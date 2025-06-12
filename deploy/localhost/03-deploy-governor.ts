import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployGovernor: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying Governor and waiting for confirmations...')

	const args: string[] = []

	const governor = await deploy('Governor', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`Governor contract at ${governor.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(governor.address, args)
	}
}

export default deployGovernor
deployGovernor.tags = ['localhost', 'l-deploy', 'l-governor']
