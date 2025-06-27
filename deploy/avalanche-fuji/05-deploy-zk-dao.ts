import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { parseEther } from 'viem'

import {
	AVALANCHE_FUJI_DON_ID,
	AVALANCHE_FUJI_FUNCTIONS_ROUTER,
	AVALANCHE_FUJI_LINK_TOKEN,
	AVALANCHE_FUJI_SUBSCRIPTION_ID,
	developmentChains,
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

	const linkTokenAddress: string = AVALANCHE_FUJI_LINK_TOKEN
	const governorTokenAddress: string = governorToken.address
	const timeLockAddress: string = timeLock.address
	const governorAddress: string = governor.address
	const verifierAddress: string = verifier.address
	const routerAddress: string = AVALANCHE_FUJI_FUNCTIONS_ROUTER
	const subscriptionId: bigint = AVALANCHE_FUJI_SUBSCRIPTION_ID
	const gasLimit: bigint = GAS_LIMIT
	const donId: string = AVALANCHE_FUJI_DON_ID
	const source: string = SOURCE

	const args = [
		governorTokenAddress,
		timeLockAddress,
		governorAddress,
		verifierAddress,
		linkTokenAddress,
		factory,
		routerAddress,
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
		await verify(verifier.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('ZKDAO')
	await save('ZKDAO', {
		address: zkDao.address,
		...artifact
	})

	log('----------------------------------------------------')
	log('Funding factory wallet with NATIVE token...')

	const wallet = await hre.viem.getWalletClient(deployer)

	const transferNativeTokenTx = await wallet.sendTransaction({
		account: deployer,
		to: factory,
		value: parseEther('0.1') // 0.01 ETH
	})

	log(`Factory wallet funded with NATIVE token: ${transferNativeTokenTx}`)
}

export default deployZkDao
deployZkDao.tags = ['avalancheFuji', 'af-deploy', 'af-ZKDAO']
