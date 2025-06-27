import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { stringToHex } from 'viem'

import { developmentChains, networkConfig } from '@/config/const'
import { verify } from '@/utils/verify'

const deployGovernorToken: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, save } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying GovernorToken and waiting for confirmations...')

	const args: string[] = []

	const deterministic = await deployments.deterministic('GovernorToken', {
		from: deployer,
		args,
		deterministicDeployment: stringToHex('governor-token-v1'),
		contract: 'GovernorToken',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	const governorToken = await deterministic.deploy()

	log(`GovernorToken contract at ${governorToken.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(governorToken.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('GovernorToken')
	await save('GovernorToken', {
		address: governorToken.address,
		...artifact
	})
}

export default deployGovernorToken
deployGovernorToken.tags = ['localhost', 'l-deploy', 'l-governorToken']
