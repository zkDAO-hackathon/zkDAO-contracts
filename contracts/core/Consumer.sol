// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FunctionsClient} from '@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol';
import {ConfirmedOwner} from '@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol';
import {FunctionsRequest} from '@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol';

import {IGovernor} from '../core/interfaces/IGovernor.sol';
import {Errors} from '../core/libraries/Errors.sol';

contract Consumer is FunctionsClient, ConfirmedOwner, Errors {
	using FunctionsRequest for FunctionsRequest.Request;

	/// ======================
	/// ======= Events =======
	/// ======================

	event Response(bytes32 indexed requestId, bytes response, bytes err);

	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Proposal {
		IGovernor dao;
		address voteToken;
		uint256 daoId;
		uint256 proposalId;
		uint256 snapshot;
		bool queued;
		bool executed;
		// 30 bytes free for future use
	}

	struct SendRequestParams {
		string source;
		bytes encryptedSecretsUrls;
		uint8 donHostedSecretsSlotID;
		uint64 donHostedSecretsVersion;
		string[] args;
		bytes[] bytesArgs;
		uint64 subscriptionId;
		uint32 gasLimit;
		bytes32 donID;
	}

	/// =========================
	/// === Storage Variables ===
	/// =========================

	uint64 internal subscriptionId; // 8 bytes
	uint32 internal gasLimit; // 4 bytes
	// 20 bytes free for future use

	bytes32 internal donID; // 32 bytes
	bytes32 public s_lastRequestId; // 32 bytes
	uint256 private requestCounter; // 32 bytes

	Proposal[] internal queue; // 32 bytes + 20 bytes free for future use
	bytes public s_lastResponse;
	bytes public s_lastError;

	string public source;

	// daoId => proposalId => Proposal
	mapping(IGovernor => mapping(uint256 => Proposal)) internal proposals;
	mapping(bytes32 => Proposal[]) private pendingProposals;
	mapping(bytes32 => bool) private pendingRequests;

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor(
		address _router,
		uint64 _subscriptionId,
		uint32 _gasLimit,
		bytes32 _donID,
		string memory _source
	) FunctionsClient(_router) ConfirmedOwner(msg.sender) {
		subscriptionId = _subscriptionId;
		gasLimit = _gasLimit;
		donID = _donID;
		source = _source;
	}

	/// ==========================
	/// === External Functions ===
	/// ==========================

	function getSubscriptionId() external view returns (uint64) {
		return subscriptionId;
	}

	function getGasLimit() external view returns (uint32) {
		return gasLimit;
	}

	function getDonID() external view returns (bytes32) {
		return donID;
	}

	function getRequestCounter() external view returns (uint256) {
		return requestCounter;
	}

	function getQueue() external view returns (Proposal[] memory) {
		return queue;
	}

	/**
	 * @notice Send a pre-encoded CBOR request
	 * @param _request CBOR-encoded request data
	 * @param _subscriptionId Billing ID
	 * @param _gasLimit The maximum amount of gas the request can consume
	 * @param _donID ID of the job to be invoked
	 * @return requestId The ID of the sent request
	 */

	function sendRequestCBOR(
		bytes memory _request,
		uint64 _subscriptionId,
		uint32 _gasLimit,
		bytes32 _donID
	) external returns (bytes32 requestId) {
		requestId = _sendRequest(_request, _subscriptionId, _gasLimit, _donID);

		s_lastRequestId = requestId;
		pendingRequests[requestId] = true;

		return requestId;
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	/**
	 * @notice Send a request to the Chainlink Functions node
	 * @param _params Parameters for the request
	 * @param _proposals Proposals to be processed in the request
	 * @return requestId The ID of the sent request
	 */

	function sendRequest(
		SendRequestParams memory _params,
		Proposal[] memory _proposals
	) internal returns (bytes32 requestId) {
		FunctionsRequest.Request memory req;

		// 1. Build the Functions request
		req.initializeRequestForInlineJavaScript(_params.source);
		if (_params.encryptedSecretsUrls.length > 0)
			req.addSecretsReference(_params.encryptedSecretsUrls);
		else if (_params.donHostedSecretsVersion > 0) {
			req.addDONHostedSecrets(
				_params.donHostedSecretsSlotID,
				_params.donHostedSecretsVersion
			);
		}
		if (_params.args.length > 0) req.setArgs(_params.args);
		if (_params.bytesArgs.length > 0) req.setBytesArgs(_params.bytesArgs);

		// 2. Set the request parameters
		requestId = _sendRequest(
			req.encodeCBOR(),
			_params.subscriptionId,
			_params.gasLimit,
			_params.donID
		);

		s_lastRequestId = requestId;
		pendingRequests[requestId] = true;

		// 3. Store the proposals in the pendingProposals mapping
		for (uint256 i = 0; i < _proposals.length; ) {
			pendingProposals[requestId].push(_proposals[i]);

			for (uint256 j = 0; j < queue.length; ) {
				if (
					queue[j].dao == _proposals[i].dao &&
					queue[j].proposalId == _proposals[i].proposalId
				) {
					queue[j] = queue[queue.length - 1];
					queue.pop();
					break;
				}

				unchecked {
					j++;
				}
			}

			unchecked {
				i++;
			}
		}

		return requestId;
	}

	/**
	 * @notice Store latest result/error
	 * @param requestId The request ID, returned by sendRequest()
	 * @param response Aggregated response from the user code
	 * @param err Aggregated error from the user code or from the execution pipeline
	 */

	function fulfillRequest(
		bytes32 requestId,
		bytes memory response,
		bytes memory err
	) internal override {
		if (s_lastRequestId != requestId) {
			revert UNEXPECTED_REQUEST_ID(requestId);
		}

		pendingRequests[requestId] = false;

		s_lastResponse = response;
		s_lastError = err;

		if (response.length > 0) {
			string memory concatCIDs = abi.decode(response, (string));
			string[] memory cids = _splitByPipe(concatCIDs);

			Proposal[] memory lastProposals = pendingProposals[s_lastRequestId];

			for (uint256 i = 0; i < lastProposals.length; ) {
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

				unchecked {
					i++;
				}
			}
		}

		emit Response(requestId, s_lastResponse, s_lastError);
	}

	function setSubscriptionId(uint64 _subscriptionId) external {
		subscriptionId = _subscriptionId;
	}

	function setGasLimit(uint32 _gasLimit) external {
		gasLimit = _gasLimit;
	}

	function setDonID(bytes32 _donID) external {
		donID = _donID;
	}

	function setSource(string memory _source) external {
		source = _source;
	}

	/// ==========================
	/// === Private Functions ====
	/// ==========================

	/**
	 * @notice Split a string with "|" delimiter into an array of substrings
	 * @param input The input string to split
	 */

	function _splitByPipe(
		string memory input
	) private pure returns (string[] memory) {
		bytes memory strBytes = bytes(input);
		uint256 count = 1;

		for (uint256 i = 0; i < strBytes.length; ) {
			if (strBytes[i] == '|') count++;

			unchecked {
				i++;
			}
		}

		string[] memory parts = new string[](count);
		uint256 lastIndex = 0;
		uint256 partIndex = 0;

		for (uint256 i = 0; i < strBytes.length; ) {
			if (strBytes[i] == '|') {
				bytes memory part = new bytes(i - lastIndex);
				for (uint256 j = lastIndex; j < i; ) {
					part[j - lastIndex] = strBytes[j];

					unchecked {
						j++;
					}
				}
				parts[partIndex++] = string(part);
				lastIndex = i + 1;
			}
			unchecked {
				i++;
			}
		}

		if (lastIndex < strBytes.length) {
			bytes memory part = new bytes(strBytes.length - lastIndex);
			for (uint256 j = lastIndex; j < strBytes.length; ) {
				part[j - lastIndex] = strBytes[j];

				unchecked {
					j++;
				}
			}
			parts[partIndex] = string(part);
		}

		return parts;
	}
}
