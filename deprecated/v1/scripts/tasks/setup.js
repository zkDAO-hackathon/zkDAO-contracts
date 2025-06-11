const hre = require('hardhat')

async function setupVendorV2() {
	const [deployer] = await hre.ethers.getSigners()
	const network = hre.network.name

	console.log(`Configurando VendorV2 en la red: ${network}`)
	console.log('Configurando con la cuenta:', deployer.address)

	// Configurar opciones de gas según la red
	const gasOptions =
		{
			alfajores: {
				gasPrice: hre.ethers.parseUnits('0.1', 'gwei'),
				gasLimit: 5000000
			},
			celo: {
				gasPrice: hre.ethers.parseUnits('5', 'gwei'),
				gasLimit: 5000000
			}
		}[network] || {}

	// Obtener la dirección del contrato desplegado
	const vendorV2Address = process.env.VENDOR_V2_ADDRESS
	if (!vendorV2Address) {
		throw new Error('VENDOR_V2_ADDRESS no está configurado en el archivo .env')
	}

	const VendorV2 = await hre.ethers.getContractFactory('VendorV2')
	const vendorV2 = VendorV2.attach(vendorV2Address)

	// 1. Configurar tokens
	console.log('\nConfigurando tokens...')

	// Token nativo (CELO)
	await vendorV2.addToken(
		'0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Dirección especial para token nativo
		'0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Oracle de Chainlink para CELO/USD
		8, // Decimales del oracle
		true, // Activo
		true, // Es nativo
		gasOptions
	)
	console.log('Token nativo (CELO) configurado')

	// cUSD
	await vendorV2.addToken(
		'0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD en Celo mainnet
		'0x765DE816845861e75A25fCA122bb6898B8B1282a', // Oracle de Chainlink para cUSD/USD
		8, // Decimales del oracle
		true, // Activo
		false, // No es nativo
		gasOptions
	)
	console.log('cUSD configurado')

	// 2. Configurar grupo por defecto
	console.log('\nConfigurando grupo por defecto...')
	const defaultGroup = {
		group: 'default',
		state: true,
		arrayShared: [
			{
				addr: deployer.address,
				pcng: 10000 // 100% va al deployer
			}
		]
	}
	await vendorV2.addGroup('default', true, defaultGroup.arrayShared, gasOptions)
	console.log('Grupo por defecto configurado')

	// 3. Configurar colección
	console.log('\nConfigurando colección...')
	const nftAddress = process.env.NFT_ADDRESS
	if (!nftAddress) {
		throw new Error('NFT_ADDRESS no está configurado en el archivo .env')
	}

	await vendorV2.addCollection(
		nftAddress,
		hre.ethers.parseEther('1'), // Precio en USD (1 USD)
		true, // Activo
		gasOptions
	)
	console.log('Colección configurada')

	console.log('\nConfiguración completada exitosamente!')
	console.log('Dirección del contrato:', vendorV2Address)
	console.log('\nPara verificar la configuración:')
	console.log('1. Ver tokens configurados:')
	console.log('   await vendorV2.tokensList()')
	console.log('2. Ver grupos configurados:')
	console.log("   await vendorV2.getGroup('default')")
	console.log('3. Ver colecciones configuradas:')
	console.log('   await vendorV2.collectionList()')
}

// Exportar la tarea para Hardhat
task(
	'setup',
	'Configura el contrato VendorV2 con tokens, grupos y colecciones'
).setAction(async () => {
	await setupVendorV2()
})

module.exports = {
	setupVendorV2
}
