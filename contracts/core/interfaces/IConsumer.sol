// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IGovernor} from '../interfaces/IGovernor.sol';

interface IConsumer {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Proposal {
		IGovernor dao;
		uint256 daoId;
		uint256 proposalId;
		uint256 snapshot;
		address voteToken;
		bool queued;
		bool executed;
	}

	struct SendRequestParams {
		string source; // JavaScript source code to execute
		bytes encryptedSecretsUrls; // Encrypted URLs where to fetch user secrets
		uint8 donHostedSecretsSlotID; // Don hosted secrets slot ID
		uint64 donHostedSecretsVersion; // Don hosted secrets version
		string[] args; // List of arguments accessible from within the source code
		bytes[] bytesArgs; // Array of bytes arguments, represented as hex strings
		uint64 subscriptionId; // Billing ID
		uint32 gasLimit; // Array of bytes arguments, represented as hex strings
		bytes32 donID; // Billing ID
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event Response(bytes32 indexed requestId, bytes response, bytes err);
}
