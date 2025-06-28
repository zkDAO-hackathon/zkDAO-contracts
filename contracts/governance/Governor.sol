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

import {IGovernorToken} from '../core/interfaces/IGovernorToken.sol';
import {IVerifier} from '../core/Verifier.sol';
import {IGovernor} from '../core/interfaces/IGovernor.sol';
import {IZKDAO} from '../core/interfaces/IZKDAO.sol';
import {Errors} from '../core/libraries/Errors.sol';

contract Governor is
	Initializable,
	GovernorUpgradeable,
	GovernorSettingsUpgradeable,
	GovernorCountingSimpleUpgradeable,
	GovernorVotesUpgradeable,
	GovernorVotesQuorumFractionUpgradeable,
	GovernorTimelockControlUpgradeable,
	IGovernor,
	Errors
{
	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(uint256 => uint256) private proposalsIds;
	mapping(uint256 => string) private cids;
	mapping(uint256 => ZKProposalVote) private zkVotes;
	mapping(uint256 => mapping(uint256 => bool)) private nullifierUsed;

	IVerifier public verifier;
	IZKDAO public zkDao;

	uint256 private proposalCounter;
	uint256 public id;
	string public description;
	string public logo;

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {
		_disableInitializers();
	}

	/// =========================
	/// ======= Modifiers =======
	/// =========================

	modifier onlyZKDAO() {
		if (msg.sender != address(zkDao)) revert UNAUTHORIZED();
		_;
	}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		GovernorInitParams calldata params,
		IVerifier _verifier
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

		id = params.id;
		verifier = _verifier;
		zkDao = IZKDAO(payable(msg.sender));
		description = params.description;
		logo = params.logo;
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getProposalCounter() external view returns (uint256) {
		return proposalCounter;
	}

	function getProposalId(uint256 _proposalId) external view returns (uint256) {
		return proposalsIds[_proposalId];
	}

	function getNullifierUsed(
		uint256 proposalId,
		uint256 nullifier
	) external view override returns (bool) {
		return nullifierUsed[proposalId][nullifier];
	}

	function getRoot(
		uint256 proposalId
	) external view override returns (string memory) {
		return cids[proposalId];
	}

	function getZKVote(
		uint256 proposalId
	)
		external
		view
		override
		returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)
	{
		ZKProposalVote storage p = zkVotes[proposalId];
		return (p.againstVotes, p.forVotes, p.abstainVotes);
	}

	function isWaitingMerkle(
		uint256 proposalId
	) public view override returns (bool) {
		return
			super.state(proposalId) == ProposalState.Pending &&
			bytes(cids[proposalId]).length == 0;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function castZKVote(
		uint256 _proposalId,
		bytes calldata _proof,
		bytes32[] calldata _inputs
	) external {
		if (state(_proposalId) != ProposalState.Active) revert VOTING_CLOSED();

		if (!verifier.verify(_proof, _inputs)) revert ZK_PROOF_FAILED();

		uint256 nullifier = uint256(_inputs[0]);
		uint256 weight = uint256(_inputs[1]);
		uint256 choice = uint256(_inputs[2]);

		if (nullifierUsed[_proposalId][nullifier]) revert DOUBLE_VOTE();
		nullifierUsed[_proposalId][nullifier] = true;

		_countVote(_proposalId, address(0), uint8(choice), weight, '');

		emit ZKVoteCast(_proposalId, uint8(choice), weight, _inputs[0]);
	}

	function setRoot(
		uint256 _proposalId,
		string memory _cid
	) external override onlyZKDAO {
		cids[_proposalId] = _cid;
	}

	/// =============================
	/// ===== Override Functions ====
	/// =============================

	/// @dev quorum = forVotes+abstainVotes (normales) + ZK
	function _quorumReached(
		uint256 proposalId
	)
		internal
		view
		override(GovernorUpgradeable, GovernorCountingSimpleUpgradeable)
		returns (bool)
	{
		// votos registrados por la lógica OZ
		bool quorumNormal = super._quorumReached(proposalId);

		// votos ZK
		ZKProposalVote storage p = zkVotes[proposalId];
		uint256 forZK = p.forVotes;
		uint256 abstainZK = p.abstainVotes;
		uint256 extra = forZK + abstainZK;

		if (extra == 0) return quorumNormal; // atajo barato

		uint256 required = quorum(proposalSnapshot(proposalId));

		// lee el total “normal” usando la vista pública
		(
			uint256 againstNormal,
			uint256 forNormal,
			uint256 abstainNormal
		) = proposalVotes(proposalId); // usa OZ GovernorCountingSimple's public getter

		return (forNormal + abstainNormal + extra) >= required;
	}

	/// @dev mayoría = forVotes (normales + ZK) > againstVotes (normales + ZK)
	function _voteSucceeded(
		uint256 proposalId
	)
		internal
		view
		override(GovernorUpgradeable, GovernorCountingSimpleUpgradeable)
		returns (bool)
	{
		(
			uint256 againstNormal,
			uint256 forNormal /* abstainNormal */,

		) = proposalVotes(proposalId);

		ZKProposalVote storage p = zkVotes[proposalId];
		uint256 againstZK = p.againstVotes;
		uint256 forZK = p.forVotes;

		return (forNormal + forZK) > (againstNormal + againstZK);
	}

	function propose(
		address[] memory targets,
		uint256[] memory values,
		bytes[] memory calldatas,
		string memory _description
	) public override(GovernorUpgradeable, IGovernor) returns (uint256) {
		address proposer = _msgSender();

		if (!_isValidDescriptionForProposer(proposer, _description)) {
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

		proposalCounter++;
		proposalsIds[proposalCounter] = proposalId;

		uint256 snapshot = proposalSnapshot(proposalId);

		zkDao.queueProposal(
			id,
			proposalId,
			snapshot,
			block.number,
			address(token())
		);

		return proposalId;
	}

	/**
	 * @notice Override _countVote to handle both regular and ZK votes
	 */
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
		// If account is address(0), it's a ZK vote
		if (account == address(0)) {
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

		// Regular vote, delegate to parent
		return super._countVote(proposalId, account, support, weight, params);
	}

	/**
	 * @notice Override state to handle waiting for merkle root
	 */
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

	/**
	 * @notice Override _cancel for timelock integration
	 */
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

	/**
	 * @notice Override _executor for timelock integration
	 */
	function _executor()
		internal
		view
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (address)
	{
		return super._executor();
	}

	/**
	 * @notice Override _queueOperations for timelock integration
	 */
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

	/**
	 * @notice Override _executeOperations for timelock integration
	 */
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

	/**
	 * @notice Override proposalNeedsQueuing for timelock integration
	 */
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

	/**
	 * @notice Override proposalThreshold for settings integration
	 */
	function proposalThreshold()
		public
		view
		override(GovernorUpgradeable, GovernorSettingsUpgradeable)
		returns (uint256)
	{
		return super.proposalThreshold();
	}

	/**
	 * @notice Override supportsInterface for interface detection
	 */
	function supportsInterface(
		bytes4 interfaceId
	) public view virtual override(GovernorUpgradeable) returns (bool) {
		return super.supportsInterface(interfaceId);
	}

	/**
	 * @notice Override clock for votes integration
	 */
	function clock()
		public
		view
		override(GovernorUpgradeable, GovernorVotesUpgradeable)
		returns (uint48)
	{
		return super.clock();
	}

	/**
	 * @notice Override CLOCK_MODE for votes integration
	 */
	function CLOCK_MODE()
		public
		view
		override(GovernorUpgradeable, GovernorVotesUpgradeable)
		returns (string memory)
	{
		return super.CLOCK_MODE();
	}

	/**
	 * @notice Override quorum for quorum fraction integration
	 */
	function quorum(
		uint256 blockNumber
	)
		public
		view
		override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
		returns (uint256)
	{
		return super.quorum(blockNumber);
	}

	/**
	 * @notice Override getVotes for votes integration
	 */
	function getVotes(
		address account,
		uint256 blockNumber
	) public view override(GovernorUpgradeable) returns (uint256) {
		return super.getVotes(account, blockNumber);
	}

	/**
	 * @notice Override getVotesWithParams for votes integration
	 */
	function getVotesWithParams(
		address account,
		uint256 blockNumber,
		bytes memory params
	) public view override(GovernorUpgradeable) returns (uint256) {
		return super.getVotesWithParams(account, blockNumber, params);
	}

	/**
	 * @notice Override votingDelay for settings integration
	 */
	function votingDelay()
		public
		view
		override(GovernorUpgradeable, GovernorSettingsUpgradeable)
		returns (uint256)
	{
		return super.votingDelay();
	}

	/**
	 * @notice Override votingPeriod for settings integration
	 */
	function votingPeriod()
		public
		view
		override(GovernorUpgradeable, GovernorSettingsUpgradeable)
		returns (uint256)
	{
		return super.votingPeriod();
	}
}
