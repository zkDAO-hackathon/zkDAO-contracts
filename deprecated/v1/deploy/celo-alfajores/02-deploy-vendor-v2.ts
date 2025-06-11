import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployVendorV2: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying VendorV2 and waiting for confirmations...')

	const vendorV2 = await deploy('VendorV2', {
		from: deployer,
		args: [],
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`VendorV2 contract at ${vendorV2.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(vendorV2.address, [])
	}
}

export default deployVendorV2
deployVendorV2.tags = ['celoAlfajores', 'ca-vendorV2']
