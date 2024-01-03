const TronWeb = require("tronweb");

var EIP1967Proxy = artifacts.require("EIP1967Proxy");
var TransferVerifierProd = artifacts.require("TransferVerifier.sol");
var TreeUpdateVerifierProd = artifacts.require("TreeUpdateVerifier.sol");
var DelegatedDepositVerifierProd = artifacts.require(
  "DelegatedDepositVerifier.sol"
);
var TransferVerifierStage = artifacts.require("TransferVerifierStage.sol");
var TreeUpdateVerifierStage = artifacts.require("TreeUpdateVerifierStage.sol");
var DelegatedDepositVerifierStage = artifacts.require(
  "DelegatedDepositVerifierStage.sol"
);
var ZkBobPoolERC20 = artifacts.require("ZkBobPoolERC20");

const poolAbi = require("./abi.json");

module.exports = async function (deployer) {
  const usdt = TronWeb.address.fromHex(process.env.TOKEN);
  // 410000000000000000000000000000000000000000 does not work for some reason
  const zeroAddress = TronWeb.address.fromHex(
    "410000000000000000000000000000000000000001"
  );
  const tronWeb = new TronWeb(
    {
      fullNode: deployer.options.options.fullHost,
      solidityNode: deployer.options.options.fullHost,
    },
    deployer.options.options.privateKey
  );
  const poolProxy = tronWeb.contract(poolAbi, process.env.POOL_PROXY);

  // // 1. Deploy verifiers
  var transferVerifier;
  var treeUpdateVerifier;
  var delegatedDepositVerifier;
  if (process.env.VERIFIERS.toLowerCase() == "prod") {
    console.log("Deploying prod verifiers");
    await deployer.deploy(TransferVerifierProd);
    transferVerifier = await TransferVerifierProd.deployed().address;
    await deployer.deploy(TreeUpdateVerifierProd);
    treeUpdateVerifier = await TreeUpdateVerifierProd.deployed().address;
    await deployer.deploy(DelegatedDepositVerifierProd);
    delegatedDepositVerifier = await DelegatedDepositVerifierProd.deployed()
      .address;
  } else if (process.env.VERIFIERS.toLowerCase() == "offchain") {
    console.log("Using offchain verifiers");
    // We don't deploy verifiers in this case
    // We assume that they are not used in the pool contract
    transferVerifier = zeroAddress;
    treeUpdateVerifier = zeroAddress;
    delegatedDepositVerifier = zeroAddress;
  } else {
    console.log("Deploying stage verifiers");
    await deployer.deploy(TransferVerifierStage);
    transferVerifier = await TransferVerifierStage.deployed().address;
    await deployer.deploy(TreeUpdateVerifierStage);
    treeUpdateVerifier = await TreeUpdateVerifierStage.deployed().address;
    await deployer.deploy(DelegatedDepositVerifierStage);
    delegatedDepositVerifier = await DelegatedDepositVerifierStage.deployed()
      .address;
  }

  // 2. Get direct deposit queue proxy

  const queueProxy = await poolProxy["direct_deposit_queue"]().call();
  console.log("queueProxy:", queueProxy);

//    3. Deploy new pool implementation
  await deployer.deploy(
    ZkBobPoolERC20,
    process.env.POOL_ID,
    usdt,
    transferVerifier,
    treeUpdateVerifier,
    delegatedDepositVerifier,
    queueProxy,
    zeroAddress,
    1,
    1000000
  );
  const newPoolImpl = await ZkBobPoolERC20.deployed();

  console.log(
    "New pool implementation: ",
    TronWeb.address.fromHex(newPoolImpl.address)
  );

};
