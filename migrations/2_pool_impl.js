const TronWeb = require('tronweb');
const { ethers } = require('ethers');

var EIP1967Proxy = artifacts.require("EIP1967Proxy");
var TransferVerifierProd = artifacts.require("TransferVerifier.sol");
var TreeUpdateVerifierProd  = artifacts.require("TreeUpdateVerifier.sol");
var DelegatedDepositVerifierProd = artifacts.require("DelegatedDepositVerifier.sol");
var TransferVerifierStage = artifacts.require("TransferVerifierStage.sol");
var TreeUpdateVerifierStage  = artifacts.require("TreeUpdateVerifierStage.sol");
var DelegatedDepositVerifierStage = artifacts.require("DelegatedDepositVerifierStage.sol");
var ZkBobPoolERC20 = artifacts.require("ZkBobPoolERC20");

module.exports = async function(deployer) {
    const usdt = TronWeb.address.toHex(process.env.TOKEN);
    var transferVerifier;
    var treeUpdateVerifier;
    var delegatedDepositVerifier;
    if (process.env.USE_STAGE_VERIFIERS.toLowerCase() == 'true') {
        await deployer.deploy(TransferVerifierStage);
        transferVerifier = await TransferVerifierStage.deployed();
        await deployer.deploy(TreeUpdateVerifierStage);
        treeUpdateVerifier = await TreeUpdateVerifierStage.deployed();
        await deployer.deploy(DelegatedDepositVerifierStage);
        delegatedDepositVerifier = await DelegatedDepositVerifierStage.deployed();
    } else {
        await deployer.deploy(TransferVerifierProd);
        transferVerifier = await TransferVerifierProd.deployed();
        await deployer.deploy(TreeUpdateVerifierProd);
        treeUpdateVerifier = await TreeUpdateVerifierProd.deployed();
        await deployer.deploy(DelegatedDepositVerifierProd);
        delegatedDepositVerifier = await DelegatedDepositVerifierProd.deployed();
    }

    const deployerAddress = TronWeb.address.toHex(deployer.options.options.from);
    await deployer.deploy(EIP1967Proxy, deployerAddress, usdt, []);
    const queueProxy = await EIP1967Proxy.deployed();
    console.log('Queue proxy: ', queueProxy.address);

    await deployer.deploy(
        ZkBobPoolERC20,
        process.env.POOL_ID,
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
