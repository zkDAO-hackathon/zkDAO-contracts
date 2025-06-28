import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import {
	developmentChains,
	networkConfig,
	TIMELOCK_DETERMINISTIC_DEPLOYMENT
} from '@/config/const'
import { verify } from '@/utils/verify'

const deployTimeLock: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, save } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying TimeLock and waiting for confirmations...')

	const args: string[] = []

	const deterministic = await deployments.deterministic('TimeLock', {
		from: deployer,
		args,
		deterministicDeployment: TIMELOCK_DETERMINISTIC_DEPLOYMENT,
		contract: 'TimeLock',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	const timeLock = await deterministic.deploy()

	log(`TimeLock contract at ${timeLock.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(timeLock.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('GovernorToken')
	await save('TimeLock', {
		address: timeLock.address,
		...artifact
	})
}

export default deployTimeLock
deployTimeLock.tags = ['ethereumSepolia', 'es-deploy', 'es-timelock']
