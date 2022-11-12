const { network } = require("hardhat");
const { devNetWorks } = require("../helper.config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("NftMarketplace", {
    from: deployer,
    log: true,
    args: [],
  });
  log("nftMarketplace Deployed!");
  log("----------------------------------------------------");
};
module.exports.tags = ["all", "nftMarketplace", "main"];
