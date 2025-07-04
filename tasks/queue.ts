import { task } from 'hardhat/config'
import { type Address, encodeFunctionData, keccak256, toBytes } from 'viem'

import { AMOUNT, CCIP_BNM_TOKEN } from '@/config/const'
import { DaoStruct, ProposalStruct } from '@/models'

task('queue', 'Queue a proposal to give tokens to an user').setAction(
	async (_, hre) => {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { user1, factory } = await getNamedAccounts()

		const chain = network.name
		const publicClient = await viem.getPublicClient()

		console.log('----------------------------------------------------')
		console.log(`🏁 Moving proposal state to queue on ${chain}`)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')
		const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

		const daoCounter = await zkdao.read.getDaoCounter()
		const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

		const governor = await viem.getContractAt('Governor', dao.governor)

		const proposalCounter = await governor.read.getProposalCounter()
		const proposal = (await governor.read.getProposal([
			proposalCounter
		])) as ProposalStruct

		console.log('----------------------------------------------------')
		console.log(`🏁 ${user1} Moving proposal ${proposal.id} to queue`)

		const fee = await zkdao.read.getCcipFee(
			[factory as Address, CCIP_BNM_TOKEN(chain), BigInt(AMOUNT)],
			{ account: user1 }
		)

		const targets = [zkdaoAddress]
		const values = [0n]

		const transferCallData = encodeFunctionData({
			abi: zkdao.abi,
			functionName: 'transferCrosschain',
			args: [factory as Address, CCIP_BNM_TOKEN(chain), BigInt(AMOUNT), fee]
		})

		const calldatas = [transferCallData]

		const description = `Cross-chain transfer ${AMOUNT} tokens to ${factory} via CCIP`

		const descriptionHash = keccak256(toBytes(description))

		const queueTx = await governor.write.queue(
			[targets, values, calldatas, descriptionHash],
			{ account: user1 }
		)

		await publicClient.waitForTransactionReceipt({
			hash: queueTx
		})

		console.log(`✅ Queued proposal ${proposal.id}. tx hash: ${queueTx}`)
	}
)
