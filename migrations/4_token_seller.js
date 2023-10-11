const TronWeb = require('tronweb');
const ethers = require('ethers');
var UniswapV3Seller = artifacts.require("UniswapV3Seller");


module.exports = async function(deployer) {
    const usdt = TronWeb.address.toHex(process.env.TOKEN);
    const wtrx = TronWeb.address.toHex(process.env.WRAPPED_TOKEN);
    const fee = process.env.POOL_FEE;
    const swapRouter = TronWeb.address.toHex(process.env.ROUTER);
    const quoter = TronWeb.address.toHex(process.env.QUOTER);
    
    const tronWeb = new TronWeb({
        fullNode: deployer.options.options.fullHost,
        solidityNode: deployer.options.options.fullHost,
    }, deployer.options.options.privateKey);

    await deployer.deploy(UniswapV3Seller, swapRouter, quoter, usdt, fee, '410000000000000000000000000000000000000000', 0);
    const seller = await UniswapV3Seller.deployed();

    {
        var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
            tronWeb.address.toHex(),
            'setTokenSeller(address)',
            {},
            [
                {type: 'address', value: seller.address},
            ]
        );
        var signed = await tronWeb.trx.sign(transaction.transaction, deployer.options.options.privateKey);
        await tronWeb.trx.sendRawTransaction(signed);
    }
    
};
