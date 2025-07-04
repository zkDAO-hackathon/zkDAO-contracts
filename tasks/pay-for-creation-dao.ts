import { task } from 'hardhat/config'
import { Address } from 'viem'
import { estimateFeesPerGas } from 'viem/actions'

import {
	AMOUNTS,
	GOVERNOR_PARAMS,
	GOVERNOR_TOKEN_PARAMS,
	MIN_DELAY,
	PRICE,
	TO
} from '@/config/const'

task('pay-for-dao-creation', 'Create a DAO').setAction(async (_, hre) => {
	try {
		const { viem, deployments, getNamedAccounts, network } = hre
		const { deployer } = await getNamedAccounts()

		const chain = network.name

		const publicClient = await viem.getPublicClient()

		console.log('----------------------------------------------------')
		console.log(`🏗️  Creating DAO on ${chain}...`)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')
		const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

		console.log('----------------------------------------------------')
		console.log('🏗️  Paying to create DAO...')

		const fees = await estimateFeesPerGas(publicClient)

		const payForDaoCreationTx = await zkdao.write.payForDaoCreation(
			[GOVERNOR_TOKEN_PARAMS, MIN_DELAY, GOVERNOR_PARAMS, TO, AMOUNTS, PRICE],
			{
				account: deployer as Address,
				maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
				maxFeePerGas: fees.maxFeePerGas
			}
		)

		await publicClient.waitForTransactionReceipt({ hash: payForDaoCreationTx })

		console.log(`✅ Created DAO. tx hash: ${payForDaoCreationTx}`)
	} catch (error) {
		console.error('❌ Error creating Bogota DAO:', error)
	}
})
