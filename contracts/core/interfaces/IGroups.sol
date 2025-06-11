// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IGroups Interface
 * @dev Interface for the Groups contract that manages ambassador groups and commission distribution
 * @notice This interface defines all public and external functions of the Groups contract
 */
interface IGroups {
	/// =========================
	/// ======== Structs ========
	/// =========================

	/**
	 * @dev Structure representing an ambassador group
	 * @param referral Unique referral code for the group
	 * @param state Group state (active/inactive)
	 * @param ambassadors Array of ambassadors associated with the group
	 */
	struct Group {
		string referral;
		bool state;
		Ambassador[] ambassadors;
	}

	/**
	 * @dev Structure representing an ambassador
	 * @param account Ambassador's address
	 * @param fee Ambassador's commission in basis points
	 */
	struct Ambassador {
		address account;
		uint256 fee;
	}

	/// =========================
	/// ======== Events =========
	/// =========================

	/**
	 * @dev Event emitted when supported tokens are added
	 * @param tokens Array of added token addresses
	 */
	event TokensAdded(address[] tokens);

	/**
	 * @dev Event emitted when a supported token is removed
	 * @param token Address of the removed token
	 */
	event TokenRemoved(address token);

	/**
	 * @dev Event emitted when a new group is created
	 * @param referral Referral code of the created group
	 * @param state Initial state of the group
	 * @param ambassadors Array of group ambassadors
	 */
	event GroupCreated(
		string indexed referral,
		bool state,
		Ambassador[] ambassadors
	);

	/**
	 * @dev Event emitted when a group's status is updated
	 * @param referral Group's referral code
	 * @param status New group status
	 */
	event GroupStatusUpdated(string indexed referral, bool status);

	/**
	 * @dev Event emitted when ambassadors are added to a group
	 * @param referral Group's referral code
	 * @param ambassadors Array of added ambassadors
	 */
	event AmbassadorsAdded(string indexed referral, Ambassador[] ambassadors);

	/**
	 * @dev Event emitted when ambassadors in a group are updated
	 * @param referral Group's referral code
	 * @param ambassadors Array of updated ambassadors
	 */
	event AmbassadorsUpdated(string indexed referral, Ambassador[] ambassadors);

	/**
	 * @dev Event emitted when ambassadors are removed from a group
	 * @param referral Group's referral code
	 * @param accounts Array of removed ambassador addresses
	 */
	event AmbassadorsRemoved(string indexed referral, address[] accounts);

	/**
	 * @dev Event emitted when a commission is distributed to an ambassador
	 * @param embassador Address of the ambassador receiving the commission
	 * @param amount Distributed amount
	 */
	event Distributed(address indexed embassador, uint256 amount);

	/// =========================
	/// ===== View Functions ====
	/// =========================

	/**
	 * @dev Gets complete information of a group by its referral code
	 * @param _referral Group's referral code
	 * @return Group Complete group structure
	 */
	function getGroup(
		string calldata _referral
	) external view returns (Group memory);

	/**
	 * @dev Gets a group's referral code by its index
	 * @param _id Group index in the list
	 * @return string Group's referral code
	 */
	function getGroupReferral(uint256 _id) external view returns (string memory);

	/**
	 * @dev Checks if a token is supported by the contract
	 * @param _token Token address to verify
	 * @return bool True if the token is supported, false otherwise
	 */
	function isTokenSupported(address _token) external view returns (bool);

	/**
	 * @dev Calculates commission based on amount and percentage
	 * @param _amount Total amount on which to calculate the commission
	 * @param _porcentaje Commission percentage in basis points (10000 = 100%)
	 * @return fee Calculated commission amount
	 */
	function calculateFee(
		uint256 _amount,
		uint256 _porcentaje
	) external pure returns (uint256 fee);

	/**
	 * @dev Gets the total number of created groups
	 * @return uint256 Total number of groups
	 */
	function groupCount() external view returns (uint256);
}
