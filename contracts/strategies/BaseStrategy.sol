// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from 'solady/src/tokens/ERC20.sol';

import {IInhabit} from '../core/interfaces/IInhabit.sol';
import {Native} from '../core/libraries/Native.sol';
import {Transfer} from '../core/libraries/Transfer.sol';
import {Errors} from '../core/libraries/Errors.sol';

abstract contract BaseStrategy is Native, Transfer, Errors {
	/// =========================
	/// === Storage Variables ===
	/// =========================

	IInhabit private inhabit;
	uint256 private campaignId;
	uint256 private collectionId;

	/// =========================
	/// ====== Modifiers ========
	/// =========================

	modifier onlyInhabit() {
		_checkOnlyInhabit();
		_;
	}

	modifier onlyInitialized() {
		_checkOnlyInitialized();
		_;
	}

	receive() external payable {}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function __BaseStrategy_init(
		uint256 _campaignId,
		uint256 _collectionId
	) internal virtual {
		// check if collection ID is not initialized already, if it is, revert
		if (campaignId != 0) revert ALREADY_INITIALIZED_STRATEGY();
		if (collectionId != 0) revert ALREADY_INITIALIZED_STRATEGY();

		// check if collection ID is valid and not zero (0), if it is, revert
		if (_campaignId == 0) revert INVALID();
		if (_collectionId == 0) revert INVALID();

		inhabit = IInhabit(msg.sender);
		campaignId = _campaignId;
		collectionId = _collectionId;
	}

	/// =========================
	/// === View Functions ======
	/// =========================

	function getInhabit() public view virtual returns (address) {
		return address(inhabit);
	}

	function getCampaignId() public view virtual returns (uint256) {
		return campaignId;
	}

	function getCollectionId() public view virtual returns (uint256) {
		return collectionId;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function recoverFunds(
		address _token,
		address _to
	) public virtual onlyInhabit {
		_isZeroAddress(_to);

		uint256 amount = _token == NATIVE
			? address(this).balance
			: ERC20(_token).balanceOf(address(this));

		_transferAmount(_token, _to, amount);
	}

	/// =========================
	/// === Private Functions ===
	/// =========================

	function _checkOnlyInitialized() private view {
		if (collectionId == 0) revert NOT_INITIALIZED();
	}

	function _checkOnlyInhabit() private view {
		if (msg.sender != address(inhabit)) revert UNAUTHORIZED();
	}

	/// =========================
	/// ======== Hooks ==========
	/// =========================
}
