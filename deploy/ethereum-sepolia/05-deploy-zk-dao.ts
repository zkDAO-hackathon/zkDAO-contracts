import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import {
	AVALANCHE_FUJI_CCIP_DESTION_CHAIN_SELECTOR,
	developmentChains,
	ETHEREUM_SEPOLIA__USDC_TOKEN,
	ETHEREUM_SEPOLIA_CCIP_BNM_TOKEN,
	ETHEREUM_SEPOLIA_CCIP_LMN_TOKEN,
	ETHEREUM_SEPOLIA_DON_ID,
	ETHEREUM_SEPOLIA_FUNCTIONS_ROUTER,
	ETHEREUM_SEPOLIA_LINK_TOKEN,
	ETHEREUM_SEPOLIA_SUBSCRIPTION_ID,
	GAS_LIMIT,
	networkConfig,
	SOURCE
} from '@/config/const'
import { verify } from '@/utils/verify'

const deployZkDao: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log, get, save } = deployments
	const { deployer, factory } = await getNamedAccounts()

	const governorToken = await get('GovernorToken')
	const timeLock = await get('TimeLock')
	const governor = await get('Governor')
	const verifier = await get('HonkVerifier')

	log('----------------------------------------------------')
	log('Deploying ZKDAO and waiting for confirmations...')

	const governorTokenAddress: string = governorToken.address
	const timeLockAddress: string = timeLock.address
	const governorAddress: string = governor.address
	const verifierAddress: string = verifier.address

	const linkTokenAddress: string = ETHEREUM_SEPOLIA_LINK_TOKEN
	const ccipRouterAddress: string = ETHEREUM_SEPOLIA_FUNCTIONS_ROUTER // Using the same address for Functions Router
	const ccipBnmTokenAddress: string = ETHEREUM_SEPOLIA_CCIP_BNM_TOKEN // Using LINK token for CCIP BNM
	const ccipLmnTokenAddress: string = ETHEREUM_SEPOLIA_CCIP_LMN_TOKEN // Using LINK token for CCIP LMN
	const usdcTokenAddress: string = ETHEREUM_SEPOLIA__USDC_TOKEN // Using LINK token for USDC
	const avalancheFujiSelector: bigint =
		AVALANCHE_FUJI_CCIP_DESTION_CHAIN_SELECTOR

	const functionsRouterAddress: string = ETHEREUM_SEPOLIA_FUNCTIONS_ROUTER
	const subscriptionId: bigint = ETHEREUM_SEPOLIA_SUBSCRIPTION_ID
	const gasLimit: bigint = GAS_LIMIT
	const donId: string = ETHEREUM_SEPOLIA_DON_ID
	const source: string = SOURCE

	const implementation = {
		governorToken: governorTokenAddress,
		timelock: timeLockAddress,
		governor: governorAddress,
		verifier: verifierAddress
	}

	const ccipParams = {
		linkTokenAddress,
		ccipRouterAddress,
		ccipBnmToken: ccipBnmTokenAddress,
		ccipLmnToken: ccipLmnTokenAddress,
		usdcToken: usdcTokenAddress,
		avalancheFujiSelector: avalancheFujiSelector
	}

	const args = [
		implementation,
		ccipParams,
		factory,
		functionsRouterAddress,
		subscriptionId,
		gasLimit,
		donId,
		source
	]

	const zkDao = await deploy('ZKDAO', {
		from: deployer,
		args,
		contract: 'ZKDAO',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`ZKDAO contract at ${zkDao.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(zkDao.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('ZKDAO')
	await save('ZKDAO', {
		address: zkDao.address,
		...artifact
	})

	// log('----------------------------------------------------')
	// log('Funding factory wallet with NATIVE token...')

	// const wallet = await hre.viem.getWalletClient(deployer)

	// const transferNativeTokenTx = await wallet.sendTransaction({
	// 	account: deployer,
	// 	to: factory,
	// 	value: parseEther('0.1') // 0.01 ETH
	// })

	// log(`Factory wallet funded with NATIVE token: ${transferNativeTokenTx}`)
}

export default deployZkDao
deployZkDao.tags = ['ethereumSepolia', 'es-deploy', 'es-ZKDAO']
