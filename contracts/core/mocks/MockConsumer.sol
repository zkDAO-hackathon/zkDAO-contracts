// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGovernor} from '../interfaces/IGovernor.sol';

/**
 * @title MockConsumer
 * @notice Mock implementation of Consumer contract for local testing
 * @dev Simulates Chainlink Functions behavior without external dependencies
 */
contract MockConsumer {
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
	}

	/// ======================
	/// ======= Errors =======
	/// ======================

	error UnexpectedRequestID(bytes32 requestId);

	/// =========================
	/// === Storage Variables ===
	/// =========================

	bytes32 public s_lastRequestId;
	bytes public s_lastResponse;
	bytes public s_lastError;

	Proposal[] internal queue;

	address public owner;
	uint256 private requestCounter;

	// daoId => proposalId => Proposal
	mapping(IGovernor => mapping(uint256 => Proposal)) internal proposals;
	mapping(bytes32 => Proposal[]) private pendingProposals;

	// Mock storage for simulating responses
	mapping(bytes32 => bytes) private mockResponses;
	mapping(bytes32 => bytes) private mockErrors;
	mapping(bytes32 => bool) private pendingRequests;

	/// ======================
	/// ======= Events =======
	/// ======================

	event Response(bytes32 indexed requestId, bytes response, bytes err);
	event RequestSent(bytes32 indexed requestId, string source, string[] args);

	/// ========================
	/// ======= Modifiers ======
	/// ========================

	modifier onlyOwner() {
		require(msg.sender == owner, 'Not the owner');
		_;
	}

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {
		owner = msg.sender;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function sendRequest(
		SendRequestParams memory params,
		Proposal[] memory _proposals
	) internal onlyOwner returns (bytes32 requestId) {
		// Generate mock request ID
		requestId = keccak256(
			abi.encodePacked(
				block.timestamp,
				block.prevrandao,
				msg.sender,
				requestCounter++
			)
		);

		for (uint256 i = 0; i < _proposals.length; i++) {
			pendingProposals[requestId].push(_proposals[i]);

			for (uint256 j = 0; j < queue.length; j++) {
				if (
					queue[j].dao == _proposals[i].dao &&
					queue[j].proposalId == _proposals[i].proposalId
				) {
					queue[j] = queue[queue.length - 1];
					queue.pop();
					break;
				}
			}
		}

		s_lastRequestId = requestId;
		pendingRequests[requestId] = true;

		emit RequestSent(requestId, params.source, params.args);

		return requestId;
	}

	/**
	 * @notice Send a pre-encoded CBOR request (mocked)
	 */
	function sendRequestCBOR(
		bytes memory request,
		uint64 subscriptionId,
		uint32 gasLimit,
		bytes32 donID
	) external onlyOwner returns (bytes32 requestId) {
		// Generate mock request ID
		requestId = keccak256(
			abi.encodePacked(
				block.timestamp,
				block.prevrandao,
				msg.sender,
				requestCounter++
			)
		);

		s_lastRequestId = requestId;
		pendingRequests[requestId] = true;

		return requestId;
	}

	/// ================================
	/// ===== Mock Helper Functions ===
	/// ================================

	/**
	 * @notice Mock function to simulate successful response
	 * @param _requestId The request ID to fulfill
	 * @param _cids Merkle root for the proposal
	 */
	function mockFulfillRequest(
		bytes32 _requestId,
		string memory _cids
	) external {
		require(pendingRequests[_requestId], 'Request not pending');

		bytes memory response = abi.encode(_cids);
		bytes memory err = '';

		fulfillRequest(_requestId, response, err);
	}

	/**
	 * @notice Mock function to simulate error response
	 * @param requestId The request ID to fulfill with error
	 * @param errorMessage Error message to return
	 */
	function mockFulfillRequestWithError(
		bytes32 requestId,
		string memory errorMessage
	) external {
		require(pendingRequests[requestId], 'Request not pending');

		bytes memory response = '';
		bytes memory err = bytes(errorMessage);

		fulfillRequest(requestId, response, err);
	}

	/**
	 * @notice Set predefined response for a request (for advanced testing)
	 * @param requestId Request ID
	 * @param response Response data
	 * @param err Error data
	 */
	function setPredefinedResponse(
		bytes32 requestId,
		bytes memory response,
		bytes memory err
	) external onlyOwner {
		mockResponses[requestId] = response;
		mockErrors[requestId] = err;
	}

	/**
	 * @notice Auto-fulfill request with predefined response
	 * @param requestId Request ID to auto-fulfill
	 */
	function autoFulfillRequest(bytes32 requestId) external {
		require(pendingRequests[requestId], 'Request not pending');

		bytes memory response = mockResponses[requestId];
		bytes memory err = mockErrors[requestId];

		fulfillRequest(requestId, response, err);
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	/**
	 * @notice Store latest result/error (same as original)
	 * @param requestId The request ID, returned by sendRequest()
	 * @param response Aggregated response from the user code
	 * @param err Aggregated error from the user code or from the execution pipeline
	 */
	function fulfillRequest(
		bytes32 requestId,
		bytes memory response,
		bytes memory err
	) internal {
		if (!pendingRequests[requestId]) {
			revert UnexpectedRequestID(requestId);
		}

		// Mark request as completed
		pendingRequests[requestId] = false;

		s_lastResponse = response;
		s_lastError = err;

		if (response.length > 0) {
			string memory concatCIDs = abi.decode(response, (string));

			string[] memory cids = splitByPipe(concatCIDs);

			Proposal[] memory lastProposals = pendingProposals[s_lastRequestId];

			for (uint256 i = 0; i < lastProposals.length; i++) {
				if (
					!proposals[lastProposals[i].dao][lastProposals[i].proposalId].executed
				) {
					IGovernor(lastProposals[i].dao).setRoot(
						lastProposals[i].proposalId,
						cids[i]
					);

					proposals[lastProposals[i].dao][lastProposals[i].proposalId]
						.executed = true;
				}
			}
		}

		emit Response(requestId, s_lastResponse, s_lastError);
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	/**
	 * @notice Check if request is pending
	 */
	function isRequestPending(bytes32 requestId) external view returns (bool) {
		return pendingRequests[requestId];
	}

	/**
	 * @notice Get request counter for testing
	 */
	function getRequestCounter() external view returns (uint256) {
		return requestCounter;
	}

	/**
	 * @notice Transfer ownership
	 */
	function transferOwnership(address newOwner) external onlyOwner {
		owner = newOwner;
	}

	function _handleProposalRoot(
		Proposal memory _proposal,
		bytes32 root
	) internal {
		// IGovernor(_proposal.dao).setRoot(p.proposalId, root);
	}

	function splitByPipe(
		string memory input
	) public pure returns (string[] memory) {
		bytes memory strBytes = bytes(input);
		uint256 count = 1;

		for (uint256 i = 0; i < strBytes.length; i++) {
			if (strBytes[i] == '|') count++;
		}

		string[] memory parts = new string[](count);
		uint256 lastIndex = 0;
		uint256 partIndex = 0;

		for (uint256 i = 0; i < strBytes.length; i++) {
			if (strBytes[i] == '|') {
				bytes memory part = new bytes(i - lastIndex);
				for (uint256 j = lastIndex; j < i; j++) {
					part[j - lastIndex] = strBytes[j];
				}
				parts[partIndex++] = string(part);
				lastIndex = i + 1;
			}
		}

		if (lastIndex < strBytes.length) {
			bytes memory part = new bytes(strBytes.length - lastIndex);
			for (uint256 j = lastIndex; j < strBytes.length; j++) {
				part[j - lastIndex] = strBytes[j];
			}
			parts[partIndex] = string(part);
		}

		return parts;
	}

	function splitRoots(
		string memory input
	) internal pure returns (string[] memory) {
		bytes memory inputBytes = bytes(input);
		uint256 count = 1;

		for (uint256 i = 0; i < inputBytes.length; i++) {
			if (inputBytes[i] == 'e') {
				count++;
			}
		}

		string[] memory parts = new string[](count);
		uint256 lastIndex = 0;
		uint256 partIndex = 0;

		for (uint256 i = 0; i < inputBytes.length; i++) {
			if (inputBytes[i] == 'e') {
				bytes memory part = new bytes(i - lastIndex);
				for (uint256 j = lastIndex; j < i; j++) {
					part[j - lastIndex] = inputBytes[j];
				}
				parts[partIndex++] = string(part);
				lastIndex = i + 1;
			}
		}

		if (lastIndex < inputBytes.length) {
			bytes memory part = new bytes(inputBytes.length - lastIndex);
			for (uint256 j = lastIndex; j < inputBytes.length; j++) {
				part[j - lastIndex] = inputBytes[j];
			}
			parts[partIndex] = string(part);
		}

		return parts;
	}

	function convertStringsToBytes32(
		string[] memory input
	) internal pure returns (bytes32[] memory) {
		bytes32[] memory result = new bytes32[](input.length);

		for (uint256 i = 0; i < input.length; i++) {
			result[i] = toBytes32(input[i]);
		}

		return result;
	}

	function toBytes32(
		string memory source
	) internal pure returns (bytes32 result) {
		bytes memory temp = bytes(source);
		require(temp.length == 66 || temp.length == 64, 'Invalid length'); // with or without "0x"

		uint256 start = (temp[0] == '0' && temp[1] == 'x') ? 2 : 0;

		assembly {
			result := mload(add(temp, add(32, start)))
		}
	}
}
