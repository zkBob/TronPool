const TronWeb = require('tronweb');
const { ethers } = require('ethers');

var EIP1967Proxy = artifacts.require("EIP1967Proxy");
var TransferVerifier = artifacts.require("TransferVerifier");
var TreeUpdateVerifier  = artifacts.require("TreeUpdateVerifier");
var DelegatedDepositVerifier = artifacts.require("DelegatedDepositVerifier");
var ZkBobPoolBob = artifacts.require("ZkBobPoolBOB");

module.exports = async function(deployer) {
    const tronWeb = new TronWeb({
        fullNode: 'http://139.144.183.185:26667',
        solidityNode: 'http://139.144.183.185:26668',
    }, deployer.options.options.privateKey);

    await deployer.deploy(TransferVerifier);
    const transferVerifier = await TransferVerifier.deployed();
    await deployer.deploy(TreeUpdateVerifier);
    const treeUpdateVerifier = await TreeUpdateVerifier.deployed();
    await deployer.deploy(DelegatedDepositVerifier);
    const delegatedDepositVerifier = await DelegatedDepositVerifier.deployed();

    const deployerAddress = TronWeb.address.toHex(deployer.options.options.from);
    await deployer.deploy(EIP1967Proxy, deployerAddress, process.env.TOKEN, []);
    const queueProxy = await EIP1967Proxy.deployed();
    console.log('Queue proxy: ', queueProxy.address);

    await deployer.deploy(
        ZkBobPoolBob,
        16776966,
        process.env.TOKEN,
        transferVerifier.address,
        treeUpdateVerifier.address,
        delegatedDepositVerifier.address,
        queueProxy.address,
    );
    const poolImpl = await ZkBobPoolBob.deployed();
    console.log('Pool implementation: ', poolImpl.address);
};
