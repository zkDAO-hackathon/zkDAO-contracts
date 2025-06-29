import { task } from 'hardhat/config'
import { type Address, encodeFunctionData, keccak256, toBytes } from 'viem'

import { AMOUNT } from '@/config/const'
import { DaoStruct } from '@/models'

task('execute', 'Execute a proposal to give tokens to an user').setAction(
	async (_, hre) => {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { user1, user3 } = await getNamedAccounts()

		const chain = network.name
		const publicClient = await viem.getPublicClient()

		console.log('----------------------------------------------------')
		console.log(`🎇 Executing proposal on ${chain}`)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')
		const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

		const daoCounter = await zkdao.read.getDaoCounter()
		const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

		const tokenGovernor = await viem.getContractAt('GovernorToken', dao.token)
		const governor = await viem.getContractAt('Governor', dao.governor)

		const proposalCounter = await governor.read.getProposalCounter()
		const proposalId = await governor.read.getProposalId([proposalCounter])

		console.log('----------------------------------------------------')
		console.log(`🎇 ${user1} Executing proposal ${proposalId}`)

		const targets = [dao.token]
		const values = [0n]

		const mintCallData = encodeFunctionData({
			abi: tokenGovernor.abi,
			functionName: 'mintBatch',
			args: [[user3], [AMOUNT]]
		})

		const calldatas = [mintCallData]

		const description = `DAO for Bogota`

		const descriptionHash = keccak256(toBytes(description))

		const executeTx = await governor.write.execute(
			[targets, values, calldatas, descriptionHash],
			{ account: user1 }
		)

		await publicClient.waitForTransactionReceipt({
			hash: executeTx
		})

		console.log(`✅ Executed proposal ${proposalId}. tx hash: ${executeTx}`)
	}
)
