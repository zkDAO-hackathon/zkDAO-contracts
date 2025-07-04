// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
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

	struct ProposalStorage {
		uint256 id;
		uint256 proposalNumber;
		uint256 createdAt;
		address proposer;
		string description;
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

	event TokensTransferred(
		bytes32 indexed messageId,
		uint64 indexed destinationChainSelector,
		address receiver,
		address token,
		uint256 tokenAmount,
		address feeToken,
		uint256 fees
	);

	/// =========================
	/// === Storage Variables ===
	/// =========================

	uint256 private proposalCounter;
	uint256 private id;
	address private linkToken;
	IVerifier private verifier;
	IZKDAO private zkDao;
	string private description;
	string private logo;

	mapping(uint256 => ProposalStorage) private proposals;
	mapping(uint256 => ZKProposalVote) private zkVotes;
	mapping(uint256 => string) private cids;
	mapping(uint256 => mapping(uint256 => bool)) private nullifierUsed;

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
		IVerifier _verifier,
		address _linkToken
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
		linkToken = _linkToken;
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getProposalCounter() external view returns (uint256) {
		return proposalCounter;
	}

	function getId() external view returns (uint256) {
		return id;
	}

	function getVerifier() external view returns (IVerifier) {
		return verifier;
	}

	function getZKDAO() external view returns (IZKDAO) {
		return zkDao;
	}

	function getDescription() external view returns (string memory) {
		return description;
	}

	function getLogo() external view returns (string memory) {
		return logo;
	}

	function getProposal(
		uint256 _id
	) external view returns (ProposalStorage memory) {
		return proposals[_id];
	}

	function getZKVote(
		uint256 _id
	)
		external
		view
		returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)
	{
		ZKProposalVote storage p = zkVotes[_id];
		return (p.againstVotes, p.forVotes, p.abstainVotes);
	}

	function getNullifierUsed(
		uint256 _id,
		uint256 nullifier
	) external view returns (bool) {
		return nullifierUsed[_id][nullifier];
	}

	function getCid(uint256 _id) external view returns (string memory) {
		return cids[_id];
	}

	function timeLeft(uint256 _id) external view returns (uint256) {
		uint256 leftTime = 0;
		if (state(_id) == ProposalState.Active) {
			leftTime = proposalSnapshot(_id) + votingPeriod() - block.timestamp;
		}
		if (leftTime < 0) {
			leftTime = 0;
		}
		return leftTime;
	}

	function isWaitingMerkle(uint256 _id) public view returns (bool) {
		return
			super.state(_id) == ProposalState.Pending && bytes(cids[_id]).length == 0;
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

	function setRoot(uint256 _proposalId, string memory _cid) external onlyZKDAO {
		cids[_proposalId] = _cid;
	}

	function transferCrosschainTreasury(
		address _receiver,
		address _token,
		uint256 _amount
	) external returns (bytes32) {
		uint256 fee = zkDao.getCcipFee(_receiver, _token, _amount);

		if (IERC20(linkToken).balanceOf(address(this)) < fee) {
			revert INSUFFICIENT_FUNDS();
		}

		if (IERC20(linkToken).allowance(address(this), address(zkDao)) < fee) {
			IERC20(linkToken).approve(address(zkDao), type(uint256).max);
		}

		IERC20(linkToken).transfer(address(zkDao), fee);

		if (IERC20(_token).balanceOf(address(this)) < _amount) {
			revert INSUFFICIENT_FUNDS();
		}

		if (IERC20(_token).allowance(address(this), address(zkDao)) < _amount) {
			IERC20(_token).approve(address(zkDao), type(uint256).max);
		}

		IERC20(_token).transfer(address(zkDao), _amount);
		return zkDao.transferCrosschain(_receiver, _token, _amount);
	}

	/// =============================
	/// ===== Override Functions ====
	/// =============================

	function _quorumReached(
		uint256 proposalId
	)
		internal
		view
		override(GovernorUpgradeable, GovernorCountingSimpleUpgradeable)
		returns (bool)
	{
		bool quorumNormal = super._quorumReached(proposalId);

		ZKProposalVote storage p = zkVotes[proposalId];
		uint256 forZK = p.forVotes;
		uint256 abstainZK = p.abstainVotes;
		uint256 extra = forZK + abstainZK;

		if (extra == 0) return quorumNormal;

		uint256 required = quorum(proposalSnapshot(proposalId));

		(
			uint256 againstNormal,
			uint256 forNormal,
			uint256 abstainNormal
		) = proposalVotes(proposalId);

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
	) public override(GovernorUpgradeable) returns (uint256) {
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
			_description,
			proposer
		);

		proposalCounter++;
		proposals[proposalCounter] = ProposalStorage({
			id: proposalId,
			proposalNumber: proposalCounter,
			createdAt: block.timestamp,
			proposer: proposer,
			description: _description
		});

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

	// The following functions are overrides required by Solidity.

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

	function state(
		uint256 proposalId
	)
		public
		view
		override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
		returns (ProposalState)
	{
		return super.state(proposalId);
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
}
