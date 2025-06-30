import { task } from 'hardhat/config'
import { type Address, encodeFunctionData } from 'viem'

import { AMOUNT, CCIP_BNM_TOKEN } from '@/config/const'
import { DaoStruct } from '@/models'

task(
	'propose-transfer-crosschain',
	'Propose a cross-chain token transfer to a user'
).setAction(async (_, hre) => {
	const { viem } = hre
	const { getNamedAccounts, deployments, network } = hre
	const { factory, user1 } = await getNamedAccounts()

	const chain = network.name
	const publicClient = await viem.getPublicClient()

	console.log('----------------------------------------------------')
	console.log(`🌉 Proposing cross-chain transfer on ${chain}...`)

	const { address: zkdaoAddress } = await deployments.get('ZKDAO')
	const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

	const daoCounter = await zkdao.read.getDaoCounter()
	const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

	const governor = await viem.getContractAt('Governor', dao.governor)

	console.log('----------------------------------------------------')
	console.log(`🌉 ${user1} proposes to transfer ${AMOUNT} tokens to ${factory}`)

	const targets = [zkdaoAddress]
	const values = [0n]

	const transferCallData = encodeFunctionData({
		abi: zkdao.abi,
		functionName: 'transferTokensPayLINK',
		args: [factory as Address, CCIP_BNM_TOKEN(chain), BigInt(AMOUNT)]
	})

	const calldatas = [transferCallData]

	const description = `Cross-chain transfer ${AMOUNT} tokens to ${factory} via CCIP`

	const proposeTx = await governor.write.propose(
		[targets, values, calldatas, description],
		{ account: user1 }
	)

	await publicClient.waitForTransactionReceipt({ hash: proposeTx })

	console.log(`✅ Proposed. tx hash: ${proposeTx}`)
})
