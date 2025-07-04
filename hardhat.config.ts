import '@nomicfoundation/hardhat-toolbox-viem'
import '@nomicfoundation/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'hardhat-deploy'
import 'tsconfig-paths/register'
import './tasks'

import dotenv from 'dotenv'
import { HardhatUserConfig, SolcUserConfig } from 'hardhat/types'
import { avalancheFuji, localhost, sepolia } from 'viem/chains'

import { ensureEnvVar } from './utils/ensure-env-var'

// Load environment variables
dotenv.config()

const {
	SCAN_API_KEY,
	ETHEREUM_SEPOLIA_RPC_HTTPS,
	AVALANCHE_FUJI_RPC_HTTPS,
	STAGING_WALLET_PRIVATE_KEY,
	STAGING_FACTORY_WALLET_PUBLIC_KEY,
	STAGING_FACTORY_WALLET_PRIVATE_KEY,
	STAGING_USER1_WALLET_PUBLIC_KEY,
	STAGING_USER1_WALLET_PRIVATE_KEY,
	STAGING_USER2_WALLET_PUBLIC_KEY,
	STAGING_USER2_WALLET_PRIVATE_KEY,
	STAGING_USER3_WALLET_PUBLIC_KEY,
	STAGING_USER3_WALLET_PRIVATE_KEY
} = process.env

// Ensure environment variables
const ethereumSepoliaUrl = ensureEnvVar(
	ETHEREUM_SEPOLIA_RPC_HTTPS,
	'ETHEREUM_SEPOLIA_RPC_HTTPS'
)

const avalancheFujiUrl = ensureEnvVar(
	AVALANCHE_FUJI_RPC_HTTPS,
	'AVALANCHE_FUJI_RPC_HTTPS'
)

const apiKey = ensureEnvVar(SCAN_API_KEY, 'SCAN_API_KEY')

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

const user1WalletPublicKey = ensureEnvVar(
	STAGING_USER1_WALLET_PUBLIC_KEY,
	'STAGING_USER1_WALLET_PUBLIC_KEY'
)

const user1WalletPrivateKey = ensureEnvVar(
	STAGING_USER1_WALLET_PRIVATE_KEY,
	'STAGING_USER1_WALLET_PRIVATE_KEY'
)

const user2WalletPublicKey = ensureEnvVar(
	STAGING_USER2_WALLET_PUBLIC_KEY,
	'STAGING_USER2_WALLET_PUBLIC_KEY'
)

const user2WalletPrivateKey = ensureEnvVar(
	STAGING_USER2_WALLET_PRIVATE_KEY,
	'STAGING_USER2_WALLET_PRIVATE_KEY'
)

const user3WalletPublicKey = ensureEnvVar(
	STAGING_USER3_WALLET_PUBLIC_KEY,
	'STAGING_USER3_WALLET_PUBLIC_KEY'
)

const user3WalletPrivateKey = ensureEnvVar(
	STAGING_USER3_WALLET_PRIVATE_KEY,
	'STAGING_USER3_WALLET_PRIVATE_KEY'
)

// Set up accounts
const accounts: string[] = [
	walletPrivateKey,
	factoryWalletPrivateKey,
	user1WalletPrivateKey,
	user2WalletPrivateKey,
	user3WalletPrivateKey
]

// Set up Solidity compiler
const solcUserConfig = (version: string): SolcUserConfig => {
	return {
		version,
		settings: {
			optimizer: {
				enabled: true,
				runs: 50
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
			url: ethereumSepoliaUrl,
			accounts,
			chainId: sepolia.id
		},
		avalancheFuji: {
			url: avalancheFujiUrl,
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
			default: user1WalletPublicKey
		},
		user2: {
			default: user2WalletPublicKey
		},
		user3: {
			default: user3WalletPublicKey
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
		apiKey
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
