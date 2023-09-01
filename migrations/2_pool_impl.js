const TronWeb = require('tronweb');
const { ethers } = require('ethers');

var EIP1967Proxy = artifacts.require("EIP1967Proxy");
var TransferVerifier = artifacts.require("TransferVerifier");
var TreeUpdateVerifier  = artifacts.require("TreeUpdateVerifier");
var DelegatedDepositVerifier = artifacts.require("DelegatedDepositVerifier");
var ZkBobPoolERC20 = artifacts.require("ZkBobPoolERC20");

module.exports = async function(deployer) {
    const usdt = TronWeb.address.toHex('TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs');
    const tronWeb = new TronWeb({
        fullNode: 'https://api.shasta.trongrid.io',
        solidityNode: 'https://api.shasta.trongrid.io',
    }, deployer.options.options.privateKey);

    await deployer.deploy(TransferVerifier);
    const transferVerifier = await TransferVerifier.deployed();
    await deployer.deploy(TreeUpdateVerifier);
    const treeUpdateVerifier = await TreeUpdateVerifier.deployed();
    await deployer.deploy(DelegatedDepositVerifier);
    const delegatedDepositVerifier = await DelegatedDepositVerifier.deployed();

    const deployerAddress = TronWeb.address.toHex(deployer.options.options.from);
    await deployer.deploy(EIP1967Proxy, deployerAddress, usdt, []);
    const queueProxy = await EIP1967Proxy.deployed();
    console.log('Queue proxy: ', queueProxy.address);

    await deployer.deploy(
        ZkBobPoolERC20,
        16776966,
        usdt,
        transferVerifier.address,
        treeUpdateVerifier.address,
        delegatedDepositVerifier.address,
        queueProxy.address,
        '410000000000000000000000000000000000000000',
        1,
        1000000,
    );
    const poolImpl = await ZkBobPoolERC20.deployed();
    console.log('Pool implementation: ', poolImpl.address);
};
