import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployNFTCollection: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying NFTCollection and waiting for confirmations...')

	const nftCollection = await deploy('NFTCollection', {
		from: deployer,
		args: [],
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`NFTCollection contract at ${nftCollection.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(nftCollection.address, [])
	}
}

export default deployNFTCollection
deployNFTCollection.tags = ['localhost', 'l-deploy', 'l-nftCollection']
