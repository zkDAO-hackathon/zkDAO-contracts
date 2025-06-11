// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IQueueProposalState {
	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function queueProposal(
		uint256 daoId,
		uint256 proposalId,
		uint256 snapshot
	) external returns (uint256);
}
