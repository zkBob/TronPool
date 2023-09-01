const TronWeb = require('tronweb');

var EIP1967Proxy = artifacts.require("EIP1967Proxy");
var BobToken = artifacts.require("BobToken");

module.exports = async function(deployer) {
    const deployerAddress = TronWeb.address.toHex(deployer.options.options.from);
    await deployer.deploy(EIP1967Proxy, deployerAddress, deployerAddress, []);
    const proxy = await EIP1967Proxy.deployed();
    await deployer.deploy(BobToken, proxy.address);
    const token = await BobToken.deployed();
    await proxy.upgradeTo(token.address);
};
