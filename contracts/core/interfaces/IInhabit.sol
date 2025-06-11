// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IInhabit {
	/// =========================
	/// ======== Events =========
	/// =========================

	event NFTPurchased(
		address indexed buyer,
		uint256 indexed campaignId,
		uint256 indexed collectionId,
		address collection,
		uint256 tokenId,
		address paymentToken,
		uint256 price,
		uint256 referralFee
	);

	event RefundEstablished(
		uint256 indexed campaignId,
		address indexed collectionId,
		address paymentToken,
		uint256 amountPerNFT,
		uint256 totalRefundAmount,
		uint256 totalNFTsSold
	);

	event RefundClaimed(
		uint256 indexed campaignId,
		address indexed collectionId,
		uint256 tokenId,
		address indexed claimer,
		address paymentToken,
		uint256 amount
	);

	event TreasuryUpdated(
		address indexed oldTreasury,
		address indexed newTreasury
	);
}
