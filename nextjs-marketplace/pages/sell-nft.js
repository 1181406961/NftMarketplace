import Head from "next/head";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useWeb3Contract, useMoralis } from "react-moralis";
import { Button, Form, useNotification } from "web3uikit";
import styles from "../styles/Home.module.css";
import nftAbi from "../constants/BasicNft.json";
import nftMarketplaceAbi from "../constants/NftMarketplace.json";
import networkMapping from "../constants/networkMapping.json";
import { ethers } from "ethers";

export default function Home() {
  const { chainId, account, isWeb3Enabled } = useMoralis();
  const chainString = chainId ? parseInt(chainId).toString() : "31337";
  const marketplaceAddress = networkMapping[chainString].NftMarketplace[0];
  const [proceeds, setProceeds] = useState("0");
  const dispatch = useNotification();
  const { runContractFunction } = useWeb3Contract();
  async function setupUI() {
    const returnedProcess = await runContractFunction({
      params: {
        abi: nftMarketplaceAbi,
        contractAddress: marketplaceAddress,
        functionName: "getProceeds",
        params: {
          seller: account,
        },
      },
      onError: (error) => console.log(error),
    });
    if (returnedProcess) {
      setProceeds(returnedProcess.toString());
    }
  }
  useEffect(() => {
    setupUI();
  }, [proceeds, account, isWeb3Enabled, chainId]);
  const handleWithdrawSuccess = () => {
    dispatch({
      type: "success",
      message: "Withdrawing proceeds",
      position: "topR",
    });
  };
  const approveAndList = async (data) => {
    console.log("Approving...");
    const nftAddress = data.data[0].inputResult;
    const tokenId = data.data[1].inputResult;
    const price = ethers.utils
      .parseUnits(data.data[2].inputResult, "ether")
      .toString();
    await runContractFunction({
      params: {
        abi: nftAbi,
        contractAddress: nftAddress,
        functionName: "approve",
        params: {
          to: marketplaceAddress,
          tokenId: tokenId,
        },
      },
      onSuccess: (tx) => handleApproveSuccess(tx, nftAddress, tokenId, price),
      onError: (error) => console.log(error),
    });
  };
  async function handleApproveSuccess(tx, nftAddress, tokenId, price) {
    await tx.wait();
    await runContractFunction({
      params: {
        abi: nftMarketplaceAbi,
        contractAddress: marketplaceAddress,
        functionName: "listItem",
        params: {
          nftAddress: nftAddress,
          tokenId: tokenId,
          price: price,
        },
      },
      onSuccess: () => handleListSuccess(),
      onError: (error) => console.log(error),
    });
  }
  async function handleListSuccess() {
    dispatch({
      type: "success",
      message: "NFT listing",
      title: "NFT listed",
      position: "topR",
    });
    console.log("Ok! Now time to list");
  }
  return (
    <div className={styles.container}>
      <Form
        onSubmit={approveAndList}
        data={[
          {
            name: "NFT Address",
            type: "text",
            inputWidth: "50%",
            value: "",
            key: "nftAddress",
          },
          {
            name: "Token ID",
            type: "number",
            value: "",
            key: "tokenId",
          },
          {
            name: "Price (in ETH)",
            type: "number",
            value: "",
            key: "price",
          },
        ]}
        title="Sell your NFT!"
        id="Main Form"
      />
      <div>
        Withdraw {ethers.utils.formatEther(proceeds || "0")}ETH proceeds
        {proceeds != "0" ? (
          <Button
            onClick={() => {
              runContractFunction({
                params: {
                  abi: nftMarketplaceAbi,
                  contractAddress: marketplaceAddress,
                  functionName: "withdrawProceeds",
                  params: {},
                },
                onError: (error) => console.log(error),
                onSuccess: () => handleWithdrawSuccess(),
              });
            }}
            text="withdraw"
            type="button"
          />
        ) : (
          <div>No proceeds detected</div>
        )}
      </div>
    </div>
  );
}
