import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployTimeLock: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying TimeLock and waiting for confirmations...')

	const minDelay: number = 300 // 5 minutes
	const proposers: string[] = []
	const executors: string[] = []
	const admin: string = deployer

	const args = [minDelay, proposers, executors, admin]

	const timeLock = await deploy('TimeLock', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`TimeLock at ${timeLock.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(timeLock.address, args)
	}
}

export default deployTimeLock
deployTimeLock.tags = ['all', 'timelock']
