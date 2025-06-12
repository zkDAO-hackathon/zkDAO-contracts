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

export const NATIVE: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Ethreum Sepolia

// Avalanche Fuji

export const TREASURY_ADDRESS: Address =
	'0xd243438f6d14E2097e96D81e56E08C7D847a67A6'

export const SALVIEGA_ADDRESS: Address =
	'0xd7A4467a26d26d00cB6044CE09eBD69EDAC0564C'

export const LUCA_ADDRESS: Address =
	'0x7753E5f36f20B14fFb6b6a61319Eb66f63abdb0b'

export const CELO_ALFAJORES_CUSD_ADDRESS: Address =
	'0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1' // 18 decimals

export const CELO_ALFAJORES_USDC_ADDRESS: Address =
	'0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B' // 6 decimals

export const CELO_ALFAJORES_MOCK_NATIVE_USDT_ADDRESS: Address =
	'0xBba91F588d031469ABCCA566FE80fB1Ad8Ee3287' // 6 by Mento

// Args

export const tokenName: string = 'zkDAO token'
export const tokenSymbol: string = 'zkDAO'

export const minDelay: number = 300 // 5 minutes
export const proposers: string[] = []
export const executors: string[] = []
export const admin: string = zeroAddress

export const name: string = 'zkDAO Governor'
export const tokenAddress: string = zeroAddress
export const timeLockAddress: string = zeroAddress
export const verifierAddress: string = zeroAddress
export const votingDelay: number = 604800 // 1 week
export const votingPeriod: number = 604800 // 1 week
export const proposalThreshold: number = 1 // 0 token
export const votesQuorumFraction: number = 4 // 4% of total supply
