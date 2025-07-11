// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGovernor} from '../interfaces/IGovernor.sol';
import {MockConsumer} from './MockConsumer.sol';

import 'hardhat/console.sol';

/**
 * @title MockQueueProposalState
 * @notice Mock implementation of QueueProposalState for local testing
 * @dev Simulates Chainlink Automation behavior without external dependencies
 */
contract MockQueueProposalState is MockConsumer {
	/// =========================
	/// === Storage Variables ===
	/// =========================

	// Mock automation variables
	bool public automationEnabled;
	address public automationRegistry;
	uint256 public lastUpkeepTimestamp;
	uint256 public upkeepCounter;

	// Mock control variables
	bool public forceUpkeepNeeded;
	uint256 public mockBlockTimestamp;

	/// ======================
	/// ======= Events =======
	/// ======================

	event ProposalQueued(
		address indexed dao,
		uint256 indexed daoId,
		uint256 indexed proposalId,
		uint256 snapshot,
		uint256 proposalBlock,
		address voteToken
	);

	event ProposalDequeued(
		address indexed dao,
		uint256 indexed daoId,
		uint256 indexed proposalId,
		uint256 snapshot,
		uint256 proposalBlock,
		address voteToken
	);

	event UpkeepPerformed(uint256 indexed upkeepId, uint256 proposalsProcessed);
	event AutomationToggled(bool enabled);

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {
		automationEnabled = true;
		automationRegistry = msg.sender;
		mockBlockTimestamp = block.timestamp;
	}

	/// ========================
	/// ======= Modifiers ======
	/// ========================

	modifier onlyAutomation() {
		require(
			msg.sender == automationRegistry || msg.sender == address(this),
			'Only automation registry can call this'
		);
		_;
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function checkUpkeep(
		bytes calldata /* checkData */
	) external view returns (bool upkeepNeeded, bytes memory performData) {
		if (forceUpkeepNeeded) {
			return (true, abi.encode(queue));
		}

		if (!automationEnabled) {
			return (false, bytes(''));
		}

		uint256 count = 0;
		uint256 currentTime = mockBlockTimestamp > 0
			? mockBlockTimestamp
			: block.timestamp;

		for (uint256 i = 0; i < queue.length; i++) {
			if (
				queue[i].snapshot <= currentTime &&
				!proposals[queue[i].dao][queue[i].proposalId].queued
			) {
				count++;
			}
		}

		if (count == 0) {
			return (false, bytes(''));
		}

		Proposal[] memory proposalsToPerform = new Proposal[](count);

		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (
				queue[i].snapshot <= currentTime &&
				!proposals[queue[i].dao][queue[i].proposalId].queued
			) {
				proposalsToPerform[index] = queue[i];
				index++;
			}
		}

		performData = abi.encode(proposalsToPerform);
		upkeepNeeded = count > 0;
	}

	function getQueueLength() external view returns (uint256) {
		return queue.length;
	}

	function getProposal(
		address dao,
		uint256 proposalId
	) external view returns (Proposal memory) {
		return proposals[IGovernor(dao)][proposalId];
	}

	function qetQueue() external view returns (Proposal[] memory) {
		return queue;
	}

	function isProposalProcessed(
		address dao,
		uint256 proposalId
	) external view returns (bool) {
		return proposals[IGovernor(dao)][proposalId].queued;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function performUpkeep(bytes calldata performData) external onlyAutomation {
		require(automationEnabled, 'Automation is disabled');

		Proposal[] memory proposalsToProcess = abi.decode(
			performData,
			(Proposal[])
		);

		string[] memory args = new string[](proposalsToProcess.length);

		for (uint256 i = 0; i < proposalsToProcess.length; i++) {
			Proposal memory p = proposalsToProcess[i];
			string memory serialized;

			if (!proposals[p.dao][p.proposalId].queued) {
				proposals[p.dao][p.proposalId].queued = true;

				serialized = string(
					abi.encodePacked(
						'dao=',
						toAsciiString(address(p.dao)),
						';daoId=',
						uintToString(p.daoId),
						';proposalId=',
						uintToString(p.proposalId),
						';snapshot=',
						uintToString(p.snapshot),
						';voteToken=',
						toAsciiString(p.voteToken)
					)
				);

				args[i] = serialized;
				console.log('Serialized proposal:', serialized);

				emit ProposalDequeued(
					address(p.dao),
					p.daoId,
					p.proposalId,
					p.snapshot,
					p.proposalBlock,
					p.voteToken
				);
			}

			sendRequest(
				SendRequestParams({
					source: 'queueProposal',
					encryptedSecretsUrls: bytes(''), // No secrets in this mock
					donHostedSecretsSlotID: 0, // No DON secrets in this mock
					donHostedSecretsVersion: 0, // No DON secrets in this mock
					args: args,
					bytesArgs: new bytes[](0), // No bytes args in this mock
					subscriptionId: 0 // No subscription in this mock
				}),
				proposalsToProcess
			);
		}

		lastUpkeepTimestamp = block.timestamp;
		upkeepCounter++;

		emit UpkeepPerformed(upkeepCounter, proposalsToProcess.length);
	}

	function _queueProposal(
		uint256 _daoId,
		uint256 _proposalId,
		uint256 _snapshot,
		uint256 _proposalBlock,
		address voteToken
	) internal virtual {
		queue.push(
			Proposal({
				dao: IGovernor(msg.sender),
				daoId: _daoId,
				proposalId: _proposalId,
				snapshot: _snapshot,
				proposalBlock: _proposalBlock,
				voteToken: voteToken,
				queued: false,
				executed: false
			})
		);

		emit ProposalQueued(
			msg.sender,
			_daoId,
			_proposalId,
			_snapshot,
			_proposalBlock,
			voteToken
		);
	}

	/// ================================
	/// ===== Mock Helper Functions ===
	/// ================================

	/**
	 * @notice Toggle automation on/off for testing
	 */
	function toggleAutomation(bool enabled) external {
		automationEnabled = enabled;
		emit AutomationToggled(enabled);
	}

	/**
	 * @notice Set mock block timestamp for testing time-dependent logic
	 */
	function setMockBlockTimestamp(uint256 timestamp) external {
		mockBlockTimestamp = timestamp;
	}

	/**
	 * @notice Advance mock time by specified seconds
	 */
	function advanceTime(uint256 seconds_) external {
		if (mockBlockTimestamp == 0) {
			mockBlockTimestamp = block.timestamp;
		}
		mockBlockTimestamp += seconds_;
	}

	/**
	 * @notice Force upkeep to be needed for testing
	 */
	function setForceUpkeepNeeded(bool force) external {
		forceUpkeepNeeded = force;
	}

	/**
	 * @notice Manually trigger upkeep (simulates Chainlink calling performUpkeep)
	 */
	function manualUpkeep() external returns (uint256 processedCount) {
		(bool upkeepNeeded, bytes memory performData) = this.checkUpkeep('');

		if (upkeepNeeded) {
			this.performUpkeep(performData);
			Proposal[] memory proposals = abi.decode(performData, (Proposal[]));
			return proposals.length;
		}

		return 0;
	}

	/**
	 * @notice Simulate automated upkeep cycle
	 */
	function simulateAutomationCycle()
		external
		returns (bool executed, uint256 processedCount)
	{
		if (!automationEnabled) {
			return (false, 0);
		}

		(bool upkeepNeeded, bytes memory performData) = this.checkUpkeep('');

		if (upkeepNeeded) {
			this.performUpkeep(performData);
			Proposal[] memory proposals = abi.decode(performData, (Proposal[]));
			return (true, proposals.length);
		}

		return (false, 0);
	}

	/**
	 * @notice Clear all processed proposals (for testing)
	 */
	function clearProcessedProposals() external {
		for (uint256 i = 0; i < queue.length; i++) {
			proposals[queue[i].dao][queue[i].proposalId].queued = false;
		}
	}

	/**
	 * @notice Clear the entire queue (for testing)
	 */
	function clearQueue() external {
		delete queue;
	}

	/**
	 * @notice Remove processed proposals from queue
	 */
	function cleanupQueue() external {
		uint256 activeCount = 0;

		// Count active proposals
		for (uint256 i = 0; i < queue.length; i++) {
			if (!proposals[queue[i].dao][queue[i].proposalId].queued) {
				activeCount++;
			}
		}

		// Create new array with only active proposals
		Proposal[] memory activeProposals = new Proposal[](activeCount);
		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (!proposals[queue[i].dao][queue[i].proposalId].queued) {
				activeProposals[index] = queue[i];
				index++;
			}
		}

		// Replace queue
		delete queue;
		for (uint256 i = 0; i < activeProposals.length; i++) {
			queue.push(activeProposals[i]);
		}
	}

	/**
	 * @notice Set automation registry address
	 */
	function setAutomationRegistry(address registry) external {
		automationRegistry = registry;
	}

	/**
	 * @notice Get automation stats for monitoring
	 */
	function getAutomationStats()
		external
		view
		returns (
			bool enabled,
			uint256 queueLength,
			uint256 pendingCount,
			uint256 processedCount,
			uint256 lastUpkeep,
			uint256 totalUpkeeps
		)
	{
		uint256 pending = 0;
		uint256 processed = 0;
		uint256 currentTime = mockBlockTimestamp > 0
			? mockBlockTimestamp
			: block.timestamp;

		for (uint256 i = 0; i < queue.length; i++) {
			if (queue[i].snapshot <= currentTime) {
				if (proposals[queue[i].dao][queue[i].proposalId].queued) {
					processed++;
				} else {
					pending++;
				}
			}
		}

		return (
			automationEnabled,
			queue.length,
			pending,
			processed,
			lastUpkeepTimestamp,
			upkeepCounter
		);
	}

	function uintToString(uint256 v) internal pure returns (string memory) {
		if (v == 0) return '0';
		uint256 digits;
		uint256 temp = v;
		while (temp != 0) {
			digits++;
			temp /= 10;
		}
		bytes memory buffer = new bytes(digits);
		while (v != 0) {
			digits -= 1;
			buffer[digits] = bytes1(uint8(48 + uint256(v % 10)));
			v /= 10;
		}
		return string(buffer);
	}

	function toAsciiString(address x) internal pure returns (string memory) {
		bytes memory s = new bytes(42);
		s[0] = '0';
		s[1] = 'x';
		for (uint256 i = 0; i < 20; i++) {
			bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
			bytes1 hi = bytes1(uint8(b) / 16);
			bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
			s[2 * i + 2] = char(hi);
			s[2 * i + 3] = char(lo);
		}
		return string(s);
	}

	function char(bytes1 b) internal pure returns (bytes1 c) {
		if (uint8(b) < 10) return bytes1(uint8(b) + 48);
		else return bytes1(uint8(b) + 87);
	}
}
