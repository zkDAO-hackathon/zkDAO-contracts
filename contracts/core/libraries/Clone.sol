// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/proxy/Clones.sol';

library Clone {
	function createClone(
		address _contract,
		address _deployer,
		uint256 _nonce
	) internal returns (address) {
		bytes32 salt = keccak256(abi.encodePacked(_deployer, _nonce));

		return Clones.cloneDeterministic(_contract, salt);
	}
}
