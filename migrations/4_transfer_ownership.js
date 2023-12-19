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

async function assertSuccess(tronWeb, result, message) {
    if (!result.result) {
        console.log("Result: " + result);
        throw new Error(message || "Assertion failed");
    }

    console.log("Waiting for transaction to be confirmed...");
    var info = await tronWeb.trx.getTransactionInfo(result.txid);
    while (!info.receipt) {
        await new Promise(r => setTimeout(r, 1000));
        info = await tronWeb.trx.getTransactionInfo(result.txid);
    }
    if (info.receipt.result != 'SUCCESS') {
        console.log("Info: " + info);
        throw new Error(message || "Assertion failed");
    }
}

module.exports = async function(deployer) {
    const deployerAddress = TronWeb.address.toHex(deployer.options.options.from);
    const tronWeb = new TronWeb({
        fullNode: deployer.options.options.fullHost,
        solidityNode: deployer.options.options.fullHost,
    }, deployer.options.options.privateKey);

    if (process.env.OWNER && tronWeb.address.toHex(process.env.OWNER) != deployerAddress) {
        result = await transferOwnership(deployer, tronWeb, process.env.POOL_PROXY, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of pool proxy');
        console.log("Transfer ownership of pool proxy to " + process.env.OWNER);

        result = await transferOwnership(deployer, tronWeb, process.env.QUEUE_PROXY, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of queue proxy');
        console.log("Transfer ownership of queue proxy to " + process.env.OWNER);

        result = await transferOwnership(deployer, tronWeb, process.env.OPERATOR_MANAGER, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of operator manager');
        console.log("Transfer ownership of operator manager to " + process.env.OWNER);

        result = await transferOwnership(deployer, tronWeb, process.env.MPC_GUARD, process.env.OWNER);
        await assertSuccess(tronWeb, result, 'Could not transfer ownership of MPC guard');
        console.log("Transfer ownership of MPC guard to " + process.env.OWNER);
    }

    // 10. Set admin
    if (process.env.ADMIN && tronWeb.address.toHex(process.env.ADMIN) != deployerAddress) {
        result = await setAdmin(deployer, tronWeb, process.env.POOL_PROXY, process.env.ADMIN);
        await assertSuccess(tronWeb, result, 'Could not set admin of pool proxy');
        console.log("Set admin of pool proxy to " + process.env.ADMIN);

        result = await setAdmin(deployer, tronWeb, process.env.QUEUE_PROXY, process.env.ADMIN);
        await assertSuccess(tronWeb, result, 'Could not set admin of queue proxy');
        console.log("Set admin of queue proxy to " + process.env.ADMIN);
    }
};
