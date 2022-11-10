const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify");
const { devNetWorks, networkConfig, NFT_URIS } = require("../helper.config");
const MIN_FEE = ethers.utils.parseEther("0.01").toString();
const FUND_AMOUNT = ethers.utils.parseEther("1"); // 1 Ether, or 1e18 (10^18) Wei

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;
  if (devNetWorks.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const trxRsp = await vrfCoordinatorV2Mock.createSubscription();
    const trxReceipt = await trxRsp.wait();
    subscriptionId = trxReceipt.events[0].args.subId.toString();
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  arguments = [
    subscriptionId,
    vrfCoordinatorV2Address,
    NFT_URIS,
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["callbackGasLimit"],
    networkConfig[chainId]["mintFee"],
  ];
  const myNft = await deploy("MyNft", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: 1,
  });
  // 国内网络好像不行，连vpn也不可以
  // if (!devNetWorks.includes(network.name)) {
  //   await verify(myNft.address, []);
  // }
  if (devNetWorks.includes(network.name)) {
    let trxResponse = await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId,
      myNft.address
    );
    await trxResponse.wait();
  }
  log("myNft deployed!");
  log("----------------------------------------------------");
};

module.exports.tags = ["all", "nft"];
