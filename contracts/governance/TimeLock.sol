// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TimelockControllerUpgradeable} from '@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

import {ITimeLock} from '../core/interfaces/ITimeLock.sol';

contract TimeLock is Initializable, TimelockControllerUpgradeable {
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
		uint256 _minDelay,
		address[] memory _proposers,
		address[] memory _executors,
		address _admin
	) public override(TimelockControllerUpgradeable) initializer {
		__TimelockController_init(_minDelay, _proposers, _executors, _admin);
	}
}
