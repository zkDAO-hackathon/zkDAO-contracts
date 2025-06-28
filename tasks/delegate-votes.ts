import { task } from 'hardhat/config'
import type { Address } from 'viem'

import { DaoStruct } from '@/models'

task('delegate-votes', 'Delegates voting power of a GovernorToken').setAction(
	async (_, hre) => {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { user1, user2, user3 } = await getNamedAccounts()

		const chain = network.name
		const publicClient = await viem.getPublicClient()

		console.log('----------------------------------------------------')
		console.log(`🗳️  Delegating votes on ${chain}...`)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')
		const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

		const daoCounter = await zkdao.read.getDaoCounter()
		const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

		const token = dao.token
		const tokenGovernor = await viem.getContractAt(
			'GovernorToken',
			token as Address
		)

		console.log('----------------------------------------------------')
		console.log(`🫂  ${user1} Delegating votes yourself`)

		const delegateTx1 = await tokenGovernor.write.delegate([user1 as Address], {
			account: user1 as Address
		})

		await publicClient.waitForTransactionReceipt({ hash: delegateTx1 })

		console.log(`✅ User1 delegated votes. tx hash: ${delegateTx1}`)

		console.log('----------------------------------------------------')
		console.log(`🫂  ${user2} Delegating votes yourself`)

		const delegateTx2 = await tokenGovernor.write.delegate([user2 as Address], {
			account: user2 as Address
		})

		await publicClient.waitForTransactionReceipt({ hash: delegateTx2 })

		console.log(`✅ User2 delegated votes. tx hash: ${delegateTx2}`)

		console.log('----------------------------------------------------')
		console.log(`🫂  ${user3} Delegating votes yourself`)

		const delegateTx3 = await tokenGovernor.write.delegate([user3 as Address], {
			account: user3 as Address
		})

		await publicClient.waitForTransactionReceipt({ hash: delegateTx3 })

		console.log(`✅ User3 delegated votes to User1. tx hash: ${delegateTx3}`)
	}
)
