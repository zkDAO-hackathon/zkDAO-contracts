// utils/verify.ts
import { run } from 'hardhat'

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export const verify = async (
	contractAddress: string,
	args: unknown[]
): Promise<void> => {
	console.log('Verifying contract...')

	try {
		console.log('⏳ Waiting 18 seconds for Etherscan to index the contract...')
		await sleep(18000) // Wait for 18 seconds to ensure Etherscan has indexed the contract
		await run('verify:verify', {
			address: contractAddress,
			constructorArguments: args
		})

		console.log('✅ Contract verified successfully!')
	} catch (error: any) {
		if (error.message.toLowerCase().includes('already verified')) {
			console.log('✅ Contract is already verified!')
		} else if (error.message.includes('does not have bytecode')) {
			console.log('❌ Contract still has no bytecode. Possible reasons:')
			console.log('   1. Contract deployment failed')
			console.log('   2. Wrong network selected')
			console.log('   3. Need to wait longer for Etherscan')
		} else {
			console.error('❌ Verification error:', error.message)
		}
	}
}
