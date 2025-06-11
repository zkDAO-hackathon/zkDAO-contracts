const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

describe('VendorV2', function () {
	let vendor
	let owner
	let user1
	let user2
	let mockToken
	let mockNFT
	let mockOracle
	let group
	let mockChainlink
	let nonUser

	beforeEach(async function () {
		;[owner, user1, user2, nonUser] = await ethers.getSigners()

		// Desplegar contratos mock
		const MockToken = await ethers.getContractFactory('MockErc20')
		mockToken = await MockToken.deploy(
			'Mock Token',
			'MTK',
			ethers.parseEther('1000000')
		)
		await mockToken.waitForDeployment()
		console.log('MockToken deployed at:', await mockToken.getAddress())

		const MockNFT = await ethers.getContractFactory('MockNFT')
		mockNFT = await MockNFT.deploy()
		await mockNFT.waitForDeployment()
		console.log('MockNFT deployed at:', await mockNFT.getAddress())

		const MockChainlink = await ethers.getContractFactory('MockChainlink')
		mockChainlink = await MockChainlink.deploy()
		await mockChainlink.waitForDeployment()
		console.log('MockChainlink deployed at:', await mockChainlink.getAddress())

		// Desplegar Group.sol real
		const Group = await ethers.getContractFactory('Group')
		group = await Group.deploy()
		await group.waitForDeployment()
		console.log('Group deployed at:', await group.getAddress())

		// Desplegar VendorV2
		const VendorV2 = await ethers.getContractFactory('VendorV2')
		vendor = await VendorV2.deploy()
		await vendor.waitForDeployment()
		console.log('VendorV2 deployed at:', await vendor.getAddress())

		// Configurar roles - el owner ya es admin por defecto
		await vendor.connect(owner).addUser(owner.address)
		console.log('Added owner as user')
		await vendor.connect(owner).addUser(user1.address)
		console.log('Added user1 as user')
		await vendor.connect(owner).addUser(user2.address)
		console.log('Added user2 as user')

		// Dar permisos de mint al contrato vendor en el NFT
		await mockNFT.connect(owner).transferOwnership(await vendor.getAddress())
		console.log('Transferred NFT ownership to vendor')

		// Configurar precio en el oráculo
		await mockChainlink.connect(owner).setPrice(ethers.parseEther('1800')) // 1 ETH = 1800 USD
		console.log('Set price in oracle')

		// Configurar el token en la whitelist
		await vendor
			.connect(owner)
			.addToken(
				await mockToken.getAddress(),
				await mockChainlink.getAddress(),
				8,
				true,
				false
			)
		console.log('Added token to whitelist')

		// Configurar el token nativo (ETH)
		await vendor.connect(owner).addToken(
			'0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Dirección especial para ETH
			await mockChainlink.getAddress(),
			8,
			true,
			true
		)
		console.log('Added native token to whitelist')

		// Configurar el grupo default en el contrato VendorV2
		const defaultGroup = {
			group: 'default',
			state: true,
			arrayShared: [
				{
					addr: owner.address,
					pcng: 10000 // 100% va al owner
				}
			]
		}
		await vendor
			.connect(owner)
			.addGroup('default', true, defaultGroup.arrayShared)
		console.log('Added default group in VendorV2 contract')

		// Configurar la colección con un precio más bajo para las pruebas
		await vendor
			.connect(owner)
			.addCollection(await mockNFT.getAddress(), ethers.parseEther('0.1'), true)
		console.log('Added collection')

		// Dar tokens a user1 para las pruebas
		await mockToken
			.connect(owner)
			.transfer(user1.address, ethers.parseEther('1000'))
		console.log('Transferred tokens to user1')
	})

	describe('Funciones básicas', function () {
		describe('Compra con tokens ERC20', function () {
			it('Debería permitir comprar NFTs con tokens ERC20', async function () {
				const vendorAddress = await vendor.getAddress()
				// Aprobar tokens
				await mockToken
					.connect(user1)
					.approve(vendorAddress, ethers.parseEther('100'))

				// Comprar NFTs
				await vendor
					.connect(user1)
					.buyWithToken('default', await mockToken.getAddress(), 0, 1)

				// Verificar que el usuario recibió el NFT
				expect(await mockNFT.balanceOf(user1.address)).to.equal(
					1,
					'El usuario debería tener 1 NFT después de la compra'
				)
			})

			it('Debería permitir compras múltiples de NFTs con tokens ERC20', async function () {
				const vendorAddress = await vendor.getAddress()
				await mockToken
					.connect(user1)
					.approve(vendorAddress, ethers.parseEther('100'))

				await vendor
					.connect(user1)
					.buyWithToken('default', await mockToken.getAddress(), 0, 3)

				expect(await mockNFT.balanceOf(user1.address)).to.equal(
					3,
					'El usuario debería tener 3 NFTs después de la compra múltiple'
				)
			})

			it('Debería fallar la compra con tokens ERC20 si no hay suficiente balance', async function () {
				const vendorAddress = await vendor.getAddress()
				await mockToken
					.connect(user2)
					.approve(vendorAddress, ethers.parseEther('100'))

				await expect(
					vendor
						.connect(user2)
						.buyWithToken('default', await mockToken.getAddress(), 0, 1)
				).to.be.revertedWith("You don't have enough tokens to buy")
			})
		})

		describe('Compra con ETH (Token Nativo)', function () {
			it('Debería permitir comprar NFTs con ETH', async function () {
				const ethAmount = ethers.parseEther('0.1')

				await vendor
					.connect(user1)
					.buyNative('default', 0, 1, { value: ethAmount })

				expect(await mockNFT.balanceOf(user1.address)).to.equal(
					1,
					'El usuario debería tener 1 NFT después de la compra con ETH'
				)
			})

			it('Debería permitir compras múltiples de NFTs con ETH', async function () {
				const ethAmount = ethers.parseEther('0.3')

				await vendor
					.connect(user1)
					.buyNative('default', 0, 3, { value: ethAmount })

				expect(await mockNFT.balanceOf(user1.address)).to.equal(
					3,
					'El usuario debería tener 3 NFTs después de la compra múltiple con ETH'
				)
			})

			it('Debería fallar la compra con ETH si se envía un monto insuficiente', async function () {
				await expect(
					vendor
						.connect(user1)
						.buyNative('default', 0, 1, { value: ethers.parseEther('0.01') })
				).to.be.revertedWith('Insufficient ETH sent')
			})
		})

		it('Debería permitir al owner transferir NFTs reservados a un usuario', async function () {
			await vendor.connect(owner).transferReserved(0, user1.address, 1)
			expect(await mockNFT.balanceOf(user1.address)).to.equal(
				1,
				'El usuario debería tener 1 NFT después de la transferencia reservada'
			)
		})
	})

	describe('Funciones de Reembolso', function () {
		describe('Reembolso con Tokens ERC20', function () {
			it('Debería permitir reembolsar una inversión realizada con tokens ERC20', async function () {
				// Habilitar reembolsos
				await vendor.connect(owner).setRefundActive(true)
				await vendor.connect(owner).setRefundEnabled(user1.address, true)

				const vendorAddress = await vendor.getAddress()
				await mockToken
					.connect(user1)
					.approve(vendorAddress, ethers.parseEther('100'))

				// Comprar NFTs con tokens
				await vendor
					.connect(user1)
					.buyWithToken('default', await mockToken.getAddress(), 0, 1)

				// Aprobar el NFT para ser transferido
				await mockNFT.connect(user1).approve(await vendor.getAddress(), 0)

				// Transferir tokens al contrato para permitir reembolsos
				await mockToken
					.connect(owner)
					.transfer(await vendor.getAddress(), ethers.parseEther('100'))

				const balanceInicial = await mockToken.balanceOf(user1.address)

				// Solicitar reembolso
				await vendor
					.connect(user1)
					.refundInvestment(0, await mockToken.getAddress(), 0)

				const balanceFinal = await mockToken.balanceOf(user1.address)
				expect(balanceFinal).to.be.gt(
					balanceInicial,
					'El balance del usuario debería ser mayor después del reembolso'
				)
			})

			it('No debería permitir reembolsos de tokens ERC20 sin aprobación previa del NFT', async function () {
				await vendor.connect(owner).setRefundActive(true)
				await vendor.connect(owner).setRefundEnabled(user1.address, true)

				const vendorAddress = await vendor.getAddress()
				await mockToken
					.connect(user1)
					.approve(vendorAddress, ethers.parseEther('100'))

				await vendor
					.connect(user1)
					.buyWithToken('default', await mockToken.getAddress(), 0, 1)

				await expect(
					vendor
						.connect(user1)
						.refundInvestment(0, await mockToken.getAddress(), 0)
				).to.be.revertedWith('ERC721: caller is not token owner or approved')
			})
		})

		describe('Reembolso con ETH (Token Nativo)', function () {
			it('Debería permitir reembolsar una inversión realizada con ETH', async function () {
				const nativeTokenAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

				// Habilitar reembolsos
				await vendor.connect(owner).setRefundActive(true)
				await vendor.connect(owner).setRefundEnabled(user1.address, true)

				// Enviar ETH adicional al contrato para reembolsos
				await owner.sendTransaction({
					to: await vendor.getAddress(),
					value: ethers.parseEther('1.0')
				})

				// Comprar NFT con ETH
				const ethAmount = ethers.parseEther('0.1') // Precio del NFT
				await vendor.connect(user1).buyNative(
					'default',
					0, // _cIdx
					1, // _amount
					{ value: ethAmount }
				)

				// Aprobar el NFT para ser transferido (ID 0 asumiendo que es el primero minteado)
				await mockNFT.connect(user1).approve(await vendor.getAddress(), 0)

				const balanceInicial = await ethers.provider.getBalance(user1.address)

				// Solicitar reembolso usando address(0) para el token nativo
				await vendor.connect(user1).refundInvestment(
					0,
					ethers.ZeroAddress, // Usar ethers.ZeroAddress en lugar de nativeTokenAddress
					0
				)

				const balanceFinal = await ethers.provider.getBalance(user1.address)
				expect(balanceFinal).to.be.gt(
					balanceInicial,
					'El balance de ETH del usuario debería ser mayor después del reembolso'
				)
			})
		})
	})

	describe('Controles de Seguridad', function () {
		it('No debería permitir compras con tokens ERC20 sin aprobación previa de los tokens', async function () {
			const mockTokenAddress = await mockToken.getAddress()
			await expect(
				vendor.connect(user1).buyWithToken('default', mockTokenAddress, 0, 1)
			).to.be.revertedWith('Token approval is required to continue')
		})

		it('No debería permitir reembolsos si la funcionalidad global de reembolso no está activa', async function () {
			const mockTokenAddress = await mockToken.getAddress()
			await expect(
				vendor.connect(user1).refundInvestment(0, mockTokenAddress, 0)
			).to.be.revertedWith('Refund functionality is not active')
		})

		it('No debería permitir reembolsos si la wallet específica del usuario no está habilitada para reembolsos', async function () {
			await vendor.connect(owner).setRefundActive(true)
			const mockTokenAddress = await mockToken.getAddress()

			await expect(
				vendor.connect(user1).refundInvestment(0, mockTokenAddress, 0)
			).to.be.revertedWith('Refund not enabled for this wallet')
		})

		it("No debería permitir que usuarios no autorizados (sin rol 'user') transfieran NFTs reservados", async function () {
			await expect(
				vendor.connect(nonUser).transferReserved(0, user1.address, 1)
			).to.be.revertedWith('Caller is not user')
		})

		it('No debería permitir comprar NFTs (ni con token ni con ETH) de una colección inactiva', async function () {
			// Desactivar la colección 0 explícitamente para esta prueba
			await vendor
				.connect(owner)
				.setCollectionStatus(await mockNFT.getAddress(), false)

			const mockTokenAddress = await mockToken.getAddress()
			await mockToken
				.connect(user1)
				.approve(await vendor.getAddress(), ethers.parseEther('100'))

			// Intentar comprar con token
			await expect(
				vendor.connect(user1).buyWithToken('default', mockTokenAddress, 0, 1)
			).to.be.revertedWith('Collection is not active')

			// Intentar comprar con ETH
			await expect(
				vendor
					.connect(user1)
					.buyNative('default', 0, 1, { value: ethers.parseEther('0.1') })
			).to.be.revertedWith('Collection is not active')

			// Reactivar la colección para no afectar otras pruebas (si es necesario)
			await vendor
				.connect(owner)
				.setCollectionStatus(await mockNFT.getAddress(), true)
		})
	})

	describe('Transferencia de NFTs Reservados (Seguridad Adicional)', function () {
		it("No debería permitir transferir NFTs reservados si el llamador no tiene el rol 'user'", async function () {
			await expect(
				vendor.connect(nonUser).transferReserved(0, user1.address, 1)
			).to.be.revertedWith('Caller is not user')
		})

		it('No debería permitir comprar con ETH de una colección inactiva (verificación específica)', async function () {
			// Desactivar la colección 0 explícitamente
			await vendor
				.connect(owner)
				.setCollectionStatus(await mockNFT.getAddress(), false)

			await expect(
				vendor
					.connect(user1)
					.buyNative('default', 0, 1, { value: ethers.parseEther('0.1') })
			).to.be.revertedWith('Collection is not active')

			// Reactivar la colección
			await vendor
				.connect(owner)
				.setCollectionStatus(await mockNFT.getAddress(), true)
		})
	})

	describe('Gestión de Colecciones', function () {
		it('No debería permitir comprar con ETH de una colección que ha sido desactivada', async function () {
			// Usar la dirección de la colección existente (mockNFT)
			const collectionAddress = await mockNFT.getAddress()

			// Desactivar la colección usando su dirección
			await vendor.connect(owner).setCollectionStatus(collectionAddress, false)

			await expect(
				vendor
					.connect(user1)
					.buyNative('default', 0, 1, { value: ethers.parseEther('0.1') })
			).to.be.revertedWith('Collection is not active')

			// Reactivar la colección
			await vendor.connect(owner).setCollectionStatus(collectionAddress, true)
		})
	})
})
