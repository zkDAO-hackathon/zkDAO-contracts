import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployVerifier: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying Verifier and waiting for confirmations...')

	const verifier = await deploy('HonkVerifier', {
		from: deployer,
		args: [],
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`Verifier at ${verifier.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(verifier.address, [])
	}
}

export default deployVerifier
deployVerifier.tags = ['all', 'verifier']
