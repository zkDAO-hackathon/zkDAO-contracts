import { Address } from 'viem'

import { NetworkConfigInfo } from '@/models'

// Hardhat and Localhost are development chains

export const developmentChains = ['hardhat', 'localhost']

export const networkConfig: NetworkConfigInfo = {
	localhost: {},
	hardhat: {},
	celo: {
		blockConfirmations: 3
	},
	celoAlfajores: {
		blockConfirmations: 3
	}
}

// NFT Collections

export const NFT_COLLECTIONS = {
	caracoli: {
		metadataUrl:
			'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafkreiczdctjncnwxrnuuaz66wgv37a4u7ycrqnkt2n73cu4bafdv5z5oa',
		price: 2000n
	},
	jaguar: {
		metadataUrl:
			'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafkreih4fccggynla475clgzrj2rs2ulggxvi7lwyavhjcyjeuxjduetoq',
		price: 5000n
	},
	paujil: {
		metadataUrl:
			'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafkreig63uzhbc2p3nddkkqtw3ildtgbcc7buoyd6flnz6qyzk2m3beuxe',
		price: 500n
	},
	titi: {
		metadataUrl:
			'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafkreihqsoyx6iiqxjp2qughd54xz2gtgddj2ivjgwfqfnitvkkmkmg6au',
		price: 50n
	}
}

export const NATIVE: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Celo Mainnet

// Celo Alfajores

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
