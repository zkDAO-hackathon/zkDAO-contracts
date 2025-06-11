// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721Upgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol';
import {ERC721URIStorageUpgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol';
import {ERC721BurnableUpgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

import {INFTCollection} from '../../core/interfaces/INFTCollection.sol';
import {BaseStrategy} from '../../strategies/BaseStrategy.sol';

contract NFTCollection is
	Initializable,
	ERC721Upgradeable,
	ERC721URIStorageUpgradeable,
	ERC721BurnableUpgradeable,
	INFTCollection,
	BaseStrategy
{
	/// =========================
	/// === Storage Variables ===
	/// =========================

	uint256 public tokenCount = 0;
	uint256 public supply;
	uint256 public price;
	string public baseURI;
	bool public state;

	/// @custom:oz-upgrades-unsafe-allow constructor

	constructor() {
		_disableInitializers();
	}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(CollectionParams calldata _params) public initializer {
		__ERC721_init(_params.name, _params.symbol);
		__ERC721URIStorage_init();
		__ERC721Burnable_init();

		__BaseStrategy_init(_params.campaignId, _params.collectionId);

		supply = _params.supply;
		price = _params.price;
		state = _params.state;
		baseURI = _params.uri;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function safeMint(address _to) external onlyInhabit returns (uint256) {
		_isZeroAddress(_to);
		if (tokenCount >= supply) revert INVALID_SUPPLY();
		if (!state) revert COLLECTION_NOT_ACTIVE();

		_safeMint(_to, ++tokenCount);
		return tokenCount;
	}

	function burn(
		uint256 tokenId
	) public override(ERC721BurnableUpgradeable, INFTCollection) onlyInhabit {
		_invalidTokenId(tokenId);
		_burn(tokenId);
	}

	function setBaseURI(string calldata uri) external onlyInhabit {
		_isEmptyString(uri);
		baseURI = uri;

		emit BaseURIUpdated(uri);
	}

	function setPrice(uint256 _price) external onlyInhabit {
		if (_price == 0) revert INVALID_PRICE();
		price = _price;

		emit PriceUpdated(_price);
	}

	function setState(bool _state) external onlyInhabit {
		if (state == _state) revert SAME_STATE();
		state = _state;

		emit StateUpdated(_state);
	}

	function setSupply(uint256 _supply) external onlyInhabit {
		if (_supply < tokenCount) revert INVALID_SUPPLY();
		supply = _supply;

		emit SupplyUpdated(_supply);
	}

	/// =========================
	/// ===== View Functions ====
	/// =========================

	function _baseURI() internal view override returns (string memory) {
		return baseURI;
	}

	function _invalidTokenId(uint256 _tokenId) internal view {
		if (_tokenId == 0 || _tokenId > tokenCount) revert INVALID_CAMPAIGN_ID();
	}

	// the following functions are overrides required by BaseStrategy

	function recoverFunds(
		address token,
		address to
	) public override(BaseStrategy, INFTCollection) onlyInhabit {
		super.recoverFunds(token, to);
	}

	function getInhabit()
		public
		view
		override(BaseStrategy, INFTCollection)
		returns (address)
	{
		return super.getInhabit();
	}

	function getCampaignId()
		public
		view
		override(BaseStrategy, INFTCollection)
		returns (uint256)
	{
		return super.getCampaignId();
	}

	function getCollectionId()
		public
		view
		override(BaseStrategy, INFTCollection)
		returns (uint256)
	{
		return super.getCampaignId();
	}

	// The following functions are overrides required by Solidity.

	function tokenURI(
		uint256 tokenId
	)
		public
		view
		override(ERC721Upgradeable, ERC721URIStorageUpgradeable, INFTCollection)
		returns (string memory)
	{
		return super.tokenURI(tokenId);
	}

	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(ERC721Upgradeable, ERC721URIStorageUpgradeable, INFTCollection)
		returns (bool)
	{
		return super.supportsInterface(interfaceId);
	}
}
