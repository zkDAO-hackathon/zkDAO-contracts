// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from 'solady/src/tokens/ERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IVotes} from '@openzeppelin/contracts/governance/utils/IVotes.sol';
import {TimelockControllerUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol';

import {IGovernor} from './interfaces/IGovernor.sol';
import {IGovernorToken} from './interfaces/IGovernorToken.sol';
import {ITimeLock} from './interfaces/ITimeLock.sol';
import {IVerifier} from './Verifier.sol';
import {QueueProposalState} from './QueueProposalState.sol';
import {Transfer} from './libraries/Transfer.sol';
import {Errors} from './libraries/Errors.sol';
import {Clone} from './libraries/Clone.sol';

contract ZKDAO is QueueProposalState, Transfer {
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

	event PaidForDaoCreation(
		GovernorTokenParams tokenParams,
		uint256 minDelay,
		GovernorParams governorParams,
		address[] to,
		uint256[] amounts,
		uint256 value
	);

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
		string description;
		string logo;
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

	uint256 private price = 1 ether; // Price to create a DAO in LINK tokens
	uint256 private daoCounter;

	address private factory;
	IERC20 private linkToken;
	IGovernorToken private governorToken;
	ITimeLock private timelock;
	IVerifier private verifier;
	IGovernor private governor;

	mapping(address => uint256) private nonces;
	mapping(address => uint256) private daoIds;
	mapping(uint256 => DAO) private daos;

	receive() external payable {}

	constructor(
		address _governorToken,
		address _timelock,
		address _governor,
		address _verifier,
		address _linkAddress,
		address _factory,
		address _router,
		uint64 _subscriptionId,
		uint32 _gasLimit,
		bytes32 _donID,
		string memory _source
	) QueueProposalState(_router, _subscriptionId, _gasLimit, _donID, _source) {
		governorToken = IGovernorToken(_governorToken);
		timelock = ITimeLock(_timelock);
		governor = IGovernor(_governor);
		verifier = IVerifier(_verifier);
		linkToken = IERC20(_linkAddress);
		factory = _factory;
	}

	/// =========================
	/// ====== Modifiers ========
	/// =========================

	modifier onlyFactory() {
		if (msg.sender != factory) revert UNAUTHORIZED();
		_;
	}

	modifier onlyZkDaos() {
		uint256 daoId = daoIds[msg.sender];
		if (daoId == 0) {
			revert DAO_NOT_FOUND(daoId);
		}

		if (daos[daoId].governor != IGovernor(msg.sender)) {
			revert UNAUTHORIZED();
		}
		_;
	}

	/// ==========================
	/// === External Functions ===
	/// ==========================

	function getPrice() external view returns (uint256) {
		return price;
	}

	function getDaoCounter() external view returns (uint256) {
		return daoCounter;
	}

	function getImplementations()
		external
		view
		returns (
			address _factory,
			address _linkToken,
			address _governorToken,
			address _timelock,
			address _governor,
			address _verifier
		)
	{
		return (
			factory,
			address(linkToken),
			address(governorToken),
			address(timelock),
			address(governor),
			address(verifier)
		);
	}

	function getNonce(address account) external view returns (uint256) {
		return nonces[account];
	}

	function getDaoId(address account) external view returns (uint256) {
		return daoIds[account];
	}

	function getDao(uint256 id) external view returns (DAO memory dao) {
		return daos[id];
	}

	function payForDaoCreation(
		GovernorTokenParams calldata _tokenParams,
		uint256 _minDelay,
		GovernorParams calldata _governorParams,
		address[] calldata _to,
		uint256[] calldata _amounts,
		uint256 _value
	) external payable {
		if (linkToken.balanceOf(msg.sender) < price) revert INSUFFICIENT_FUNDS();

		if (linkToken.allowance(msg.sender, address(this)) < price)
			revert INSUFFICIENT_ALLOWANCE();

		_transferAmountFrom(
			address(linkToken),
			TransferData({from: msg.sender, to: address(this), amount: price})
		);

		emit PaidForDaoCreation(
			_tokenParams,
			_minDelay,
			_governorParams,
			_to,
			_amounts,
			_value
		);
	}

	function createDao(
		GovernorTokenParams calldata _tokenParams,
		uint256 _minDelay,
		GovernorParams calldata _governorParams,
		address[] calldata _to,
		uint256[] calldata _amounts
	) external onlyFactory {
		if (_to.length != _amounts.length) revert MISMATCH();

		uint256 baseNonce = ++nonces[msg.sender];
		uint256 id = ++daoCounter;

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
			IVotes(tokenClone),
			TimelockControllerUpgradeable(payable(timelockClone)),
			verifier,
			_governorParams,
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

		IGovernorToken(tokenClone).mintBatch(_to, _amounts);
		IGovernorToken(tokenClone).transferOwnership(timelockClone);

		daoIds[governorClone] = id;
		daos[id] = DAO({
			token: IGovernorToken(tokenClone),
			timelock: ITimeLock(timelockClone),
			governor: IGovernor(governorClone),
			deployer: msg.sender
		});

		emit DaoCreated(id, msg.sender, tokenClone, timelockClone, governorClone);
	}

	function queueProposal(
		uint256 daoId,
		uint256 proposalId,
		uint256 snapshot,
		uint256 proposalBlock,
		address voteToken
	) external onlyZkDaos {
		_queueProposal(daoId, proposalId, snapshot, proposalBlock, voteToken);
	}

	function setPrice(uint256 _price) external {
		price = _price;
	}

	function recoverFunds(address _token, address _to) external {
		uint256 amount = _token == NATIVE
			? address(this).balance
			: ERC20(_token).balanceOf(address(this));

		_transferAmount(_token, _to, amount);
	}

	/// =========================
	/// == Private Functions ====
	/// =========================

	function _initializeToken(
		address tokenClone,
		GovernorTokenParams calldata tokenParams
	) private {
		IGovernorToken(tokenClone).initialize(
			tokenParams.name,
			tokenParams.symbol,
			address(this)
		);
	}

	function _initializeTimelock(
		address timelockClone,
		uint256 minDelay
	) private {
		ITimeLock(timelockClone).initialize(
			minDelay,
			new address[](0),
			new address[](0),
			address(this)
		);
	}

	function _initializeGovernor(
		address _governorClone,
		IVotes _token,
		TimelockControllerUpgradeable _timelock,
		IVerifier _verifier,
		GovernorParams calldata governorParams,
		uint256 id
	) private {
		// Convert calldata struct to memory struct for compatibility
		IGovernor.GovernorInitParams memory memoryParams = IGovernor
			.GovernorInitParams({
				name: governorParams.name,
				token: _token,
				timelock: _timelock,
				votingDelay: governorParams.votingDelay,
				votingPeriod: governorParams.votingPeriod,
				proposalThreshold: governorParams.proposalThreshold,
				votesQuorumFraction: governorParams.quorumFraction,
				id: id,
				description: governorParams.description,
				logo: governorParams.logo
			});

		IGovernor(_governorClone).initialize(memoryParams, _verifier);
	}
}
