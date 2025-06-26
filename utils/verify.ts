// utils/verify.ts
import { run } from 'hardhat'
import { ethers } from 'hardhat'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const verify = async (
	contractAddress: string,
	args: unknown[]
): Promise<void> => {
	console.log('Verifying contract...')

	try {
		// Primero verificar que el contrato tiene bytecode
		const code = await ethers.provider.getCode(contractAddress)
		if (code === '0x' || code === '0x0') {
			console.log('❌ Contract has no bytecode at address:', contractAddress)
			console.log('Contract may not have been deployed properly')
			return
		}

		// Esperar un poco para que Etherscan procese el despliegue
		console.log('⏳ Waiting 30 seconds for Etherscan to index the contract...')
		await delay(30000) // 30 segundos

		// Intentar verificar
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
