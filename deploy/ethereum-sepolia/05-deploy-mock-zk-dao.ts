import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployZkDao: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log, get, save } = deployments
	const { deployer, factory } = await getNamedAccounts()

	const linkToken = await get('MockErc20')
	const governorToken = await get('GovernorToken')
	const timeLock = await get('TimeLock')
	const governor = await get('Governor')
	const verifier = await get('HonkVerifier')

	log('----------------------------------------------------')
	log('Deploying MockZKDAO and waiting for confirmations...')

	const linkTokenAddress: string = linkToken.address
	const governorTokenAddress: string = governorToken.address
	const timeLockAddress: string = timeLock.address
	const governorAddress: string = governor.address
	const verifierAddress: string = verifier.address

	const args: string[] = [
		governorTokenAddress,
		timeLockAddress,
		governorAddress,
		verifierAddress,
		linkTokenAddress,
		factory
	]

	const zkDao = await deploy('MockZKDAO', {
		from: deployer,
		args,
		contract: 'MockZKDAO',
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`MockZKDAO contract at ${zkDao.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(verifier.address, args)
	}

	const artifact = await deployments.getExtendedArtifact('MockZKDAO')
	await save('MockZKDAO', {
		address: zkDao.address,
		...artifact
	})

	// log('----------------------------------------------------')
	// log('Funding factory wallet with NATIVE token...')

	// const wallet = await hre.viem.getWalletClient(deployer)

	// const transferNativeTokenTx = await wallet.sendTransaction({
	// 	account: deployer,
	// 	to: factory,
	// 	value: parseEther('1')
	// })

	// log(`Factory wallet funded with NATIVE token: ${transferNativeTokenTx}`)
}

export default deployZkDao
deployZkDao.tags = ['ethereumSepolia', 'es-deploy', 'es-ZKDAO']
