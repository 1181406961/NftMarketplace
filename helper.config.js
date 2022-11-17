const { ethers } = require("hardhat");
const networkConfig = {
  default: {
    name: "hardhat",
  },
  31337: {
    name: "localhost",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    mintFee: ethers.utils.parseEther("0.01").toString(), // 最小入场费
    callbackGasLimit: "500000", // 获取随机数的回调函数 gas
  },
  5: {
    name: "goerli",
    subscriptionId: 5079,
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
    callbackGasLimit: "500000", // 获取随机数的回调函数 gas
    mintFee: ethers.utils.parseEther("0.01").toString(), // 最小入场费
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
  },
};
devNetWorks = ["localhost", "hardhat"];
const NFT_URIS = [
  "ipfs://QmSsYRx3LpDAb1GZQm7zZ1AuHZjfbPkD6J7s9r41xu1mf8",
  "ipfs://QmYx6GsYAKnNzZ9A6NvEKV9nf1VaDzJrqDR23Y8YSkebLU",
  "ipfs://QmUPjADFGEKmfohdTaNcWhp7VGk26h5jXDA7v3VtTnTLcW",
];
const frontEndContractsFile =
  "./nextjs-marketplace/constants/networkMapping.json";
const frontEndContractsFile2 =
  "./graph-nft-marketplace/constants/networkMapping.json";
const frontEndAbiLocation = "./nextjs-marketplace/constants/";
const frontEndAbiLocation2 = "./graph-nft-marketplace/constants/";
module.exports = {
  devNetWorks,
  networkConfig,
  NFT_URIS,
  frontEndContractsFile,
  frontEndContractsFile2,
  frontEndAbiLocation,
  frontEndAbiLocation2,
};
