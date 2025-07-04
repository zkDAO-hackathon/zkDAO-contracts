import { Address, Hex, parseEther, stringToHex, zeroAddress } from 'viem'

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
const ETHEREUM_SEPOLIA_FUNCTIONS_ROUTER: Address =
	'0xb83E47C2bC239B3bf370bc41e1459A34b41238D0'

const ETHEREUM_SEPOLIA_FUNCTIONS_SUBSCRIPTION_ID: bigint = 5243n

const ETHEREUM_SEPOLIA_FUNCTIONS_DON_ID: Hex =
	'0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000'

const ETHEREUM_SEPOLIA_LINK_TOKEN: Address =
	'0x779877A7B0D9E8603169DdbD7836e478b4624789'

const ETHEREUM_SEPOLIA_CCIP_ROUTER: Address =
	'0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59'

const ETHEREUM_SEPOLIA_CCIP_DESTION_CHAIN_SELECTOR: bigint =
	16015286601757825753n

const ETHEREUM_SEPOLIA_CCIP_BNM_TOKEN: Address =
	'0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05'

const ETHEREUM_SEPOLIA_CCIP_LMN_TOKEN: Address =
	'0x466D489b6d36E7E3b824ef491C225F5830E81cC1'

const ETHEREUM_SEPOLIACCIP_USDC_TOKEN: Address =
	'0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'

// Avalanche Fuji
const AVALANCHE_FUJI_FUNCTIONS_ROUTER: Address =
	'0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0'

const AVALANCHE_FUJI_FUNCTIONS_SUBSCRIPTION_ID: bigint = 0n

const AVALANCHE_FUJI_FUNCTIONS_DON_ID: Hex =
	'0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000'

const AVALANCHE_FUJI_LINK_TOKEN: Address =
	'0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846'

const AVALANCHE_FUJI_CCIP_ROUTER: Address =
	'0xF694E193200268f9a4868e4Aa017A0118C9a8177'

const AVALANCHE_FUJI_CCIP_DESTION_CHAIN_SELECTOR: bigint = 14767482510784806043n

const AVALANCHE_FUJI_CCIP_BNM_TOKEN: Address =
	'0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4'

const AVALANCHE_FUJI_CCIP_LMN_TOKEN: Address =
	'0x70F5c5C40b873EA597776DA2C21929A8282A3b35'

const AVALANCHE_FUJICCIP_USDC_TOKEN: Address =
	'0x7bA2e5c37C4151d654Fcc4b41ffF3Fe693c23852'

// Common
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

export const CCIP_BNM_TOKEN: (chain: string) => Address = (
	chain: string
): Address => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_CCIP_BNM_TOKEN
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_CCIP_BNM_TOKEN
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

export const FUNCTIONS_SUBSCRIPTION_ID: (chain: string) => bigint = (
	chain: string
): bigint => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_FUNCTIONS_SUBSCRIPTION_ID
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_FUNCTIONS_SUBSCRIPTION_ID
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const FUNCTIONS_DON_ID: (chain: string) => Hex = (
	chain: string
): Hex => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_FUNCTIONS_DON_ID
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_FUNCTIONS_DON_ID
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const CCIP_LMN_TOKEN: (chain: string) => Address = (
	chain: string
): Address => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_CCIP_LMN_TOKEN
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_CCIP_LMN_TOKEN
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const CCIP_USDC_TOKEN: (chain: string) => Address = (
	chain: string
): Address => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIACCIP_USDC_TOKEN
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJICCIP_USDC_TOKEN
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const CCIP_ROUTER: (chain: string) => Address = (
	chain: string
): Address => {
	if (chain === 'ethereumSepolia') {
		return ETHEREUM_SEPOLIA_CCIP_ROUTER
	} else if (chain === 'avalancheFuji') {
		return AVALANCHE_FUJI_CCIP_ROUTER
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const CCIP_DESTION_CHAIN_SELECTOR: (chain: string) => bigint = (
	chain: string
): bigint => {
	if (chain === 'ethereumSepolia') {
		return AVALANCHE_FUJI_CCIP_DESTION_CHAIN_SELECTOR
	} else if (chain === 'avalancheFuji') {
		return ETHEREUM_SEPOLIA_CCIP_DESTION_CHAIN_SELECTOR
	} else {
		throw new Error(`Unsupported chain: ${chain}`)
	}
}

export const GOVERNOR_TOKEN_DETERMINISTIC_DEPLOYMENT: Hex =
	stringToHex('governor-token-v14')

export const TIMELOCK_DETERMINISTIC_DEPLOYMENT: Hex =
	stringToHex('timelock-v14')

export const GOVERNOR_DETERMINISTIC_DEPLOYMENT: Hex =
	stringToHex('governor-v14')

export const VERIFIER_DETERMINISTIC_DEPLOYMENT: Hex =
	stringToHex('verifier-v14')

export const ZKDAO_DETERMINISTIC_DEPLOYMENT: Hex = stringToHex('zkdao-v14')

export const PRICE = parseEther('0.000001') // 1 LINK with 18 decimals

export const GAS_LIMIT: bigint = 300_000n // 300,000 gas limit

export const SOURCE = `
	const url = "https://merkle.kaiser-soft.com/merkle-tree/generate-merkle-trees";

	const response = await Functions.makeHttpRequest({
		url,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		data: {
			proposals: args,
		},
	});

	if (response.error) {
		const { status, statusText } = response.response || {};
		throw Error(\`Request failed: \${status ?? "Unknown"} \${statusText ?? "No status text"}\`);
	}

	const { cids } = response.data;

	if (!cids) {
		throw Error("No cids found in the response");
	}

	return Functions.encodeString(cids);
` // Source code for the Functions job

// Args

// Pay for creation of DAO args
const tokenName: string = 'zkDAO token'
const tokenSymbol: string = 'zkDAO'

export const GOVERNOR_TOKEN_PARAMS = {
	name: tokenName,
	symbol: tokenSymbol
}

export const MIN_DELAY: bigint = 0n // 0 minutes
export const proposers: string[] = []
export const executors: string[] = []
export const admin: string = zeroAddress

const name: string = 'Bogota DAO'
const description: string = 'DAO for Bogota'
const logo: string =
	'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafybeibendwijlnunkx7mpsgre2kquvtlt5tnfk7eeydqegyi4hpmrbxai'

const votingDelay: bigint = 250n //
const votingPeriod: bigint = 500n // 150n // 2.5 minutes
const proposalThreshold: bigint = 1n // 0 token
const quorumFraction: bigint = 4n // 4% of total supply

export const GOVERNOR_PARAMS = {
	name,
	description,
	logo,
	votingDelay,
	votingPeriod,
	proposalThreshold,
	quorumFraction
}

const user1: Address = '0x7753E5f36f20B14fFb6b6a61319Eb66f63abdb0b'
const user2: Address = '0xDCF75D1C782fB6459e47cf4Aa9fdc7c9f13f414c'
const user3: Address = '0xD96B642Ca70edB30e58248689CEaFc6E36785d68'

export const TO: Address[] = [
	user1,
	user2,
	user3,
	'0x47cD2d81B7a652AB3AB1088FB06ae02e35D98ADB'
]

export const AMOUNT: bigint = parseEther('0.1') // 1 tokens each
export const AMOUNTS: bigint[] = [AMOUNT, AMOUNT, AMOUNT, AMOUNT]
