// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "base64-sol/base64.sol";
import "hardhat/console.sol";
error Nft__NeedMoreETHSent();
error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__TransferFailed();

contract MyNft is ERC721, VRFConsumerBaseV2, Ownable {
    // VRF
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private NUM_WORDS = 1;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    // 记录requestId对应的请求者是谁
    mapping(uint256 => address) s_requestIdToSender;
    mapping(uint256 => string) s_tokenIdToUri;

    // NFT
    // 概率对应的uri
    string[3] internal s_probToUris;
    // 最小铸造费
    uint256 private immutable i_mintFee;
    // 概率范围
    uint256 internal constant MAX_CHANGE_VALUE = 100;

    // event
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Prob prob, address minter);

    using Counters for Counters.Counter;
    enum Prob {
        LOW,
        MIDDLE,
        HIGH
    }
    Counters.Counter private _tokenIds;

    constructor(
        uint64 subscriptionId,
        address vrfCoordinatorAdress,
        string[3] memory probToUris,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint256 mintFee
    ) ERC721("MyNft", "MNFT") VRFConsumerBaseV2(vrfCoordinatorAdress) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorAdress);
        i_subscriptionId = subscriptionId;
        s_probToUris = probToUris;
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
        i_mintFee = mintFee;
    }

    // 请求随机数创建token
    function requestMintNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert Nft__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory _randomWords
    ) internal override {
        address owner = s_requestIdToSender[requestId];
        uint256 newItemId = _tokenIds.current();
        uint256 randomNum = _randomWords[0];
        Prob prob = getRandomProb(randomNum);
        string memory imgUri = s_probToUris[uint256(prob)];
        _tokenIds.increment();
        _safeMint(owner, newItemId);
        _set_tokenUri(newItemId, imgUri);
        emit NftMinted(prob, owner);
    }

    function getRandomProb(uint256 randomNum) public pure  returns (Prob) {
        uint256[3] memory changeArray = getProbArray();
        uint256 random = randomNum % MAX_CHANGE_VALUE;
        for (uint i = 0; i < changeArray.length; i++) {
            if (random < changeArray[i]) {
                return Prob(i);
            }
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getProbArray() public pure returns (uint256[3] memory) {
        // 计算概率，low:10,middle:30,high:70
        return [10, 30, MAX_CHANGE_VALUE];
    }

    function _set_tokenUri(uint256 tokenId, string memory imageUri) private {
        require(_exists(tokenId), "MyNft: URI set of nonexistent token");
        s_tokenIdToUri[tokenId] = imageUri;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireMinted(tokenId);
        string memory imageURI = s_tokenIdToUri[tokenId];
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name:"',
                                name(),
                                '", "description":"An NFT that changes based on the Chainlink Feed",',
                                '"attributes": [{"trait_type":"coolness","value":100}],"image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getProbToUris(uint256 index) public view returns (string memory) {
        return s_probToUris[index];
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIds.current();
    }

    function withdraw() public onlyOwner {
        // 提取现金到拥有者账户
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }
}
