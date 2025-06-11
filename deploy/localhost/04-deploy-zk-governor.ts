import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import verify from '@/utils'

const deployZkGovernor: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log, get } = deployments
	const { deployer } = await getNamedAccounts()

	const governorToken = await get('GovernorToken')
	const timeLock = await get('TimeLock')
	const verifier = await get('HonkVerifier')

	log('----------------------------------------------------')
	log('Deploying ZKGovernor and waiting for confirmations...')

	const name: string = 'zkDAO Governor'
	const tokenAddress: string = governorToken.address
	const timeLockAddress: string = timeLock.address
	const verifierAddress: string = verifier.address
	const votingDelay: number = 604800 // 1 week
	const votingPeriod: number = 604800 // 1 week
	const proposalThreshold: number = 1 // 0 token
	const votesQuorumFraction: number = 4 // 4% of total supply

	const args = [
		name,
		tokenAddress,
		timeLockAddress,
		verifierAddress,
		votingDelay,
		votingPeriod,
		proposalThreshold,
		votesQuorumFraction
	]

	const zkGovernor = await deploy('ZKGovernor', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`ZKGovernor at ${zkGovernor.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(verifier.address, args)
	}
}

export default deployZkGovernor
deployZkGovernor.tags = ['all', 'zkGovernor']
