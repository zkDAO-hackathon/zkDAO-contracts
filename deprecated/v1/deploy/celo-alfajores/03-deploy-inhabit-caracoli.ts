import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import {
	developmentChains,
	networkConfig,
	NFT_COLLECTIONS
} from '@/config/constants'
import { verify } from '@/utils/verify'

const deployInhabit: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	const { address: vendorV2Address } = await deployments.get('VendorV2')

	log('----------------------------------------------------')
	log('Deploying Inhabit caracoli collection and waiting for confirmations...')

	const caracoliArgs = [
		'INHABIT Ñuiyanzhi CARACOLI',
		'CARACOLI',
		19n,
		NFT_COLLECTIONS.caracoli,
		vendorV2Address
	]

	const caracoliCollection = await deploy('Inhabit_CARACOLI', {
		contract: 'Inhabit',
		from: deployer,
		args: caracoliArgs,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`Caracoli collection deployed at ${caracoliCollection.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(caracoliCollection.address, caracoliArgs)
	}
}

export default deployInhabit
deployInhabit.tags = ['celoAlfajores', 'ca-inhabitCollections', 'ca-caracoli']
