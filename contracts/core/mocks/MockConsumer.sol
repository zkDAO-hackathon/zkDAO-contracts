// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockConsumer
 * @notice Mock implementation of Consumer contract for local testing
 * @dev Simulates Chainlink Functions behavior without external dependencies
 */
contract MockConsumer {
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

	address public owner;
	uint256 private requestCounter;

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

	/**
	 * @notice Send a simple request (mocked)
	 * @param source JavaScript source code
	 * @param encryptedSecretsUrls Encrypted URLs where to fetch user secrets
	 * @param donHostedSecretsSlotID Don hosted secrets slotId
	 * @param donHostedSecretsVersion Don hosted secrets version
	 * @param args List of arguments accessible from within the source code
	 * @param bytesArgs Array of bytes arguments, represented as hex strings
	 * @param subscriptionId Billing ID
	 */
	function sendRequest(
		string memory source,
		bytes memory encryptedSecretsUrls,
		uint8 donHostedSecretsSlotID,
		uint64 donHostedSecretsVersion,
		string[] memory args,
		bytes[] memory bytesArgs,
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

		emit RequestSent(requestId, source, args);

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
	 * @param requestId The request ID to fulfill
	 * @param dao Address of the DAO
	 * @param proposalId Proposal ID
	 * @param merkleRoot Merkle root for the proposal
	 */
	function mockFulfillRequest(
		bytes32 requestId,
		address dao,
		uint256 proposalId,
		bytes32 merkleRoot
	) external {
		require(pendingRequests[requestId], 'Request not pending');

		bytes memory response = abi.encode(dao, proposalId, merkleRoot);
		bytes memory err = '';

		fulfillRequest(requestId, response, err);
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

		// Decode response if not empty (same logic as original)
		if (response.length > 0) {
			(address dao, uint256 proposalId, bytes32 merkleRoot) = abi.decode(
				response,
				(address, uint256, bytes32)
			);

			// TODO: Implement the logic to handle the response
			// IGovernor(dao).setRoot(proposalId, merkleRoot);
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
}
