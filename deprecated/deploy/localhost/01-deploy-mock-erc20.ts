import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployMockErc20: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying MockErc20 and waiting for confirmations...')

	const name: string = 'USD Coin'
	const symbol: string = 'USDC'

	const args = [name, symbol]

	const mockErc20 = await deploy('MockErc20', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`MockErc20 contract at ${mockErc20.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(mockErc20.address, [])
	}
}

export default deployMockErc20
deployMockErc20.tags = ['localhost', 'l-deploy', 'l-mockErc20']
