// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGovernor} from './interfaces/IGovernor.sol';
import {IGovernorToken} from './interfaces/IGovernorToken.sol';
import {IQueueProposalState} from './interfaces/IQueueProposalState.sol';
import {ITimeLock} from './interfaces/ITimeLock.sol';
import {IVerifier} from './interfaces/IVerifier.sol';
import {Clone} from './libraries/Clone.sol';

contract ZKDAO {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct GovernorTokenParams {
		string name;
		string symbol;
	}

	struct GovernorParams {
		string name;
		uint48 votingDelay;
		uint32 votingPeriod;
		uint256 proposalThreshold;
		uint256 quorumFraction;
	}

	struct DAO {
		IGovernorToken token;
		ITimeLock timelock;
		IGovernor governor;
		address deployer;
	}

	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(address => uint256) private nonces;
	mapping(uint256 => DAO) private daos;

	uint256 public daoIdCounter;

	IGovernorToken public governorToken;
	ITimeLock public timelock;
	IVerifier public verifier;
	IQueueProposalState public queueProposalState;
	IGovernor public governor;

	/// ======================
	/// ======= Events =======
	/// ======================

	event DaoCreated(
		uint256 indexed id,
		address indexed deployer,
		address token,
		address timelock,
		address governor
	);

	constructor(
		address _governorToken,
		address _timelock,
		address _governor,
		address _verifier
	) // address _queueProposalState,
	{
		governorToken = IGovernorToken(_governorToken);
		timelock = ITimeLock(_timelock);
		governor = IGovernor(_governor);
		verifier = IVerifier(_verifier);
		// queueProposalState = IQueueProposalState(_queueProposalState);
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getDao(uint256 id) external view returns (DAO memory dao) {
		return daos[id];
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function createDao(
		GovernorTokenParams calldata _tokenParams,
		uint256 _minDelay,
		GovernorParams calldata _governorParams,
		address[] calldata _to,
		uint256[] calldata _amounts
	) external {
		uint256 baseNonce = ++nonces[msg.sender];
		uint256 id = ++daoIdCounter;

		address tokenClone = Clone.createClone(
			address(governorToken),
			msg.sender,
			baseNonce
		);

		address timelockClone = Clone.createClone(
			address(timelock),
			msg.sender,
			baseNonce + 1
		);

		address governorClone = Clone.createClone(
			address(governor),
			msg.sender,
			baseNonce + 2
		);

		nonces[msg.sender] = baseNonce + 2;

		_initializeToken(tokenClone, _tokenParams);

		_initializeTimelock(timelockClone, _minDelay);

		_initializeGovernor(
			governorClone,
			_governorParams,
			tokenClone,
			timelockClone,
			id
		);

		// Setup DAO
		ITimeLock(timelockClone).grantRole(
			ITimeLock(timelockClone).PROPOSER_ROLE(),
			governorClone
		);
		ITimeLock(timelockClone).grantRole(
			ITimeLock(timelockClone).EXECUTOR_ROLE(),
			address(0)
		);
		ITimeLock(timelockClone).renounceRole(
			ITimeLock(timelockClone).DEFAULT_ADMIN_ROLE(),
			address(this)
		);

		// TODO: add eth to pay for gas fees
		IGovernorToken(governorClone).mintBatch(_to, _amounts);
		IGovernorToken(tokenClone).transferOwnership(timelockClone);

		// Save DAO data
		daos[id] = DAO({
			token: IGovernorToken(tokenClone),
			timelock: ITimeLock(timelockClone),
			governor: IGovernor(governorClone),
			deployer: msg.sender
		});

		emit DaoCreated(id, msg.sender, tokenClone, timelockClone, governorClone);
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	function _initializeToken(
		address tokenClone,
		GovernorTokenParams calldata tokenParams
	) internal {
		IGovernorToken(tokenClone).initialize(
			tokenParams.name,
			tokenParams.symbol,
			address(this)
		);
	}

	function _initializeTimelock(
		address timelockClone,
		uint256 minDelay
	) internal {
		ITimeLock(timelockClone).initialize(
			minDelay,
			new address[](0),
			new address[](0),
			address(this)
		);
	}

	function _initializeGovernor(
		address governorClone,
		GovernorParams calldata governorParams,
		address tokenClone,
		address timelockClone,
		uint256 id
	) internal {
		IGovernor(governorClone).initialize(
			governorParams.name,
			IGovernorToken(tokenClone),
			ITimeLock(timelockClone),
			IVerifier(verifier),
			IQueueProposalState(queueProposalState),
			governorParams.votingDelay,
			governorParams.votingPeriod,
			governorParams.proposalThreshold,
			governorParams.quorumFraction,
			id
		);
	}

	receive() external payable {}
}
