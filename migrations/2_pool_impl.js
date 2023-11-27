const TronWeb = require('tronweb');
const { ethers } = require('ethers');

var ZkBobPoolERC20 = artifacts.require("ZkBobPoolERC20");

module.exports = async function(deployer) {
    const usdt = TronWeb.address.toHex(process.env.TOKEN);

    const transferVerifier = TronWeb.address.toHex(process.env.TRANSFER_VERIFIER_ADDRESS);
    const treeUpdateVerifier = TronWeb.address.toHex(process.env.TREE_UPDATE_VERIFIER_ADDRESS);
    const delegatedDepositVerifier = TronWeb.address.toHex(process.env.DELEGATED_DEPOSIT_VERIFIER_ADDRESS);
    const ddQueueProxy = TronWeb.address.toHex(process.env.DD_QUEUE_PROXY_ADDRESS);
    
    await deployer.deploy(
        ZkBobPoolERC20,
        process.env.POOL_ID,
        usdt,
        transferVerifier,
        treeUpdateVerifier,
        delegatedDepositVerifier,
        ddQueueProxy,
        '410000000000000000000000000000000000000000',
        1,
        1000000,
    );
    const poolImpl = await ZkBobPoolERC20.deployed();
    console.log('Pool implementation: ', poolImpl.address);
};
