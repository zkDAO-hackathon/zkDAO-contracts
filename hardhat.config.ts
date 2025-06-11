import '@nomicfoundation/hardhat-toolbox-viem'
import '@nomicfoundation/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'hardhat-deploy'
import 'tsconfig-paths/register'

import dotenv from 'dotenv'
import { HardhatUserConfig, SolcUserConfig } from 'hardhat/types'

import { ensureEnvVar } from './utils/ensure-env-var'

// Load environment variables

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const {
	COINMARKETCAP_API_KEY,
	SCAN_API_KEY,
	GAS_REPORT,
	RPC_HTTPS,
	WALLET_PRIVATE_KEY
} = process.env

// Ensure environment variables

const url = ensureEnvVar(RPC_HTTPS, 'CELO_RPC_URL')

const apiKey = ensureEnvVar(SCAN_API_KEY, 'CELOSCAN_API_KEY')

const coinmarketcap = ensureEnvVar(
	COINMARKETCAP_API_KEY,
	'COINMARKETCAP_API_KEY'
)

const enabled = GAS_REPORT === 'true' ? true : false

const walletPrivateKey = ensureEnvVar(WALLET_PRIVATE_KEY, 'PRIVATE_KEY')

// Set up accounts

const accounts: string[] = [walletPrivateKey]

// Set up Solidity compiler

const solcUserConfig = (version: string): SolcUserConfig => {
	return {
		version,
		settings: {
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	}
}

const config: HardhatUserConfig = {
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			allowUnlimitedContractSize: true,
			chainId: 1337
		},
		localhost: {
			allowUnlimitedContractSize: true,
			chainId: 1337,
			url: 'http://localhost:8545'
		},

		celo: {
			chainId: 42220,
			accounts,
			url
		},

		celoAlfajores: {
			chainId: 44787,
			accounts,
			url
		}
	},

	namedAccounts: {
		deployer: {
			default: 0
		},
		luca: {
			default: 1
		},
		juan: {
			default: 2
		},
		santiago: {
			default: 3
		},
		ledger: {
			default: 4
		}
	},

	sourcify: {
		enabled: true
	},

	solidity: {
		compilers: [solcUserConfig('0.8.28')]
	},

	etherscan: {
		apiKey,
		customChains: [
			{
				network: 'celo',
				chainId: 42220,
				urls: {
					apiURL: 'https://api.etherscan.io/v2/api?chainid=42220',
					browserURL: 'https://celoscan.io'
				}
			},
			{
				network: 'celoAlfajores',
				chainId: 44787,
				urls: {
					apiURL: 'https://api.etherscan.io/v2/api?chainid=44787',
					browserURL: 'https://alfajores.celoscan.io'
				}
			}
		]
	},

	gasReporter: {
		enabled,
		coinmarketcap,
		currency: 'USD',
		currencyDisplayPrecision: 5,
		token: 'CELO',
		tokenPrice: '0.4',
		gasPrice: 0.5,
		offline: true,
		includeIntrinsicGas: true,
		reportFormat: 'terminal',
		darkMode: true,
		showMethodSig: true,
		outputFile: 'gas-report.txt'
	},

	typechain: {
		outDir: 'typechain-types',
		target: 'ethers-v6'
	},

	mocha: {
		timeout: 200000
	}
}

export default config
