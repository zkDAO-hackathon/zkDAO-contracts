// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IFunctionsRouter} from '@chainlink/contracts/src/v0.8/functions/dev/v1_X/interfaces/IFunctionsRouter.sol';
import {IFunctionsClient} from '@chainlink/contracts/src/v0.8/functions/dev/v1_X/interfaces/IFunctionsClient.sol';
import {FunctionsRequest} from '@chainlink/contracts/src/v0.8/functions/dev/v1_X/libraries/FunctionsRequest.sol';

/// @title Upgradeable Chainlink Functions client contract
/// @notice Contract developers can inherit this contract in order to make Chainlink Functions requests
abstract contract FunctionsClientUpgradeable is IFunctionsClient {
	using FunctionsRequest for FunctionsRequest.Request;

	IFunctionsRouter internal i_router;

	event RequestSent(bytes32 indexed id);
	event RequestFulfilled(bytes32 indexed id);

	error OnlyRouterCanFulfill();

	/// @notice Initializer instead of constructor (for upgradeable pattern)
	/// @param router The address of the Chainlink Functions router
	function __FunctionsClient_init(address router) internal {
		i_router = IFunctionsRouter(router);
	}

	/// @notice Sends a Chainlink Functions request
	/// @param data The CBOR encoded bytes data for a Functions request
	/// @param subscriptionId The subscription ID that will be charged to service the request
	/// @param callbackGasLimit The gas available for the fulfillment callback
	/// @param donId The DON ID used for the request
	/// @return requestId The generated request ID for this request
	function _sendRequest(
		bytes memory data,
		uint64 subscriptionId,
		uint32 callbackGasLimit,
		bytes32 donId
	) internal returns (bytes32) {
		bytes32 requestId = i_router.sendRequest(
			subscriptionId,
			data,
			FunctionsRequest.REQUEST_DATA_VERSION,
			callbackGasLimit,
			donId
		);
		emit RequestSent(requestId);
		return requestId;
	}

	/// @notice User defined function to handle a response from the DON
	/// @dev Must be implemented by inheriting contracts
	function fulfillRequest(
		bytes32 requestId,
		bytes memory response,
		bytes memory err
	) internal virtual;

	/// @inheritdoc IFunctionsClient
	function handleOracleFulfillment(
		bytes32 requestId,
		bytes memory response,
		bytes memory err
	) external override {
		if (msg.sender != address(i_router)) {
			revert OnlyRouterCanFulfill();
		}
		fulfillRequest(requestId, response, err);
		emit RequestFulfilled(requestId);
	}
}
