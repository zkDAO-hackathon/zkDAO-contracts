import { Address } from 'viem'

export interface NetworkConfigInfo {
	[chainId: string]: {
		blockConfirmations?: number
	}
}

export interface GovernorTokenParams {
	name: string
	symbol: string
}

export interface GovernorParams {
	name: string
	description: string
	logo: string
	votingDelay: bigint
	votingPeriod: bigint
	proposalThreshold: bigint
	quorumFraction: bigint
}

export interface DaoStruct {
	token: Address
	timelock: Address
	governor: Address
	deployer: Address
}
