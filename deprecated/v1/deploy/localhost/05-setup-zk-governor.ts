import { viem } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Address, zeroAddress } from 'viem'

const setupContracts: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments } = hre
	const { log } = deployments
	const { deployer, alice, bob, anthony } = await getNamedAccounts()

	const { address: tokenAddress } = await deployments.get('GovernorToken')
	const { address: timeLockAddress } = await deployments.get('TimeLock')
	const { address: governorAddress } = await deployments.get('ZKGovernor')

	const governorToken = await viem.getContractAt(
		'GovernorToken',
		tokenAddress as Address
	)

	const timeLock = await viem.getContractAt(
		'TimeLock',
		timeLockAddress as Address
	)

	const governor = await viem.getContractAt(
		'ZKGovernor',
		governorAddress as Address
	)

	log('----------------------------------------------------')
	log('Setting up contracts for roles...')

	const to: string[] = [alice, bob, anthony]
	const votes: number[] = [5, 5, 5]

	const proposerRole = await timeLock.read.PROPOSER_ROLE()
	const executorRole = await timeLock.read.EXECUTOR_ROLE()
	const adminRole = await timeLock.read.DEFAULT_ADMIN_ROLE()

	await timeLock.write.grantRole([proposerRole, governor.address])
	await timeLock.write.grantRole([executorRole, zeroAddress])
	await timeLock.write.revokeRole([adminRole, deployer])

	await governorToken.write.mintBatch([to, votes])
	await governorToken.write.transferOwnership([timeLock.address])
}

export default setupContracts
setupContracts.tags = ['all', 'setup']
