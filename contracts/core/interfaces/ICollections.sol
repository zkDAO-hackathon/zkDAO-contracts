// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICollections {
	/// =========================
	/// ======== Structs ========
	/// =========================

	struct Refund {
		bool claimed;
	}

	struct Purchase {
		address collection;
		uint256 tokenId;
		address paymentToken;
		uint256 price;
		uint256 referralFee;
		uint256 campaignId;
		uint256 timestamp;
		bool refunded;
	}

	struct CollectionParams {
		string name;
		string symbol;
		string uri;
		uint256 supply;
		uint256 price;
		bool state;
	}

	struct Collection {
		string name;
		string symbol;
		string uri;
		uint256 supply;
		uint256 price;
		bool state;
		address creator;
		uint256 tokenCount;
	}

	struct Campaign {
		address[] collections;
		bool state;
		address creator;
		uint256 goal;
		uint256 fundsRaised;
	}

	/// =========================
	/// ======== Events =========
	/// =========================

	event CampaignCreated(
		uint256 indexed campaignId,
		address indexed creator,
		CollectionParams[] collections
	);

	event CampaignStatusUpdated(uint256 indexed campaignId, bool status);

	event CollectionCreated(
		address indexed collection,
		address indexed creator,
		string name,
		string symbol,
		uint256 supply,
		uint256 price
	);

	event NFTPurchased(
		uint256 indexed campaignId,
		address indexed collection,
		address paymentToken,
		address indexed buyer,
		uint256 tokenId,
		uint256 price,
		uint256 timestamp,
		bool refunded
	);

	event CollectionBaseURIUpdated(
		uint256 indexed campaignId,
		address indexed collection,
		string baseURI
	);

	event CollectionPriceUpdated(
		uint256 indexed campaignId,
		address indexed collection,
		uint256 price
	);

	event CollectionStateUpdated(
		uint256 indexed campaignId,
		address indexed collection,
		bool state
	);

	event CollectionSupplyUpdated(
		uint256 indexed campaignId,
		address indexed collection,
		uint256 supply
	);

	event NftCollectionUpdated(address indexed collection);
}
