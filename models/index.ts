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
	votingDelay: bigint
	votingPeriod: bigint
	proposalThreshold: bigint
	quorumFraction: bigint
}
