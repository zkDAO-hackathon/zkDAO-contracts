// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGovernorToken} from './IGovernorToken.sol';
import {IQueueProposalState} from './IQueueProposalState.sol';
import {ITimeLock} from './ITimeLock.sol';
import {IVerifier} from './IVerifier.sol';

interface IGovernor {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct PublicInputs {
		uint256 proposalId;
		uint256 weight;
		uint8 choice;
		bytes32 root;
		uint256 nullifier;
	}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	/// @notice Initializes the Governor contract.
	/// @param _name Name of the Governor instance (used for EIP-712 signing).
	/// @param _token Token used for voting.
	/// @param _timelock Timelock contract used for executing proposals.
	/// @param _verifier ZK-proof verifier contract.
	/// @param _votingDelay Delay before voting starts.
	/// @param _votingPeriod Duration of the voting period.
	/// @param _proposalThreshold Minimum number of votes required to create a proposal.
	/// @param _votesQuorumFraction Fraction of total votes required for quorum.
	/// @param _id DAO ID.
	function initialize(
		string memory _name,
		IGovernorToken _token,
		ITimeLock _timelock,
		IVerifier _verifier,
		IQueueProposalState _queueProposalState,
		uint48 _votingDelay,
		uint32 _votingPeriod,
		uint256 _proposalThreshold,
		uint256 _votesQuorumFraction,
		uint256 _id
	) external;

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getNullifierUsed(
		uint256 proposalId,
		uint256 nullifier
	) external view returns (bool);

	function getRoot(uint256 proposalId) external view returns (bytes32);

	function getZKVote(
		uint256 proposalId
	)
		external
		view
		returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes);

	function isWaitingMerkle(uint256 proposalId) external view returns (bool);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function castZKVote(
		uint256 proposalId,
		bytes calldata proof,
		PublicInputs calldata inputs
	) external;

	function setRoot(uint256 proposalId, bytes32 root) external;
}
