import { Address, Hex, parseEther, zeroAddress } from 'viem'

import { NetworkConfigInfo } from '@/models'

// Hardhat and Localhost are development chains

export const developmentChains = ['hardhat', 'localhost']

export const networkConfig: NetworkConfigInfo = {
	localhost: {},
	hardhat: {},
	ethereumSepolia: {
		blockConfirmations: 3
	},
	avalancheFuji: {
		blockConfirmations: 3
	}
}

// Circuit
export const BN254_FIELD_MODULUS: bigint = BigInt(
	'21888242871839275222246405745257275088548364400416034343698204186575808495617'
)

export const NATIVE: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Ethreum Sepolia

export const ETHEREUM_SEPOLIA_LINK_TOKEN: Address =
	'0x779877A7B0D9E8603169DdbD7836e478b4624789' // Sepolia LINK token address

export const ETHEREUM_SEPOLIA_FUNCTIONS_ROUTER: Address =
	'0xb83E47C2bC239B3bf370bc41e1459A34b41238D0' // Sepolia Function Router address

export const ETHEREUM_SEPOLIA_SUBSCRIPTION_ID: bigint = 5195n // pending subscription ID

export const ETHEREUM_SEPOLIA_DON_ID: Hex =
	'0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000' // Sepolia DON ID

// Avalanche Fuji

export const AVALANCHE_FUJI_LINK_TOKEN: Address =
	'0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846' // Fuji LINK token address

export const AVALANCHE_FUJI_FUNCTIONS_ROUTER: Address =
	'0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0' // Fuji Function Router address

export const AVALANCHE_FUJI_SUBSCRIPTION_ID: bigint = 15681n // subscription ID

export const AVALANCHE_FUJI_DON_ID: Hex =
	'0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000' // Fuji DON ID

// Common

export const PRICE = parseEther('5') // 5 LINK with 18 decimals

export const GAS_LIMIT: bigint = 300_000n // 300,000 gas limit

export const SOURCE: string = 'https://example.com/source' // replace with actual source URL

export const LINK_TOKEN: (chain: string) => Address = (
	chain: string
): Address => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_LINK_TOKEN
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_LINK_TOKEN
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const FUNCTIONS_ROUTER: (chain: string) => Address = (
	chain: string
): Address => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_FUNCTIONS_ROUTER
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_FUNCTIONS_ROUTER
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const SUBSCRIPTION_ID: (chain: string) => bigint = (
	chain: string
): bigint => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_SUBSCRIPTION_ID
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_SUBSCRIPTION_ID
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const DON_ID: (chain: string) => Hex = (chain: string): Hex => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_DON_ID
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_DON_ID
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

// Args

export const tokenName: string = 'zkDAO token'
export const tokenSymbol: string = 'zkDAO'

export const minDelay: number = 300 // 5 minutes
export const proposers: string[] = []
export const executors: string[] = []
export const admin: string = zeroAddress

export const name: string = 'zkDAO Governor'
export const votingDelay: number = 604800 // 1 week
export const votingPeriod: number = 604800 // 1 week
export const proposalThreshold: number = 1 // 0 token
export const votesQuorumFraction: number = 4 // 4% of total supply
