// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract MockErc20Fail is IERC20 {
	string public name = 'MockFail';
	string public symbol = 'MF';
	uint8 public decimals = 18;
	uint256 public override totalSupply;

	mapping(address => uint256) private balances;
	mapping(address => mapping(address => uint256)) private allowances;

	function balanceOf(address account) public view override returns (uint256) {
		return balances[account];
	}

	function transfer(address, uint256) public pure override returns (bool) {
		// Siempre falla
		return false;
	}

	function transferFrom(
		address,
		address,
		uint256
	) public pure override returns (bool) {
		// Siempre falla
		return false;
	}

	function approve(
		address spender,
		uint256 amount
	) public override returns (bool) {
		allowances[msg.sender][spender] = amount;
		return true;
	}

	function allowance(
		address owner,
		address spender
	) public view override returns (uint256) {
		return allowances[owner][spender];
	}

	// Función de utilidad para tests
	function mint(address to, uint256 amount) external {
		balances[to] += amount;
		totalSupply += amount;
	}
}
