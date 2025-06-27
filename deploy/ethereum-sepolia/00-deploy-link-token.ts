import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { stringToHex } from 'viem'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployMockErc20: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying LINK and waiting for confirmations...')

	const name: string = 'ChainLink Token'
	const symbol: string = 'LINK'

	const args = [name, symbol]

	const deterministic = await deployments.deterministic('MockErc20', {
		from: deployer,
		args,
		deterministicDeployment: stringToHex('mock-erc20-v1'),
		contract: 'MockErc20',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	const mockErc20 = await deterministic.deploy()

	log(`LINK contract at ${mockErc20.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(mockErc20.address, args)
	}
}

export default deployMockErc20
deployMockErc20.tags = ['ethereum', 'es-deploy', 'es-link']
