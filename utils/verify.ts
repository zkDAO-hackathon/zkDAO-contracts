// utils/verify.ts
import { run } from 'hardhat'

export const verify = async (
	contractAddress: string,
	args: unknown[]
): Promise<void> => {
	console.log('Verifying contract...')

	try {
		console.log('⏳ Waiting 9 seconds for Etherscan to index the contract...')

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
