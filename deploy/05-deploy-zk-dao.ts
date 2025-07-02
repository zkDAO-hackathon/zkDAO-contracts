import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import {
	CCIP_BNM_TOKEN,
	CCIP_DESTION_CHAIN_SELECTOR,
	CCIP_LMN_TOKEN,
	CCIP_ROUTER,
	CCIP_USDC_TOKEN,
	developmentChains,
	FUNCTION_DON_ID,
	FUNCTIONS_ROUTER,
	FUNCTIONS_SUBSCRIPTION_ID,
	GAS_LIMIT,
	LINK_TOKEN,
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

	const chain = network.name

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

	const linkTokenAddress: string = LINK_TOKEN(chain)
	const ccipRouterAddress: string = CCIP_ROUTER(chain)
	const ccipBnmTokenAddress: string = CCIP_BNM_TOKEN(chain)
	const ccipLnmTokenAddress: string = CCIP_LMN_TOKEN(chain)
	const usdcTokenAddress: string = CCIP_USDC_TOKEN(chain)
	const destinationChainSelector: bigint = CCIP_DESTION_CHAIN_SELECTOR(chain)

	const functionsRouterAddress: string = FUNCTIONS_ROUTER(chain)
	const subscriptionId: bigint = FUNCTIONS_SUBSCRIPTION_ID(chain)
	const gasLimit: bigint = GAS_LIMIT
	const donId: string = FUNCTION_DON_ID(chain)
	const source: string = SOURCE

	const implementation = {
		governorToken: governorTokenAddress,
		timelock: timeLockAddress,
		governor: governorAddress,
		verifier: verifierAddress
	}

	const ccipParams = {
		linkToken: linkTokenAddress,
		ccipRouter: ccipRouterAddress,
		ccipBnmToken: ccipBnmTokenAddress,
		ccipLnmToken: ccipLnmTokenAddress,
		usdcToken: usdcTokenAddress,
		destinationChainSelector: destinationChainSelector
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
deployZkDao.tags = ['deploy', 'zkdao']
