const { network } = require("hardhat");
const { devNetWorks } = require("../helper.config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("BasicNft", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
  log("BasicNft Deployed!");
  log("----------------------------------------------------");
};

module.exports.tags = ["all", "basicnft", "main"];
