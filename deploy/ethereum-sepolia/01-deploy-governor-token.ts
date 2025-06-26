// deploy/ethereumSepolia/01-deploy-governor-token.ts
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { stringToHex } from 'viem'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployGovernorToken: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log, getOrNull } = deployments
	const { deployer } = await getNamedAccounts()

	// Verificar si ya está desplegado
	const existing = await getOrNull('GovernorToken')
	if (existing) {
		log(`GovernorToken already deployed at ${existing.address}`)

		// Verificar si tiene bytecode
		const code = await hre.ethers.provider.getCode(existing.address)
		if (code === '0x' || code === '0x0') {
			log('⚠️  Warning: Deployment exists but has no bytecode!')
			log('Removing invalid deployment and redeploying...')
			await deployments.delete('GovernorToken')
		} else {
			return // Ya está desplegado correctamente
		}
	}

	log('----------------------------------------------------')
	log('Deploying GovernorToken and waiting for confirmations...')

	const args: string[] = []

	const governorToken = await deploy('GovernorToken', {
		from: deployer,
		args,
		deterministicDeployment: stringToHex('governor-token-v1'),
		contract: 'GovernorToken',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	if (!developmentChains.includes(network.name)) {
		log('⏳ Verifying...')
		await verify(governorToken.address, args)
	}
}

export default deployGovernorToken
deployGovernorToken.tags = ['ethereumSepolia', 'es-deploy', 'es-governorToken']
