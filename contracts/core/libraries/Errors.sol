// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Errors {
	/// ======================
	/// ====== Generic =======
	/// ======================

	error MISMATCH();
	error UNAUTHORIZED();

	/// ======================
	/// ====== Governor ======
	/// ======================

	error INVALID_VOTE_TYPE();
	error INVALID_PROPOSAL_ID();
	error INVALID_NULLIFIER();
	error ZK_PROOF_FAILED();
}
