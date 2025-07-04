import { task } from 'hardhat/config'
import { Address } from 'viem'
import { estimateFeesPerGas } from 'viem/actions'

import { LINK_TOKEN, PRICE } from '@/config/const'

task(
	'approve-link',
	`Approve ${PRICE} LINK tokens for ZKDAO contract`
).setAction(async (_, hre) => {
	try {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { deployer } = await getNamedAccounts()

		const chain = network.name

		console.log('----------------------------------------------------')
		console.log(`🔗 Approving LINK on ${chain}...`)

		const publicClient = await viem.getPublicClient()

		const fees = await estimateFeesPerGas(publicClient)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')

		const link = await viem.getContractAt('IERC20', LINK_TOKEN(chain))

		console.log('----------------------------------------------------')
		console.log(`🔓 Approving ${PRICE} LINK to ZKDAO at ${zkdaoAddress}...`)

		const approveTx = await link.write.approve([zkdaoAddress, PRICE], {
			account: deployer as Address,
			maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
			maxFeePerGas: fees.maxFeePerGas
		})

		await publicClient.waitForTransactionReceipt({ hash: approveTx })

		console.log(`✅ Approved. tx hash: ${approveTx}`)
	} catch (error) {
		console.error('❌ Error approving LINK:', error)
	}
})
