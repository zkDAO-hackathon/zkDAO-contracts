import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { stringToHex } from 'viem'

import { developmentChains, networkConfig } from '@/config/constants'
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

	const governor = await deployments.deterministic('Governor', {
		from: deployer,
		args,
		salt: stringToHex('governor-v1'),
		contract: 'Governor',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

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
deployGovernor.tags = ['localhost', 'l-deploy', 'l-governor']
