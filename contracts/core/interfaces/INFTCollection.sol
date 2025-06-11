// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from '@openzeppelin/contracts/token/ERC721/IERC721.sol';

/**
 * @title INFTCollection Interface
 * @dev Interface for the NFTCollection contract that manages ERC721 collections with minting controls
 * @notice This interface defines all external functions and events for NFT collection management
 */
interface INFTCollection is IERC721 {
	/// =========================
	/// ======== Structs ========
	/// =========================

	/**
	 * @dev Parameters for initializing an NFT collection
	 * @param id Unique identifier for the collection strategy
	 * @param name Collection name (e.g., "Awesome Apes")
	 * @param symbol Collection symbol (e.g., "AA")
	 * @param uri Base URI for token metadata
	 * @param supply Maximum number of tokens that can be minted
	 * @param price Price per token in wei
	 * @param state Initial active/inactive state of the collection
	 */
	struct CollectionParams {
		uint256 campaignId;
		uint256 collectionId;
		string name;
		string symbol;
		string uri;
		uint256 supply;
		uint256 price;
		bool state;
	}

	/// =========================
	/// ======== Events =========
	/// =========================

	/**
	 * @dev Event emitted when the base URI is updated
	 * @param newBaseURI The new base URI for token metadata
	 */
	event BaseURIUpdated(string indexed newBaseURI);

	/**
	 * @dev Event emitted when the mint price is updated
	 * @param newPrice The new price per token in wei
	 */
	event PriceUpdated(uint256 indexed newPrice);

	/**
	 * @dev Event emitted when the collection state is updated
	 * @param newState The new state (true = active, false = inactive)
	 */
	event StateUpdated(bool indexed newState);

	/**
	 * @dev Event emitted when the supply limit is updated
	 * @param newSupply The new maximum supply of tokens
	 */
	event SupplyUpdated(uint256 indexed newSupply);

	/**
	 * @dev Event emitted when a token is successfully minted
	 * @param to Address that received the minted token
	 * @param tokenId The ID of the minted token
	 */
	event TokenMinted(address indexed to, uint256 indexed tokenId);

	/// =========================
	/// ===== Initializer =======
	/// =========================

	/**
	 * @dev Initializes the NFT collection with the given parameters
	 * @param _params Collection initialization parameters
	 * @notice This function can only be called once during proxy initialization
	 * @notice Sets up the ERC721 name, symbol, and collection-specific parameters
	 */
	function initialize(CollectionParams calldata _params) external;

	/// =========================
	/// === External Functions ==
	/// =========================

	/**
	 * @dev Safely mints a new token to the specified address
	 * @param _to Address to receive the minted token
	 * @return tokenId The ID of the newly minted token
	 * @notice Only authorized addresses can call this function
	 * @notice Collection must be active and within supply limits
	 * @notice Reverts if supply limit is reached or collection is inactive
	 */
	function safeMint(address _to) external returns (uint256);

	function burn(uint256 tokenId) external;

	/**
	 * @dev Updates the base URI for token metadata
	 * @param uri New base URI string
	 * @notice Only authorized addresses can call this function
	 * @notice URI cannot be empty string
	 * @notice Emits BaseURIUpdated event
	 */
	function setBaseURI(string calldata uri) external;

	/**
	 * @dev Updates the mint price for tokens
	 * @param _price New price per token in wei
	 * @notice Only authorized addresses can call this function
	 * @notice Price must be greater than 0
	 * @notice Emits PriceUpdated event
	 */
	function setPrice(uint256 _price) external;

	/**
	 * @dev Updates the active/inactive state of the collection
	 * @param _state New state (true = active, false = inactive)
	 * @notice Only authorized addresses can call this function
	 * @notice Cannot set the same state twice
	 * @notice Emits StateUpdated event
	 */
	function setState(bool _state) external;

	/**
	 * @dev Updates the maximum supply of tokens
	 * @param _supply New maximum supply
	 * @notice Only authorized addresses can call this function
	 * @notice New supply cannot be less than current token count
	 * @notice Emits SupplyUpdated event
	 */
	function setSupply(uint256 _supply) external;

	/**
	 * @dev Recovers funds from the contract
	 * @param _token Address of the token to recover (use address(0) for native ETH)
	 * @param _to Address to send recovered funds to
	 * @notice Only authorized addresses can call this function
	 * @notice Reverts if trying to recover native ETH without specifying address(0)
	 * @notice Emits Transfer event for the recovered amount
	 */
	function recoverFunds(address _token, address _to) external;

	/// =========================
	/// ===== View Functions ====
	/// =========================

	/**
	 * @dev Gets the current number of minted tokens
	 * @return uint256 Current token count
	 */
	function tokenCount() external view returns (uint256);

	/**
	 * @dev Gets the maximum supply of tokens
	 * @return uint256 Maximum supply limit
	 */
	function supply() external view returns (uint256);

	/**
	 * @dev Gets the current mint price
	 * @return uint256 Price per token in wei
	 */
	function price() external view returns (uint256);

	/**
	 * @dev Gets the base URI for token metadata
	 * @return string Base URI string
	 */
	function baseURI() external view returns (string memory);

	/**
	 * @dev Gets the current active/inactive state
	 * @return bool Current state (true = active, false = inactive)
	 */
	function state() external view returns (bool);

	/**
	 * @dev Returns the token URI for a given token ID
	 * @param tokenId Token ID to get URI for
	 * @return string Complete token URI
	 * @notice Combines base URI with token-specific metadata
	 */
	function tokenURI(uint256 tokenId) external view returns (string memory);

	/**
	 * @dev Checks if the contract supports a given interface
	 * @param interfaceId Interface identifier to check
	 * @return bool True if interface is supported
	 */
	function supportsInterface(bytes4 interfaceId) external view returns (bool);

	/// =========================
	/// ===== Base Strategy =====
	/// =========================

	function getInhabit() external view returns (address);

	function getCampaignId() external view returns (uint256);

	function getCollectionId() external view returns (uint256);
}
