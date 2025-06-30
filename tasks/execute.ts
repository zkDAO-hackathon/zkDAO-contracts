import { task } from 'hardhat/config'
import { type Address, encodeFunctionData, keccak256, toBytes } from 'viem'

import { AMOUNT, CCIP_BNM_TOKEN } from '@/config/const'
import { DaoStruct, ProposalStruct } from '@/models'

task('execute', 'Execute a proposal to give tokens to an user').setAction(
	async (_, hre) => {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { user1, factory } = await getNamedAccounts()

		const chain = network.name
		const publicClient = await viem.getPublicClient()

		console.log('----------------------------------------------------')
		console.log(`🎇 Executing proposal on ${chain}`)

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
		console.log(`🎇 ${user1} Executing proposal ${proposal.id}`)

		const targets = [zkdaoAddress]
		const values = [0n]

		const transferCallData = encodeFunctionData({
			abi: zkdao.abi,
			functionName: 'transferTokensPayLINK',
			args: [factory as Address, CCIP_BNM_TOKEN(chain), BigInt(AMOUNT)]
		})
		const calldatas = [transferCallData]

		const description = `Cross-chain transfer ${AMOUNT} tokens to ${factory} via CCIP`

		const descriptionHash = keccak256(toBytes(description))

		const rawData = encodeFunctionData({
			abi: governor.abi,
			functionName: 'execute',
			args: [targets, values, calldatas, descriptionHash]
		})

		console.log('🧾 Raw calldata for governor.execute(...):')
		console.log(rawData)

		const executeTx = await governor.write.execute(
			[targets, values, calldatas, descriptionHash],
			{ account: user1 }
		)

		await publicClient.waitForTransactionReceipt({
			hash: executeTx
		})

		console.log(`✅ Executed proposal ${proposal.id}. tx hash: ${executeTx}`)
	}
)
