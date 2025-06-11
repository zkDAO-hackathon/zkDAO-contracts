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
	log('Deploying Inhabit paujil collection and waiting for confirmations...')

	const paujilArgs = [
		'INHABIT Ñuiyanzhi PAUJIL',
		'PAUJIL',
		124n,
		NFT_COLLECTIONS.paujil,
		vendorV2Address
	]

	const paujilCollection = await deploy('Inhabit_PAUJIL', {
		contract: 'Inhabit',
		from: deployer,
		args: paujilArgs,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`Paujil collection deployed at ${paujilCollection.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(paujilCollection.address, paujilArgs)
	}
}
export default deployInhabit
deployInhabit.tags = ['celoAlfajores', 'inhabitCollections', 'ca-paujil']
