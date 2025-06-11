const hre = require('hardhat')

async function main() {
	const [deployer] = await hre.ethers.getSigners()
	const network = hre.network.name

	console.log(`Desplegando contratos en la red: ${network}`)
	console.log('Desplegando contratos con la cuenta:', deployer.address)

	// Configurar opciones de gas para Alfajores
	const gasOptions =
		network === 'alfajores'
			? {
					gasPrice: hre.ethers.parseUnits('0.1', 'gwei'),
					gasLimit: 5000000
				}
			: {}

	// Desplegar el contrato VendorV2
	console.log('Desplegando VendorV2...')
	const VendorV2 = await hre.ethers.getContractFactory('VendorV2')
	const vendorV2 = await VendorV2.deploy(gasOptions)
	await vendorV2.waitForDeployment()
	const vendorV2Address = await vendorV2.getAddress()
	console.log(`VendorV2 desplegado en ${network}:`, vendorV2Address)

	// Configurar el deployer como admin y user
	console.log('Configurando roles...')
	await vendorV2.addUser(deployer.address, gasOptions)
	console.log('Deployer configurado como usuario')

	// Solo verificar si no estamos en la red local
	if (network !== 'hardhat' && network !== 'localhost') {
		// Esperar para la verificación
		console.log('Esperando 5 bloques para la verificación...')
		await vendorV2.deploymentTransaction().wait(5)

		// Verificar el contrato
		console.log('Verificando contrato...')
		try {
			await hre.run('verify:verify', {
				address: vendorV2Address,
				constructorArguments: []
			})
			console.log('Contrato verificado exitosamente')
		} catch (error) {
			console.error('Error en la verificación:', error)
		}
	} else {
		console.log('Saltando verificación en red local')
	}

	// Documentación de uso
	console.log('\nDocumentación de uso:')
	console.log('1. Configuración inicial:')
	console.log('   - Usar addToken() para configurar tokens aceptados')
	console.log('   - Usar addCollection() para configurar colecciones de NFTs')
	console.log('   - Usar addGroup() para configurar grupos de distribución')
	console.log('\n2. Operaciones principales:')
	console.log('   - buyWithToken() para comprar con tokens ERC20')
	console.log('   - buyNative() para comprar con ETH')
	console.log('   - refundInvestment() para solicitar reembolsos')
	console.log('\n3. Administración:')
	console.log('   - addUser() para agregar nuevos usuarios')
	console.log('   - setRefundActive() para controlar reembolsos')
	console.log('   - setCollectionStatus() para gestionar colecciones')
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
