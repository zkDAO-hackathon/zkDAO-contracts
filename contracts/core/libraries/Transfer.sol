// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import 'solady/src/utils/SafeTransferLib.sol';
import {Native} from './Native.sol';

contract Transfer is Native {
	error AMOUNT_MISMATCH();

	struct TransferData {
		address from;
		address to;
		uint256 amount;
	}

	function _transferAmountsFrom(
		address _token,
		TransferData[] memory _transferData
	) internal virtual returns (bool) {
		uint256 msgValue = msg.value;

		for (uint256 i; i < _transferData.length; ) {
			TransferData memory transferData = _transferData[i];

			if (_token == NATIVE) {
				msgValue -= transferData.amount;
				SafeTransferLib.safeTransferETH(transferData.to, transferData.amount);
			} else {
				SafeTransferLib.safeTransferFrom(
					_token,
					transferData.from,
					transferData.to,
					transferData.amount
				);
			}

			unchecked {
				i++;
			}
		}

		if (msgValue != 0) revert AMOUNT_MISMATCH();

		return true;
	}

	function _transferAmountFrom(
		address _token,
		TransferData memory _transferData
	) internal virtual returns (bool) {
		uint256 amount = _transferData.amount;
		if (_token == NATIVE) {
			if (msg.value < amount) revert AMOUNT_MISMATCH();

			SafeTransferLib.safeTransferETH(_transferData.to, amount);
		} else {
			SafeTransferLib.safeTransferFrom(
				_token,
				_transferData.from,
				_transferData.to,
				amount
			);
		}
		return true;
	}

	function _transferAmount(
		address _token,
		address _to,
		uint256 _amount
	) internal virtual {
		if (_token == NATIVE) {
			SafeTransferLib.safeTransferETH(_to, _amount);
		} else {
			SafeTransferLib.safeTransfer(_token, _to, _amount);
		}
	}

	function _getBalance(
		address _token,
		address _account
	) internal view returns (uint256) {
		if (_token == NATIVE) {
			return payable(_account).balance;
		} else {
			return SafeTransferLib.balanceOf(_token, _account);
		}
	}
}
