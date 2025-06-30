import { task } from 'hardhat/config'
import { type Address, encodeFunctionData } from 'viem'

import { AMOUNT } from '@/config/const'
import { DaoStruct } from '@/models'

task(
	'propose-new-meber',
	`Propose to give ${AMOUNT} tokens to an user`
).setAction(async (_, hre) => {
	const { viem } = hre
	const { getNamedAccounts, deployments, network } = hre
	const { user1, user3 } = await getNamedAccounts()

	const chain = network.name
	const publicClient = await viem.getPublicClient()

	console.log('----------------------------------------------------')
	console.log(`🐘 Proposing on ${chain}...`)

	const { address: zkdaoAddress } = await deployments.get('ZKDAO')
	const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

	const daoCounter = await zkdao.read.getDaoCounter()
	const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

	const tokenGovernor = await viem.getContractAt('GovernorToken', dao.token)
	const governor = await viem.getContractAt('Governor', dao.governor)

	console.log('----------------------------------------------------')
	console.log(`🐘 ${user1} proposes to give ${AMOUNT} vote tokens to ${user3} `)

	const targets = [dao.token]
	const values = [0n]

	const mintCallData = encodeFunctionData({
		abi: tokenGovernor.abi,
		functionName: 'mintBatch',
		args: [[user3], [AMOUNT]]
	})

	const calldatas = [mintCallData]

	const description = `Add ${user3} to the DAO and give them ${AMOUNT} tokens`

	const proposeTx = await governor.write.propose(
		[targets, values, calldatas, description],
		{ account: user1 }
	)

	await publicClient.waitForTransactionReceipt({ hash: proposeTx })

	console.log(`✅ Proposed. tx hash: ${proposeTx}`)
})
