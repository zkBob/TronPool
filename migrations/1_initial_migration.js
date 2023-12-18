var Migrations = artifacts.require("Migrations");

module.exports = async function(deployer) {
  await deployer.deploy(Migrations);
  const result = await Migrations.deployed();
  console.log('Migrations: ', result.address);
};
