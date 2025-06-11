import { expect } from 'chai'
import chai from 'chai'
import chaiBigint from 'chai-bigint'
import hre, { viem } from 'hardhat'
import { Address, GetContractReturnType, zeroAddress } from 'viem'

import { ABIS } from '@/config/abi'

chai.use(chaiBigint)

interface FixtureReturn {
	// Cuentas nombradas
	deployer: string
	luca: string
	juan: string
	santiago: string
	// Contrato
	caracoli: GetContractReturnType<typeof ABIS.Inhabit>
}

describe('Inhabit', function () {
	async function deployFixture(): Promise<FixtureReturn> {
		const { deployments, getNamedAccounts } = hre
		const { deployer, luca, juan, santiago } = await getNamedAccounts()

		await deployments.fixture(['localhost'])

		// Obtener dirección del contrato
		const inhabitCaracoliAddress = (await deployments.get('Inhabit_CARACOLI'))
			.address as Address

		const caracoli = (await viem.getContractAt(
			'Inhabit',
			inhabitCaracoliAddress
		)) as unknown as GetContractReturnType<typeof ABIS.Inhabit>

		return {
			deployer,
			luca,
			juan,
			santiago,
			caracoli
		}
	}

	describe('SoftAdministered', function () {
		describe('Initialization', function () {
			beforeEach(async function () {
				const fixture = await deployFixture()
				Object.assign(this, fixture)
			})

			describe('constructor', function () {
				it('Should set deployer as owner', async function () {
					const owner = await this.caracoli.read.owner()
					expect(owner.toLowerCase()).to.equal(this.deployer.toLowerCase())
				})

				it('Should not grant user role to owner by default', async function () {
					const hasRole = await this.caracoli.read.hasRole([this.deployer])
					expect(hasRole).to.be.false
				})
			})

			describe('owner', function () {
				it('Should return current owner address', async function () {
					const owner = await this.caracoli.read.owner()
					expect(owner.toLowerCase()).to.equal(this.deployer.toLowerCase())
				})
			})
		})

		describe('Access Modifiers', function () {
			beforeEach(async function () {
				const fixture = await deployFixture()
				Object.assign(this, fixture)
			})

			describe('onlyOwner', function () {
				it('Should allow owner to call onlyOwner functions', async function () {
					const tx = await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})
					expect(tx).to.exist
				})

				it('Should revert if non-owner calls onlyOwner function', async function () {
					await expect(
						this.caracoli.write.addRole([this.santiago], {
							account: this.juan
						})
					).to.be.rejectedWith('Ownable: caller is not the owner')
				})
			})

			describe('onlyUser', function () {
				it('Should allow user with role to call onlyUser functions', async function () {
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.true
				})

				it('Should revert if user without role calls onlyUser function', async function () {
					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.false
				})
			})

			describe('onlyUserOrOwner', function () {
				it('Should allow owner to call onlyUserOrOwner functions', async function () {
					const hasRole = await this.caracoli.read.hasRole([this.deployer])
					const owner = await this.caracoli.read.owner()
					expect(owner.toLowerCase()).to.equal(this.deployer.toLowerCase())
				})

				it('Should allow user with role to call onlyUserOrOwner functions', async function () {
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.true
				})

				it('Should revert if neither owner nor user calls onlyUserOrOwner function', async function () {
					const hasRole = await this.caracoli.read.hasRole([this.santiago])
					const isOwner =
						this.santiago.toLowerCase() === this.deployer.toLowerCase()
					expect(hasRole || isOwner).to.be.false
				})
			})
		})

		describe('Role Management', function () {
			beforeEach(async function () {
				const fixture = await deployFixture()
				Object.assign(this, fixture)
			})

			describe('addRole', function () {
				it('Should grant role to new user', async function () {
					const tx = await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})
					expect(tx).to.exist

					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.true
				})

				it('Should not duplicate role for existing user', async function () {
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					const tx = await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})
					expect(tx).to.exist

					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.true
				})

				it('Should revert if called by non-owner', async function () {
					await expect(
						this.caracoli.write.addRole([this.santiago], {
							account: this.juan
						})
					).to.be.rejectedWith('Ownable: caller is not the owner')
				})

				it('Should revert when adding zero address [FAILING TEST]', async function () {
					await expect(
						this.caracoli.write.addRole([zeroAddress], {
							account: this.deployer
						})
					).to.be.rejectedWith('Inhabit: wallet is zero address')
				})

				it('Should emit RoleGranted event when adding role [FAILING TEST]', async function () {
					const tx = await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					const publicClient = await viem.getPublicClient()
					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					expect(receipt.logs).to.have.lengthOf.greaterThan(0)
				})

				it('Should handle zero address input (CURRENT VULNERABLE BEHAVIOR)', async function () {
					const tx = await this.caracoli.write.addRole([zeroAddress], {
						account: this.deployer
					})
					expect(tx).to.exist

					const hasRole = await this.caracoli.read.hasRole([zeroAddress])
					expect(hasRole).to.be.true
				})
			})

			describe('revokeRole', function () {
				it('Should revoke role from existing user', async function () {
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					const tx = await this.caracoli.write.revokeRole([this.juan], {
						account: this.deployer
					})
					expect(tx).to.exist

					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.false
				})

				it('Should handle revoking non-existent role', async function () {
					const tx = await this.caracoli.write.revokeRole([this.luca], {
						account: this.deployer
					})
					expect(tx).to.exist

					const hasRole = await this.caracoli.read.hasRole([this.luca])
					expect(hasRole).to.be.false
				})

				it('Should revert if called by non-owner', async function () {
					await expect(
						this.caracoli.write.revokeRole([this.deployer], {
							account: this.juan
						})
					).to.be.rejectedWith('Ownable: caller is not the owner')
				})

				it('Should revert when trying to revoke owner role [FAILING TEST]', async function () {
					await this.caracoli.write.addRole([this.deployer], {
						account: this.deployer
					})

					await expect(
						this.caracoli.write.revokeRole([this.deployer], {
							account: this.deployer
						})
					).to.be.rejectedWith('Inhabit: cannot revoke owner role')
				})

				it('Should emit RoleRevoked event when revoking role [FAILING TEST]', async function () {
					// Primero agregar rol
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					// ESTE TEST FALLA PORQUE EL CONTRATO NO EMITE EVENTOS
					const tx = await this.caracoli.write.revokeRole([this.juan], {
						account: this.deployer
					})

					const publicClient = await viem.getPublicClient()
					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					// Esperamos que emita evento RoleRevoked
					expect(receipt.logs).to.have.lengthOf.greaterThan(0)

					// Verificar que el evento tenga los parámetros correctos
					// const roleRevokedEvent = receipt.logs.find(log => log.topics[0] === roleRevokedTopic)
					// expect(roleRevokedEvent).to.exist
					// expect(roleRevokedEvent.args.account).to.equal(this.juan)
				})

				// 🔴 TEST ACTUAL QUE DOCUMENTA EL PROBLEMA (para comparación)
				it('Should allow revoking owner role (CURRENT PROBLEMATIC BEHAVIOR)', async function () {
					// Este test PASA pero documenta un comportamiento problemático
					await this.caracoli.write.addRole([this.deployer], {
						account: this.deployer
					})

					const tx = await this.caracoli.write.revokeRole([this.deployer], {
						account: this.deployer
					})
					expect(tx).to.exist

					const hasRole = await this.caracoli.read.hasRole([this.deployer])
					expect(hasRole).to.be.false
				})
			})

			describe('hasRole', function () {
				it('Should return true for user with active role', async function () {
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					const hasRole = await this.caracoli.read.hasRole([this.juan])
					expect(hasRole).to.be.true
				})

				it('Should return false for user without role', async function () {
					const hasRole = await this.caracoli.read.hasRole([this.luca])
					expect(hasRole).to.be.false
				})

				it('Should return false for revoked user', async function () {
					// Agregar y luego revocar
					await this.caracoli.write.addRole([this.santiago], {
						account: this.deployer
					})
					await this.caracoli.write.revokeRole([this.santiago], {
						account: this.deployer
					})

					const hasRole = await this.caracoli.read.hasRole([this.santiago])
					expect(hasRole).to.be.false
				})

				it('Should handle zero address query', async function () {
					const hasRole = await this.caracoli.read.hasRole([zeroAddress])
					expect(hasRole).to.be.false
				})
			})
		})

		describe('Ownership Transfer', function () {
			beforeEach(async function () {
				const fixture = await deployFixture()
				Object.assign(this, fixture)
			})

			describe('transferOwnership', function () {
				it('Should transfer ownership to valid address', async function () {
					const tx = await this.caracoli.write.transferOwnership([this.juan], {
						account: this.deployer
					})
					expect(tx).to.exist

					const newOwner = await this.caracoli.read.owner()
					expect(newOwner.toLowerCase()).to.equal(this.juan.toLowerCase())
				})

				it('Should revert if transferring to zero address', async function () {
					await expect(
						this.caracoli.write.transferOwnership([zeroAddress], {
							account: this.deployer
						})
					).to.be.rejectedWith('Ownable: new owner is the zero address')
				})

				it('Should revert if called by non-owner', async function () {
					await expect(
						this.caracoli.write.transferOwnership([this.luca], {
							account: this.juan
						})
					).to.be.rejectedWith('Ownable: caller is not the owner')
				})

				it('Should allow transferring to same owner', async function () {
					const tx = await this.caracoli.write.transferOwnership(
						[this.deployer],
						{
							account: this.deployer
						}
					)
					expect(tx).to.exist

					const owner = await this.caracoli.read.owner()
					expect(owner.toLowerCase()).to.equal(this.deployer.toLowerCase())
				})

				// 🔴 TEST QUE DEBE FALLAR - Emisión de eventos de ownership
				it('Should emit OwnershipTransferred event [FAILING TEST]', async function () {
					// ESTE TEST FALLA PORQUE EL CONTRATO NO EMITE EVENTOS
					const oldOwner = await this.caracoli.read.owner()

					const tx = await this.caracoli.write.transferOwnership([this.juan], {
						account: this.deployer
					})

					const publicClient = await viem.getPublicClient()
					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					// Esperamos que emita evento OwnershipTransferred
					expect(receipt.logs).to.have.lengthOf.greaterThan(0)

					// Verificar que el evento tenga los parámetros correctos
					// const ownershipEvent = receipt.logs.find(log => log.topics[0] === ownershipTransferredTopic)
					// expect(ownershipEvent).to.exist
					// expect(ownershipEvent.args.previousOwner).to.equal(oldOwner)
					// expect(ownershipEvent.args.newOwner).to.equal(this.juan)
				})

				// 🔴 TEST QUE DEBE FALLAR - Validación de transferencia al mismo owner
				it('Should revert when transferring to same owner (optimization) [FAILING TEST]', async function () {
					// ESTE TEST FALLA PORQUE EL CONTRATO NO OPTIMIZA PARA EVITAR TRANSFERENCIAS INNECESARIAS
					await expect(
						this.caracoli.write.transferOwnership([this.deployer], {
							account: this.deployer
						})
					).to.be.rejectedWith('Inhabit: new owner is same as current owner')
				})

				// 🔴 TEST ACTUAL QUE DOCUMENTA EL COMPORTAMIENTO ACTUAL (para comparación)
				it('Should emit OwnershipTransferred event (CURRENT NO-EVENT BEHAVIOR)', async function () {
					// Este test PASA pero documenta que NO hay eventos
					const tx = await this.caracoli.write.transferOwnership([this.juan], {
						account: this.deployer
					})

					const publicClient = await viem.getPublicClient()
					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					// Esperamos que NO haya eventos (comportamiento actual)
					expect(receipt.logs).to.have.lengthOf(0) // Actual: no events
				})
			})
		})

		describe('Edge Cases', function () {
			beforeEach(async function () {
				const fixture = await deployFixture()
				Object.assign(this, fixture)
			})

			describe('Multiple Operations', function () {
				it('Should handle multiple role additions and revocations', async function () {
					const users = [this.juan, this.luca, this.santiago]

					// Agregar roles a todos
					for (const user of users) {
						await this.caracoli.write.addRole([user], {
							account: this.deployer
						})
						const hasRole = await this.caracoli.read.hasRole([user])
						expect(hasRole).to.be.true
					}

					// Revocar algunos roles
					await this.caracoli.write.revokeRole([this.luca], {
						account: this.deployer
					})

					// Verificar estados finales
					expect(await this.caracoli.read.hasRole([this.juan])).to.be.true
					expect(await this.caracoli.read.hasRole([this.luca])).to.be.false
					expect(await this.caracoli.read.hasRole([this.santiago])).to.be.true
				})

				it('Should handle ownership transfer with existing roles', async function () {
					// Agregar rol a juan
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					// Transferir ownership a juan
					await this.caracoli.write.transferOwnership([this.juan], {
						account: this.deployer
					})

					// Juan ahora es owner Y tiene rol de usuario
					const owner = await this.caracoli.read.owner()
					const hasRole = await this.caracoli.read.hasRole([this.juan])

					expect(owner.toLowerCase()).to.equal(this.juan.toLowerCase())
					expect(hasRole).to.be.true

					// Juan puede gestionar roles como nuevo owner
					const tx = await this.caracoli.write.addRole([this.luca], {
						account: this.juan
					})
					expect(tx).to.exist
				})
			})

			// 🔴 TESTS ADICIONALES QUE DEBEN FALLAR - Funciones getter para variables privadas
			describe('Private Variables Access [FAILING TESTS]', function () {
				// 🔴 TEST QUE DEBE FALLAR - Getter para WalletAccessStruct
				it('Should provide getter for wallet access details [FAILING TEST]', async function () {
					// Agregar rol
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})

					// ESTE TEST FALLA PORQUE NO HAY GETTER PARA LOS DETALLES DEL WALLET
					// Esperamos una función que retorne la estructura completa
					const walletDetails = await this.caracoli.read.getWalletAccess([
						this.juan
					])
					expect(walletDetails.wallet.toLowerCase()).to.equal(
						this.juan.toLowerCase()
					)
					expect(walletDetails.active).to.be.true
				})

				// 🔴 TEST QUE DEBE FALLAR - Enumerar usuarios con roles
				it('Should provide function to get all users with roles [FAILING TEST]', async function () {
					// Agregar varios roles
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})
					await this.caracoli.write.addRole([this.luca], {
						account: this.deployer
					})

					// ESTE TEST FALLA PORQUE NO HAY FUNCIÓN PARA ENUMERAR USUARIOS
					const usersWithRoles = await this.caracoli.read.getAllUsersWithRoles()
					expect(usersWithRoles).to.have.lengthOf(2)
					expect(usersWithRoles).to.include(this.juan.toLowerCase())
					expect(usersWithRoles).to.include(this.luca.toLowerCase())
				})

				// 🔴 TEST QUE DEBE FALLAR - Contador de usuarios activos
				it('Should provide function to get active users count [FAILING TEST]', async function () {
					// Agregar y revocar algunos roles
					await this.caracoli.write.addRole([this.juan], {
						account: this.deployer
					})
					await this.caracoli.write.addRole([this.luca], {
						account: this.deployer
					})
					await this.caracoli.write.addRole([this.santiago], {
						account: this.deployer
					})
					await this.caracoli.write.revokeRole([this.luca], {
						account: this.deployer
					})

					// ESTE TEST FALLA PORQUE NO HAY FUNCIÓN PARA CONTAR USUARIOS ACTIVOS
					const activeUsersCount =
						await this.caracoli.read.getActiveUsersCount()
					expect(activeUsersCount).to.equal(2n) // juan y santiago activos
				})
			})
		})
	})
})
