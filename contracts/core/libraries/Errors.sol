// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Errors {
	/// ======================
	/// ====== Generic =======
	/// ======================

	error INSUFFICIENT_ALLOWANCE();
	error INSUFFICIENT_FUNDS();
	error MISMATCH();
	error UNAUTHORIZED();

	/// ======================
	/// ======= ZK DAO =======
	/// ======================

	error DAO_NOT_FOUND(uint256 daoId);

	/// ======================
	/// ====== Governor ======
	/// ======================

	error INVALID_VOTE_TYPE();
	error INVALID_PROPOSAL_ID();
	error INVALID_NULLIFIER();
	error ZK_PROOF_FAILED();

	error InvalidArrayLength();
	error UnauthorizedCaller();
	error DAONotFound(uint256 daoId);
	error InvalidParameters();
}
