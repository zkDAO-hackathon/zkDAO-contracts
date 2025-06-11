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
	log('Deploying Inhabit titi collection and waiting for confirmations...')

	const titiArgs = [
		'INHABIT Ñuiyanzhi TITI',
		'TITI',
		2483n,
		NFT_COLLECTIONS.titi,
		vendorV2Address
	]

	const titiCollection = await deploy('Inhabit_TITI', {
		contract: 'Inhabit',
		from: deployer,
		args: titiArgs,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`Titi collection deployed at ${titiCollection.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(titiCollection.address, titiArgs)
	}
}

export default deployInhabit
deployInhabit.tags = ['celoAlfajores', 'inhabitCollections', 'ca-titi']
