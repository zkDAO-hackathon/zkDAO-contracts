import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { stringToHex } from 'viem'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployVerifier: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, save } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying Verifier and waiting for confirmations...')

	const args: string[] = []

	const deterministic = await deployments.deterministic('HonkVerifier', {
		from: deployer,
		args,
		deterministicDeployment: stringToHex('verifier-v1'),
		contract: 'HonkVerifier',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	const verifier = await deterministic.deploy()

	log(`Verifier contract at ${verifier.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(verifier.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('HonkVerifier')
	await save('HonkVerifier', {
		address: verifier.address,
		...artifact
	})
}

export default deployVerifier
deployVerifier.tags = ['ethereumSepolia', 'es-deploy', 'es-verifier']
