// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGovernor} from './IGovernor.sol';
import {IGovernorToken} from './IGovernorToken.sol';
import {ITimeLock} from './ITimeLock.sol';
import {IVerifier} from './IVerifier.sol';

interface IZKDAO {
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

	/// ======================
	/// ======= Errors =======
	/// ======================

	error InvalidArrayLength();
	error UnauthorizedCaller();
	error DAONotFound(uint256 daoId);
	error InvalidParameters();

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	/**
	 * @notice Get DAO information by ID
	 * @param id DAO identifier
	 * @return dao DAO struct containing token, timelock, governor, and deployer
	 */
	function getDao(uint256 id) external view returns (DAO memory dao);

	/**
	 * @notice Get the current DAO counter
	 * @return Current number of DAOs created
	 */
	function daoIdCounter() external view returns (uint256);

	/**
	 * @notice Get user's current nonce for deterministic address generation
	 * @param account User address
	 * @return Current nonce value
	 */
	function getNonce(address account) external view returns (uint256);

	/**
	 * @notice Get all implementation contract addresses
	 * @return governorToken Governor token implementation address
	 * @return timelock Timelock implementation address
	 * @return governor Governor implementation address
	 * @return verifier ZK verifier implementation address
	 */
	function getImplementations()
		external
		view
		returns (
			address governorToken,
			address timelock,
			address governor,
			address verifier
		);

	/**
	 * @notice Check if a DAO exists
	 * @param id DAO identifier
	 * @return exists True if DAO exists
	 */
	function daoExists(uint256 id) external view returns (bool exists);

	/**
	 * @notice Get total number of DAOs created
	 * @return total Total DAO count
	 */
	function getTotalDAOs() external view returns (uint256 total);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	/**
	 * @notice Create a new DAO with governance token, timelock, and governor
	 * @param _tokenParams Parameters for the governance token
	 * @param _minDelay Minimum delay for timelock operations (in seconds)
	 * @param _governorParams Parameters for the governor contract
	 * @param _to Array of addresses to receive initial token allocation
	 * @param _amounts Array of token amounts corresponding to _to addresses
	 * @dev Arrays _to and _amounts must have the same length
	 * @dev Emits DaoCreated event upon successful creation
	 */
	function createDao(
		GovernorTokenParams calldata _tokenParams,
		uint256 _minDelay,
		GovernorParams calldata _governorParams,
		address[] calldata _to,
		uint256[] calldata _amounts
	) external payable;

	/**
	 * @notice Queue a proposal for processing (called by Governor contracts)
	 * @param daoId DAO identifier
	 * @param proposalId Proposal identifier within the DAO
	 * @param snapshot Block number snapshot for the proposal
	 * @dev Only callable by registered Governor contracts
	 */
	function queueProposal(
		uint256 daoId,
		uint256 proposalId,
		uint256 snapshot
	) external;

	/// =============================
	/// == Admin / Upgrade Functions ==
	/// =============================

	/**
	 * @notice Update implementation contracts (if upgradeable)
	 * @param _governorToken New governor token implementation
	 * @param _timelock New timelock implementation
	 * @param _governor New governor implementation
	 * @param _verifier New verifier implementation
	 * @dev Only callable by contract owner/admin
	 */
	function updateImplementations(
		address _governorToken,
		address _timelock,
		address _governor,
		address _verifier
	) external;

	/**
	 * @notice Receive function to accept ETH payments
	 * @dev Used for funding DAO operations and gas fees
	 */
	receive() external payable;
}
