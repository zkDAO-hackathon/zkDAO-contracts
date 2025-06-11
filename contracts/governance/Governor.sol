// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {GovernorUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol';
import {GovernorCountingSimpleUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol';
import {GovernorSettingsUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol';
import {GovernorTimelockControlUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol';
import {GovernorVotesUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol';
import {GovernorVotesQuorumFractionUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol';
import {IVotes} from '@openzeppelin/contracts/governance/utils/IVotes.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {TimelockControllerUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol';

import {IConsumer} from '../core/interfaces/IConsumer.sol';
import {IQueueProposalState} from '../core/interfaces/IQueueProposalState.sol';
import {IVerifier} from '../core/interfaces/IVerifier.sol';
import {Errors} from '../core/libraries/Errors.sol';

contract Governor is
	Initializable,
	GovernorUpgradeable,
	GovernorSettingsUpgradeable,
	GovernorCountingSimpleUpgradeable,
	GovernorVotesUpgradeable,
	GovernorVotesQuorumFractionUpgradeable,
	GovernorTimelockControlUpgradeable,
	Errors
{
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
	}

	struct GovernorExternalRefs {
		IConsumer consumer;
		IQueueProposalState queue;
		IVerifier verifier;
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

	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(uint256 => ZKProposalVote) private zkVotes;
	mapping(uint256 => bytes32) private roots;
	mapping(uint256 => mapping(uint256 => bool)) private nullifierUsed;

	IConsumer public consumer;
	IQueueProposalState public queueProposalState;
	IVerifier public verifier;

	uint256 public id;

	/// ======================
	/// ======= Events =======
	/// ======================

	event ZKVoteCast(
		uint256 indexed proposalId,
		uint8 choice,
		uint256 weight,
		uint256 nullifier
	);

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {
		_disableInitializers();
	}

	/// =========================
	/// ======= Modifiers =======
	/// =========================

	modifier onlyConsumer() {
		if (msg.sender != address(consumer)) revert UNAUTHORIZED();
		_;
	}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		GovernorInitParams calldata params,
		GovernorExternalRefs calldata refs
	) public initializer {
		__Governor_init(params.name);
		__GovernorSettings_init(
			params.votingDelay,
			params.votingPeriod,
			params.proposalThreshold
		);
		__GovernorCountingSimple_init();
		__GovernorVotes_init(params.token);
		__GovernorVotesQuorumFraction_init(params.votesQuorumFraction);
		__GovernorTimelockControl_init(params.timelock);

		_setContracts(refs.consumer, refs.queue, refs.verifier);

		id = params.id;
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getNullifierUsed(
		uint256 proposalId,
		uint256 nullifier
	) external view returns (bool) {
		return nullifierUsed[proposalId][nullifier];
	}

	function getRoot(uint256 proposalId) external view returns (bytes32) {
		return roots[proposalId];
	}

	function getZKVote(
		uint256 proposalId
	)
		external
		view
		returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)
	{
		ZKProposalVote storage p = zkVotes[proposalId];
		return (p.againstVotes, p.forVotes, p.abstainVotes);
	}

	function isWaitingMerkle(uint256 proposalId) public view returns (bool) {
		return
			super.state(proposalId) == ProposalState.Pending &&
			roots[proposalId] == bytes32(0);
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function castZKVote(
		uint256 _proposalId,
		bytes calldata _proof,
		PublicInputs calldata _inputs
	) external {
		if (_inputs.choice > 2) revert INVALID_VOTE_TYPE();
		if (_inputs.proposalId != _proposalId) revert INVALID_PROPOSAL_ID();
		if (bytes32(_inputs.root) != roots[_proposalId]) revert MISMATCH();
		if (nullifierUsed[_proposalId][_inputs.nullifier])
			revert INVALID_NULLIFIER();

		nullifierUsed[_proposalId][_inputs.nullifier] = true;

		bytes memory packed = abi.encodePacked(
			_inputs.proposalId,
			_inputs.weight,
			uint256(_inputs.choice),
			_inputs.root,
			_inputs.nullifier
		);

		if (!verifier.verify(_proof, packed)) revert ZK_PROOF_FAILED();

		_countVote(_proposalId, address(0), _inputs.choice, _inputs.weight, '');

		emit ZKVoteCast(
			_proposalId,
			_inputs.choice,
			_inputs.weight,
			_inputs.nullifier
		);
	}

	function setRoot(uint256 proposalId, bytes32 root) external onlyConsumer {
		roots[proposalId] = root;
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	function _setContracts(
		IConsumer _consumer,
		IQueueProposalState _queueProposalState,
		IVerifier _verifier
	) internal {
		consumer = _consumer;
		queueProposalState = _queueProposalState;
		verifier = _verifier;
	}

	// The following functions are overrides required by Solidity.

	function propose(
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		string memory description
	) public override returns (uint256) {
		address proposer = _msgSender();

		if (!_isValidDescriptionForProposer(proposer, description)) {
			revert GovernorRestrictedProposer(proposer);
		}

		uint256 votesThreshold = proposalThreshold();
		if (votesThreshold > 0) {
			uint256 proposerVotes = getVotes(proposer, clock() - 1);
			if (proposerVotes < votesThreshold) {
				revert GovernorInsufficientProposerVotes(
					proposer,
					proposerVotes,
					votesThreshold
				);
			}
		}

		uint256 proposalId = _propose(
			targets,
			values,
			calldatas,
			description,
			proposer
		);

		uint256 snapshot = proposalSnapshot(proposalId);

		queueProposalState.queueProposal(id, proposalId, snapshot);

		return proposalId;
	}

	function _countVote(
		uint256 proposalId,
		address account,
		uint8 support,
		uint256 weight,
		bytes memory params
	)
		internal
		virtual
		override(GovernorUpgradeable, GovernorCountingSimpleUpgradeable)
		returns (uint256)
	{
		if (account != address(0)) {
			return super._countVote(proposalId, account, support, weight, params);
		}

		ZKProposalVote storage p = zkVotes[proposalId];

		if (support == uint8(VoteType.Against)) {
			p.againstVotes += weight;
		} else if (support == uint8(VoteType.For)) {
			p.forVotes += weight;
		} else if (support == uint8(VoteType.Abstain)) {
			p.abstainVotes += weight;
		} else {
			revert('GovernorVotingSimple: invalid value for enum VoteType');
		}

		return weight;
	}

	function state(
		uint256 proposalId
	)
		public
		view
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (ProposalState)
	{
		ProposalState current = GovernorUpgradeable.state(proposalId);

		if (isWaitingMerkle(proposalId)) {
			return ProposalState.Pending;
		}

		return current;
	}

	function _execute(
		uint256 proposalId,
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		bytes32 descriptionHash
	) internal {
		_execute(proposalId, targets, values, calldatas, descriptionHash);
	}

	function _cancel(
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		bytes32 descriptionHash
	)
		internal
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (uint256)
	{
		return super._cancel(targets, values, calldatas, descriptionHash);
	}

	function _executor()
		internal
		view
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (address)
	{
		return super._executor();
	}

	function _queueOperations(
		uint256 proposalId,
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		bytes32 descriptionHash
	)
		internal
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (uint48)
	{
		return
			super._queueOperations(
				proposalId,
				targets,
				values,
				calldatas,
				descriptionHash
			);
	}

	function _executeOperations(
		uint256 proposalId,
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		bytes32 descriptionHash
	) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
		super._executeOperations(
			proposalId,
			targets,
			values,
			calldatas,
			descriptionHash
		);
	}

	function proposalNeedsQueuing(
		uint256 proposalId
	)
		public
		view
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (bool)
	{
		return super.proposalNeedsQueuing(proposalId);
	}

	function proposalThreshold()
		public
		view
		override(GovernorUpgradeable, GovernorSettingsUpgradeable)
		returns (uint256)
	{
		return super.proposalThreshold();
	}
}
