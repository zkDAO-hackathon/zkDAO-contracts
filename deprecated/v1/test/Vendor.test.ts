import { expect } from 'chai'
import chai from 'chai'
import chaiBigint from 'chai-bigint'
import hre, { viem } from 'hardhat'
import { Address, GetContractReturnType, parseEther, zeroAddress } from 'viem'

import { ABIS } from '@/config/abi'
import { TEST_TOKEN_ONE, TEST_TOKEN_TWO } from '@/config/constants'
import { CollectionStruct, GroupStruct } from '@/models'
chai.use(chaiBigint)

interface FixtureReturn {
	deployer: string
	luca: string
	juan: string
	santiago: string
	mockcUSD: GetContractReturnType<typeof ABIS.MockErc20>
	dataFeeds: GetContractReturnType<typeof ABIS.MockOracleV2>
	caracoli: GetContractReturnType<typeof ABIS.Inhabit>
	jaguar: GetContractReturnType<typeof ABIS.Inhabit>
	paujil: GetContractReturnType<typeof ABIS.Inhabit>
	titi: GetContractReturnType<typeof ABIS.Inhabit>
	vendorV2: GetContractReturnType<typeof ABIS.VendorV2>
}

describe('VendorV2', function () {
	async function deployFixture(): Promise<FixtureReturn> {
		const { deployments, getNamedAccounts } = hre
		const { deployer, luca, juan, santiago } = await getNamedAccounts()

		await deployments.fixture(['localhost'])

		const mockErc20Address = (await deployments.get('MockErc20'))
			.address as Address

		const mockOracleAddress = (await deployments.get('MockOracleV2'))
			.address as Address

		const inhabitCaracoliAddress = (await deployments.get('Inhabit_CARACOLI'))
			.address as Address

		const inhabitJaguarAddress = (await deployments.get('Inhabit_JAGUAR'))
			.address as Address

		const inhabitPaujilAddress = (await deployments.get('Inhabit_PAUJIL'))
			.address as Address

		const inhabitTitiAddress = (await deployments.get('Inhabit_TITI'))
			.address as Address

		const vendorV2Address = (await deployments.get('VendorV2'))
			.address as Address

		const mockcUSD = (await viem.getContractAt(
			'MockErc20',
			mockErc20Address
		)) as unknown as GetContractReturnType<typeof ABIS.MockErc20>

		const dataFeeds = (await viem.getContractAt(
			'MockOracleV2',
			mockOracleAddress
		)) as unknown as GetContractReturnType<typeof ABIS.MockOracleV2>

		const caracoli = (await viem.getContractAt(
			'Inhabit',
			inhabitCaracoliAddress
		)) as unknown as GetContractReturnType<typeof ABIS.Inhabit>

		const jaguar = (await viem.getContractAt(
			'Inhabit',
			inhabitJaguarAddress
		)) as unknown as GetContractReturnType<typeof ABIS.Inhabit>

		const paujil = (await viem.getContractAt(
			'Inhabit',
			inhabitPaujilAddress
		)) as unknown as GetContractReturnType<typeof ABIS.Inhabit>

		const titi = (await viem.getContractAt(
			'Inhabit',
			inhabitTitiAddress
		)) as unknown as GetContractReturnType<typeof ABIS.Inhabit>

		const vendorV2 = (await viem.getContractAt(
			'VendorV2',
			vendorV2Address
		)) as unknown as GetContractReturnType<typeof ABIS.VendorV2>

		return {
			deployer,
			luca,
			juan,
			santiago,
			mockcUSD,
			dataFeeds,
			caracoli,
			jaguar,
			paujil,
			titi,
			vendorV2
		}
	}

	describe.skip('Administered', function () {
		beforeEach(async function () {
			const fixture = await deployFixture()
			this.vendorV2 = fixture.vendorV2
			this.deployer = fixture.deployer
			this.luca = fixture.luca
			this.juan = fixture.juan
			this.santiago = fixture.santiago
		})

		describe('isAdmin', function () {
			it('Should return true for default admin (deployer)', async function () {
				const isAdmin = await this.vendorV2.read.isAdmin([this.deployer])
				expect(isAdmin).to.be.true
			})

			it('Should return false for non-admin address', async function () {
				const isAdmin = await this.vendorV2.read.isAdmin([this.juan])
				expect(isAdmin).to.be.false
			})
		})

		describe('isUser', function () {
			it('Should return false for address not added as user', async function () {
				const isUser = await this.vendorV2.read.isUser([this.juan])
				expect(isUser).to.be.false
			})

			it('Should return true for address added as user', async function () {
				await this.vendorV2.write.addUser([this.juan], {
					account: this.deployer
				})
				const isUser = await this.vendorV2.read.isUser([this.juan])
				expect(isUser).to.be.true
			})
		})

		describe('addAdmin', function () {
			it('Should allow admin to add another admin', async function () {
				await this.vendorV2.write.addAdmin([this.juan], {
					account: this.deployer
				})
				const isAdmin = await this.vendorV2.read.isAdmin([this.juan])
				expect(isAdmin).to.be.true
			})

			it('Should revert if non-admin tries to add an admin', async function () {
				await expect(
					this.vendorV2.write.addAdmin([this.luca], {
						account: this.luca
					})
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should revert if admin tries to add existing admin again', async function () {
				await this.vendorV2.write.addAdmin([this.juan], {
					account: this.deployer
				})
				await expect(
					this.vendorV2.write.addAdmin([this.juan], {
						account: this.deployer
					})
				).to.be.rejectedWith('AccessControl: account')
			})
		})

		describe('addUser', function () {
			it('Should allow admin to add user', async function () {
				await this.vendorV2.write.addUser([this.luca], {
					account: this.deployer
				})
				const isUser = await this.vendorV2.read.isUser([this.luca])
				expect(isUser).to.be.true
			})

			it('Should revert if non-admin tries to add user', async function () {
				await expect(
					this.vendorV2.write.addUser([this.luca], {
						account: this.luca
					})
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should revert if admin tries to add user twice', async function () {
				await this.vendorV2.write.addUser([this.luca], {
					account: this.deployer
				})
				await expect(
					this.vendorV2.write.addUser([this.luca], {
						account: this.deployer
					})
				).to.be.rejectedWith('AccessControl: account')
			})
		})

		describe('removeUser', function () {
			it('Should allow admin to remove user', async function () {
				await this.vendorV2.write.addUser([this.luca], {
					account: this.deployer
				})
				await this.vendorV2.write.removeUser([this.luca], {
					account: this.deployer
				})
				const isUser = await this.vendorV2.read.isUser([this.luca])
				expect(isUser).to.be.false
			})

			it('Should revert if non-admin tries to remove user', async function () {
				await expect(
					this.vendorV2.write.removeUser([this.juan], {
						account: this.luca
					})
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should revert if user does not exist', async function () {
				await expect(
					this.vendorV2.write.removeUser([this.juan], {
						account: this.deployer
					})
				).to.be.rejectedWith('AccessControl: account')
			})
		})

		describe('renounceAdmin', function () {
			it('Should allow admin to renounce their own admin role', async function () {
				await this.vendorV2.write.addAdmin([this.juan], {
					account: this.deployer
				})
				await this.vendorV2.write.renounceAdmin([], {
					account: this.juan
				})
				const isAdmin = await this.vendorV2.read.isAdmin([this.juan])
				expect(isAdmin).to.be.false
			})

			it('Should not revert if a non-admin calls renounceAdmin', async function () {
				await this.vendorV2.write.renounceAdmin([], {
					account: this.santiago
				})
				const isAdmin = await this.vendorV2.read.isAdmin([this.santiago])
				expect(isAdmin).to.be.false
			})
		})
	})

	describe.skip('WhiteListTokenV2', function () {
		beforeEach(async function () {
			const fixture = await deployFixture()
			this.vendorV2 = fixture.vendorV2
			this.mockcUSD = fixture.mockcUSD
			this.dataFeeds = fixture.dataFeeds
			this.deployer = fixture.deployer
			this.luca = fixture.luca
			this.juan = fixture.juan
			this.santiago = fixture.santiago

			await this.vendorV2.write.addUser([this.luca], { account: this.deployer })
			await this.vendorV2.write.addUser([this.juan], { account: this.deployer })
		})

		describe('tokenList', function () {
			it('Should show tokens list', async function () {
				const tokens = await this.vendorV2.read.tokensList()
				expect(tokens).to.be.an('array').that.is.not.empty
			})
		})

		describe('addToken', function () {
			it('Should revert if non-user tries to add a token', async function () {
				await expect(
					this.vendorV2.write.addToken(
						[this.mockcUSD.address, this.dataFeeds.address, 8, true, false],
						{ account: this.santiago }
					)
				).to.be.rejectedWith('Restricted to users.')
			})

			it('Should revert if user tries to add zero address', async function () {
				await expect(
					this.vendorV2.write.addToken(
						[zeroAddress, this.dataFeeds.address, 8, true, false],
						{ account: this.luca }
					)
				).to.be.rejectedWith('Token already exist')
			})

			it('Should revert if user tries to add an existing token', async function () {
				await expect(
					this.vendorV2.write.addToken(
						[this.mockcUSD.address, this.dataFeeds.address, 8, true, false],
						{ account: this.luca }
					)
				).to.be.rejectedWith('Token already exist')
			})

			it('Should allow user to add a valid new token', async function () {
				const tokenAddr = TEST_TOKEN_ONE
				const tx = await this.vendorV2.write.addToken(
					[tokenAddr, this.dataFeeds.address, 8, true, false],
					{ account: this.luca }
				)
				expect(tx).to.exist
			})
		})

		describe('updateToken', function () {
			it('Should revert if user tries to update non-existent token id', async function () {
				await expect(
					this.vendorV2.write.updateToken([666, 1, TEST_TOKEN_ONE, 0, false], {
						account: this.luca
					})
				).to.be.rejectedWith('Invalid Token')
			})

			it('Should revert if type is 0 (invalid type)', async function () {
				await expect(
					this.vendorV2.write.updateToken([1, 0, TEST_TOKEN_ONE, 0, false], {
						account: this.juan
					})
				).to.be.rejectedWith('Error type')
			})

			it('Should revert if token does not exist by address', async function () {
				await expect(
					this.vendorV2.write.updateToken([1, 1, TEST_TOKEN_TWO, 0, false], {
						account: this.juan
					})
				).to.be.rejectedWith('Invalid Token')
			})

			it('Should update oracle address', async function () {
				await this.vendorV2.write.updateToken([1, 1, this.juan, 0, false], {
					account: this.luca
				})
				const token = await this.vendorV2.read.getTokenByAddr([
					this.mockcUSD.address
				])
				expect(token.oracle).to.equal(this.juan)
			})

			it('Should update oracle decimals', async function () {
				await this.vendorV2.write.updateToken([1, 2, zeroAddress, 10, false], {
					account: this.luca
				})
				const token = await this.vendorV2.read.getTokenByAddr([
					this.mockcUSD.address
				])
				expect(token.orcDecimals).to.equal(10n)
			})

			it('Should update active status', async function () {
				await this.vendorV2.write.updateToken([1, 3, zeroAddress, 0, false], {
					account: this.luca
				})
				const token = await this.vendorV2.read.getTokenByAddr([
					this.mockcUSD.address
				])
				expect(token.active).to.be.false
			})

			it('Should update native status', async function () {
				await this.vendorV2.write.updateToken([1, 4, zeroAddress, 0, true], {
					account: this.luca
				})
				const token = await this.vendorV2.read.getTokenByAddr([
					this.mockcUSD.address
				])
				expect(token.isNative).to.be.true
			})
		})

		describe('getTokenByAddr', function () {
			it('Should revert if token does not exist (zero address)', async function () {
				await expect(
					this.vendorV2.read.getTokenByAddr([zeroAddress])
				).to.be.rejectedWith('Invalid Token')
			})

			it('Should revert if token does not exist (random address)', async function () {
				await expect(
					this.vendorV2.read.getTokenByAddr([TEST_TOKEN_TWO])
				).to.be.rejectedWith('Invalid Token')
			})

			it('Should return token by address if exists', async function () {
				const token = await this.vendorV2.read.getTokenByAddr([
					this.mockcUSD.address
				])
				expect(token).to.be.an('object')
				expect(token.addr).to.equal(this.mockcUSD.address)
			})
		})
	})

	describe.skip('WithdrawV2', function () {
		const cUSDAmount: bigint = 1000000000n // 10 cUSD
		const ethAmount: bigint = 1000000000n // 0.000000001 ETH

		beforeEach(async function () {
			const fixture = await deployFixture()
			this.vendorV2 = fixture.vendorV2
			this.mockcUSD = fixture.mockcUSD
			this.dataFeeds = fixture.dataFeeds
			this.deployer = fixture.deployer
			this.luca = fixture.luca
			this.juan = fixture.juan
			this.santiago = fixture.santiago

			await this.vendorV2.write.addAdmin([this.luca], {
				account: this.deployer
			})
			await this.vendorV2.write.addAdmin([this.juan], {
				account: this.deployer
			})

			await this.mockcUSD.write.transfer([this.vendorV2.address, cUSDAmount], {
				account: this.deployer
			})

			const wallet = await viem.getWalletClient(this.deployer)
			await wallet.sendTransaction({
				to: this.vendorV2.address,
				value: ethAmount
			})
		})

		describe('withdraw', function () {
			it('Should revert if non-admin tries to withdraw', async function () {
				await expect(
					this.vendorV2.write.withdraw([ethAmount, this.santiago], {
						account: this.santiago
					})
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should revert if recipient address is zero', async function () {
				await expect(
					this.vendorV2.write.withdraw([ethAmount, zeroAddress], {
						account: this.luca
					})
				).to.be.rejectedWith('Invalid address')
			})

			it('Should revert if amount is zero', async function () {
				await expect(
					this.vendorV2.write.withdraw([0n, this.luca], {
						account: this.luca
					})
				).to.be.rejectedWith('Amount must be greater than zero')
			})

			it('Should revert if insufficient ETH balance', async function () {
				const tooMuch = ethAmount + 1_000_000n
				await expect(
					this.vendorV2.write.withdraw([tooMuch, this.luca], {
						account: this.luca
					})
				).to.be.rejectedWith('Failed to withdraw contract fee')
			})

			it('Should allow admin to withdraw ETH', async function () {
				const publicClient = await viem.getPublicClient()

				const balanceBefore = await publicClient.getBalance({
					address: this.luca
				})

				await this.vendorV2.write.withdraw([ethAmount, this.luca], {
					account: this.deployer
				})

				const balanceAfter = await publicClient.getBalance({
					address: this.luca
				})

				expect(balanceAfter).to.equal(balanceBefore + ethAmount)
			})

			it('Should decrease contract ETH balance after withdrawal', async function () {
				const publicClient = await viem.getPublicClient()

				const balanceBefore = await publicClient.getBalance({
					address: this.vendorV2.address
				})

				await this.vendorV2.write.withdraw([ethAmount, this.juan], {
					account: this.luca
				})

				const balanceAfter = await publicClient.getBalance({
					address: this.vendorV2.address
				})

				expect(balanceAfter).to.equal(balanceBefore - ethAmount)
			})
		})

		describe('withdrawToken', function () {
			it('Should revert if called by non-admin', async function () {
				await expect(
					this.vendorV2.write.withdrawToken(
						[this.mockcUSD.address, cUSDAmount, this.luca],
						{
							account: this.santiago
						}
					)
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should revert if token address is zero', async function () {
				await expect(
					this.vendorV2.write.withdrawToken(
						[zeroAddress, cUSDAmount, this.luca],
						{
							account: this.juan
						}
					)
				).to.be.rejected
			})

			it('Should revert if recipient address is zero', async function () {
				await expect(
					this.vendorV2.write.withdrawToken(
						[this.mockcUSD.address, cUSDAmount, zeroAddress],
						{ account: this.juan }
					)
				).to.be.rejected
			})

			it('Should revert if amount is zero', async function () {
				await expect(
					this.vendorV2.write.withdrawToken(
						[this.mockcUSD.address, 0n, this.juan],
						{ account: this.juan }
					)
				).to.be.rejected
			})

			it('Should revert if balance is insufficient', async function () {
				const tooMuch = cUSDAmount + 1_000_000n
				await expect(
					this.vendorV2.write.withdrawToken(
						[this.mockcUSD.address, tooMuch, this.juan],
						{ account: this.juan }
					)
				).to.be.rejectedWith('Failed to withdraw contract fee')
			})

			it('Should allow admin to withdraw tokens', async function () {
				const before = await this.mockcUSD.read.balanceOf([this.juan])
				await this.vendorV2.write.withdrawToken(
					[this.mockcUSD.address, cUSDAmount, this.juan],
					{ account: this.juan }
				)
				const after = await this.mockcUSD.read.balanceOf([this.juan])
				expect(after).to.equal(before + cUSDAmount)
			})

			it('Should reduce contract token balance after withdrawal', async function () {
				const before = await this.mockcUSD.read.balanceOf([
					this.vendorV2.address
				])
				await this.vendorV2.write.withdrawToken(
					[this.mockcUSD.address, cUSDAmount, this.juan],
					{ account: this.juan }
				)
				const after = await this.mockcUSD.read.balanceOf([
					this.vendorV2.address
				])
				expect(after).to.equal(before - cUSDAmount)
			})
		})
	})

	describe.skip('Group', function () {
		const TEN_TOKENS: bigint = parseEther('10')
		const ONE_ETH: bigint = parseEther('1')
		const P5000: bigint = 5000n
		const P2500: bigint = 2500n
		const P1250: bigint = 1250n

		beforeEach(async function () {
			const fixture = await deployFixture()
			Object.assign(this, fixture)

			await this.vendorV2.write.addAdmin([this.luca], {
				account: this.deployer
			})

			await this.mockcUSD.write.mint([this.vendorV2.address, TEN_TOKENS], {
				account: this.deployer
			})

			const wallet = await viem.getWalletClient(this.deployer)
			await wallet.sendTransaction({
				to: this.vendorV2.address,
				value: ONE_ETH
			})
		})

		describe('addGroup', function () {
			it('Should revert if group name is empty', async function () {
				await expect(
					this.vendorV2.write.addGroup(
						['', true, [{ addr: this.juan, pcng: 10000n }]],
						{
							account: this.deployer
						}
					)
				).to.be.rejectedWith('AddGroup: Group Already Stored')
			})

			it('Should revert if shared array is empty', async function () {
				await expect(
					this.vendorV2.write.addGroup(['VOID', true, []], {
						account: this.luca
					})
				).to.be.rejectedWith('AddGroup: Empty ArrayShared')
			})

			it('Should revert if non-admin tries to add a group', async function () {
				const shared = [{ addr: this.juan, pcng: P5000 }]
				await expect(
					this.vendorV2.write.addGroup(['TEAM', true, shared], {
						account: this.juan
					})
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should revert if admin tries to add an existing group', async function () {
				const shared = [{ addr: this.juan, pcng: P5000 }]
				await this.vendorV2.write.addGroup(['TEAM', true, shared], {
					account: this.luca
				})

				await expect(
					this.vendorV2.write.addGroup(['TEAM', true, shared], {
						account: this.luca
					})
				).to.be.rejectedWith('AddGroup: Group Already Stored')
			})

			it('Should revert if total percentage exceeds 100 %', async function () {
				const shared = [{ addr: this.juan, pcng: 12000n }]
				await expect(
					this.vendorV2.write.addGroup(['ODD', true, shared], {
						account: this.luca
					})
				).to.be.rejectedWith('AddGroup: The Taximum Percentage Is Exceeded')
			})

			it('Should allow admin to add a valid group', async function () {
				const shared = [{ addr: this.juan, pcng: P5000 }]
				await this.vendorV2.write.addGroup(['TEAM', true, shared], {
					account: this.luca
				})

				const g = await this.vendorV2.read.getGroup(['TEAM'])
				expect(g.group).to.equal('TEAM')
				expect(g.state).to.be.true
				expect(g.arrayShared.length).to.equal(1)
			})
		})

		describe('updateGroupStatus', function () {
			beforeEach(async function () {
				await this.vendorV2.write.addGroup(
					['SWITCH', true, [{ addr: this.juan, pcng: P5000 }]],
					{ account: this.deployer }
				)
			})

			it('Should revert if non-admin tries to update status', async function () {
				await expect(
					this.vendorV2.write.updateGroupStatus(['SWITCH', false], {
						account: this.juan
					})
				).to.be.rejectedWith('Restricted to admins.')
			})

			it('Should allow admin to toggle group status', async function () {
				await this.vendorV2.write.updateGroupStatus(['SWITCH', false], {
					account: this.luca
				})
				const g = await this.vendorV2.read.getGroup(['SWITCH'])
				expect(g.state).to.be.false
			})

			it('Should revert if group does not exist', async function () {
				await expect(
					this.vendorV2.write.updateGroupStatus(['NOEXIST', true], {
						account: this.deployer
					})
				).to.be.rejected
			})
		})

		describe('shared management', function () {
			// beforeEach(async function () {
			// 	await this.vendorV2.write.addGroup(
			// 		['CREW', true, [{ addr: this.juan, pcng: P2500 }]],
			// 		{ account: this.deployer }
			// 	)
			// })

			it('Should revert if group does not exist when adding shared', async function () {
				await expect(
					this.vendorV2.write.addSharedOfGroup(
						['NONE', { addr: this.santiago, pcng: P1250 }],
						{ account: this.luca }
					)
				).to.be.rejectedWith('addSharedOfGroup: Group Not Already Stored')
			})

			it('Should revert if adding shared exceeds 100 % total', async function () {
				await expect(
					this.vendorV2.write.addSharedOfGroup(
						['CREW', { addr: this.santiago, pcng: 8000n }],
						{ account: this.luca }
					)
				).to.be.rejectedWith(
					'addSharedOfGroup: The Taximum Percentage Is Exceeded'
				)
			})

			it('Should allow admin to add shared to group', async function () {
				await this.vendorV2.write.addSharedOfGroup(
					['CREW', { addr: this.santiago, pcng: P1250 }],
					{ account: this.luca }
				)
				const g = await this.vendorV2.read.getGroup(['CREW'])
				expect(g.arrayShared.length).to.equal(2)
			})

			it('Should revert if index is out of bounds when removing shared', async function () {
				await expect(
					this.vendorV2.write.removeSharedOfGroup(['CREW', 3], {
						account: this.luca
					})
				).to.be.rejectedWith('Index out of bounds')
			})

			it('Should allow admin to remove shared from group', async function () {
				await this.vendorV2.write.removeSharedOfGroup(['CREW', 0], {
					account: this.luca
				})
				const g = await this.vendorV2.read.getGroup(['CREW'])
				expect(g.arrayShared.length).to.equal(0)
			})

			it('Should revert if updateSharedOfGroup idx out of range', async function () {
				await expect(
					this.vendorV2.write.updateSharedOfGroup(
						['CREW', 3, 0, { addr: this.santiago, pcng: P1250 }],
						{ account: this.luca }
					)
				).to.be.rejectedWith('updateSharedOfGroup: Index out of bounds')
			})

			it('Should revert if group does not exist when updating shared', async function () {
				await expect(
					this.vendorV2.write.updateSharedOfGroup(
						['MISSING', 1, 0, { addr: this.santiago, pcng: P1250 }],
						{ account: this.luca }
					)
				).to.be.rejected
			})

			it('Should allow admin to update shared addr and percentage', async function () {
				await this.vendorV2.write.addSharedOfGroup(
					['CREW', { addr: this.santiago, pcng: P1250 }],
					{ account: this.luca }
				)

				await this.vendorV2.write.updateSharedOfGroup(
					['CREW', 2, 1, { addr: this.santiago, pcng: P5000 }],
					{ account: this.deployer }
				)

				const g: GroupStruct = await this.vendorV2.read.getGroup(['CREW'])
				expect(g.arrayShared[1].addr).to.equal(this.santiago)
				expect(g.arrayShared[1].pcng).to.equal(P5000)
			})
		})

		describe('calculateFee', function () {
			it('Should return (amount * pct / 10000)', async function () {
				const fee = await this.vendorV2.read.calculateFee([10000n, 2500])
				expect(fee).to.equal(2500n)
			})

			it('Should return 0 when porcentaje is 0', async function () {
				const fee = await this.vendorV2.read.calculateFee([10000n, 0])
				expect(fee).to.equal(0n)
			})

			it('Should return 0 when amount is 0', async function () {
				const fee = await this.vendorV2.read.calculateFee([0n, 5000])
				expect(fee).to.equal(0n)
			})
		})

		describe('distribution', function () {
			beforeEach(async function () {
				await this.vendorV2.write.addGroup(
					[
						'PAY',
						true,
						[
							{ addr: this.juan, pcng: 6000 },
							{ addr: this.santiago, pcng: 4000 }
						]
					],
					{ account: this.deployer }
				)
			})

			it('Should revert if group does not exist', async function () {
				await expect(
					this.vendorV2.write.distribution(
						['NOPE', ONE_ETH, true, zeroAddress],
						{ account: this.deployer }
					)
				).to.be.rejectedWith('distribution: Group Not Already Stored')
			})

			it('Should revert if group is inactive', async function () {
				await this.vendorV2.write.updateGroupStatus(['PAY', false], {
					account: this.deployer
				})
				await expect(
					this.vendorV2.write.distribution(
						['PAY', ONE_ETH, true, zeroAddress],
						{ account: this.deployer }
					)
				).to.be.rejectedWith('distribution: Group Not Already Available')
			})

			it('Should revert if contract balance is insufficient', async function () {
				await expect(
					this.vendorV2.write.distribution(
						['PAY', ONE_ETH * 2n, true, zeroAddress],
						{ account: this.deployer }
					)
				).to.be.rejectedWith('distribution: Not enough balance')
			})

			it('Should revert if shared percentages sum < 100 %', async function () {
				await this.vendorV2.write.addGroup(
					['LOW', true, [{ addr: this.juan, pcng: 9000 }]],
					{ account: this.deployer }
				)

				await expect(
					this.vendorV2.write.distribution(
						['LOW', ONE_ETH, true, zeroAddress],
						{
							account: this.deployer
						}
					)
				).to.be.rejectedWith('distribution: percentage sum mismatch')
			})

			it('Should revert if group has zero shared', async function () {
				await this.vendorV2.write.addGroup(['EMPTY', true, []], {
					account: this.deployer
				})

				await expect(
					this.vendorV2.write.distribution(
						['EMPTY', ONE_ETH, true, zeroAddress],
						{ account: this.deployer }
					)
				).to.be.rejectedWith('distribution: No Shared found')
			})

			it('Should distribute ETH among beneficiaries', async function () {
				const pub = await viem.getPublicClient()
				const j0 = await pub.getBalance({ address: this.juan })
				const s0 = await pub.getBalance({ address: this.santiago })

				const tx = await this.vendorV2.write.distribution(
					['PAY', ONE_ETH, true, zeroAddress],
					{ account: this.deployer }
				)

				const logs = await this.vendorV2.getEvents.Distributed({
					fromBlock: tx.blockNumber
				})
				expect(logs.length).to.equal(2)

				const j1 = await pub.getBalance({ address: this.juan })
				const s1 = await pub.getBalance({ address: this.santiago })

				expect(j1).to.equal(j0 + (ONE_ETH * 6000n) / 10000n)
				expect(s1).to.equal(s0 + (ONE_ETH * 4000n) / 10000n)
			})

			it('Should distribute ERC-20 tokens among beneficiaries', async function () {
				const j0 = await this.mockcUSD.read.balanceOf([this.juan])
				const s0 = await this.mockcUSD.read.balanceOf([this.santiago])

				await this.vendorV2.write.distribution(
					['PAY', TEN_TOKENS, false, this.mockcUSD.address],
					{ account: this.deployer }
				)

				const j1 = await this.mockcUSD.read.balanceOf([this.juan])
				const s1 = await this.mockcUSD.read.balanceOf([this.santiago])

				expect(j1).to.equal(j0 + (TEN_TOKENS * 6000n) / 10000n)
				expect(s1).to.equal(s0 + (TEN_TOKENS * 4000n) / 10000n)
			})

			it('Should revert when token transfer fails (sendToken)', async function () {
				/* deploy mock token that always fails on transfer */
				const MockFail = await viem.deployContract('MockErc20Fail', [])
				await MockFail.write.mint([this.vendorV2.address, TEN_TOKENS], {
					account: this.deployer
				})

				await this.vendorV2.write.addGroup(
					['FAIL', true, [{ addr: this.juan, pcng: 10000 }]],
					{ account: this.deployer }
				)

				await expect(
					this.vendorV2.write.distribution(
						['FAIL', TEN_TOKENS, false, MockFail.address],
						{ account: this.deployer }
					)
				).to.be.rejectedWith('distribution: token transfer failed')
			})
		})

		describe('getGroupListPaginated', function () {
			beforeEach(async function () {
				for (let i = 0; i < 5; i++) {
					await this.vendorV2.write.addGroup(
						[`G${i}`, true, [{ addr: this.juan, pcng: P2500 }]],
						{ account: this.deployer }
					)
				}
			})

			it('Should revert if range is invalid', async function () {
				await expect(
					this.vendorV2.read.getGroupListPaginated([3n, 2n])
				).to.be.rejectedWith('Invalid range')
			})

			it('Should return paginated group list', async function () {
				const list = await this.vendorV2.read.getGroupListPaginated([1n, 4n])
				expect(list.length).to.equal(3)
				expect(list[0].group).to.equal('G1')
				expect(list[2].group).to.equal('G3')
			})
		})
	})

	describe('CollectionV2', function () {
		const price: bigint = 500000000n // $5.00 USD
		const newPrice: bigint = 600000000n // $6.00 USD

		beforeEach(async function () {
			const fixture = await deployFixture()
			this.vendorV2 = fixture.vendorV2
			this.mockcUSD = fixture.mockcUSD
			this.dataFeeds = fixture.dataFeeds
			this.deployer = fixture.deployer
			this.luca = fixture.luca
			this.juan = fixture.juan
			this.santiago = fixture.santiago

			await this.vendorV2.write.addUser([this.luca], {
				account: this.deployer
			})

			await this.vendorV2.write.addUser([this.juan], {
				account: this.deployer
			})
		})

		describe('addCollection', function () {
			it('Should revert if user tries to add a collection that already exists', async function () {
				await this.vendorV2.write.addCollection(
					[this.mockcUSD.address, price, true],
					{ account: this.luca }
				)

				await expect(
					this.vendorV2.write.addCollection(
						[this.mockcUSD.address, price, true],
						{ account: this.luca }
					)
				).to.be.rejectedWith('Collection already stored')
			})

			it('Should revert if address is zero', async function () {
				await expect(
					this.vendorV2.write.addCollection([zeroAddress, price, true], {
						account: this.luca
					})
				).to.be.rejectedWith('Invalid collection address')
			})

			it('Should revert if price is zero', async function () {
				await expect(
					this.vendorV2.write.addCollection([this.mockcUSD.address, 0n, true], {
						account: this.luca
					})
				).to.be.rejectedWith('Price must be greater than zero')
			})

			it('Should allow user to add a valid collection', async function () {
				await this.vendorV2.write.addCollection(
					[this.mockcUSD.address, price, true],
					{ account: this.luca }
				)

				const collection = await this.vendorV2.read.getCollectionByAddr([
					this.mockcUSD.address
				])

				expect(collection.addr).to.equal(this.mockcUSD.address)
				expect(collection.price).to.equal(price)
				expect(collection.active).to.be.true
			})
		})

		describe('updateCollection', function () {
			beforeEach(async function () {
				await this.vendorV2.write.addCollection(
					[this.mockcUSD.address, price, true],
					{ account: this.luca }
				)
			})

			it('Should revert if user tries to update a non-existent collection', async function () {
				await expect(
					this.vendorV2.write.updateCollection(
						[666, 1, TEST_TOKEN_ONE, price, true],
						{ account: this.luca }
					)
				).to.be.rejectedWith('Invalid collection address')
			})

			it('Should revert if type is invalid', async function () {
				await expect(
					this.vendorV2.write.updateCollection(
						[0, 0, TEST_TOKEN_ONE, price, true],
						{ account: this.luca }
					)
				).to.be.rejectedWith('Error type')
			})

			it('Should allow user to update price', async function () {
				await this.vendorV2.write.updateCollection(
					[0, 1, TEST_TOKEN_ONE, newPrice, false],
					{ account: this.luca }
				)

				const collection = await this.vendorV2.read.getCollectionByAddr([
					this.mockcUSD.address
				])
				expect(collection.price).to.equal(newPrice)
			})

			it('Should allow user to update address', async function () {
				await this.vendorV2.write.updateCollection(
					[0, 2, TEST_TOKEN_ONE, newPrice, false],
					{ account: this.luca }
				)

				const collection = await this.vendorV2.read.getCollectionByAddr([
					TEST_TOKEN_ONE
				])
				expect(collection.addr).to.equal(TEST_TOKEN_ONE)
			})

			it('Should allow user to update status', async function () {
				await this.vendorV2.write.updateCollection(
					[0, 3, TEST_TOKEN_ONE, newPrice, false],
					{ account: this.luca }
				)

				const updated = await this.vendorV2.read.getCollectionByAddr([
					TEST_TOKEN_ONE
				])
				expect(updated.active).to.be.false
			})
		})

		describe('collectionList', function () {
			it('Should return the list of collections', async function () {
				await this.vendorV2.write.addCollection(
					[this.mockcUSD.address, price, true],
					{ account: this.luca }
				)

				const collections = await this.vendorV2.read.collectionList()
				expect(collections).to.be.an('array').that.is.not.empty
				const found = collections.find(
					(c: CollectionStruct) => c.addr === this.mockcUSD.address
				)
				expect(found).to.not.be.undefined
				expect(found.price).to.equal(price)
			})
		})

		describe('getCollectionByAddr', function () {
			it('Should revert if collection does not exist', async function () {
				await expect(
					this.vendorV2.read.getCollectionByAddr([zeroAddress])
				).to.be.rejectedWith('Invalid Collection')

				await expect(
					this.vendorV2.read.getCollectionByAddr([TEST_TOKEN_TWO])
				).to.be.rejectedWith('Invalid Collection')
			})

			it('Should return correct collection data by address', async function () {
				await this.vendorV2.write.addCollection(
					[this.mockcUSD.address, price, true],
					{ account: this.luca }
				)

				const collection = await this.vendorV2.read.getCollectionByAddr([
					this.mockcUSD.address
				])
				expect(collection.addr).to.equal(this.mockcUSD.address)
				expect(collection.price).to.equal(price)
				expect(collection.active).to.be.true
			})
		})
	})
})
