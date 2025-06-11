// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVerifier {
	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function verify(
		bytes calldata proof,
		bytes calldata pubInputs
	) external view returns (bool);
}
