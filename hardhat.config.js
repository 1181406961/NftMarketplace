/** @type import('hardhat/config').HardhatUserConfig */
require("hardhat-deploy");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "";
PRIVATE_KEY = process.env.PRIVATE_KEY || "";
ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

module.exports = {
  solidity: "0.8.7",
  namedAccounts: {
    deployer: {
      default: 0,
      goerli: 0,
    },
  },
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5,
    },
  },
  // verify 国内环境不行，开了vpn全局代理也不行
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    timeout: 500000,
  },
  // mocha: {
  //   timeout: 200000, // 200 seconds max for running tests
  // },
};
