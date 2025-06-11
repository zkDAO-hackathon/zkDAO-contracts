const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('Sistema de Distribución de Comisiones', function () {
	let vendor
	let owner
	let user1
	let distributor1
	let distributor2
	let distributor3
	let mockToken
	let mockNFT
	let mockChainlink
	let group

	beforeEach(async function () {
		// Obtener las cuentas para testing
		;[owner, user1, distributor1, distributor2, distributor3] =
			await ethers.getSigners()

		// Desplegar token ERC20 para pruebas
		const MockToken = await ethers.getContractFactory('MockErc20')
		mockToken = await MockToken.deploy(
			'Mock Token',
			'MTK',
			ethers.parseEther('1000000')
		)
		await mockToken.waitForDeployment()
		console.log('MockToken desplegado en:', await mockToken.getAddress())

		// Desplegar NFT para pruebas
		const MockNFT = await ethers.getContractFactory('MockNFT')
		mockNFT = await MockNFT.deploy()
		await mockNFT.waitForDeployment()
		console.log('MockNFT desplegado en:', await mockNFT.getAddress())

		// Desplegar Chainlink mock para precios
		const MockChainlink = await ethers.getContractFactory('MockChainlink')
		mockChainlink = await MockChainlink.deploy()
		await mockChainlink.waitForDeployment()
		console.log(
			'MockChainlink desplegado en:',
			await mockChainlink.getAddress()
		)

		// Desplegar contrato Group
		const Group = await ethers.getContractFactory('Group')
		group = await Group.deploy()
		await group.waitForDeployment()
		console.log('Group desplegado en:', await group.getAddress())

		// Desplegar VendorV2
		const VendorV2 = await ethers.getContractFactory('VendorV2')
		vendor = await VendorV2.deploy()
		await vendor.waitForDeployment()
		console.log('VendorV2 desplegado en:', await vendor.getAddress())

		// Configurar roles
		await vendor.connect(owner).addUser(owner.address)
		await vendor.connect(owner).addUser(user1.address)
		await vendor.connect(owner).addUser(distributor1.address)
		await vendor.connect(owner).addUser(distributor2.address)
		await vendor.connect(owner).addUser(distributor3.address)
		console.log('Roles configurados')

		// Dar permisos de mint al vendor en el NFT
		await mockNFT.connect(owner).transferOwnership(await vendor.getAddress())
		console.log('Permisos de NFT transferidos')

		// Configurar token ERC20 en la whitelist
		await vendor
			.connect(owner)
			.addToken(
				await mockToken.getAddress(),
				await mockChainlink.getAddress(),
				8,
				true,
				false
			)
		console.log('Token ERC20 añadido a whitelist')

		// Configurar token nativo (ETH) en la whitelist
		await vendor
			.connect(owner)
			.addToken(
				'0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
				await mockChainlink.getAddress(),
				8,
				true,
				true
			)
		console.log('Token nativo añadido a whitelist')

		// Configurar grupos de distribución
		const distributionGroup70_30 = {
			group: 'distribution70_30',
			state: true,
			arrayShared: [
				{
					addr: distributor1.address,
					pcng: 7000 // 70%
				},
				{
					addr: distributor2.address,
					pcng: 3000 // 30%
				}
			]
		}

		const distributionGroup33_33_33 = {
			group: 'distribution33_33_33',
			state: true,
			arrayShared: [
				{
					addr: distributor1.address,
					pcng: 3334 // ~33.34%
				},
				{
					addr: distributor2.address,
					pcng: 3333 // ~33.33%
				},
				{
					addr: distributor3.address,
					pcng: 3333 // ~33.33%
				}
			]
		}

		await vendor
			.connect(owner)
			.addGroup('distribution70_30', true, distributionGroup70_30.arrayShared)
		await vendor
			.connect(owner)
			.addGroup(
				'distribution33_33_33',
				true,
				distributionGroup33_33_33.arrayShared
			)
		console.log('Grupos de distribución configurados')

		// Configurar colección NFT
		await vendor.connect(owner).addCollection(
			await mockNFT.getAddress(),
			ethers.parseEther('0.1'), // Precio en USD
			true
		)
		console.log('Colección NFT configurada')

		// Dar tokens al usuario de prueba
		await mockToken
			.connect(owner)
			.transfer(user1.address, ethers.parseEther('1000'))
		console.log('Tokens transferidos al usuario de prueba')

		// Configurar precio en el oráculo
		await mockChainlink.connect(owner).setPrice(ethers.parseEther('1800')) // 1 ETH = 1800 USD
		console.log('Precio configurado en el oráculo')
	})

	describe('Gestión de Grupos de Distribución', function () {
		it('Debería permitir al admin actualizar el estado de un grupo (activar/desactivar)', async function () {
			await vendor.connect(owner).updateGroupStatus('distribution70_30', false)
			const grupo = await vendor.getGroup('distribution70_30')
			expect(grupo.state).to.be.false
		})

		it('No debería permitir que una cuenta no-admin actualice el estado de un grupo', async function () {
			await expect(
				vendor.connect(user1).updateGroupStatus('distribution70_30', false)
			).to.be.revertedWith('Restricted to admins.')
		})

		it('Debería fallar la compra si se intenta distribuir a un grupo desactivado', async function () {
			const vendorAddress = await vendor.getAddress()
			await vendor.connect(owner).updateGroupStatus('distribution70_30', false)

			await mockToken
				.connect(user1)
				.approve(vendorAddress, ethers.parseEther('100'))

			await expect(
				vendor
					.connect(user1)
					.buyWithToken('distribution70_30', await mockToken.getAddress(), 0, 1)
			).to.be.revertedWith('distribution: Group Not Already Available')
		})
	})

	describe('Distribución de Comisiones con Token ERC20', function () {
		it('Debería distribuir correctamente las comisiones 70/30 al comprar con tokens ERC20', async function () {
			const vendorAddress = await vendor.getAddress()

			// Balance inicial de los distribuidores
			const dist1BalanceInicial = await mockToken.balanceOf(
				distributor1.address
			)
			const dist2BalanceInicial = await mockToken.balanceOf(
				distributor2.address
			)

			// Aprobar tokens para la compra
			await mockToken
				.connect(user1)
				.approve(vendorAddress, ethers.parseEther('100'))

			// Realizar compra
			await vendor
				.connect(user1)
				.buyWithToken('distribution70_30', await mockToken.getAddress(), 0, 1)

			// Verificar distribución
			const dist1BalanceFinal = await mockToken.balanceOf(distributor1.address)
			const dist2BalanceFinal = await mockToken.balanceOf(distributor2.address)

			// Calcular cambios en balances
			const dist1Ganancia = dist1BalanceFinal - dist1BalanceInicial
			const dist2Ganancia = dist2BalanceFinal - dist2BalanceInicial

			// Verificar proporciones (70/30)
			expect(dist1Ganancia).to.be.gt(
				0n,
				'El distribuidor 1 debería haber recibido tokens'
			)
			expect(dist2Ganancia).to.be.gt(
				0n,
				'El distribuidor 2 debería haber recibido tokens'
			)
			const ratio = (dist1Ganancia * 3n) / (dist2Ganancia * 7n)
			expect(ratio).to.be.closeTo(
				1n,
				2n,
				'La proporción de distribución debería ser aproximadamente 70/30'
			)
		})

		it('Debería distribuir correctamente las comisiones 33/33/33 al comprar con tokens ERC20', async function () {
			const vendorAddress = await vendor.getAddress()

			// Balance inicial de los distribuidores
			const dist1BalanceInicial = await mockToken.balanceOf(
				distributor1.address
			)
			const dist2BalanceInicial = await mockToken.balanceOf(
				distributor2.address
			)
			const dist3BalanceInicial = await mockToken.balanceOf(
				distributor3.address
			)

			// Aprobar tokens para la compra
			await mockToken
				.connect(user1)
				.approve(vendorAddress, ethers.parseEther('100'))

			// Realizar compra
			await vendor
				.connect(user1)
				.buyWithToken(
					'distribution33_33_33',
					await mockToken.getAddress(),
					0,
					1
				)

			// Verificar distribución
			const dist1BalanceFinal = await mockToken.balanceOf(distributor1.address)
			const dist2BalanceFinal = await mockToken.balanceOf(distributor2.address)
			const dist3BalanceFinal = await mockToken.balanceOf(distributor3.address)

			// Calcular cambios en balances
			const dist1Ganancia = dist1BalanceFinal - dist1BalanceInicial
			const dist2Ganancia = dist2BalanceFinal - dist2BalanceInicial
			const dist3Ganancia = dist3BalanceFinal - dist3BalanceInicial

			// Verificar que todos recibieron tokens
			expect(dist1Ganancia).to.be.gt(
				0n,
				'El distribuidor 1 debería haber recibido tokens'
			)
			expect(dist2Ganancia).to.be.gt(
				0n,
				'El distribuidor 2 debería haber recibido tokens'
			)
			expect(dist3Ganancia).to.be.gt(
				0n,
				'El distribuidor 3 debería haber recibido tokens'
			)

			// Verificar que las cantidades son aproximadamente iguales
			const maxDiferencia = ethers.parseEther('0.001') // Permitir una pequeña diferencia
			expect(Math.abs(Number(dist1Ganancia - dist2Ganancia))).to.be.lessThan(
				Number(maxDiferencia),
				'La diferencia entre distribuidor 1 y 2 debería ser mínima'
			)
			expect(Math.abs(Number(dist2Ganancia - dist3Ganancia))).to.be.lessThan(
				Number(maxDiferencia),
				'La diferencia entre distribuidor 2 y 3 debería ser mínima'
			)
			expect(Math.abs(Number(dist1Ganancia - dist3Ganancia))).to.be.lessThan(
				Number(maxDiferencia),
				'La diferencia entre distribuidor 1 y 3 debería ser mínima'
			)
		})
	})

	describe('Distribución de Comisiones con Token Nativo (ETH)', function () {
		it('Debería distribuir correctamente las comisiones 70/30 al comprar con ETH', async function () {
			// Balance inicial de los distribuidores
			const dist1BalanceInicial = await ethers.provider.getBalance(
				distributor1.address
			)
			const dist2BalanceInicial = await ethers.provider.getBalance(
				distributor2.address
			)

			// Realizar compra con ETH
			await vendor.connect(user1).buyNative(
				'distribution70_30',
				0, // _cIdx
				1, // _amount
				{ value: ethers.parseEther('0.1') }
			)

			// Verificar distribución
			const dist1BalanceFinal = await ethers.provider.getBalance(
				distributor1.address
			)
			const dist2BalanceFinal = await ethers.provider.getBalance(
				distributor2.address
			)

			// Calcular cambios en balances
			const dist1Ganancia = dist1BalanceFinal - dist1BalanceInicial
			const dist2Ganancia = dist2BalanceFinal - dist2BalanceInicial

			// Verificar proporciones (70/30)
			expect(dist1Ganancia).to.be.gt(
				0n,
				'El distribuidor 1 debería haber recibido ETH'
			)
			expect(dist2Ganancia).to.be.gt(
				0n,
				'El distribuidor 2 debería haber recibido ETH'
			)
			const ratio = (dist1Ganancia * 3n) / (dist2Ganancia * 7n)
			expect(ratio).to.be.closeTo(
				1n,
				2n,
				'La proporción de distribución debería ser aproximadamente 70/30'
			)
		})

		it('Debería distribuir correctamente las comisiones 33/33/33 al comprar con ETH', async function () {
			// Balance inicial de los distribuidores
			const dist1BalanceInicial = await ethers.provider.getBalance(
				distributor1.address
			)
			const dist2BalanceInicial = await ethers.provider.getBalance(
				distributor2.address
			)
			const dist3BalanceInicial = await ethers.provider.getBalance(
				distributor3.address
			)

			// Realizar compra con ETH
			await vendor.connect(user1).buyNative(
				'distribution33_33_33',
				0, // _cIdx
				1, // _amount
				{ value: ethers.parseEther('0.1') }
			)

			// Verificar distribución
			const dist1BalanceFinal = await ethers.provider.getBalance(
				distributor1.address
			)
			const dist2BalanceFinal = await ethers.provider.getBalance(
				distributor2.address
			)
			const dist3BalanceFinal = await ethers.provider.getBalance(
				distributor3.address
			)

			// Calcular cambios en balances
			const dist1Ganancia = dist1BalanceFinal - dist1BalanceInicial
			const dist2Ganancia = dist2BalanceFinal - dist2BalanceInicial
			const dist3Ganancia = dist3BalanceFinal - dist3BalanceInicial

			// Verificar que todos recibieron ETH
			expect(dist1Ganancia).to.be.gt(
				0n,
				'El distribuidor 1 debería haber recibido ETH'
			)
			expect(dist2Ganancia).to.be.gt(
				0n,
				'El distribuidor 2 debería haber recibido ETH'
			)
			expect(dist3Ganancia).to.be.gt(
				0n,
				'El distribuidor 3 debería haber recibido ETH'
			)

			// Verificar que las cantidades son aproximadamente iguales
			const maxDiferencia = ethers.parseEther('0.001') // Permitir una pequeña diferencia
			expect(Math.abs(Number(dist1Ganancia - dist2Ganancia))).to.be.lessThan(
				Number(maxDiferencia),
				'La diferencia entre distribuidor 1 y 2 debería ser mínima'
			)
			expect(Math.abs(Number(dist2Ganancia - dist3Ganancia))).to.be.lessThan(
				Number(maxDiferencia),
				'La diferencia entre distribuidor 2 y 3 debería ser mínima'
			)
			expect(Math.abs(Number(dist1Ganancia - dist3Ganancia))).to.be.lessThan(
				Number(maxDiferencia),
				'La diferencia entre distribuidor 1 y 3 debería ser mínima'
			)
		})

		it('Debería fallar la compra con ETH si se envía un monto insuficiente para la comisión', async function () {
			await expect(
				vendor.connect(user1).buyNative(
					'distribution70_30',
					0, // _cIdx
					1, // _amount
					{ value: ethers.parseEther('0.00001') } // Enviar muy poco ETH
				)
			).to.be.revertedWith('Insufficient ETH sent') // Corregido mensaje esperado
		})
	})
})
