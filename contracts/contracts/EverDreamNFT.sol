// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title EverDreamNFT — dream journal NFTs with IPFS metadata URIs
/// @notice Custodial minter (owner) mints to user wallets; supports simulacrum animation_url via tokenURI
contract EverDreamNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event DreamMinted(address indexed to, uint256 indexed tokenId, string tokenURI, bytes32 dreamIdHash);

    constructor() ERC721("EverDream", "DREAM") Ownable() {}

    /// @param to Recipient wallet
    /// @param uri IPFS or HTTPS metadata URI (OpenSea-compatible JSON)
    /// @param dreamIdHash keccak256 of app dream id for off-chain lookup
    function mintDream(
        address to,
        string calldata uri,
        bytes32 dreamIdHash
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit DreamMinted(to, tokenId, uri, dreamIdHash);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}