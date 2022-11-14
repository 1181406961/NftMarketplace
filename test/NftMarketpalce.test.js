const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");

describe("NftMarketplace", () => {
  let myNft, deployer, player, marketplace, tokenId, price;
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    player = accounts[1];
    price = ethers.utils.parseEther("0.01");
    await deployments.fixture(["mocks", "nft", "nftMarketplace"]);
    myNft = await ethers.getContract("MyNft");
    marketplace = await ethers.getContract("NftMarketplace");
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    const fee = await myNft.getMintFee();
    tokenId = await myNft.getCurrentTokenId();
    const trxResp = await myNft.requestMintNft({ value: fee });
    const trxReceipt = await trxResp.wait();
    await vrfCoordinatorV2Mock.fulfillRandomWords(
      trxReceipt.events[1].args.requestId,
      myNft.address
    );
  });
  describe("listItem", () => {
    it("list my nft", async () => {
      await myNft.approve(marketplace.address, tokenId);
      await expect(marketplace.listItem(myNft.address, tokenId, price))
        .to.emit(marketplace, "ItemListed")
        .withArgs(deployer.address, myNft.address, tokenId, price);
    });
    it("not approve", async () => {
      await expect(
        marketplace.listItem(myNft.address, tokenId, price)
      ).to.be.revertedWith("NotApprovedForMarketplace");
    });
    it("already listed", async () => {
      await myNft.approve(marketplace.address, tokenId);
      await marketplace.listItem(myNft.address, tokenId, price);
      await expect(
        marketplace.listItem(myNft.address, tokenId, price)
      ).to.be.revertedWith("AlreadyListed");
    });
    it("price is zero", async () => {
      await myNft.approve(marketplace.address, tokenId);
      await expect(
        marketplace.listItem(myNft.address, tokenId, 0)
      ).to.be.revertedWith("PriceMustBeAboveZero");
    });
    it("owner can list", async () => {
      await myNft.approve(marketplace.address, tokenId);
      marketplace = marketplace.connect(player);
      await expect(
        marketplace.listItem(myNft.address, tokenId, 100)
      ).to.be.revertedWith("NotOwner");
    });
  });
  describe("Already List tokeId", () => {
    beforeEach(async () => {
      await myNft.approve(marketplace.address, tokenId);
      await marketplace.listItem(myNft.address, tokenId, price);
    });

    describe("cancelListing", () => {
      it("cancel", async () => {
        await marketplace.cancelListing(myNft.address, tokenId);
        item = await marketplace.getListing(myNft.address, tokenId);
        assert.equal(item.price.toString(), "0");
      });

      it("owner can cancel", async () => {
        marketplace = marketplace.connect(player);
        await expect(
          marketplace.cancelListing(myNft.address, tokenId)
        ).to.be.revertedWith("NotOwner");
      });
      it("listed can cancel", async () => {
        await marketplace.cancelListing(myNft.address, tokenId);
        await expect(
          marketplace.cancelListing(myNft.address, tokenId)
        ).to.be.revertedWith("NotListed");
      });
    });

    describe("buyItem", () => {
      it("player buy token", async () => {
        marketplace = marketplace.connect(player);
        await marketplace.buyItem(myNft.address, tokenId, { value: price });
        owner = await myNft.ownerOf(tokenId);
        deployerProceed = await marketplace.getProceeds(deployer.address);
        assert.equal(owner.toString(), player.address.toString());
        assert.equal(deployerProceed.toString(), price.toString());
      });
      it("not listed can't buy", async () => {
        await marketplace.cancelListing(myNft.address, tokenId);
        marketplace = marketplace.connect(player);
        await expect(
          marketplace.buyItem(myNft.address, tokenId, { value: price })
        ).to.be.revertedWith("NotListed");
      });
      it("buy item price not met", async () => {
        await expect(
          marketplace.buyItem(myNft.address, tokenId, { value: 100 })
        ).to.be.revertedWith("PriceNotMet");
      });
    });
    describe("updateListing", () => {
      it("update price", async () => {
        newPrice = ethers.utils.parseEther("0.02");
        await marketplace.updateListing(myNft.address, tokenId, newPrice);
        item = await marketplace.getListing(myNft.address, tokenId);
        assert.equal(newPrice.toString(), item.price.toString());
      });
      it("not listed can't update", async () => {
        await marketplace.cancelListing(myNft.address, tokenId);
        await expect(
          marketplace.updateListing(myNft.address, tokenId, 321313)
        ).to.be.revertedWith("NotListed");
      });
      it("only owner can update", async () => {
        marketplace = marketplace.connect(player);
        await expect(
          marketplace.updateListing(myNft.address, tokenId, 32234432)
        ).to.be.revertedWith("NotOwner");
      });
      it("price must be above zero", async () => {
        await expect(
          marketplace.updateListing(myNft.address, tokenId, 0)
        ).to.be.revertedWith("PriceMustBeAboveZero");
      });
    });
  });
  describe("withdrawProceeds", () => {
    it("withdraw money", async () => {
      await myNft.approve(marketplace.address, tokenId);
      await marketplace.listItem(myNft.address, tokenId, price);
      deployerStartBalance = await deployer.getBalance();
      marketplace = marketplace.connect(player);
      await marketplace.buyItem(myNft.address, tokenId, { value: price });
      marketplace = marketplace.connect(deployer);
      deployerProceed = await marketplace.getProceeds(deployer.address);
      let trxResp = await marketplace.withdrawProceeds();
      const { gasUsed, effectiveGasPrice } = await trxResp.wait();
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const deployerEndBalance = await deployer.getBalance();
      endDeployerProceed = await marketplace.getProceeds(deployer.address);
      assert.equal(
        deployerProceed.sub(gasCost).add(deployerStartBalance).toString(),
        deployerEndBalance.toString()
      );
      assert.equal(endDeployerProceed.toString(), "0");
    });
    it("no proceed", async () => {
      await expect(marketplace.withdrawProceeds()).to.be.revertedWith(
        "NoProceeds"
      );
    });
  });
});
