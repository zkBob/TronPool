const TronWeb = require('tronweb');
const { ethers } = require('ethers');

var EIP1967Proxy = artifacts.require("EIP1967Proxy");
var ZkBobPoolERC20 = artifacts.require("ZkBobPoolERC20");
var ZkBobDirectDepositQueue = artifacts.require("ZkBobDirectDepositQueue");
var MutableOperatorManager = artifacts.require("MutableOperatorManager");
var ZkAddress = artifacts.require("ZkAddress");
var Base58 = artifacts.require("Base58");
var MPCGuard = artifacts.require("MPCGuard");

const abiCoder = new ethers.AbiCoder();
const ADDRESS_PREFIX_REGEX = /^(41)/;

function encodeParams(inputs) {
    let typesValues = inputs
    let parameters = ''

    if (typesValues.length == 0)
        return parameters
    let types = [];
    const values = [];

    for (let i = 0; i < typesValues.length; i++) {
        let {type, value} = typesValues[i];
        if (type == 'address')
            value = value.replace(ADDRESS_PREFIX_REGEX, '0x');
        else if (type == 'address[]')
            value = value.map(v => toHex(v).replace(ADDRESS_PREFIX_REGEX, '0x'));
        types.push(type);
        values.push(value);
    }

    // console.log(types, values)
    try {
        parameters = abiCoder.encode(types, values).replace(/^(0x)/, '');
    } catch (ex) {
        console.log(ex);
    }
    return parameters
}

async function setGuards(deployer, tronWeb, mpcGuard) {
    // parse guards addresses from process.env.MPC_GUARDS
    const guards = process.env.MPC_GUARDS.split(',');
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        mpcGuard,
        'setGuards(address[])',
        {},
        [
            {type: 'address[]', value: guards},
        ],
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    return await tronWeb.trx.sendRawTransaction(signed);
}

async function setOperatorManager(deployer, tronWeb, contractAddress, operatorManager) {
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contractAddress,
        'setOperatorManager(address)',
        {},
        [
            {type: 'address', value: tronWeb.address.fromHex(operatorManager)},
        ],
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    return await tronWeb.trx.sendRawTransaction(signed);
}

async function transferOwnership(deployer, tronWeb, contractAddress, newOwner) {
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contractAddress,
        'transferOwnership(address)',
        {},
        [
            {type: 'address', value: tronWeb.address.fromHex(newOwner)},
        ],
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    return await tronWeb.trx.sendRawTransaction(signed);
}

async function setAdmin(deployer, tronWeb, contractAddress, newAdmin) {
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contractAddress,
        'setAdmin(address)',
        {},
        [
            {type: 'address', value: tronWeb.address.fromHex(newAdmin)},
        ],
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    return await tronWeb.trx.sendRawTransaction(signed);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

async function assertSuccess(tronWeb, result, message) {
    assert(result.result, message);

    var info = await tronWeb.trx.getTransactionInfo(result.txid);
    while (!info.receipt) {
        await new Promise(r => setTimeout(r, 1000));
        info = await tronWeb.trx.getTransactionInfo(result.txid);
    }
    assert(info.receipt.result == 'SUCCESS', message);
}

module.exports = async function(deployer) {
    const usdt = TronWeb.address.fromHex(process.env.TOKEN);
    const tronWeb = new TronWeb({
        fullNode: deployer.options.options.fullHost,
        solidityNode: deployer.options.options.fullHost,
    }, deployer.options.options.privateKey);

    // 1. Deploy pool proxy
    const deployerAddress = TronWeb.address.toHex(deployer.options.options.from);
    await deployer.deploy(EIP1967Proxy, deployerAddress, usdt, []);
    const poolProxy = await EIP1967Proxy.deployed();

    const params = encodeParams([
        {type: 'uint256', value: process.env.INITIAL_ROOT}, // zkBobInitialRoot
        {type: 'uint256', value: '144115188075855871'}, // zkBobPoolCap
        {type: 'uint256', value: '8589934591'}, // zkBobDailyDepositCap
        {type: 'uint256', value: '8589934591'}, // zkBobDailyWithdrawalCap
        {type: 'uint256', value: '8589934591'}, // zkBobDailyUserDepositCap
        {type: 'uint256', value: '8589934591'}, // zkBobDepositCap
        {type: 'uint256', value: '0'}, // zkBobDailyUserDirectDepositCap
        {type: 'uint256', value: '0'}, // zkBobDirectDepositCap
    ]);

    // 2. Initialize pool
    var selector = ZkBobPoolERC20.web3.eth.abi.encodeFunctionSignature("initialize(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)");
    selector += params;
    console.log(poolProxy.address)
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        poolProxy.address,
        'upgradeToAndCall(address,bytes)',
        {},
        [
            {type: 'address', value: process.env.POOL_IMPL},
            {type: 'bytes', value: selector},
        ]
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    var result = await tronWeb.trx.sendRawTransaction(signed);
    if (!result.result) {
        console.log('Could not initialize pool');
        return;
    }

    // 3. Deploy direct deposit queue implementation
    await deployer.deploy(Base58);
    await deployer.link(Base58, ZkAddress);
    await deployer.deploy(ZkAddress);
    await deployer.link(ZkAddress, ZkBobDirectDepositQueue);
    await deployer.deploy(
        ZkBobDirectDepositQueue, 
        TronWeb.address.fromHex(poolProxy.address), 
        usdt, 
        1,
    );
    const queueImpl = await ZkBobDirectDepositQueue.deployed();
    
    // 4. Upgrade direct deposit queue proxy
    transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        process.env.QUEUE_PROXY,
        'upgradeTo(address)',
        {},
        [
            {'type': 'address', 'value': queueImpl.address},
        ]
    );
    signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    result = await tronWeb.trx.sendRawTransaction(
        signed
    );
    if (!result.result) {
        console.log('Could not upgrade queue proxy');
        return;
    }

    // 5. Deploy MPCGuard with process.env.RELAYER as operator
    await deployer.deploy(
        MPCGuard,
        tronWeb.address.fromHex(process.env.RELAYER), // operator
        poolProxy.address, // pool
    );
    const mpcGuard = await MPCGuard.deployed();

    // 6. Set guards
    result = await setGuards(deployer, tronWeb, mpcGuard.address);
    await assertSuccess(tronWeb, result, 'Could not set guards');
    console.log("Set guards to " + process.env.MPC_GUARDS);

    // 7. Deploy MutableOperatorManager with MPCGuard as operator
    await deployer.deploy(
        MutableOperatorManager,
        mpcGuard.address, // mpc guard
        tronWeb.address.fromHex(process.env.FEE_RECEIVER), // feeReceiver
        process.env.RELAYER_URL, // url
    );
    const operatorManager = await MutableOperatorManager.deployed();

    // 8. Set operator manager
    result = await setOperatorManager(deployer, tronWeb, process.env.QUEUE_PROXY, operatorManager.address);
    await assertSuccess(tronWeb, result, 'Could not set operator manager for queue proxy');
    console.log("Set operator manager for queue proxy to " + operatorManager.address);

    result = await setOperatorManager(deployer, tronWeb, poolProxy.address, operatorManager.address);
    await assertSuccess(tronWeb, result, 'Could not set operator manager for pool proxy');
    console.log("Set operator manager for pool proxy to " + operatorManager.address);

    console.log('MPCGuard: ', tronWeb.address.fromHex(mpcGuard.address));
    console.log('Operator: ', tronWeb.address.fromHex(operatorManager.address));
    console.log('Pool: ', tronWeb.address.fromHex(poolProxy.address));
    console.log('Direct deposit queue: ', tronWeb.address.fromHex(process.env.QUEUE_PROXY));

    // 9. Transfer ownership
    if (process.env.OWNER) {
        result = await transferOwnership(deployer, tronWeb, poolProxy.address, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of pool proxy');
        console.log("Transfer ownership of pool proxy to " + process.env.OWNER);

        result = await transferOwnership(deployer, tronWeb, process.env.QUEUE_PROXY, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of queue proxy');
        console.log("Transfer ownership of queue proxy to " + process.env.OWNER);

        result = await transferOwnership(deployer, tronWeb, operatorManager.address, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of operator manager');
        console.log("Transfer ownership of operator manager to " + process.env.OWNER);

        result = await transferOwnership(deployer, tronWeb, mpcGuard.address, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of MPC guard');
        console.log("Transfer ownership of MPC guard to " + process.env.OWNER);
    }

    // 10. Set admin
    if (tronWeb.address.toHex(process.env.ADMIN) != deployerAddress) {
        result = await setAdmin(deployer, tronWeb, poolProxy.address, process.env.ADMIN);
        await assertSuccess(tronWeb, result, 'Could not set admin of pool proxy');
        console.log("Set admin of pool proxy to " + process.env.ADMIN);

        result = await setAdmin(deployer, tronWeb, process.env.QUEUE_PROXY, process.env.ADMIN);
        await assertSuccess(tronWeb, result, 'Could not set admin of queue proxy');
        console.log("Set admin of queue proxy to " + process.env.ADMIN);
    }
};
