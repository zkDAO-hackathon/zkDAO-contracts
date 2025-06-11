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
	log('Deploying Inhabit jaguar collection and waiting for confirmations...')

	const jaguarArgs = [
		'INHABIT Ñuiyanzhi JAGUAR',
		'JAGUAR',
		5n,
		NFT_COLLECTIONS.jaguar,
		vendorV2Address
	]

	const jaguarCollection = await deploy('Inhabit_JAGUAR', {
		contract: 'Inhabit',
		from: deployer,
		args: jaguarArgs,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`Jaguar collection deployed at ${jaguarCollection.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(jaguarCollection.address, jaguarArgs)
	}
}

export default deployInhabit
deployInhabit.tags = ['celoAlfajores', 'ca-inhabitCollections', 'ca-jaguar']
