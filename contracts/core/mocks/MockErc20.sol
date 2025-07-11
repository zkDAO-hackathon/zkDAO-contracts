// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockErc20 is ERC20 {
	constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

	function mint(address to, uint256 amount) public {
		_mint(to, amount);
	}

	function decimals() public view virtual override returns (uint8) {
		return 6; // USDC-like decimals
	}
}
