const TronWeb = require('tronweb');
const ethers = require('ethers');
var UniswapV3Seller = artifacts.require("UniswapV3Seller");

const abiCoder = new ethers.AbiCoder();
const ADDRESS_PREFIX = "41";
const ADDRESS_PREFIX_REGEX = /^(41)/;

function decodeParams(types, output, ignoreMethodHash) {

    if (!output || typeof output === 'boolean') {
        ignoreMethodHash = output;
        output = types;
    }

    if (ignoreMethodHash && output.replace(/^0x/, '').length % 64 === 8)
        output = '0x' + output.replace(/^0x/, '').substring(8);

    const abiCoder = new AbiCoder();

    if (output.replace(/^0x/, '').length % 64)
        throw new Error('The encoded string is not valid. Its length must be a multiple of 64.');
    return abiCoder.decode(types, output).reduce((obj, arg, index) => {
        if (types[index] == 'address')
            arg = ADDRESS_PREFIX + arg.substr(2).toLowerCase();
        obj.push(arg);
        return obj;
    }, []);
}

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

async function getSwapParams(tronWeb, amount) {
    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        'TP3Y7vjWVwwuuJQGzbTxQ65MzYamc3VpZG',
        'getSwapParams(uint256)',
        {},
        [{type: 'uint256', value: amount}],
    );

    return abiCoder.decode(['tuple(bytes, address, uint256, uint256, uint256)'], '0x' + res.constant_result[0])[0];
}

async function getPool(tronWeb, factory, token0, token1, fee) {
    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        factory,
        'getPool(address,address,uint24)',
        {},
        [{type: 'address', value: token0}, {type: 'address', value: token1}, {type: 'uint24', value: fee}],
    );
    return '41' + abiCoder.decode(['address'], '0x' + res.constant_result[0])[0].slice(2);
}

async function getSlot0(tronWeb, pool) {
    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        pool,
        'slot0()',
        {},
        [],
    );
    return abiCoder.decode(
        ['tuple(uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked) slot0'],
        '0x' + res.constant_result[0],
    ).slot0;
}

async function hasMultiplePools(tronWeb, path) {
    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        'TFUBwL7AEDrAjRdB2dPyTXgAveNq1JkDCM',
        'hasMultiplePools(bytes)',
        {},
        [{type: 'bytes', value: path}],
    )
    return abiCoder.decode(['bool'], '0x' + res.constant_result[0])[0];
}

async function getFirstPool(tronWeb, path) {
    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        'TFUBwL7AEDrAjRdB2dPyTXgAveNq1JkDCM',
        'getFirstPool(bytes)',
        {},
        [{type: 'bytes', value: path}],
    )
    return abiCoder.decode(['address', 'address', 'uint24'], '0x' + res.constant_result[0]);
}


async function getTokens(tronWeb, pool) {
    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        pool,
        'token0()',
        {},
        [],
    );
    var token0 = '41' + abiCoder.decode(['address'], '0x' + res.constant_result[0])[0].slice(2);
    res = await tronWeb.transactionBuilder.triggerConstantContract(
        pool,
        'token1()',
        {},
        [],
    );
    var token1 = '41' + abiCoder.decode(['address'], '0x' + res.constant_result[0])[0].slice(2);
    return [tronWeb.address.fromHex(token0), tronWeb.address.fromHex(token1)];
}


async function debugSellForEth(tronWeb, deployer, my_debug, seller, receiver, amount) {
    var data = '802e33b0';
    data += encodeParams([
        {type: 'address', value: tronWeb.address.toHex(receiver)},
        {type: 'uint256', value: amount},
    ]);
    console.log('encoded');
    console.log(data);
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        tronWeb.address.toHex(my_debug),
        'call(address,bytes)',
        {},
        [
            {type: 'address', value: tronWeb.address.toHex(seller)},
            {type: 'bytes', value: '0x' + data},
        ],
    );
    console.log('built');
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    var result = await tronWeb.trx.sendRawTransaction(
        signed
    );
    console.log(result);
}


module.exports = async function(deployer) {
    const usdt = TronWeb.address.toHex('TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf');
    const wtrx = TronWeb.address.toHex('TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a');
    const fee = 3000;
    const swapRouter = TronWeb.address.toHex('TRaQfARihsnjC1c4ZJMmXbaRVFDdCnbrrd');
    const quoter = TronWeb.address.toHex('TPdZedM797fpzTErwGYqUcdkmMvYukT3Mc');
    const factory = 'TLJWAScHZ4Qmk1axyKMzrnoYuu2pSLer1F';
    const my_debug = 'TLTucc51WG7FBMwBEcZgjmCVQN2ZvnChNs';
    
    const tronWeb = new TronWeb({
        fullNode: 'https://api.nileex.io/',
        solidityNode: 'https://api.nileex.io/',
    }, deployer.options.options.privateKey);

    // const kek = await tronWeb.trx.getTransactionInfo('fd1006171861992c1adc62907fa20424ada712f233ce42994175bc7d4f66c759');
    // const internal = kek.internal_transactions;
    // for (let i = 0; i < internal.length; ++i) {
    //     console.log('from: ', tronWeb.address.fromHex(internal[i].caller_address));
    //     console.log('to: ', tronWeb.address.fromHex(internal[i].transferTo_address));
    //     console.log('info: ', internal[i].callValueInfo);
    // }
    // console.log(kek);
    // return;

    // const params = await getSwapParams(tronWeb, 500);
    // const path = params[0];
    // console.log(await hasMultiplePools(tronWeb, path));
    // console.log(await getFirstPool(tronWeb, path));

    // console.log(usdt);
    // console.log(wtrx);


    // const pool = await getPool(tronWeb, factory, usdt, wtrx, fee);
    // const slot0  = await getSlot0(tronWeb, pool);

    // await debugSellForEth(tronWeb, deployer, my_debug, 'TP3Y7vjWVwwuuJQGzbTxQ65MzYamc3VpZG', 'TPfQEQT4HFPFcFuvCj45fCVjtcoc6ALpxG', 500);

    // return;

    await deployer.deploy(UniswapV3Seller, swapRouter, quoter, usdt, fee, '410000000000000000000000000000000000000000', 0);
    const seller = await UniswapV3Seller.deployed();
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        usdt,
        'transfer(address,uint256)',
        {},
        [{type: 'address', value: seller.address}, {type: 'uint256', value: 500}],
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    var result = await tronWeb.trx.sendRawTransaction(signed);
    await seller.sellForETH(
        deployer.options.options.from,
        500,
    );
};
