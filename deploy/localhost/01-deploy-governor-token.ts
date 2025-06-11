import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployGovernorToken: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying GovernorToken and waiting for confirmations...')

	const tokenName: string = 'zkDAO token'
	const tokenSymbol: string = 'zkDAO'

	const args = [tokenName, tokenSymbol, deployer]

	const governorToken = await deploy('GovernorToken', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`GovernorToken contract at ${governorToken.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(governorToken.address, args)
	}
}

export default deployGovernorToken
deployGovernorToken.tags = ['all', 'governor']
