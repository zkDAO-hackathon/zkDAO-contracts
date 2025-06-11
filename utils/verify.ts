import { run } from 'hardhat'

export const verify = async (
	contractAddress: string,
	args: unknown[]
): Promise<void> => {
	console.log('Verifying contract...')
	try {
		await run('verify:verify', {
			address: contractAddress,
			constructorArguments: args
		})
	} catch (error) {
		if (error.message.toLowerCase().includes('already verified')) {
			console.log('Already Verified!')
		} else {
			console.error(error)
		}
	}
}
