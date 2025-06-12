// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockQueueProposalState
 * @notice Mock implementation of QueueProposalState for local testing
 * @dev Simulates Chainlink Automation behavior without external dependencies
 */
contract MockQueueProposalState {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Proposal {
		address dao;
		uint256 id;
		uint256 snapshot;
	}

	/// =========================
	/// === Storage Variables ===
	/// =========================

	Proposal[] public queue;

	// Mock automation variables
	bool public automationEnabled;
	address public automationRegistry;
	uint256 public lastUpkeepTimestamp;
	uint256 public upkeepCounter;

	// Mock control variables
	mapping(uint256 => bool) public processedProposals;
	bool public forceUpkeepNeeded;
	uint256 public mockBlockTimestamp;

	/// ======================
	/// ======= Events =======
	/// ======================

	event ProposalQueued(uint256 indexed id, uint256 snapshot);
	event ProposalDequeued(uint256 indexed id, uint256 snapshot);
	event UpkeepPerformed(uint256 indexed upkeepId, uint256 proposalsProcessed);
	event AutomationToggled(bool enabled);

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

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {
		automationEnabled = true;
		automationRegistry = msg.sender;
		mockBlockTimestamp = block.timestamp;
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
				queue[i].snapshot <= currentTime && !processedProposals[queue[i].id]
			) {
				count++;
			}
		}

		if (count == 0) {
			return (false, bytes(''));
		}

		Proposal[] memory proposals = new Proposal[](count);
		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (
				queue[i].snapshot <= currentTime && !processedProposals[queue[i].id]
			) {
				proposals[index] = queue[i];
				index++;
			}
		}

		performData = abi.encode(proposals);
		upkeepNeeded = count > 0;
	}

	function getQueueLength() external view returns (uint256) {
		return queue.length;
	}

	function getProposal(uint256 index) external view returns (Proposal memory) {
		require(index < queue.length, 'Index out of bounds');
		return queue[index];
	}

	function getAllProposals() external view returns (Proposal[] memory) {
		return queue;
	}

	function getPendingProposals() external view returns (Proposal[] memory) {
		uint256 count = 0;
		uint256 currentTime = mockBlockTimestamp > 0
			? mockBlockTimestamp
			: block.timestamp;

		for (uint256 i = 0; i < queue.length; i++) {
			if (
				queue[i].snapshot <= currentTime && !processedProposals[queue[i].id]
			) {
				count++;
			}
		}

		Proposal[] memory pending = new Proposal[](count);
		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (
				queue[i].snapshot <= currentTime && !processedProposals[queue[i].id]
			) {
				pending[index] = queue[i];
				index++;
			}
		}

		return pending;
	}

	function isProposalProcessed(
		uint256 proposalId
	) external view returns (bool) {
		return processedProposals[proposalId];
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function performUpkeep(bytes calldata performData) external onlyAutomation {
		require(automationEnabled, 'Automation is disabled');

		Proposal[] memory proposals = abi.decode(performData, (Proposal[]));

		for (uint256 i = 0; i < proposals.length; i++) {
			if (!processedProposals[proposals[i].id]) {
				processedProposals[proposals[i].id] = true;

				// TODO: Implement the logic to handle the queued proposals
				// For now, just mark as processed and emit event

				emit ProposalDequeued(proposals[i].id, proposals[i].snapshot);
			}
		}

		lastUpkeepTimestamp = block.timestamp;
		upkeepCounter++;

		emit UpkeepPerformed(upkeepCounter, proposals.length);
	}

	function queueProposal(
		uint256 daoId,
		uint256 proposalId,
		uint256 snapshot
	) external virtual {
		queue.push(Proposal({dao: msg.sender, id: proposalId, snapshot: snapshot}));

		emit ProposalQueued(proposalId, snapshot);
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
			processedProposals[queue[i].id] = false;
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
			if (!processedProposals[queue[i].id]) {
				activeCount++;
			}
		}

		// Create new array with only active proposals
		Proposal[] memory activeProposals = new Proposal[](activeCount);
		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (!processedProposals[queue[i].id]) {
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
	 * @notice Batch queue multiple proposals for testing
	 */
	function batchQueueProposals(
		address[] calldata daos,
		uint256[] calldata proposalIds,
		uint256[] calldata snapshots
	) external {
		require(
			daos.length == proposalIds.length &&
				proposalIds.length == snapshots.length,
			'Arrays length mismatch'
		);

		for (uint256 i = 0; i < daos.length; i++) {
			queue.push(
				Proposal({dao: daos[i], id: proposalIds[i], snapshot: snapshots[i]})
			);

			emit ProposalQueued(proposalIds[i], snapshots[i]);
		}
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
				if (processedProposals[queue[i].id]) {
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
}
