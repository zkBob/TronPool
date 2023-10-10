var PathDecoder = artifacts.require("PathDecoder");

module.exports = async function(deployer) {
    await deployer.deploy(PathDecoder);
    await PathDecoder.deployed();
};