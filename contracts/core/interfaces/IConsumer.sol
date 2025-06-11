// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IConsumer {
	/// =================================
	/// == External / Public Functions ==
	/// =================================

	/// @notice Send a JavaScript Functions request
	/// @param source JavaScript source code
	/// @param encryptedSecretsUrls Encrypted URLs to fetch user secrets
	/// @param donHostedSecretsSlotID DON-hosted secrets slot ID
	/// @param donHostedSecretsVersion DON-hosted secrets version
	/// @param args List of string arguments
	/// @param bytesArgs List of bytes arguments
	/// @param subscriptionId Chainlink Functions billing subscription ID
	/// @param gasLimit Maximum gas for the request
	/// @param donID ID of the DON job
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
	) external returns (bytes32 requestId);

	/// @notice Send a CBOR-encoded Functions request
	/// @param request CBOR-encoded data
	/// @param subscriptionId Chainlink Functions billing subscription ID
	/// @param gasLimit Maximum gas for the request
	/// @param donID ID of the DON job
	function sendRequestCBOR(
		bytes memory request,
		uint64 subscriptionId,
		uint32 gasLimit,
		bytes32 donID
	) external returns (bytes32 requestId);
}
