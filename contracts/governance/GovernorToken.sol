// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20Upgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import {ERC20PermitUpgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol';
import {ERC20VotesUpgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {NoncesUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol';
import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import {IGovernorToken} from '../core/interfaces/IGovernorToken.sol';
import {Errors} from '../core/libraries/Errors.sol';

contract GovernorToken is
	Initializable,
	ERC20Upgradeable,
	OwnableUpgradeable,
	ERC20PermitUpgradeable,
	ERC20VotesUpgradeable,
	Errors
{
	/// ======================
	/// ======= Events =======
	/// ======================

	event BatchMinted(address[] recipients, uint256[] amounts);

	/// =========================
	/// ====== Constructor ======
	/// =========================

	constructor() {
		_disableInitializers();
	}

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		string memory _name,
		string memory _symbol,
		address _owner
	) public initializer {
		__ERC20_init(_name, _symbol);
		__Ownable_init(_owner);
		__ERC20Permit_init(_name);
		__ERC20Votes_init();
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function clock() public view override returns (uint48) {
		return uint48(block.timestamp);
	}

	// solhint-disable-next-line func-name-mixedcase
	function CLOCK_MODE() public pure override returns (string memory) {
		return 'mode=timestamp';
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function mint(address to, uint256 amount) public onlyOwner {
		_mint(to, amount);
	}

	function mintBatch(
		address[] memory to,
		uint256[] memory amounts
	) public onlyOwner {
		if (to.length == amounts.length) revert MISMATCH();
		for (uint256 i = 0; i < to.length; i++) {
			_mint(to[i], amounts[i]);
		}

		emit BatchMinted(to, amounts);
	}

	// The following functions are overrides required by Solidity.

	function _update(
		address from,
		address to,
		uint256 value
	) internal override(ERC20Upgradeable, ERC20VotesUpgradeable) {
		super._update(from, to, value);
	}

	function nonces(
		address owner
	)
		public
		view
		override(ERC20PermitUpgradeable, NoncesUpgradeable)
		returns (uint256)
	{
		return super.nonces(owner);
	}

	receive() external payable {}
}
