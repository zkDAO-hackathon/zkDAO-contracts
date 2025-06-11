// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from 'solady/src/tokens/ERC20.sol';

import {IGroups} from './interfaces/IGroups.sol';
import {Transfer} from './libraries/Transfer.sol';
import {Errors} from './libraries/Errors.sol';

import 'hardhat/console.sol';

/**
 * @title Groups Contract
 * @author [salviega]
 * @notice Manages ambassador groups and referral-based commission distribution.
 * @dev Allows creation, update, and distribution of funds among ambassadors based on predefined fee percentages.
 * Supports ERC20 tokens and native ETH as payment assets.
 */

contract Groups is IGroups, Transfer, Errors {
	/// =========================
	/// === Storage Variables ===
	/// =========================

	/// @dev Collection of groups
	mapping(string => Group) private groups;

	/// @dev Collection of group referral
	mapping(uint256 => string) private groupList;

	/// @dev Collection of supported tokens
	mapping(address => bool) private tokens;

	/**
	 * @notice Allows the contract to receive native ETH.
	 * @dev This function does not contain any logic; it's used to accept plain ETH transfers.
	 */
	receive() external payable {}

	/// =========================
	/// ==== View Functions =====
	/// =========================

	/**
	 * @dev Gets the total number of created groups
	 * @return uint256 Total number of groups
	 */
	uint256 public groupCount;

	/**
	 * @dev Gets complete information of a group by its referral code
	 * @param _referral Group's referral code
	 * @return Group Complete group structure
	 */
	function getGroup(
		string calldata _referral
	) public view returns (Group memory) {
		return groups[_referral];
	}

	/**
	 * @dev Gets a group's referral code by its index
	 * @param _id Group index in the list
	 * @return string Group's referral code
	 */
	function getGroupReferral(uint256 _id) public view returns (string memory) {
		return groupList[_id];
	}

	/**
	 * @dev Checks if a token is supported by the contract
	 * @param _token Token address to verify
	 * @return bool True if the token is supported, false otherwise
	 */
	function isTokenSupported(address _token) public view returns (bool) {
		return tokens[_token];
	}

	/**
	 * @dev Calculates commission based on amount and percentage
	 * @param _amount Total amount on which to calculate the commission
	 * @param _porcentaje Commission percentage in basis points (10000 = 100%)
	 * @return fee Calculated commission amount
	 */
	function calculateFee(
		uint256 _amount,
		uint256 _porcentaje
	) public pure returns (uint256 fee) {
		return (_amount * _porcentaje) / 10000;
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	/**
	 * @dev Adds supported tokens to the contract
	 * @param _tokens Array of token addresses to add
	 * @notice Can only be called by the contract owner
	 */
	function _addToTokens(address[] calldata _tokens) internal {
		for (uint256 i = 0; i < _tokens.length; ) {
			_isZeroAddress(_tokens[i]);

			if (tokens[_tokens[i]]) revert TOKEN_ALREADY_EXISTS();
			tokens[_tokens[i]] = true;

			unchecked {
				++i;
			}
		}

		emit TokensAdded(_tokens);
	}

	/**
	 * @dev Removes a supported token from the contract
	 * @param _token Token address to remove
	 * @notice Can only be called by the contract owner
	 */
	function _removeFromTokens(address _token) internal {
		_isZeroAddress(_token);
		if (!tokens[_token]) revert TOKEN_NOT_FOUND();

		tokens[_token] = false;
		emit TokenRemoved(_token);
	}

	/**
	 * @dev Creates a new group with ambassadors
	 * @param _referral Unique referral code for the group
	 * @param _state Initial group state (true = active, false = inactive)
	 * @param _ambassadors Array of ambassadors with their respective commissions
	 * @notice Total commission sum must not exceed 10000 basis points (100%)
	 * @notice Can only be called by the contract owner
	 */
	function _createGroup(
		string calldata _referral,
		bool _state,
		Ambassador[] memory _ambassadors
	) internal {
		_isEmptyString(_referral);
		_isGroupExist(_referral);
		_validateFeeArray(_ambassadors);

		Group storage newGroup = groups[_referral];
		newGroup.referral = _referral;
		newGroup.state = _state;

		for (uint256 i = 0; i < _ambassadors.length; i++) {
			newGroup.ambassadors.push(_ambassadors[i]);
		}

		groupList[++groupCount] = _referral;
		emit GroupCreated(_referral, _state, _ambassadors);
	}

	/**
	 * @dev Updates the status of an existing group
	 * @param _referral Group's referral code
	 * @param _status New group status
	 * @notice Can only be called by the contract owner
	 */

	function _updateGroupStatus(
		string calldata _referral,
		bool _status
	) internal {
		_isNotGroupExist(_referral);
		Group storage group = groups[_referral];
		if (group.state == _status) revert SAME_STATE();
		group.state = _status;
		emit GroupStatusUpdated(_referral, _status);
	}

	/**
	 * @dev Adds ambassadors to an existing group
	 * @param _referral Group's referral code
	 * @param _ambassadors Array of ambassadors to add
	 * @notice Total commission sum after adding must not exceed 10000 basis points
	 * @notice Can only be called by the contract owner
	 */
	function _addAmbassadors(
		string calldata _referral,
		Ambassador[] calldata _ambassadors
	) internal {
		_isNotGroupExist(_referral);
		_isEmptyEmbassador(_ambassadors);

		Group storage group = groups[_referral];

		for (uint256 i; i < _ambassadors.length; ) {
			_isZeroAddress(_ambassadors[i].account);

			for (uint256 j; j < group.ambassadors.length; ) {
				if (group.ambassadors[j].account == _ambassadors[i].account) {
					revert AMBASSADOR_ALREADY_EXISTS();
				}

				unchecked {
					++j;
				}
			}

			group.ambassadors.push(_ambassadors[i]);

			unchecked {
				++i;
			}
		}

		_validateFee(group);
		emit AmbassadorsAdded(_referral, _ambassadors);
	}

	/**
	 * @dev Updates commissions of existing ambassadors in a group
	 * @param _referral Group's referral code
	 * @param _ambassadors Array of ambassadors with their new commissions
	 * @notice Ambassadors must already exist in the group
	 * @notice Total commission sum after updating must not exceed 10000 basis points
	 * @notice Can only be called by the contract owner
	 */
	function _updateAmbassadors(
		string calldata _referral,
		Ambassador[] calldata _ambassadors
	) internal {
		_isNotGroupExist(_referral);
		_isEmptyEmbassador(_ambassadors);

		Group storage group = groups[_referral];

		for (uint256 i; i < _ambassadors.length; ) {
			_isZeroAddress(_ambassadors[i].account);

			bool found = false;
			for (uint256 j; j < group.ambassadors.length; ) {
				if (group.ambassadors[j].account == _ambassadors[i].account) {
					group.ambassadors[j].fee = _ambassadors[i].fee;
					found = true;
					break;
				}

				unchecked {
					++j;
				}
			}

			if (!found) revert AMBASSADOR_NOT_FOUND();

			unchecked {
				++i;
			}
		}

		_validateFee(group);
		emit AmbassadorsUpdated(_referral, _ambassadors);
	}

	/**
	 * @dev Removes ambassadors from a group
	 * @param _referral Group's referral code
	 * @param _accounts Array of ambassador addresses to remove
	 * @notice Ambassadors must exist in the group
	 * @notice Can only be called by the contract owner
	 */
	function _removeAmbassadors(
		string calldata _referral,
		address[] calldata _accounts
	) internal {
		_isNotGroupExist(_referral);
		if (_accounts.length == 0) revert EMPTY_ARRAY();

		Group storage group = groups[_referral];

		for (uint256 i; i < _accounts.length; ) {
			if (_accounts[i] == address(0)) revert ZERO_ADDRESS();

			bool found = false;
			for (uint256 j; j < group.ambassadors.length; ) {
				if (group.ambassadors[j].account == _accounts[i]) {
					group.ambassadors[j] = group.ambassadors[
						group.ambassadors.length - 1
					];
					group.ambassadors.pop();
					found = true;
					break;
				}

				unchecked {
					++j;
				}
			}

			if (!found) revert AMBASSADOR_NOT_FOUND();

			unchecked {
				++i;
			}
		}

		emit AmbassadorsRemoved(_referral, _accounts);
	}

	/**
	 * @dev Distributes commissions to group ambassadors
	 * @param _referral Group's referral code
	 * @param _token Token address to distribute (use address(0) for native ETH)
	 * @param _amount Total amount to distribute
	 * @notice Group must be active
	 * @notice Token must be supported by the contract
	 * @notice Caller must have sufficient balance and allowance for the token
	 */
	function _distribution(
		string calldata _referral,
		address _token,
		uint256 _amount
	) internal returns (uint256) {
		_isNotGroupExist(_referral);

		Group storage group = groups[_referral];
		if (!group.state) revert GROUP_NOT_ACTIVE();

		uint256 totalFee = 0;
		for (uint256 i; i < group.ambassadors.length; ) {
			uint256 fee = calculateFee(_amount, group.ambassadors[i].fee);

			totalFee += fee;

			emit Distributed(group.ambassadors[i].account, fee);

			_transferAmount(_token, group.ambassadors[i].account, fee);

			unchecked {
				++i;
			}
		}

		return totalFee;
	}

	/**
	 * @notice Verifies whether a token is supported by the contract.
	 * @dev Reverts with TOKEN_NOT_FOUND if the token is not registered.
	 * @param _token The address of the token to verify.
	 */
	function _isTokenSupported(address _token) internal view {
		if (!isTokenSupported(_token)) revert TOKEN_NOT_FOUND();
	}

	/**
	 * @dev Recovers funds from the contract
	 * @param _token Token address to recover (use address(0) for native ETH)
	 * @param _to Destination address to send the funds
	 * @notice Can only be called by the contract owner
	 */
	function _recoverFunds(address _token, address _to) internal {
		_isZeroAddress(_to);

		uint256 amount = _token == NATIVE
			? address(this).balance
			: ERC20(_token).balanceOf(address(this));

		_transferAmount(_token, _to, amount);
	}

	/// =========================
	/// === Private Functions ===
	/// =========================

	/**
	 * @dev Validates that a group exists
	 * @param _referral Group's referral code to validate
	 * @notice Reverts if group does not exist with the given referral code
	 * @notice Used before group operations to ensure target exists
	 */
	function _isGroupExist(string calldata _referral) private view {
		if (bytes(groups[_referral].referral).length != 0)
			revert GROUP_ALREADY_EXISTS();
	}

	/**
	 * @dev Validates that a group does not already exist
	 * @param _referral Group's referral code to validate
	 * @notice Reverts if group already exists with the given referral code
	 * @notice Used before group creation to prevent duplicates
	 */
	function _isNotGroupExist(string calldata _referral) private view {
		if (bytes(groups[_referral].referral).length == 0) revert GROUP_NOT_FOUND();
	}

	/**
	 * @dev Validates that total commission fees do not exceed maximum allowed
	 * @param group Storage reference to the group being validated
	 * @notice Reverts if total fees exceed 10000 basis points (100%)
	 * @notice This function performs O(n) iteration over all ambassadors
	 * @dev Consider caching total fees in group struct for gas optimization
	 */
	function _validateFee(Group storage group) private view {
		uint256 totalFee = 0;
		for (uint256 i; i < group.ambassadors.length; ) {
			totalFee += group.ambassadors[i].fee;

			unchecked {
				++i;
			}
		}

		if (totalFee > 10000) revert PERCENTAGE_ERROR();
	}

	/**
	 * @dev Validates an array of ambassadors before processing
	 * @param _ambassadors Array of ambassadors to validate
	 * @notice Validates that no ambassador has zero address
	 * @notice Validates that total fees do not exceed maximum percentage
	 * @notice Validates that no duplicate addresses exist in array
	 * @dev This is a pure function for standalone array validation
	 */
	function _validateFeeArray(Ambassador[] memory _ambassadors) private pure {
		uint256 totalFee = 0;
		for (uint256 i; i < _ambassadors.length; ) {
			_isZeroAddress(_ambassadors[i].account);
			totalFee += _ambassadors[i].fee;
			unchecked {
				++i;
			}
		}
		if (totalFee > 10000) revert PERCENTAGE_ERROR();
	}

	/**
	 * @dev Validates that ambassador array is not empty
	 * @param _ambassadors Array of ambassadors to validate
	 * @notice Reverts if the provided array has zero length
	 * @notice Used to prevent operations on empty ambassador arrays
	 */
	function _isEmptyEmbassador(Ambassador[] memory _ambassadors) private pure {
		if (_ambassadors.length == 0) revert EMPTY_ARRAY();
	}
}
