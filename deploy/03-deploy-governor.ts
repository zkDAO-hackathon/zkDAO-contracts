import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import {
	developmentChains,
	GOVERNOR_DETERMINISTIC_DEPLOYMENT,
	networkConfig
} from '@/config/const'
import { verify } from '@/utils/verify'

const deployGovernor: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, save } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying Governor and waiting for confirmations...')

	const args: string[] = []

	const deterministic = await deployments.deterministic('Governor', {
		from: deployer,
		args,
		salt: GOVERNOR_DETERMINISTIC_DEPLOYMENT,
		contract: 'Governor',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	const governor = await deterministic.deploy()

	log(`Governor contract at ${governor.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(governor.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('Governor')
	await save('Governor', {
		address: governor.address,
		...artifact
	})
}

export default deployGovernor
deployGovernor.tags = ['all', 'governor']
