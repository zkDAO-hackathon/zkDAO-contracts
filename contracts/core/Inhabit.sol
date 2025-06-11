// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from 'solady/src/tokens/ERC20.sol';
import {ERC721} from 'solady/src/tokens/ERC721.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import {ReentrancyGuardUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

import {INFTCollection} from '../core/interfaces/INFTCollection.sol';
import {IInhabit} from '../core/interfaces/IInhabit.sol';
import {ICollections} from '../core/interfaces/ICollections.sol';
import {Groups} from './Groups.sol';
import {Collections} from './Collections.sol';

import 'hardhat/console.sol';

contract Inhabit is
	Initializable,
	AccessControlUpgradeable,
	ReentrancyGuardUpgradeable,
	IInhabit,
	Groups,
	Collections
{
	/// =========================
	/// === Storage Variables ===
	/// =========================

	bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
	bytes32 public constant USER_ROLE = keccak256('USER_ROLE');

	address public treasury;

	/// @custom:oz-upgrades-unsafe-allow constructor

	constructor() {
		_disableInitializers();
	}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		address _defaultAdmin,
		address _treasury
	) public initializer {
		__AccessControl_init();
		__ReentrancyGuard_init();

		_grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
		_grantRole(ADMIN_ROLE, _defaultAdmin);
		_grantRole(USER_ROLE, _defaultAdmin);

		treasury = _treasury;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	/// @notice Main functions

	function buyNFT(
		uint256 _campaignId,
		address _collection,
		address _token,
		string calldata _referral
	) external nonReentrant {
		_isTokenSupported(_token);

		INFTCollection nftCollection = _validateCollection(
			_campaignId,
			_collection
		);

		Campaign memory campaign = getCampaign(_campaignId);
		if (!campaign.state) revert CAMPAIGN_NOT_ACTIVE();

		uint256 price = nftCollection.price();
		if (ERC20(_token).balanceOf(msg.sender) < price)
			revert INSUFFICIENT_FUNDS();

		if (ERC20(_token).allowance(msg.sender, address(this)) < price)
			revert INSUFFICIENT_ALLOWANCE();

		uint256 referralFee = 0;

		_transferAmountFrom(
			_token,
			TransferData({from: msg.sender, to: address(this), amount: price})
		);

		if (bytes(_referral).length > 0) {
			referralFee = _distribution(_referral, _token, price);
		}

		_transferAmount(_token, treasury, price - referralFee);

		_safeMint(_campaignId, _collection, msg.sender, _token, price, referralFee);
	}

	/**
	 * @notice Admin establishes refund amount per NFT for a specific collection
	 * @param _campaignId Campaign ID
	 * @param _collection Collection address
	 * @param _token Token used for refund
	 * @param _amountPerNFT Amount to refund per NFT
	 */
	function establishRefund(
		uint256 _campaignId,
		address _collection,
		address _token,
		uint256 _amountPerNFT
	) external onlyRole(ADMIN_ROLE) nonReentrant {
		_isTokenSupported(_token);
		_validateCollection(_campaignId, _collection);

		INFTCollection nftCollection = INFTCollection(_collection);

		uint256 totalNFTsSold = nftCollection.tokenCount();
		if (totalNFTsSold == 0) revert INVALID_AMOUNT();

		uint256 totalRefundAmount = _amountPerNFT * totalNFTsSold;

		if (ERC20(_token).balanceOf(msg.sender) < totalRefundAmount)
			revert INSUFFICIENT_FUNDS();

		if (ERC20(_token).allowance(msg.sender, address(this)) < totalRefundAmount)
			revert INSUFFICIENT_ALLOWANCE();

		_setRefund(_campaignId, _collection, _token, _amountPerNFT);

		ERC20(_token).transferFrom(msg.sender, address(this), totalRefundAmount);

		emit RefundEstablished(
			_campaignId,
			_collection,
			_token,
			_amountPerNFT,
			totalRefundAmount,
			totalNFTsSold
		);
	}

	/**
	 * @notice Users can claim refund by burning their NFT
	 * @param _campaignId Campaign ID
	 * @param _collection Collection address
	 * @param _tokenId NFT token ID to burn for refund
	 */
	function claimRefund(
		uint256 _campaignId,
		address _collection,
		uint256 _tokenId
	) external nonReentrant {
		_validateCollection(_campaignId, _collection);

		if (isRefundClaimed(_campaignId, _collection, _tokenId))
			revert REFUND_ALREADY_CLAIMED();

		Purchase memory purchase = _findPurchaseByTokenId(
			_campaignId,
			_collection,
			_tokenId
		);

		INFTCollection nftCollection = _validateCollection(
			_campaignId,
			_collection
		);

		if (nftCollection.ownerOf(_tokenId) != msg.sender) revert NOT_NFT_OWNER();

		uint256 refundAmount = getRefunds(
			_campaignId,
			_collection,
			purchase.paymentToken
		);

		if (ERC20(purchase.paymentToken).balanceOf(address(this)) < refundAmount)
			revert INSUFFICIENT_FUNDS();

		_setRefundClaimed(_campaignId, _collection, _tokenId);

		nftCollection.burn(_tokenId);

		ERC20(purchase.paymentToken).transfer(msg.sender, refundAmount);

		emit RefundClaimed(
			_campaignId,
			_collection,
			_tokenId,
			msg.sender,
			purchase.paymentToken,
			refundAmount
		);
	}

	function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
		if (address(this) == _treasury) revert INVALID_ADDRESS();
		if (treasury == _treasury) revert SAME_STATE();
		_isZeroAddress(_treasury);

		treasury = _treasury;
		emit TreasuryUpdated(treasury, _treasury);
	}

	/// @notice Group functions

	function createGroup(
		string calldata _referral,
		bool _state,
		Ambassador[] calldata _ambassadors
	) external onlyRole(ADMIN_ROLE) {
		_createGroup(_referral, _state, _ambassadors);
	}

	function updateGroupStatus(
		string calldata _referral,
		bool _status
	) external onlyRole(ADMIN_ROLE) {
		_updateGroupStatus(_referral, _status);
	}

	function addAmbassadors(
		string calldata _referral,
		Ambassador[] calldata _ambassadors
	) external onlyRole(ADMIN_ROLE) {
		_addAmbassadors(_referral, _ambassadors);
	}

	function updateAmbassadors(
		string calldata _referral,
		Ambassador[] calldata _ambassadors
	) external onlyRole(ADMIN_ROLE) {
		_updateAmbassadors(_referral, _ambassadors);
	}

	function removeAmbassadors(
		string calldata _referral,
		address[] calldata _accounts
	) external onlyRole(ADMIN_ROLE) {
		_removeAmbassadors(_referral, _accounts);
	}

	function addToTokens(
		address[] calldata _tokens
	) external onlyRole(ADMIN_ROLE) {
		_addToTokens(_tokens);
	}

	function removeFromTokens(address _token) external onlyRole(ADMIN_ROLE) {
		_removeFromTokens(_token);
	}

	function recoverFunds(
		address _token,
		address _to
	) external onlyRole(ADMIN_ROLE) {
		_recoverFunds(_token, _to);
	}

	/// @notice Collection functions

	function createCampaign(
		uint256 _goal,
		CollectionParams[] memory _collectionsParams
	) external onlyRole(USER_ROLE) {
		_createCampaign(_goal, _collectionsParams);
	}

	function updateCampaignStatus(
		uint256 _campaignId,
		bool _status
	) external onlyRole(USER_ROLE) {
		_updateCampaignstatus(_campaignId, _status);
	}

	function setCollectionBaseURI(
		uint256 _campaignId,
		address _collection,
		string calldata _baseURI
	) external onlyRole(USER_ROLE) {
		_setCollectionBaseURI(_campaignId, _collection, _baseURI);
	}

	function setCollectionPrice(
		uint256 _campaignId,
		address _collection,
		uint256 _price
	) external onlyRole(USER_ROLE) {
		_setCollectionPrice(_campaignId, _collection, _price);
	}

	function setCollectionState(
		uint256 _campaignId,
		address _collection,
		bool _state
	) external onlyRole(USER_ROLE) {
		_setCollectionState(_campaignId, _collection, _state);
	}

	function setCollectionSupply(
		uint256 _campaignId,
		address _collection,
		uint256 _supply
	) external onlyRole(USER_ROLE) {
		_setCollectionSupply(_campaignId, _collection, _supply);
	}

	function setNFTCollection(
		address _nftCollection
	) external onlyRole(USER_ROLE) {
		_setNFTCollection(_nftCollection);
	}

	function recoverCollectionFunds(
		uint256 _campaignId,
		address _collectionAddress,
		address _token,
		address _to
	) external onlyRole(USER_ROLE) {
		_recoverCollectionFunds(_campaignId, _collectionAddress, _token, _to);
	}
}
