import { Address, zeroAddress } from 'viem'

import { NetworkConfigInfo } from '@/models'

// Hardhat and Localhost are development chains

export const developmentChains = ['hardhat', 'localhost']

export const networkConfig: NetworkConfigInfo = {
	localhost: {},
	hardhat: {},
	ethreumSepolia: {
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

// Avalanche Fuji

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
