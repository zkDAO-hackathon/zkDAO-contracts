// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AutomationCompatibleInterface} from '@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol';

import {Errors} from '../core/libraries/Errors.sol';

contract QueueProposalState is AutomationCompatibleInterface, Errors {
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

	/// ======================
	/// ======= Events =======
	/// ======================

	event ProposalQueued(uint256 indexed id, uint256 snapshot);
	event ProposalDequeued(uint256 indexed id, uint256 snapshot);

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function checkUpkeep(
		bytes calldata /* checkData */
	)
		external
		view
		override
		returns (bool upkeepNeeded, bytes memory performData)
	{
		uint256 count = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (queue[i].snapshot >= block.timestamp) {
				count++;
			}
		}

		if (count == 0) {
			return (false, bytes(''));
		}

		Proposal[] memory proposals = new Proposal[](count);
		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; i++) {
			if (queue[i].snapshot >= block.timestamp) {
				proposals[index] = queue[i];
				index++;
			}
		}

		performData = abi.encode(proposals);
		upkeepNeeded = count > 0;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function performUpkeep(bytes calldata performData) external override {
		Proposal[] memory proposals = abi.decode(performData, (Proposal[]));

		for (uint256 i = 0; i < proposals.length; i++) {
			// TODO: Implement the logic to handle the queued proposals
			emit ProposalDequeued(proposals[i].id, proposals[i].snapshot);
		}
	}

	function queueProposal(
		uint256 daoId,
		uint256 proposalId,
		uint256 snapshot
	) internal {
		queue.push(Proposal({dao: msg.sender, id: proposalId, snapshot: snapshot}));
		emit ProposalQueued(proposalId, snapshot);
	}
}
