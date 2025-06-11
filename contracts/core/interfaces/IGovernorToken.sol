// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGovernorToken {
	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		string memory _name,
		string memory _symbol,
		address _owner
	) external;

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function mint(address to, uint256 amount) external;

	function mintBatch(address[] memory to, uint256[] memory amounts) external;

	function transferOwnership(address newOwner) external;
}
