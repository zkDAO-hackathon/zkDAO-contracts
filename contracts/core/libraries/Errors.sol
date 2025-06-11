// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Errors {
	/// ======================
	/// ====== Generic =======
	/// ======================

	error EMPTY_STRING();
	error EMPTY_ARRAY();
	error INSUFFICIENT_ALLOWANCE();
	error INSUFFICIENT_FUNDS();
	error INSUFFICIENT_SUPPLY();
	error INVALID_ADDRESS();
	error INVALID_AMOUNT();
	error INVALID_INDEX();
	error INVALID_PRICE();
	error INVALID_SUPPLY();
	error MISMATCHED_LENGTH();
	error NOT_APPROVED();
	error NOT_INITIALIZED();
	error NOT_NFT_OWNER();
	error SAME_STATE();
	error TOKEN_ALREADY_EXISTS();
	error TOKEN_NOT_FOUND();
	error UNAUTHORIZED();
	error ZERO_ADDRESS();

	/**
	 * @dev Validates that a string is not empty
	 * @param _string String to validate
	 * @notice Reverts if string has zero length
	 * @notice Used for referral code validation
	 */
	function _isEmptyString(string memory _string) internal pure {
		if (bytes(_string).length == 0) revert EMPTY_STRING();
	}

	/**
	 * @dev Validates that an address is not the zero address
	 * @param _address Address to validate
	 * @notice Reverts if address is zero (0x0)
	 * @notice Used throughout contract for input validation
	 */
	function _isZeroAddress(address _address) internal pure {
		if (_address == address(0)) revert ZERO_ADDRESS();
	}

	/// ======================
	/// === Base Strategy ====
	/// ======================

	error ALREADY_INITIALIZED_STRATEGY();
	error INVALID();

	/// ======================
	/// === NFTCollection ====
	/// ======================

	error COLLECTION_NOT_ACTIVE();
	error INVALID_TOKEN_ID();

	/// ======================
	/// ======= Groups =======
	/// ======================

	error AMBASSADOR_ALREADY_EXISTS();
	error AMBASSADOR_NOT_FOUND();
	error GROUP_ALREADY_EXISTS();
	error GROUP_NOT_FOUND();
	error GROUP_NOT_ACTIVE();
	error PERCENTAGE_ERROR();

	/// ======================
	/// ==== Collections =====
	/// ======================

	error CAMPAIGN_NOT_ACTIVE();
	error COLLECTION_NOT_FOUND();
	error INVALID_CAMPAIGN_ID();
	error INVALID_GOAL();
	error PURCHASE_NOT_FOUND();
	error REFUND_ALREADY_CLAIMED();
}
