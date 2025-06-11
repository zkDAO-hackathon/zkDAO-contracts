import Safe from '@safe-global/protocol-kit'
import { viem } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Address, parseEther } from 'viem'

import {
	CELO_ALFAJORES_CUSD_ADDRESS,
	NFT_COLLECTIONS
} from '@/config/constants'
import { createSafeMultisig } from '@/scripts/create-safe-multisig'

const setupContracts: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const usdToWei = (usd: bigint): bigint => parseEther(usd.toString())

	const { getNamedAccounts, deployments, network } = hre
	const { log } = deployments
	const { deployer } = await getNamedAccounts()

	const publicClient = await viem.getPublicClient()

	// @ts-expect-error: network.config.url may not be typed but is present at runtime
	const rpcUrl = network.config.url

	const deployerPrivateKey = (network.config.accounts as string[])[0]

	const { address: oracleAddress } = await deployments.get('OracleV2')
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
	log('Creating Safe multisig')

	const safe: Safe = await createSafeMultisig(rpcUrl, deployerPrivateKey)

	log('----------------------------------------------------')
	log('Setting up contracts for roles...')

	const gasOption = {
		account: deployer as Address,
		gasLimit: 3000000
	}

	const txAddAdmin = await vendorV2.write.addAdmin(
		[(await safe.getAddress()) as Address],
		gasOption
	)

	await publicClient.waitForTransactionReceipt({
		hash: txAddAdmin
	})

	log(`Multisig added as admin. tx hash: ${txAddAdmin}`)

	const txAddUser = await vendorV2.write.addUser(
		[deployer as Address],
		gasOption
	)

	await publicClient.waitForTransactionReceipt({
		hash: txAddUser
	})

	log(`Deployer added as user. tx hash: ${txAddUser}`)

	log('----------------------------------------------------')
	log('Addding tokens...')

	// TODO: Uncomment this when the NATIVE token is available in the network

	// const txAddToken = await vendorV2.write.addToken(
	// 	[NATIVE, oracleAddress as Address, 8n, true, false],
	// 	gasOption
	// )

	// await publicClient.waitForTransactionReceipt({
	// 	hash: txAddToken
	// })

	// log(`NATIVE token added. tx hash: ${txAddToken}`)

	const tx2AddToken = await vendorV2.write.addToken(
		[CELO_ALFAJORES_CUSD_ADDRESS, oracleAddress as Address, 8n, true, false],
		gasOption
	)

	await publicClient.waitForTransactionReceipt({
		hash: tx2AddToken
	})

	log(`cUSD token added. tx hash: ${tx2AddToken}`)

	log('----------------------------------------------------')
	log('Addding Group... ')

	const arrayShared = [
		{
			addr: (await safe.getAddress()) as Address,
			pcng: 100n
		}
	]

	const txAddGroup = await vendorV2.write.addGroup(['CREW', true, arrayShared])

	await publicClient.waitForTransactionReceipt({
		hash: txAddGroup
	})

	log(`Group CREW added. tx hash: ${txAddGroup}`)

	log('----------------------------------------------------')
	log('Addding Inhabit collections... ')

	const txAddCaracoliCollection = await vendorV2.write.addCollection([
		inhabitCaracoliAddress as Address,
		usdToWei(NFT_COLLECTIONS.caracoli.price),
		true
	])

	await publicClient.waitForTransactionReceipt({
		hash: txAddCaracoliCollection
	})

	log(`Inhabit Caracoli collection added. tx hash: ${txAddCaracoliCollection}`)

	const txAddJaguarCollection = await vendorV2.write.addCollection([
		inhabitJaguarAddress as Address,
		usdToWei(NFT_COLLECTIONS.jaguar.price),
		true
	])

	await publicClient.waitForTransactionReceipt({
		hash: txAddJaguarCollection
	})

	log(`Inhabit Jaguar collection added. tx hash: ${txAddJaguarCollection}`)

	const txAddPaujilCollection = await vendorV2.write.addCollection([
		inhabitPaujilAddress as Address,
		usdToWei(NFT_COLLECTIONS.paujil.price),
		true
	])

	await publicClient.waitForTransactionReceipt({
		hash: txAddPaujilCollection
	})

	log(`Inhabit Paujil collection added. tx hash: ${txAddPaujilCollection}`)

	const txAddTitiCollection = await vendorV2.write.addCollection([
		inhabitTitiAddress as Address,
		usdToWei(NFT_COLLECTIONS.titi.price),
		true
	])

	await publicClient.waitForTransactionReceipt({
		hash: txAddTitiCollection
	})

	log(`Inhabit Titi collection added. tx hash: ${txAddTitiCollection}`)

	// log('----------------------------------------------------')
	// log('Removing deployer user role...')

	// const txremoveUser = await vendorV2.write.removeUser(
	// 	[deployer as Address],
	// 	gasOption
	// )

	// await publicClient.waitForTransactionReceipt({
	// 	hash: txremoveUser
	// })

	// log(`Deployer admin role revoked. tx hash: ${txremoveUser}`)

	// log('----------------------------------------------------')
	// log('Renouncing deployer admin role...')

	// const txRenounceAdmin = await vendorV2.write.renounceAdmin(gasOption)

	// await publicClient.waitForTransactionReceipt({
	// 	hash: txRenounceAdmin
	// })

	// log(`Deployer admin role renounced. tx hash: ${txRenounceAdmin}`)
}

export default setupContracts
setupContracts.tags = ['celoAlfajores', 'ca-setup']
