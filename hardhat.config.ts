import '@nomicfoundation/hardhat-toolbox-viem'
import '@nomicfoundation/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'hardhat-deploy'
import 'tsconfig-paths/register'

import dotenv from 'dotenv'
import { HardhatUserConfig, SolcUserConfig } from 'hardhat/types'
import { avalancheFuji, localhost, sepolia } from 'viem/chains'

import { ensureEnvVar } from './utils/ensure-env-var'

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV}` })
dotenv.config()

const {
	COINMARKETCAP_API_KEY,
	SCAN_API_KEY,
	GAS_REPORT,
	RPC_HTTPS,
	STAGING_WALLET_PRIVATE_KEY,
	STAGING_FACTORY_WALLET_PUBLIC_KEY,
	STAGING_FACTORY_WALLET_PRIVATE_KEY
} = process.env

// Ensure environment variables
const url = ensureEnvVar(RPC_HTTPS, 'RPC_HTTPS')

const apiKey = ensureEnvVar(SCAN_API_KEY, 'SCAN_API_KEY')

const coinmarketcap = ensureEnvVar(
	COINMARKETCAP_API_KEY,
	'COINMARKETCAP_API_KEY'
)

const enabled = GAS_REPORT === 'true' ? true : false

const walletPrivateKey = ensureEnvVar(
	STAGING_WALLET_PRIVATE_KEY,
	'STAGING_WALLET_PRIVATE_KEY'
)

const factoryWalletPublicKey = ensureEnvVar(
	STAGING_FACTORY_WALLET_PUBLIC_KEY,
	'STAGING_FACTORY_WALLET_PUBLIC_KEY'
)

const factoryWalletPrivateKey = ensureEnvVar(
	STAGING_FACTORY_WALLET_PRIVATE_KEY,
	'STAGING_FACTORY_WALLET_PRIVATE_KEY'
)

// Set up accounts
const accounts: string[] = [walletPrivateKey, factoryWalletPrivateKey]

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
			url: 'http://127.0.0.1:8545',
			chainId: localhost.id
		},
		ethereumSepolia: {
			url,
			accounts,
			chainId: sepolia.id
		},
		avalancheFuji: {
			url,
			accounts,
			chainId: avalancheFuji.id
		}
	},

	namedAccounts: {
		deployer: {
			default: 0
		},

		factory: { default: factoryWalletPublicKey },

		user1: {
			default: 1
		},
		user2: {
			default: 2
		},
		user3: {
			default: 3
		},
		user4: {
			default: 4
		}
	},

	sourcify: {
		enabled: true
	},

	solidity: {
		compilers: [solcUserConfig('0.8.28')],
		overrides: {
			'contracts/core/Verifier.sol': {
				version: '0.8.28',
				settings: {
					optimizer: {
						enabled: true,
						runs: 2000
					}
				}
			}
		}
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
