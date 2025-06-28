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

export const GOVERNOR_TOKEN_DETERMINISTIC_DEPLOYMENT: Hex =
	stringToHex('governor-token-v4')

export const TIMELOCK_DETERMINISTIC_DEPLOYMENT: Hex = stringToHex('timelock-v4')

export const GOVERNOR_DETERMINISTIC_DEPLOYMENT: Hex = stringToHex('governor-v4')

export const VERIFIER_DETERMINISTIC_DEPLOYMENT: Hex = stringToHex('verifier-v4')

export const PRICE = parseEther('2') // 5 LINK with 18 decimals

export const GAS_LIMIT: bigint = 300_000n // 300,000 gas limit

export const SOURCE = `
	// No authentication. demonstrate POST with data in body
	// callgraphql api: https://github.com/trevorblades/countries
	// docs: https://trevorblades.github.io/countries/queries/continent

	// make HTTP request
	const url =
		"https://9134-186-84-89-97.ngrok-free.app/merkle-tree/generate-merkle-trees";

	console.log(\`HTTP POST Request to \${url}\`);

	const response = await Functions.makeHttpRequest({
		url: url,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		data: {
			proposals: args,
		},
	});

	if (response.error) {
		console.error(
			response.response
				? \`\${response.response.status},\${response.response.statusText}\`
				: ""
		);

		throw Error("Request failed");
	}

	const { merkleRoots } = response.data;

	if (!merkleRoots) {
		throw Error(\`No merkle trees found in the response\`);
	}

	return Functions.encodeString(merkleRoots);
` // Source code for the Functions job

// Args

// Pay for creation of DAO args
const tokenName: string = 'zkDAO token'
const tokenSymbol: string = 'zkDAO'

export const GOVERNOR_TOKEN_PARAMS = {
	name: tokenName,
	symbol: tokenSymbol
}

export const MIN_DELAY: bigint = 150n // 2.5 minutes
export const proposers: string[] = []
export const executors: string[] = []
export const admin: string = zeroAddress

const name: string = 'Bogota DAO'
const description: string = 'DAO for Bogota'
const logo: string =
	'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafybeibendwijlnunkx7mpsgre2kquvtlt5tnfk7eeydqegyi4hpmrbxai'

const votingDelay: bigint = 150n // 2.5 minutes
const votingPeriod: bigint = 150n // 2.5 minutes
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

export const TO: Address[] = [user1, user2, user3]

export const AMOUNT: bigint = parseEther('2') // 3 tokens each
export const AMOUNTS: bigint[] = [AMOUNT, AMOUNT, AMOUNT]
