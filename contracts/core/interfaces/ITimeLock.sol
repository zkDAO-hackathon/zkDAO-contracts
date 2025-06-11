// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITimeLock {
	/// =========================
	/// ====== Role Constants ===
	/// =========================

	function PROPOSER_ROLE() external view returns (bytes32);

	function EXECUTOR_ROLE() external view returns (bytes32);

	function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

	/// =========================
	/// ====== Initializer ======
	/// =========================

	/// @notice Initializes the TimelockController
	/// @param _minDelay How long we have to wait to execute a proposal after it is queued
	/// @param _proposers Addresses allowed to propose
	/// @param _executors Addresses allowed to execute
	/// @param _admin Address allowed to manage roles
	function initialize(
		uint256 _minDelay,
		address[] memory _proposers,
		address[] memory _executors,
		address _admin
	) external;

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function grantRole(bytes32 role, address account) external;

	function renounceRole(bytes32 role, address account) external;
}
