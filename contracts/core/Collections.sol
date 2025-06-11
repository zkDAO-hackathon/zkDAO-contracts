// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INFTCollection} from './interfaces/INFTCollection.sol';
import {ICollections} from './interfaces/ICollections.sol';
import {Errors} from './libraries/Errors.sol';
import {Clone} from './libraries/Clone.sol';

import 'hardhat/console.sol';

contract Collections is ICollections, Errors {
	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(address => uint256) private nonces;
	mapping(uint256 => Campaign) private campaigns;
	mapping(uint256 => Purchase[]) private campaignPurchases;

	// Refund tracking: campaignId => collection => token => amount per NFT
	mapping(uint256 => mapping(address => mapping(address => uint256)))
		private refunds;

	// Track claimed refunds: campaignId => collection => tokenId => claimed
	mapping(uint256 => mapping(address => mapping(uint256 => bool)))
		private refundsClaimed;

	INFTCollection public nftCollection;
	uint256 public campaignCount;
	uint256 public collectionCount;

	/// =========================
	/// ====== Modifiers ========
	/// =========================

	modifier onlyCampaignCreator(uint256 _campaignId) {
		_invalidCampaignId(_campaignId);

		if (campaigns[_campaignId].creator != msg.sender) revert UNAUTHORIZED();
		_;
	}

	/// =========================
	/// === View Functions ======
	/// =========================

	function getCampaign(
		uint256 _campaignId
	) public view returns (Campaign memory) {
		return campaigns[_campaignId];
	}

	function getCampaignPurchases(
		uint256 _campaignId
	) public view returns (Purchase[] memory) {
		return campaignPurchases[_campaignId];
	}

	function getNonces(address _account) public view returns (uint256) {
		return nonces[_account];
	}

	function getRefunds(
		uint256 _campaignId,
		address _collection,
		address _token
	) public view returns (uint256) {
		return refunds[_campaignId][_collection][_token];
	}

	function isRefundClaimed(
		uint256 _campaignId,
		address _collection,
		uint256 _tokenId
	) public view returns (bool) {
		return refundsClaimed[_campaignId][_collection][_tokenId];
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	function _createCampaign(
		uint256 _goal,
		CollectionParams[] memory _collectionsParams
	) internal {
		if (_goal == 0) revert INVALID_GOAL();
		if (_collectionsParams.length == 0) revert EMPTY_ARRAY();

		Campaign storage campaign = campaigns[++campaignCount];
		campaign.state = true;
		campaign.creator = msg.sender;
		campaign.goal = _goal;
		campaign.fundsRaised = 0;

		for (uint256 i; i < _collectionsParams.length; ) {
			CollectionParams memory params = _collectionsParams[i];

			_isEmptyString(params.name);
			_isEmptyString(params.symbol);
			_isEmptyString(params.uri);
			if (params.supply == 0) revert INVALID_SUPPLY();
			if (params.price == 0) revert INVALID_PRICE();

			address newCollection = Clone.createClone(
				address(nftCollection),
				msg.sender,
				nonces[msg.sender]++
			);

			INFTCollection.CollectionParams memory initParams = INFTCollection
				.CollectionParams({
					campaignId: campaignCount,
					collectionId: ++collectionCount,
					name: params.name,
					symbol: params.symbol,
					uri: params.uri,
					supply: params.supply,
					price: params.price,
					state: params.state
				});

			INFTCollection(newCollection).initialize(initParams);

			campaign.collections.push(newCollection);

			emit CollectionCreated(
				newCollection,
				msg.sender,
				params.name,
				params.symbol,
				params.supply,
				params.price
			);

			unchecked {
				++i;
			}
		}

		emit CampaignCreated(campaignCount, msg.sender, _collectionsParams);
	}

	function _updateCampaignstatus(
		uint256 _campaignId,
		bool _status
	) internal onlyCampaignCreator(_campaignId) {
		Campaign storage campaign = campaigns[_campaignId];

		if (campaign.creator != msg.sender) revert UNAUTHORIZED();
		if (campaign.state == _status) revert SAME_STATE();

		campaign.state = _status;
		emit CampaignStatusUpdated(_campaignId, _status);
	}

	function _setRefund(
		uint256 _campaignId,
		address _collection,
		address _token,
		uint256 _amount
	) internal {
		refunds[_campaignId][_collection][_token] += _amount;
	}

	function _setRefundClaimed(
		uint256 _campaignId,
		address _collection,
		uint256 _tokenId
	) internal {
		refundsClaimed[_campaignId][_collection][_tokenId] = true;
	}

	function _setNFTCollection(address _nftCollection) internal {
		_isZeroAddress(_nftCollection);
		nftCollection = INFTCollection(_nftCollection);
		emit NftCollectionUpdated(_nftCollection);
	}

	/// @notice Collection functions

	function _safeMint(
		uint256 _campaignId,
		address _collection,
		address _to,
		address _paymentToken,
		uint256 _price,
		uint256 _referralFee
	) internal {
		INFTCollection nftCollectionFound = INFTCollection(_collection);

		if (nftCollectionFound.supply() <= nftCollectionFound.tokenCount())
			revert INVALID_SUPPLY();

		uint256 tokenId = nftCollectionFound.safeMint(_to);

		campaignPurchases[_campaignId].push(
			Purchase({
				collection: _collection,
				tokenId: tokenId,
				paymentToken: _paymentToken,
				price: _price,
				referralFee: _referralFee,
				campaignId: _campaignId,
				timestamp: block.timestamp,
				refunded: false
			})
		);

		campaigns[_campaignId].fundsRaised += _price;

		emit NFTPurchased(
			_campaignId,
			_collection,
			_paymentToken,
			_to,
			tokenId,
			_price,
			block.timestamp,
			false
		);
	}

	function _setCollectionBaseURI(
		uint256 _campaignId,
		address _collection,
		string calldata _baseURI
	) internal onlyCampaignCreator(_campaignId) {
		_isZeroAddress(_collection);

		bool found = false;
		for (uint256 i; i < campaigns[_campaignId].collections.length; ) {
			if (campaigns[_campaignId].collections[i] == _collection) {
				INFTCollection(_collection).setBaseURI(_baseURI);
				emit CollectionBaseURIUpdated(_campaignId, _collection, _baseURI);
				found = true;
				break;
			}

			unchecked {
				++i;
			}
		}

		if (!found) revert COLLECTION_NOT_FOUND();
	}

	function _setCollectionPrice(
		uint256 _campaignId,
		address _collection,
		uint256 _price
	) internal onlyCampaignCreator(_campaignId) {
		_isZeroAddress(_collection);
		if (_price == 0) revert INVALID_PRICE();

		bool found = false;
		for (uint256 i; i < campaigns[_campaignId].collections.length; ) {
			if (campaigns[_campaignId].collections[i] == _collection) {
				INFTCollection(_collection).setPrice(_price);
				emit CollectionPriceUpdated(_campaignId, _collection, _price);
				found = true;
				break;
			}

			unchecked {
				++i;
			}
		}

		if (!found) revert COLLECTION_NOT_FOUND();
	}

	function _setCollectionState(
		uint256 _campaignId,
		address _collection,
		bool _state
	) internal onlyCampaignCreator(_campaignId) {
		_isZeroAddress(_collection);

		bool found = false;
		for (uint256 i; i < campaigns[_campaignId].collections.length; ) {
			if (campaigns[_campaignId].collections[i] == _collection) {
				INFTCollection(_collection).setState(_state);
				emit CollectionStateUpdated(_campaignId, _collection, _state);
				found = true;
				break;
			}

			unchecked {
				++i;
			}
		}

		if (!found) revert COLLECTION_NOT_FOUND();
	}

	function _setCollectionSupply(
		uint256 _campaignId,
		address _collection,
		uint256 _supply
	) internal onlyCampaignCreator(_campaignId) {
		_isZeroAddress(_collection);
		if (_supply == 0) revert INVALID_SUPPLY();

		bool found = false;
		for (uint256 i; i < campaigns[_campaignId].collections.length; ) {
			if (campaigns[_campaignId].collections[i] == _collection) {
				INFTCollection(_collection).setSupply(_supply);
				emit CollectionSupplyUpdated(_campaignId, _collection, _supply);
				found = true;
				break;
			}

			unchecked {
				++i;
			}
		}

		if (!found) revert COLLECTION_NOT_FOUND();
	}

	function _recoverCollectionFunds(
		uint256 _campaignId,
		address _collectionAddress,
		address _token,
		address _to
	) internal {
		_invalidCampaignId(_campaignId);
		Campaign storage campaign = campaigns[_campaignId];

		if (msg.sender != campaign.creator) revert UNAUTHORIZED();

		bool found = false;
		for (uint256 i; i < campaign.collections.length; ) {
			if (_collectionAddress == campaign.collections[i]) {
				INFTCollection findedNftCollection = INFTCollection(
					campaign.collections[i]
				);

				findedNftCollection.recoverFunds(_token, _to);
				found = true;
				break;
			}

			unchecked {
				++i;
			}
		}

		if (!found) revert COLLECTION_NOT_FOUND();
	}

	/// =========================
	/// === Private Functions ===
	/// =========================

	function _findPurchaseByTokenId(
		uint256 _campaignId,
		address _collection,
		uint256 _tokenId
	) internal view returns (Purchase memory) {
		Purchase[] memory purchases = getCampaignPurchases(_campaignId);

		for (uint256 i = 0; i < purchases.length; ) {
			if (
				purchases[i].collection == _collection &&
				purchases[i].tokenId == _tokenId
			) {
				return purchases[i];
			}

			unchecked {
				++i;
			}
		}

		revert PURCHASE_NOT_FOUND();
	}

	function _invalidCampaignId(uint256 _campaignId) internal view {
		if (_campaignId == 0 || _campaignId > campaignCount)
			revert INVALID_CAMPAIGN_ID();
	}

	function _validateCollection(
		uint256 _campaignId,
		address _collection
	) internal view returns (INFTCollection) {
		_isZeroAddress(_collection);
		_invalidCampaignId(_campaignId);

		Campaign storage campaign = campaigns[_campaignId];

		for (uint256 i = 0; i < campaign.collections.length; ) {
			if (campaign.collections[i] == _collection) {
				return INFTCollection(_collection);
			}

			unchecked {
				++i;
			}
		}

		revert COLLECTION_NOT_FOUND();
	}
}
