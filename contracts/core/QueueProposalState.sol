// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AutomationCompatibleInterface} from '@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol';

import {IGovernor} from '../core/interfaces/IGovernor.sol';
import {Consumer} from './Consumer.sol';

contract QueueProposalState is AutomationCompatibleInterface, Consumer {
	/// ======================
	/// ======= Events =======
	/// ======================

	event ProposalQueued(
		address indexed dao,
		uint256 indexed daoId,
		uint256 indexed proposalId,
		uint256 snapshot,
		address voteToken
	);

	event ProposalDequeued(
		address indexed dao,
		uint256 indexed daoId,
		uint256 indexed proposalId,
		uint256 snapshot,
		address voteToken
	);

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor(address _router) Consumer(_router) {}

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

		for (uint256 i = 0; i < queue.length; ) {
			// Check if snapshot is in the past and hasn't been processed
			if (
				queue[i].snapshot <= block.timestamp &&
				!proposals[queue[i].dao][queue[i].proposalId].queued
			) {
				count++;
			}

			unchecked {
				i++;
			}
		}

		if (count == 0) {
			return (false, bytes(''));
		}

		Proposal[] memory proposalsToProcess = new Proposal[](count);
		uint256 index = 0;

		for (uint256 i = 0; i < queue.length; ) {
			if (
				queue[i].snapshot <= block.timestamp &&
				!proposals[queue[i].dao][queue[i].proposalId].queued
			) {
				proposalsToProcess[index] = queue[i];
				index++;
			}

			unchecked {
				i++;
			}
		}

		performData = abi.encode(proposalsToProcess);
		upkeepNeeded = true;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function performUpkeep(bytes calldata performData) external override {
		Proposal[] memory proposalsToProcess = abi.decode(
			performData,
			(Proposal[])
		);

		uint256 validCount = 0;
		for (uint256 i = 0; i < proposalsToProcess.length; ) {
			if (
				!proposals[proposalsToProcess[i].dao][proposalsToProcess[i].proposalId]
					.queued
			) {
				validCount++;
			}

			unchecked {
				i++;
			}
		}

		string[] memory args = new string[](validCount);
		Proposal[] memory validProposals = new Proposal[](validCount);

		uint256 index = 0;

		for (uint256 i = 0; i < proposalsToProcess.length; ) {
			Proposal memory p = proposalsToProcess[i];

			if (!proposals[p.dao][p.proposalId].queued) {
				proposals[p.dao][p.proposalId].queued = true;

				string memory serialized = string(
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

				args[index] = serialized;
				validProposals[index] = p;

				emit ProposalDequeued(
					address(p.dao),
					p.daoId,
					p.proposalId,
					p.snapshot,
					p.voteToken
				);

				index++;
			}

			unchecked {
				i++;
			}
		}

		if (validCount > 0) {
			// TODO: Replace with actual request to Chainlink Functions
			sendRequest(
				SendRequestParams({
					source: 'queueProposal',
					encryptedSecretsUrls: bytes(''), // No secrets in this mock
					donHostedSecretsSlotID: 0, // No DON secrets in this mock
					donHostedSecretsVersion: 0, // No DON secrets in this mock
					args: args,
					bytesArgs: new bytes[](0), // No bytes args in this mock
					subscriptionId: 0, // No subscription in this mock
					gasLimit: 100000, // Arbitrary gas limit for the mock
					donID: bytes32(0) // No DON ID in this mock
				}),
				validProposals
			);
		}
	}

	function _queueProposal(
		uint256 _daoId,
		uint256 _proposalId,
		uint256 _snapshot,
		address voteToken
	) internal virtual {
		queue.push(
			Proposal({
				dao: IGovernor(msg.sender),
				daoId: _daoId,
				proposalId: _proposalId,
				snapshot: _snapshot,
				voteToken: voteToken,
				queued: false,
				executed: false
			})
		);

		emit ProposalQueued(msg.sender, _daoId, _proposalId, _snapshot, voteToken);
	}

	/// =========================
	/// === Helpers Functions ===
	/// =========================

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
