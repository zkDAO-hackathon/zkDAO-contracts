// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from 'solady/src/tokens/ERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IVotes} from '@openzeppelin/contracts/governance/utils/IVotes.sol';
import {TimelockControllerUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol';

import {IRouterClient} from '@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol';
import {OwnerIsCreator} from '@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol';
import {Client} from '@chainlink/contracts-ccip/contracts/libraries/Client.sol';

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
	/// ======= Errors =======
	/// ======================

	error NotEnoughBalance(uint256 currentBalance, uint256 calculatedfee);
	error NothingToWithdraw();
	error FailedToWithdrawEth(address owner, address target, uint256 value);
	error DestinationChainNotAllowlisted(uint64 destinationChainSelector);
	error InvalidReceiverAddress();

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
		uint256 value,
		address creator
	);

	event TokensTransferred(
		bytes32 indexed messageId,
		uint64 indexed destinationChainSelector,
		address receiver,
		address token,
		uint256 tokenAmount,
		address feeToken,
		uint256 fee
	);

	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Implementations {
		address governorToken;
		address timelock;
		address governor;
		address verifier;
	}

	struct CcipParams {
		address linkToken;
		address ccipRouter;
		address ccipBnmToken;
		address ccipLnmToken;
		address usdcToken;
		uint64 destinationChainSelector;
	}

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

	struct Dao {
		uint256 id;
		uint256 createdAt;
		address creator;
		IGovernorToken token;
		ITimeLock timelock;
		IGovernor governor;
		string name;
		string description;
		string logo;
	}

	/// =========================
	/// === Storage Variables ===
	/// =========================

	uint256 private price = 0.000001 ether; // Price to create a DAO in LINK tokens
	uint256 private daoCounter;

	IGovernorToken private governorToken;
	ITimeLock private timelock;
	IVerifier private verifier;
	IGovernor private governor;
	IERC20 private linkToken;
	IRouterClient private ccipRouter;
	address private factory;
	uint64 private destinationChainSelector;

	mapping(uint256 => Dao) private daos;
	mapping(uint256 => uint256) private daoIdByProposalId;
	mapping(address => uint256) private daoIdByAddress;
	mapping(address => uint256) private daoIdByTimelock;

	mapping(address => uint256) private nonces;
	mapping(uint64 => bool) public allowlistedChains;

	receive() external payable {}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		Implementations memory _implementations,
		CcipParams memory _ccipParams,
		address _factory,
		address _functionsRouter,
		uint64 _subscriptionId,
		uint32 _gasLimit,
		bytes32 _donID,
		string memory _source
	) external {
		governorToken = IGovernorToken(_implementations.governorToken);
		timelock = ITimeLock(_implementations.timelock);
		governor = IGovernor(_implementations.governor);
		verifier = IVerifier(_implementations.verifier);
		linkToken = IERC20(_ccipParams.linkToken);
		ccipRouter = IRouterClient(_ccipParams.ccipRouter);
		destinationChainSelector = _ccipParams.destinationChainSelector;
		factory = _factory;

		__ConsumerUpgradable_init(
			_functionsRouter,
			_subscriptionId,
			_gasLimit,
			_donID,
			_source
		);
	}

	/// =========================
	/// ====== Modifiers ========
	/// =========================

	modifier onlyFactory() {
		if (msg.sender != factory) revert UNAUTHORIZED();
		_;
	}

	modifier onlyZkDaos() {
		uint256 daoId = daoIdByAddress[msg.sender];
		if (daoId == 0) {
			revert DAO_NOT_FOUND(daoId);
		}

		if (daos[daoId].governor != IGovernor(msg.sender)) {
			revert UNAUTHORIZED();
		}
		_;
	}

	modifier onlyTimelock() {
		uint256 daoId = daoIdByTimelock[msg.sender];
		if (daoId == 0) {
			revert DAO_NOT_FOUND(daoId);
		}

		if (daos[daoId].timelock != ITimeLock(msg.sender)) {
			revert UNAUTHORIZED();
		}
		_;
	}

	modifier validateReceiver(address _receiver) {
		if (_receiver == address(0)) revert InvalidReceiverAddress();
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

	function getLinkToken() external view returns (IERC20) {
		return linkToken;
	}

	function getCcipRouter() external view returns (IRouterClient) {
		return ccipRouter;
	}

	function getFactory() external view returns (address) {
		return factory;
	}

	function getDestinationChainSelector() external view returns (uint64) {
		return destinationChainSelector;
	}

	function getNonce() external view returns (uint256) {
		return nonces[msg.sender];
	}

	function getDaoId(address account) external view returns (uint256) {
		return daoIdByAddress[account];
	}

	function getDao(uint256 id) external view returns (Dao memory) {
		if (id == 0 || id > daoCounter) {
			return
				Dao({
					id: 0,
					createdAt: 0,
					creator: address(0),
					token: IGovernorToken(address(0)),
					timelock: ITimeLock(address(0)),
					governor: IGovernor(address(0)),
					name: '',
					description: '',
					logo: ''
				});
		}

		return daos[id];
	}

	function getCcipFee(
		address _receiver,
		address _token,
		uint256 _amount
	) external view returns (uint256) {
		return
			ccipRouter.getFee(
				destinationChainSelector,
				_buildCCIPMessage(_receiver, _token, _amount, address(linkToken))
			);
	}

	function getTreasury() external view returns (uint256) {
		return address(this).balance;
	}

	function getBalance(address _token, address _account) external view {
		_getBalance(_token, _account);
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
			_value,
			msg.sender
		);
	}

	function createDao(
		GovernorTokenParams calldata _tokenParams,
		uint256 _minDelay,
		GovernorParams calldata _governorParams,
		address[] calldata _to,
		uint256[] calldata _amounts,
		address creator
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

		linkToken.approve(address(this), price);
		linkToken.transfer(address(governorClone), price);

		daoIdByTimelock[timelockClone] = id;
		daoIdByAddress[governorClone] = id;
		daos[id] = Dao({
			id: id,
			createdAt: block.timestamp,
			creator: creator,
			token: IGovernorToken(tokenClone),
			timelock: ITimeLock(timelockClone),
			governor: IGovernor(governorClone),
			name: _governorParams.name,
			description: _governorParams.description,
			logo: _governorParams.logo
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

	function setFactory(address _factory) external {
		factory = _factory;
	}

	function setGovernorToken(address _governorToken) external {
		governorToken = IGovernorToken(_governorToken);
	}

	function setTimelock(address _timelock) external {
		timelock = ITimeLock(_timelock);
	}

	function setGovernor(address _governor) external {
		governor = IGovernor(_governor);
	}

	function setPrice(uint256 _price) external {
		price = _price;
	}

	function allowlistDestinationChain(
		uint64 _destinationChainSelector,
		bool allowed
	) external {
		allowlistedChains[_destinationChainSelector] = allowed;
	}

	function transferCrosschain(
		address _receiver,
		address _token,
		uint256 _amount,
		uint256 _fee
	)
		external
		onlyTimelock
		validateReceiver(_receiver)
		returns (bytes32 messageId)
	{
		Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
			_receiver,
			_token,
			_amount,
			address(linkToken)
		);

		linkToken.approve(address(ccipRouter), _fee);

		IERC20(_token).approve(address(ccipRouter), _amount);

		messageId = ccipRouter.ccipSend(destinationChainSelector, evm2AnyMessage);

		emit TokensTransferred(
			messageId,
			destinationChainSelector,
			_receiver,
			_token,
			_amount,
			address(linkToken),
			_fee
		);

		return messageId;
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

		IGovernor(_governorClone).initialize(
			memoryParams,
			_verifier,
			address(linkToken)
		);
	}

	function _buildCCIPMessage(
		address _receiver,
		address _token,
		uint256 _amount,
		address _feeTokenAddress
	) private pure returns (Client.EVM2AnyMessage memory) {
		// Set the token amounts
		Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](
			1
		);
		tokenAmounts[0] = Client.EVMTokenAmount({token: _token, amount: _amount});

		return
			Client.EVM2AnyMessage({
				receiver: abi.encode(_receiver),
				data: '',
				tokenAmounts: tokenAmounts,
				extraArgs: Client._argsToBytes(
					Client.GenericExtraArgsV2({
						gasLimit: 0,
						allowOutOfOrderExecution: true
					})
				),
				feeToken: _feeTokenAddress
			});
	}
}
