var Debugger = artifacts.require("Debugger");

module.exports = async function(deployer) {
    await deployer.deploy(Debugger);
    await Debugger.deployed();
};