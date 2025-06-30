// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.28;

// import {ERC20} from 'solady/src/tokens/ERC20.sol';
// import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import {IVotes} from '@openzeppelin/contracts/governance/utils/IVotes.sol';
// import {TimelockControllerUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol';

// import {IZKDAO} from '../interfaces/IZKDAO.sol';
// import {IGovernorToken} from '../interfaces/IGovernorToken.sol';
// import {ITimeLock} from '../interfaces/ITimeLock.sol';
// import {IVerifier} from '../Verifier.sol';
// import {IGovernor} from '../interfaces/IGovernor.sol';
// import {MockQueueProposalState} from './MockQueueProposalState.sol';
// import {Transfer} from '../libraries/Transfer.sol';
// import {Errors} from '../libraries/Errors.sol';
// import {Clone} from '../libraries/Clone.sol';

// import 'hardhat/console.sol';

// contract MockZKDAO is IZKDAO, MockQueueProposalState, Transfer, Errors {
// 	/// =========================
// 	/// === Storage Variables ===
// 	/// =========================

// 	mapping(address => uint256) private nonces;
// 	mapping(uint256 => DAO) private daos;
// 	mapping(address => uint256) public daoIds;

// 	uint256 public price = 2 ether; // Price in LINK tokens for creating a DAO
// 	uint256 public daoCount;

// 	address public factory;
// 	IGovernorToken public governorToken;
// 	ITimeLock public timelock;
// 	IVerifier public verifier;
// 	IGovernor public governor;
// 	IERC20 public linkToken;

// 	receive() external payable {}

// 	/// =========================
// 	/// ====== Constructor ======
// 	/// =========================

// 	constructor(
// 		address _governorToken,
// 		address _timelock,
// 		address _governor,
// 		address _verifier,
// 		address _linkAddress,
// 		address _factory
// 	) {
// 		governorToken = IGovernorToken(_governorToken);
// 		timelock = ITimeLock(_timelock);
// 		governor = IGovernor(_governor);
// 		verifier = IVerifier(_verifier);
// 		linkToken = IERC20(_linkAddress);
// 		factory = _factory;
// 	}

// 	/// =========================
// 	/// ======= Modifiers =======
// 	/// =========================

// 	modifier onlyFactory() {
// 		if (msg.sender != factory) revert UNAUTHORIZED();
// 		_;
// 	}

// 	modifier onlyZkDaos() {
// 		uint256 daoId = daoIds[msg.sender];
// 		if (daoId == 0) {
// 			revert DAO_NOT_FOUND(daoId);
// 		}

// 		if (daos[daoId].governor != IGovernor(msg.sender)) {
// 			revert UNAUTHORIZED();
// 		}
// 		_;
// 	}

// 	/// ==========================
// 	/// ===== View Functions =====
// 	/// ==========================

// 	function getDao(uint256 id) external view override returns (DAO memory dao) {
// 		return daos[id];
// 	}

// 	function getImplementations()
// 		external
// 		view
// 		override
// 		returns (
// 			address _governorToken,
// 			address _timelock,
// 			address _governor,
// 			address _verifier
// 		)
// 	{
// 		return (
// 			address(governorToken),
// 			address(timelock),
// 			address(governor),
// 			address(verifier)
// 		);
// 	}

// 	function getNonce(address account) external view override returns (uint256) {
// 		return nonces[account];
// 	}

// 	/// =================================
// 	/// == External / Public Functions ==
// 	/// =================================

// 	function payForDaoCreation(
// 		GovernorTokenParams calldata _tokenParams,
// 		uint256 _minDelay,
// 		GovernorParams calldata _governorParams,
// 		address[] calldata _to,
// 		uint256[] calldata _amounts,
// 		uint256 _value
// 	) external {
// 		if (linkToken.balanceOf(msg.sender) < price) revert INSUFFICIENT_FUNDS();

// 		if (linkToken.allowance(msg.sender, address(this)) < price)
// 			revert INSUFFICIENT_ALLOWANCE();

// 		_transferAmountFrom(
// 			address(linkToken),
// 			TransferData({from: msg.sender, to: address(this), amount: price})
// 		);

// 		emit PaidForDaoCreation(
// 			_tokenParams,
// 			_minDelay,
// 			_governorParams,
// 			_to,
// 			_amounts,
// 			_value
// 		);
// 	}

// 	function createDao(
// 		GovernorTokenParams calldata _tokenParams,
// 		uint256 _minDelay,
// 		GovernorParams calldata _governorParams,
// 		address[] calldata _to,
// 		uint256[] calldata _amounts
// 	) external onlyFactory {
// 		if (_to.length != _amounts.length) revert MISMATCH();

// 		uint256 baseNonce = ++nonces[msg.sender];
// 		uint256 id = ++daoCount;

// 		address tokenClone = Clone.createClone(
// 			address(governorToken),
// 			msg.sender,
// 			baseNonce
// 		);

// 		address timelockClone = Clone.createClone(
// 			address(timelock),
// 			msg.sender,
// 			baseNonce + 1
// 		);

// 		address governorClone = Clone.createClone(
// 			address(governor),
// 			msg.sender,
// 			baseNonce + 2
// 		);

// 		nonces[msg.sender] = baseNonce + 2;

// 		_initializeToken(tokenClone, _tokenParams);
// 		_initializeTimelock(timelockClone, _minDelay);
// 		_initializeGovernor(
// 			governorClone,
// 			IVotes(tokenClone),
// 			TimelockControllerUpgradeable(payable(timelockClone)),
// 			verifier,
// 			_governorParams,
// 			id
// 		);

// 		// Setup DAO roles
// 		ITimeLock(timelockClone).grantRole(
// 			ITimeLock(timelockClone).PROPOSER_ROLE(),
// 			governorClone
// 		);
// 		ITimeLock(timelockClone).grantRole(
// 			ITimeLock(timelockClone).EXECUTOR_ROLE(),
// 			address(0)
// 		);
// 		ITimeLock(timelockClone).renounceRole(
// 			ITimeLock(timelockClone).DEFAULT_ADMIN_ROLE(),
// 			address(this)
// 		);

// 		// Mint tokens and transfer ownership
// 		IGovernorToken(tokenClone).mintBatch(_to, _amounts);
// 		IGovernorToken(tokenClone).transferOwnership(timelockClone);

// 		// Save DAO data
// 		daoIds[governorClone] = id;
// 		daos[id] = DAO({
// 			token: IGovernorToken(tokenClone),
// 			timelock: ITimeLock(timelockClone),
// 			governor: IGovernor(governorClone),
// 			deployer: msg.sender
// 		});

// 		emit DaoCreated(id, msg.sender, tokenClone, timelockClone, governorClone);
// 	}

// 	function queueProposal(
// 		uint256 daoId,
// 		uint256 proposalId,
// 		uint256 snapshot,
// 		uint256 proposalBlock,
// 		address voteToken
// 	) external onlyZkDaos {
// 		_queueProposal(daoId, proposalId, snapshot, proposalBlock, voteToken);
// 	}

// 	/// =========================
// 	/// == Internal Functions ===
// 	/// =========================

// 	function _initializeToken(
// 		address tokenClone,
// 		GovernorTokenParams calldata tokenParams
// 	) internal {
// 		IGovernorToken(tokenClone).initialize(
// 			tokenParams.name,
// 			tokenParams.symbol,
// 			address(this)
// 		);
// 	}

// 	function _initializeTimelock(
// 		address timelockClone,
// 		uint256 minDelay
// 	) internal {
// 		ITimeLock(timelockClone).initialize(
// 			minDelay,
// 			new address[](0),
// 			new address[](0),
// 			address(this)
// 		);
// 	}

// 	function _initializeGovernor(
// 		address _governorClone,
// 		IVotes _token,
// 		TimelockControllerUpgradeable _timelock,
// 		IVerifier _verifier,
// 		GovernorParams calldata governorParams,
// 		uint256 id
// 	) internal {
// 		IGovernor.GovernorInitParams memory memoryParams = IGovernor
// 			.GovernorInitParams({
// 				name: governorParams.name,
// 				token: _token,
// 				timelock: _timelock,
// 				votingDelay: governorParams.votingDelay,
// 				votingPeriod: governorParams.votingPeriod,
// 				proposalThreshold: governorParams.proposalThreshold,
// 				votesQuorumFraction: governorParams.quorumFraction,
// 				id: id,
// 				description: governorParams.description,
// 				logo: governorParams.logo
// 			});

// 		IGovernor(_governorClone).initialize(memoryParams, _verifier);
// 	}
// }
