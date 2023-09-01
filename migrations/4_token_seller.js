const TronWeb = require('tronweb');
const ethers = require('ethers');
var UniswapV3Seller = artifacts.require("UniswapV3Seller");

const abiCoder = new ethers.AbiCoder();
const ADDRESS_PREFIX = "41";

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


module.exports = async function(deployer) {
    const usdt = TronWeb.address.toHex('TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf');
    const wtrx = TronWeb.address.toHex('TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a');
    const fee = 10000;
    const swapRouter = TronWeb.address.toHex('TRaQfARihsnjC1c4ZJMmXbaRVFDdCnbrrd');
    const quoter = TronWeb.address.toHex('TPdZedM797fpzTErwGYqUcdkmMvYukT3Mc');
    const tronWeb = new TronWeb({
        fullNode: 'https://api.nileex.io/',
        solidityNode: 'https://api.nileex.io/',
    }, deployer.options.options.privateKey);

    var res = await tronWeb.transactionBuilder.triggerConstantContract(
        'TP3Y7vjWVwwuuJQGzbTxQ65MzYamc3VpZG',
        'getSwapParams(uint256)',
        {},
        [{type: 'uint256', value: 500}],
    );

    console.log(abiCoder.decode([''], '0x' + res.constant_result[0]));
    return;
    const factory = abiCoder.decode(['address'], '0x' + res.constant_result[0])[0].replace(/^0x/, '41');

    await deployer.deploy(UniswapV3Seller, swapRouter, quoter, usdt, 10000, '410000000000000000000000000000000000000000', 0);
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
