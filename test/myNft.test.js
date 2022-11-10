const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { NFT_URIS } = require("../helper.config");
describe("MyNft Unit Tests", () => {
  let myNft, deployer, vrfCoordinatorV2Mock;
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    await deployments.fixture(["mocks", "nft"]);
    myNft = await ethers.getContract("MyNft");
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
  });

  describe("constructor", () => {
    it("sets staring values correctly", async () => {
      const low = await myNft.getProbToUris(0);
      const middle = await myNft.getProbToUris(1);
      const high = await myNft.getProbToUris(2);
      assert.equal(low, NFT_URIS[0]);
      assert.equal(middle, NFT_URIS[1]);
      assert.equal(high, NFT_URIS[2]);
      assert(low.includes("ipfs://"));
    });
  });

  describe("mint nft", () => {
    it("fails not sent ETH", async () => {
      await expect(myNft.requestMintNft()).to.be.revertedWith(
        "Nft__NeedMoreETHSent"
      );
    });
    it("fail less than mint fee", async () => {
      const fee = await myNft.getMintFee();
      await expect(
        myNft.requestMintNft({
          value: fee.sub(ethers.utils.parseEther("0.001")),
        })
      ).to.be.revertedWith("Nft__NeedMoreETHSent");
    });

    it("success enough eth", async () => {
      const fee = await myNft.getMintFee();
      await expect(
        myNft.requestMintNft({
          value: fee,
        })
      ).to.emit(myNft, "NftRequested");
    });
  });
  describe("fulfillRandomWords", () => {
    it("mints NFT after random number is returned", async () => {
      await new Promise(async (resolve, reject) => {
        myNft.once("NftMinted", async () => {
          try {
            const tokenURI = await myNft.tokenURI(0);
            assert.isTrue(tokenURI.startsWith("data:application/json;base64,"));
            resolve();
          } catch (e) {
            console.log(e);
            reject();
          }
        });
        try {
          const fee = await myNft.getMintFee();
          const trxResp = await myNft.requestMintNft({ value: fee });
          const trxReceipt = await trxResp.wait();
          await vrfCoordinatorV2Mock.fulfillRandomWords(
            trxReceipt.events[1].args.requestId,
            myNft.address
          );
        } catch (e) {
          console.log(e);
          reject();
        }
      });
    });
  });
  describe("getRandomProb", () => {
    it("should return high >= 30", async () => {
      const expectedValue = await myNft.getRandomProb(30);
      assert.equal(2, expectedValue);
    });
    it("should return 30> middle >= 10", async () => {
      const expectedValue = await myNft.getRandomProb(10);
      assert.equal(1, expectedValue);
    });
    it("should return low < 10", async () => {
      const expectedValue = await myNft.getRandomProb(9);
      assert.equal(0, expectedValue);
    });
  });
  describe("withdraw eth to owner", () => {
    it("withdraw all eth to deployer", async () => {
      let fee = ethers.utils.parseEther("1");
      let trxResp = await myNft.requestMintNft({
        value: fee,
      });
      trxResp.wait();
      const contractStartBalance = await myNft.provider.getBalance(
        myNft.address
      );
      const ownerStartBalance = await deployer.getBalance();
      trxResp = await myNft.withdraw();
      const { gasUsed, effectiveGasPrice } = await trxResp.wait();
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const contractEndBalance = await myNft.provider.getBalance(myNft.address);
      const ownerEndBalance = await deployer.getBalance();
      assert.equal(contractEndBalance, 0);
      assert.equal(
        contractStartBalance.sub(gasCost).add(ownerStartBalance).toString(),
        ownerEndBalance.toString()
      );
    });
  });
});
