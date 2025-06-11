// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGovernor} from './IGovernor.sol';
import {IGovernorToken} from './IGovernorToken.sol';
import {ITimeLock} from './ITimeLock.sol';
import {IVerifier} from './IVerifier.sol';
import {IQueueProposalState} from './IQueueProposalState.sol';

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

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getDao(uint256 id) external view returns (DAO memory dao);

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function daoIdCounter() external view returns (uint256);

	function daos(
		uint256 daoId
	)
		external
		view
		returns (
			IGovernorToken token,
			ITimeLock timelock,
			IGovernor governor,
			address deployer
		);

	function nonces(address account) external view returns (uint256);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function createDao(
		GovernorTokenParams calldata _tokenParams,
		uint256 _minDelay,
		GovernorParams calldata _governorParams,
		address[] calldata _to,
		uint256[] calldata _amounts
	) external payable;
}
