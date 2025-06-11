import { viem } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Address } from 'viem'

import { NATIVE, NFT_COLLECTIONS } from '@/config/constants'

const setupContracts: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments } = hre
	const { log } = deployments
	const { deployer } = await getNamedAccounts()

	const { address: mockErc20Address } = await deployments.get('MockErc20')
	const { address: mockOracleAddress } = await deployments.get('MockOracleV2')
	const { address: vendorV2Address } = await deployments.get('VendorV2')
	const { address: inhabitCaracoliAddress } =
		await deployments.get('Inhabit_CARACOLI')

	const { address: inhabitJaguarAddress } =
		await deployments.get('Inhabit_JAGUAR')

	const { address: inhabitPaujilAddress } =
		await deployments.get('Inhabit_PAUJIL')

	const { address: inhabitTitiAddress } = await deployments.get('Inhabit_TITI')

	const vendorV2 = await viem.getContractAt(
		'VendorV2',
		vendorV2Address as Address
	)

	log('----------------------------------------------------')
	log('Setting up contracts for roles...')

	const txAddUser = await vendorV2.write.addUser([deployer as Address])

	log(`Deployer added as user. tx hash: ${txAddUser}`)

	log('----------------------------------------------------')
	log('Addding tokens...')

	const txAddToken = await vendorV2.write.addToken([
		NATIVE,
		mockOracleAddress as Address,
		8n,
		true,
		true
	])

	log(`NATIVE token added. tx hash: ${txAddToken}`)

	await vendorV2.write.addToken([
		mockErc20Address as Address,
		mockOracleAddress as Address,
		8n,
		true,
		false
	])

	log(`MockErc20 token added. tx hash: ${txAddToken}`)

	log('----------------------------------------------------')
	log('Addding Group... ')

	const arrayShared = [
		{
			addr: deployer as Address,
			pcng: 100n
		}
	]

	const txAddGroup = await vendorV2.write.addGroup(['CREW', true, arrayShared])

	log(`Group CREW added. tx hash: ${txAddGroup}`)

	log('----------------------------------------------------')
	log('Addding Inhabit collections... ')

	const txAddCaracoliCollection = await vendorV2.write.addCollection([
		inhabitCaracoliAddress as Address,
		NFT_COLLECTIONS.caracoli.price,
		true
	])

	log(`Inhabit Caracoli collection added. tx hash: ${txAddCaracoliCollection}`)

	const txAddJaguarCollection = await vendorV2.write.addCollection([
		inhabitJaguarAddress as Address,
		NFT_COLLECTIONS.jaguar.price,
		true
	])

	log(`Inhabit Jaguar collection added. tx hash: ${txAddJaguarCollection}`)

	const txAddPaujilCollection = await vendorV2.write.addCollection([
		inhabitPaujilAddress as Address,
		NFT_COLLECTIONS.paujil.price,
		true
	])

	log(`Inhabit Paujil collection added. tx hash: ${txAddPaujilCollection}`)

	const txAddTitiCollection = await vendorV2.write.addCollection([
		inhabitTitiAddress as Address,
		NFT_COLLECTIONS.titi.price,
		true
	])

	log(`Inhabit Titi collection added. tx hash: ${txAddTitiCollection}`)
}

export default setupContracts
setupContracts.tags = ['localhost', 'l-setup']
