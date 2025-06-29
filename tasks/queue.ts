import { task } from 'hardhat/config'
import { type Address, encodeFunctionData, keccak256, toBytes } from 'viem'

import { AMOUNT } from '@/config/const'
import { DaoStruct } from '@/models'

task('queue', 'Queue a proposal to give tokens to an user').setAction(
	async (_, hre) => {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { user1, user3 } = await getNamedAccounts()

		const chain = network.name
		const publicClient = await viem.getPublicClient()

		console.log('----------------------------------------------------')
		console.log(`🏁 Moving proposal state to queue on ${chain}`)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')
		const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

		const daoCounter = await zkdao.read.getDaoCounter()
		const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

		const tokenGovernor = await viem.getContractAt('GovernorToken', dao.token)
		const governor = await viem.getContractAt('Governor', dao.governor)

		const proposalCounter = await governor.read.getProposalCounter()
		const proposalId = await governor.read.getProposalId([proposalCounter])

		console.log('----------------------------------------------------')
		console.log(`🏁 ${user1} Moving proposal ${proposalId} to queue`)

		const targets = [dao.token]
		const values = [0n]

		const mintCallData = encodeFunctionData({
			abi: tokenGovernor.abi,
			functionName: 'mintBatch',
			args: [[user3], [AMOUNT]]
		})

		const calldatas = [mintCallData]

		const description = `Add ${user3} to the DAO and give them ${AMOUNT} tokens`

		const descriptionHash = keccak256(toBytes(description))

		const queueTx = await governor.write.queue(
			[targets, values, calldatas, descriptionHash],
			{ account: user1 }
		)

		await publicClient.waitForTransactionReceipt({
			hash: queueTx
		})

		console.log(`✅ Queued proposal ${proposalId}. tx hash: ${queueTx}`)
	}
)
