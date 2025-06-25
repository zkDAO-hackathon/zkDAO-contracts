// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVotes} from '@openzeppelin/contracts/governance/utils/IVotes.sol';
import {TimelockControllerUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol';
import {IVerifier} from '../Verifier.sol';

interface IGovernor {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct GovernorInitParams {
		string name;
		IVotes token;
		TimelockControllerUpgradeable timelock;
		uint48 votingDelay;
		uint32 votingPeriod;
		uint256 proposalThreshold;
		uint256 votesQuorumFraction;
		uint256 id;
		string description;
		string logo;
	}

	struct PublicInputs {
		uint256 proposalId;
		uint256 weight;
		uint8 choice;
		bytes32 root;
		uint256 nullifier;
	}

	struct ZKProposalVote {
		uint256 againstVotes;
		uint256 forVotes;
		uint256 abstainVotes;
		// NOTE: the mapping is not necessary for the current implementation
		// mapping(uint256 => bool) hasNullified;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event ZKVoteCast(
		uint256 indexed proposalId,
		uint8 choice,
		uint256 weight,
		bytes32 nullifier
	);

	/// =========================
	/// ====== Initializer ======
	/// =========================

	/**
	 * @notice Initializes the Governor contract
	 * @param params Struct containing all initialization parameters
	 * @param _verifier ZK-proof verifier contract
	 */
	function initialize(
		GovernorInitParams calldata params,
		IVerifier _verifier
	) external;

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	/**
	 * @notice Check if a nullifier has been used for a proposal
	 * @param proposalId The proposal ID
	 * @param nullifier The nullifier to check
	 * @return True if nullifier has been used
	 */
	function getNullifierUsed(
		uint256 proposalId,
		uint256 nullifier
	) external view returns (bool);

	/**
	 * @notice Get the merkle root for a proposal
	 * @param proposalId The proposal ID
	 * @return The merkle root
	 */
	function getRoot(uint256 proposalId) external view returns (string memory);

	/**
	 * @notice Get ZK voting results for a proposal
	 * @param proposalId The proposal ID
	 * @return againstVotes Number of votes against
	 * @return forVotes Number of votes for
	 * @return abstainVotes Number of abstain votes
	 */
	function getZKVote(
		uint256 proposalId
	)
		external
		view
		returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes);

	/**
	 * @notice Check if a proposal is waiting for merkle root
	 * @param proposalId The proposal ID
	 * @return True if waiting for merkle root
	 */
	function isWaitingMerkle(uint256 proposalId) external view returns (bool);

	/**
	 * @notice Get the verifier contract address
	 * @return The verifier contract
	 */
	function verifier() external view returns (IVerifier);

	/**
	 * @notice Get the DAO ID
	 * @return The DAO identifier
	 */
	function id() external view returns (uint256);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	/**
	 * @notice Cast a ZK vote on a proposal
	 * @param _proposalId The proposal ID
	 * @param _proof The ZK proof
	 * @param _inputs The public inputs for verification
	 */
	function castZKVote(
		uint256 _proposalId,
		bytes calldata _proof,
		bytes32[] calldata _inputs
	) external;

	/**
	 * @notice Set the merkle root for a proposal (only callable by ZKDAO)
	 * @param _proposalId The proposal ID
	 * @param _cid The merkle root
	 */
	function setRoot(uint256 _proposalId, string memory _cid) external;

	/**
	 * @notice Create a new proposal
	 * @param targets Array of target addresses for proposal calls
	 * @param values Array of values (in wei) for proposal calls
	 * @param calldatas Array of call data for proposal calls
	 * @param description String description of the proposal
	 * @return proposalId The ID of the created proposal
	 */
	function propose(
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		string memory description
	) external returns (uint256 proposalId);
}
