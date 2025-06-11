import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { developmentChains, networkConfig } from '@/config/constants'
import { verify } from '@/utils/verify'

const deployOracleV2: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	log('----------------------------------------------------')
	log('Deploying OracleV2 and waiting for confirmations...')

	const oracleV2 = await deploy('OracleV2', {
		from: deployer,
		args: [],
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	log(`OracleV2 contract at ${oracleV2.address}`)

	if (!developmentChains.includes(network.name)) {
		await verify(oracleV2.address, [])
	}
}

export default deployOracleV2
deployOracleV2.tags = ['celoAlfajores', 'ca-oracleV2']
