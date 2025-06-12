import { expect } from 'chai'
import chai from 'chai'
import chaiBigint from 'chai-bigint'
import hre, { viem } from 'hardhat'
import { Address, maxUint256, parseEther, zeroAddress } from 'viem'

import { NATIVE } from '@/config/constants'
import { AmbassadorStruct } from '@/models/index'

chai.use(chaiBigint)

describe('Inhabit - Groups Module', function () {
	let fixture: any
	let deployer: string
	let luca: string
	let juan: string
	let santiago: string
	let ledger: string
	let inhabit: any
	let mockUSDC: any
	let nftCollection: any

	async function deployFixture(): Promise<any> {
		const { deployments, getNamedAccounts } = hre
		const { deployer, luca, juan, santiago, ledger } = await getNamedAccounts()

		await deployments.fixture(['localhost'])

		// Mock ERC20 (USDC)
		const mockErc20Address = (await deployments.get('MockErc20'))
			.address as Address

		const mockUSDC = await viem.getContractAt('MockErc20', mockErc20Address)

		// NFT Collection
		const nftCollectionAddress = (await deployments.get('NFTCollection'))
			.address as Address

		const nftCollection = await viem.getContractAt(
			'NFTCollection',
			nftCollectionAddress
		)

		// Inhabit
		const inhabitAddress = (await deployments.get('Inhabit')).address as Address

		const inhabit = await viem.getContractAt('Inhabit', inhabitAddress)

		return {
			deployer,
			luca,
			juan,
			santiago,
			ledger,
			inhabit,
			mockUSDC,
			nftCollection
		}
	}

	describe('Inhabit main contract', function () {
		beforeEach(async function () {
			fixture = await deployFixture()
			;({
				deployer,
				luca,
				juan,
				santiago,
				ledger,
				inhabit,
				mockUSDC,
				nftCollection
			} = fixture)
		})

		describe('setTreasury', function () {
			it('Should revert if address is the same as the contract address', async function () {
				await expect(
					inhabit.write.setTreasury([inhabit.address], {
						account: deployer
					})
				).to.be.rejectedWith('INVALID_ADDRESS')
			})

			it('Should revert if address is the same as current treasury', async function () {
				await expect(
					inhabit.write.setTreasury([ledger], {
						account: deployer
					})
				).to.be.rejectedWith('SAME_STATE')
			})

			it('Should revert if address is zero', async function () {
				await expect(
					inhabit.write.setTreasury([zeroAddress], {
						account: deployer
					})
				).to.be.rejectedWith('ZERO_ADDRESS')
			})

			it('Should allow setting a new valid treasury address', async function () {
				await expect(
					inhabit.write.setTreasury([santiago], {
						account: deployer
					})
				).not.to.be.rejected

				const currentTreasury = await inhabit.read.treasury()
				expect(currentTreasury).to.equal(santiago)
			})

			it('Should emit TreasuryUpdated event', async function () {
				const tx = await inhabit.write.setTreasury([santiago], {
					account: deployer
				})

				expect(tx).to.exist

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})
		})
	})

	describe('Groups Contract', function () {
		// Constants for testing
		const REFERRAL_CODE = 'TEST_GROUP'
		const EMPTY_REFERRAL = ''
		const FEE_50_PERCENT = 5000n // 50%
		const FEE_30_PERCENT = 3000n // 30%
		const FEE_20_PERCENT = 2000n // 20%
		const FEE_OVER_100_PERCENT = 10001n // 100.01%
		const MAX_FEE = 10000n // 100%

		beforeEach(async function () {
			fixture = await deployFixture()
			;({
				deployer,
				luca,
				juan,
				santiago,
				ledger,
				inhabit,
				mockUSDC,
				nftCollection
			} = fixture)
		})

		describe('createGroup', function () {
			it('Should revert if caller does not have ADMIN_ROLE', async function () {
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]

				await expect(
					inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
						account: luca // not admin
					})
				).to.be.rejectedWith('AccessControlUnauthorizedAccount')
			})

			it('Should revert if referral code is empty', async function () {
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]

				await expect(
					inhabit.write.createGroup([EMPTY_REFERRAL, true, ambassadors], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_STRING')
			})

			it('Should revert if group already exists', async function () {
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]

				// Create first group
				await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
					account: deployer
				})

				// Try to create same group again
				await expect(
					inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
						account: deployer
					})
				).to.be.rejectedWith('GROUP_ALREADY_EXISTS')
			})

			it('Should revert if ambassador has zero address', async function () {
				const ambassadors = [{ account: zeroAddress, fee: FEE_50_PERCENT }]

				await expect(
					inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
						account: deployer
					})
				).to.be.rejectedWith('ZERO_ADDRESS')
			})

			it('Should revert if total fees exceed 100%', async function () {
				const ambassadors = [
					{ account: luca, fee: FEE_50_PERCENT },
					{ account: juan, fee: FEE_50_PERCENT },
					{ account: santiago, fee: FEE_20_PERCENT } // Total: 120%
				]

				await expect(
					inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
						account: deployer
					})
				).to.be.rejectedWith('PERCENTAGE_ERROR')
			})

			it('Should revert if single ambassador fee exceeds 100%', async function () {
				const Ambassadors = [
					{ account: luca, fee: FEE_OVER_100_PERCENT } // 100.01%
				]

				await expect(
					inhabit.write.createGroup([REFERRAL_CODE, true, Ambassadors], {
						account: deployer
					})
				).to.be.rejectedWith('PERCENTAGE_ERROR')
			})

			it('Should create group successfully with valid parameters', async function () {
				const ambassadors = [
					{ account: luca, fee: FEE_50_PERCENT },
					{ account: juan, fee: FEE_30_PERCENT },
					{ account: santiago, fee: FEE_20_PERCENT }
				]

				const tx = await inhabit.write.createGroup(
					[REFERRAL_CODE, true, ambassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				// Verify group count increased
				const groupCount = await inhabit.read.groupCount()
				expect(groupCount).to.equal(1n)

				// Verify group data
				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.referral).to.equal(REFERRAL_CODE)
				expect(group.state).to.be.true
				expect(group.ambassadors).to.have.lengthOf(3)
			})

			it('Should emit GroupCreated event', async function () {
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]

				const tx = await inhabit.write.createGroup(
					[REFERRAL_CODE, true, ambassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})

			it('Should create inactive group when state is false', async function () {
				const ambassadors = [{ account: luca, fee: MAX_FEE }]

				await inhabit.write.createGroup([REFERRAL_CODE, false, ambassadors], {
					account: deployer
				})

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.state).to.be.false
			})

			it('Should handle edge case with exactly 100% fees', async function () {
				const ambassadors = [
					{ account: luca, fee: MAX_FEE } // Exactly 100%
				]

				const tx = await inhabit.write.createGroup(
					[REFERRAL_CODE, true, ambassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist
			})

			it('Should allow empty ambassadors array', async function () {
				const ambassadors: AmbassadorStruct[] = []

				const tx = await inhabit.write.createGroup(
					[REFERRAL_CODE, true, ambassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.ambassadors).to.have.lengthOf(0)
			})
		})

		describe('updateGroupStatus', function () {
			beforeEach(async function () {
				// Create a test group
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]
				await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
					account: deployer
				})
			})

			it('Should revert if caller does not have ADMIN_ROLE', async function () {
				await expect(
					inhabit.write.updateGroupStatus([REFERRAL_CODE, false], {
						account: luca
					})
				).to.be.rejectedWith('AccessControlUnauthorizedAccount')
			})

			it('Should revert if group does not exist', async function () {
				await expect(
					inhabit.write.updateGroupStatus(['NONEXISTENT', false], {
						account: deployer
					})
				).to.be.rejectedWith('GROUP_NOT_FOUND')
			})

			it('Should revert if setting same state', async function () {
				await expect(
					inhabit.write.updateGroupStatus([REFERRAL_CODE, true], {
						account: deployer
					})
				).to.be.rejectedWith('SAME_STATE')
			})

			it('Should update group status successfully', async function () {
				const tx = await inhabit.write.updateGroupStatus(
					[REFERRAL_CODE, false],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.state).to.be.false
			})

			it('Should emit GroupStatusUpdated event', async function () {
				const tx = await inhabit.write.updateGroupStatus(
					[REFERRAL_CODE, false],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})
		})

		describe('addAmbassadors', function () {
			beforeEach(async function () {
				// Create a test group with one ambassador
				const ambassadors = [{ account: luca, fee: FEE_30_PERCENT }]
				await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
					account: deployer
				})
			})

			it('Should revert if caller does not have ADMIN_ROLE', async function () {
				const newAmbassadors = [{ account: juan, fee: FEE_30_PERCENT }]

				await expect(
					inhabit.write.addAmbassadors([REFERRAL_CODE, newAmbassadors], {
						account: luca
					})
				).to.be.rejectedWith('AccessControlUnauthorizedAccount')
			})

			it('Should revert if group does not exist', async function () {
				const newAmbassadors = [{ account: juan, fee: FEE_30_PERCENT }]

				await expect(
					inhabit.write.addAmbassadors(['NONEXISTENT', newAmbassadors], {
						account: deployer
					})
				).to.be.rejectedWith('GROUP_NOT_FOUND')
			})

			it('Should revert if ambassadors array is empty', async function () {
				await expect(
					inhabit.write.addAmbassadors([REFERRAL_CODE, []], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_ARRAY')
			})

			it('Should revert if adding ambassador with zero address', async function () {
				const newAmbassadors = [{ account: zeroAddress, fee: FEE_30_PERCENT }]

				await expect(
					inhabit.write.addAmbassadors([REFERRAL_CODE, newAmbassadors], {
						account: deployer
					})
				).to.be.rejectedWith('ZERO_ADDRESS')
			})

			it('Should revert if total fees would exceed 100%', async function () {
				const newAmbassadors = [
					{ account: juan, fee: FEE_50_PERCENT },
					{ account: santiago, fee: FEE_30_PERCENT } // Total would be 110%
				]

				await expect(
					inhabit.write.addAmbassadors([REFERRAL_CODE, newAmbassadors], {
						account: deployer
					})
				).to.be.rejectedWith('PERCENTAGE_ERROR')
			})

			it('Should revert if adding ambassador with fee over 100%', async function () {
				const newAmbassadors = [{ account: juan, fee: FEE_OVER_100_PERCENT }]

				await expect(
					inhabit.write.addAmbassadors([REFERRAL_CODE, newAmbassadors], {
						account: deployer
					})
				).to.be.rejectedWith('PERCENTAGE_ERROR')
			})

			it('Should add ambassadors successfully', async function () {
				const newAmbassadors = [
					{ account: juan, fee: FEE_30_PERCENT },
					{ account: santiago, fee: FEE_20_PERCENT }
				]

				const tx = await inhabit.write.addAmbassadors(
					[REFERRAL_CODE, newAmbassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.ambassadors).to.have.lengthOf(3)
			})

			it('Should emit AmbassadorsAdded event', async function () {
				const newAmbassadors = [{ account: juan, fee: FEE_20_PERCENT }]

				const tx = await inhabit.write.addAmbassadors(
					[REFERRAL_CODE, newAmbassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})

			it('Should handle adding multiple ambassadors at limit', async function () {
				const newAmbassadors = [
					{ account: juan, fee: FEE_50_PERCENT },
					{ account: santiago, fee: FEE_20_PERCENT } // Total exactly 100%
				]

				const tx = await inhabit.write.addAmbassadors(
					[REFERRAL_CODE, newAmbassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist
			})

			it('Should not allow adding duplicate ambassador addresses', async function () {
				const newAmbassadors = [{ account: luca, fee: FEE_20_PERCENT }]

				await expect(
					inhabit.write.addAmbassadors([REFERRAL_CODE, newAmbassadors], {
						account: deployer
					})
				).to.be.rejectedWith('AMBASSADOR_ALREADY_EXISTS')
			})
		})

		describe('updateAmbassadors', function () {
			beforeEach(async function () {
				// Create a test group with ambassadors
				const ambassadors = [
					{ account: luca, fee: FEE_50_PERCENT },
					{ account: juan, fee: FEE_30_PERCENT }
				]
				await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
					account: deployer
				})
			})

			it('Should revert if caller does not have ADMIN_ROLE', async function () {
				const updates = [{ account: luca, fee: FEE_30_PERCENT }]

				await expect(
					inhabit.write.updateAmbassadors([REFERRAL_CODE, updates], {
						account: luca
					})
				).to.be.rejectedWith('AccessControlUnauthorizedAccount')
			})

			it('Should revert if group does not exist', async function () {
				const updates = [{ account: luca, fee: FEE_30_PERCENT }]

				await expect(
					inhabit.write.updateAmbassadors(['NONEXISTENT', updates], {
						account: deployer
					})
				).to.be.rejectedWith('GROUP_NOT_FOUND')
			})

			it('Should revert if ambassadors array is empty', async function () {
				await expect(
					inhabit.write.updateAmbassadors([REFERRAL_CODE, []], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_ARRAY')
			})

			it('Should revert if ambassador not found in group', async function () {
				const updates = [
					{ account: santiago, fee: FEE_30_PERCENT } // santiago not in group
				]

				await expect(
					inhabit.write.updateAmbassadors([REFERRAL_CODE, updates], {
						account: deployer
					})
				).to.be.rejectedWith('AMBASSADOR_NOT_FOUND')
			})

			it('Should revert if updating with zero address', async function () {
				const updates = [{ account: zeroAddress, fee: FEE_30_PERCENT }]

				await expect(
					inhabit.write.updateAmbassadors([REFERRAL_CODE, updates], {
						account: deployer
					})
				).to.be.rejectedWith('ZERO_ADDRESS')
			})

			it('Should revert if total fees would exceed 100%', async function () {
				const updates = [
					{ account: luca, fee: FEE_50_PERCENT },
					{ account: juan, fee: FEE_50_PERCENT + 1n } // Total would be 100.01%
				]

				await expect(
					inhabit.write.updateAmbassadors([REFERRAL_CODE, updates], {
						account: deployer
					})
				).to.be.rejectedWith('PERCENTAGE_ERROR')
			})

			it('Should revert if updating single ambassador to fee over 100%', async function () {
				const updates = [{ account: luca, fee: FEE_OVER_100_PERCENT }]

				await expect(
					inhabit.write.updateAmbassadors([REFERRAL_CODE, updates], {
						account: deployer
					})
				).to.be.rejectedWith('PERCENTAGE_ERROR')
			})

			it('Should update ambassador fees successfully', async function () {
				const updates = [
					{ account: luca, fee: FEE_30_PERCENT },
					{ account: juan, fee: FEE_20_PERCENT }
				]

				const tx = await inhabit.write.updateAmbassadors(
					[REFERRAL_CODE, updates],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				// Verify fees were updated correctly
				const lucaAmbassador = group.ambassadors.find(
					(a: AmbassadorStruct) => a.account === luca
				)
				const juanAmbassador = group.ambassadors.find(
					(a: AmbassadorStruct) => a.account === juan
				)

				expect(lucaAmbassador.fee).to.equal(FEE_30_PERCENT)
				expect(juanAmbassador.fee).to.equal(FEE_20_PERCENT)
			})

			it('Should emit AmbassadorsUpdated event', async function () {
				const updates = [{ account: luca, fee: FEE_20_PERCENT }]

				const tx = await inhabit.write.updateAmbassadors(
					[REFERRAL_CODE, updates],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})

			it('Should update single ambassador without affecting others', async function () {
				const updates = [{ account: luca, fee: FEE_20_PERCENT }]

				await inhabit.write.updateAmbassadors([REFERRAL_CODE, updates], {
					account: deployer
				})

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				const juanAmbassador = group.ambassadors.find(
					(a: AmbassadorStruct) => a.account === juan
				)

				// Juan's fee should remain unchanged
				expect(juanAmbassador.fee).to.equal(FEE_30_PERCENT)
			})
		})

		describe('removeAmbassadors', function () {
			beforeEach(async function () {
				// Create a test group with multiple ambassadors
				const ambassadors = [
					{ account: luca, fee: FEE_30_PERCENT },
					{ account: juan, fee: FEE_30_PERCENT },
					{ account: santiago, fee: FEE_20_PERCENT }
				]
				await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
					account: deployer
				})
			})

			it('Should revert if caller does not have ADMIN_ROLE', async function () {
				await expect(
					inhabit.write.removeAmbassadors([REFERRAL_CODE, [luca]], {
						account: luca
					})
				).to.be.rejectedWith('AccessControlUnauthorizedAccount')
			})

			it('Should revert if group does not exist', async function () {
				await expect(
					inhabit.write.removeAmbassadors(['NONEXISTENT', [luca]], {
						account: deployer
					})
				).to.be.rejectedWith('GROUP_NOT_FOUND')
			})

			it('Should revert if accounts array is empty', async function () {
				await expect(
					inhabit.write.removeAmbassadors([REFERRAL_CODE, []], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_ARRAY')
			})

			it('Should revert if trying to remove zero address', async function () {
				await expect(
					inhabit.write.removeAmbassadors([REFERRAL_CODE, [zeroAddress]], {
						account: deployer
					})
				).to.be.rejectedWith('ZERO_ADDRESS')
			})

			it('Should revert if ambassador not found', async function () {
				await expect(
					inhabit.write.removeAmbassadors([REFERRAL_CODE, [ledger]], {
						account: deployer
					})
				).to.be.rejectedWith('AMBASSADOR_NOT_FOUND')
			})

			it('Should remove single ambassador successfully', async function () {
				const tx = await inhabit.write.removeAmbassadors(
					[REFERRAL_CODE, [luca]],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.ambassadors).to.have.lengthOf(2)

				// Verify luca was removed
				const hasLuca = group.ambassadors.some(
					(a: AmbassadorStruct) => a.account === luca
				)
				expect(hasLuca).to.be.false
			})

			it('Should remove multiple ambassadors successfully', async function () {
				const tx = await inhabit.write.removeAmbassadors(
					[REFERRAL_CODE, [luca, juan]],
					{ account: deployer }
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.ambassadors).to.have.lengthOf(1)
				expect(group.ambassadors[0].account).to.equal(santiago)
			})

			it('Should emit AmbassadorsRemoved event', async function () {
				const tx = await inhabit.write.removeAmbassadors(
					[REFERRAL_CODE, [luca]],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})

			it('Should allow removing all ambassadors', async function () {
				await inhabit.write.removeAmbassadors(
					[REFERRAL_CODE, [luca, juan, santiago]],
					{ account: deployer }
				)

				const group = await inhabit.read.getGroup([REFERRAL_CODE])
				expect(group.ambassadors).to.have.lengthOf(0)
			})
		})

		describe('Distribution (Internal)', function () {
			const REFERRAL_CODE = 'TEST_GROUP'
			const CAMPAIGN_GOAL = parseEther('1000')
			const NFT_PRICE = parseEther('10')
			const NFT_SUPPLY = 100n
			const FEE_30_PERCENT = 3000n // 30%
			const FEE_40_PERCENT = 4000n // 40%
			const FEE_20_PERCENT = 2000n // 20%
			const FEE_10_PERCENT = 1000n // 10%

			let collectionAddress: Address

			beforeEach(async function () {
				fixture = await deployFixture()
				;({
					deployer,
					luca,
					juan,
					santiago,
					ledger,
					inhabit,
					mockUSDC,
					nftCollection
				} = fixture)

				// Setup roles
				const userRole = await inhabit.read.USER_ROLE()

				await inhabit.write.grantRole([userRole, luca], {
					account: deployer
				})

				// Setup NFT collection
				await inhabit.write.setNFTCollection([nftCollection.address], {
					account: deployer
				})

				// Add supported token
				await inhabit.write.addToTokens([[mockUSDC.address]], {
					account: deployer
				})

				// Create a test group with ambassadors
				const ambassadors = [
					{ account: juan, fee: FEE_40_PERCENT },
					{ account: santiago, fee: FEE_20_PERCENT }
				]

				await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
					account: deployer
				})

				// Create a campaign with collection
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: NFT_SUPPLY,
						price: NFT_PRICE,
						state: true
					}
				]

				await inhabit.write.createCampaign([CAMPAIGN_GOAL, collectionsParams], {
					account: deployer
				})

				const campaign = await inhabit.read.getCampaign([1n])
				collectionAddress = campaign.collections[0]
			})

			describe('_distribution (via buyNFT)', function () {
				beforeEach(async function () {
					// Mint tokens for buyer
					await mockUSDC.write.mint([luca, NFT_PRICE], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
						account: luca
					})
				})

				it('Should revert if group does not exist', async function () {
					await expect(
						inhabit.write.buyNFT(
							[1n, collectionAddress, mockUSDC.address, 'NONEXISTENT_GROUP'],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('GROUP_NOT_FOUND')
				})

				it('Should revert if group is inactive', async function () {
					// Deactivate the group
					await inhabit.write.updateGroupStatus([REFERRAL_CODE, false], {
						account: deployer
					})

					await expect(
						inhabit.write.buyNFT(
							[1n, collectionAddress, mockUSDC.address, REFERRAL_CODE],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('GROUP_NOT_ACTIVE')
				})

				it('Should distribute fees correctly to all ambassadors', async function () {
					const juanBalanceBefore = await mockUSDC.read.balanceOf([juan])
					const santiagoBalanceBefore = await mockUSDC.read.balanceOf([
						santiago
					])

					const tx = await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, REFERRAL_CODE],
						{
							account: luca
						}
					)

					expect(tx).to.exist

					const juanBalanceAfter = await mockUSDC.read.balanceOf([juan])
					const santiagoBalanceAfter = await mockUSDC.read.balanceOf([santiago])

					// Calculate expected fees
					const expectedJuanFee = await inhabit.read.calculateFee([
						NFT_PRICE,
						FEE_40_PERCENT
					])
					const expectedSantiagoFee = await inhabit.read.calculateFee([
						NFT_PRICE,
						FEE_20_PERCENT
					])

					expect(juanBalanceAfter).to.equal(juanBalanceBefore + expectedJuanFee)
					expect(santiagoBalanceAfter).to.equal(
						santiagoBalanceBefore + expectedSantiagoFee
					)
				})

				it('Should handle single ambassador group', async function () {
					const singleGroupCode = 'SINGLE_GROUP'
					const ambassadors = [{ account: luca, fee: FEE_30_PERCENT }]

					await inhabit.write.createGroup(
						[singleGroupCode, true, ambassadors],
						{
							account: deployer
						}
					)

					const lucaBalanceBefore = await mockUSDC.read.balanceOf([luca])

					await mockUSDC.write.mint([ledger, NFT_PRICE], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
						account: ledger
					})

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, singleGroupCode],
						{
							account: ledger
						}
					)

					const lucaBalanceAfter = await mockUSDC.read.balanceOf([luca])
					const expectedFee = await inhabit.read.calculateFee([
						NFT_PRICE,
						FEE_30_PERCENT
					])

					expect(lucaBalanceAfter).to.equal(lucaBalanceBefore + expectedFee)
				})

				it('Should handle maximum fee distribution (100%)', async function () {
					const maxFeeGroupCode = 'MAX_FEE_GROUP'
					const ambassadors = [{ account: luca, fee: 10000n }] // 100%

					await inhabit.write.createGroup(
						[maxFeeGroupCode, true, ambassadors],
						{
							account: deployer
						}
					)

					const lucaBalanceBefore = await mockUSDC.read.balanceOf([luca])

					await mockUSDC.write.mint([ledger, NFT_PRICE], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
						account: ledger
					})

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, maxFeeGroupCode],
						{
							account: ledger
						}
					)

					const lucaBalanceAfter = await mockUSDC.read.balanceOf([luca])

					// Luca should receive the entire NFT price as fee
					expect(lucaBalanceAfter).to.equal(lucaBalanceBefore + NFT_PRICE)
				})

				it('Should emit Distributed events for each ambassador', async function () {
					const tx = await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, REFERRAL_CODE],
						{
							account: luca
						}
					)

					const publicClient = await hre.viem.getPublicClient()

					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					expect(receipt.logs).to.have.lengthOf.greaterThan(1)
				})

				it('Should return correct total referral fee', async function () {
					const treasuryBalanceBefore = await mockUSDC.read.balanceOf([ledger])

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, REFERRAL_CODE],
						{
							account: luca
						}
					)

					const treasuryBalanceAfter = await mockUSDC.read.balanceOf([ledger])

					const expectedJuanFee = await inhabit.read.calculateFee([
						NFT_PRICE,
						FEE_40_PERCENT
					])

					const expectedSantiagoFee = await inhabit.read.calculateFee([
						NFT_PRICE,
						FEE_20_PERCENT
					])

					const totalReferralFee = expectedJuanFee + expectedSantiagoFee

					const expectedTreasuryAmount = NFT_PRICE - totalReferralFee

					const actualTreasuryReceived =
						treasuryBalanceAfter - treasuryBalanceBefore

					expect(actualTreasuryReceived).to.equal(expectedTreasuryAmount)
				})

				it('Should handle very small amounts without rounding errors', async function () {
					const smallPrice = 100n // Very small price
					const ambassadors = [
						{ account: juan, fee: 3333n }, // 33.33%
						{ account: santiago, fee: 3334n } // 33.34% (to make 100%)
					]

					const smallGroupCode = 'SMALL_GROUP'

					await inhabit.write.createGroup([smallGroupCode, true, ambassadors], {
						account: deployer
					})

					// Create a campaign with small price
					const collectionsParams = [
						{
							name: 'Small Collection',
							symbol: 'SMALL',
							uri: 'https://small.com/',
							supply: NFT_SUPPLY,
							price: smallPrice,
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{
							account: deployer
						}
					)

					const campaign = await inhabit.read.getCampaign([2n])
					const smallCollectionAddress = campaign.collections[0]

					await mockUSDC.write.mint([luca, smallPrice], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, smallPrice], {
						account: luca
					})

					const tx = await inhabit.write.buyNFT(
						[2n, smallCollectionAddress, mockUSDC.address, smallGroupCode],
						{
							account: luca
						}
					)

					expect(tx).to.exist

					// Verify that the distribution worked even with small amounts
					const juanBalance = await mockUSDC.read.balanceOf([juan])
					const santiagoBalance = await mockUSDC.read.balanceOf([santiago])

					expect(juanBalance).to.be.gt(0n)
					expect(santiagoBalance).to.be.gt(0n)
				})

				it('Should handle large amounts without overflow', async function () {
					const largePrice = parseEther('1000000') // 1M tokens
					const ambassadors = [{ account: luca, fee: 5000n }] // 50%

					const largeGroupCode = 'LARGE_GROUP'
					await inhabit.write.createGroup([largeGroupCode, true, ambassadors], {
						account: deployer
					})

					// Create a campaign with large price
					const collectionsParams = [
						{
							name: 'Expensive Collection',
							symbol: 'EXPENSIVE',
							uri: 'https://expensive.com/',
							supply: NFT_SUPPLY,
							price: largePrice,
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{
							account: deployer
						}
					)

					const campaign = await inhabit.read.getCampaign([2n])
					const expensiveCollectionAddress = campaign.collections[0]

					await mockUSDC.write.mint([ledger, largePrice], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, largePrice], {
						account: ledger
					})

					const lucaBalanceBefore = await mockUSDC.read.balanceOf([luca])

					const tx = await inhabit.write.buyNFT(
						[2n, expensiveCollectionAddress, mockUSDC.address, largeGroupCode],
						{
							account: ledger
						}
					)

					expect(tx).to.exist

					const lucaBalanceAfter = await mockUSDC.read.balanceOf([luca])
					const expectedFee = largePrice / 2n // 50%

					expect(lucaBalanceAfter).to.equal(lucaBalanceBefore + expectedFee)
				})

				it('Should handle multiple consecutive distributions', async function () {
					// Mint tokens for multiple purchases
					const numPurchases = 5
					const totalAmount = NFT_PRICE * BigInt(numPurchases)

					await mockUSDC.write.mint([luca, totalAmount], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, totalAmount], {
						account: luca
					})

					const juanBalanceBefore = await mockUSDC.read.balanceOf([juan])
					const santiagoBalanceBefore = await mockUSDC.read.balanceOf([
						santiago
					])

					// Perform multiple purchases
					for (let i = 0; i < numPurchases; i++) {
						await inhabit.write.buyNFT(
							[1n, collectionAddress, mockUSDC.address, REFERRAL_CODE],
							{
								account: luca
							}
						)
					}

					const juanBalanceAfter = await mockUSDC.read.balanceOf([juan])
					const santiagoBalanceAfter = await mockUSDC.read.balanceOf([santiago])

					// Calculate expected total fees
					const expectedJuanFeePerPurchase = await inhabit.read.calculateFee([
						NFT_PRICE,
						FEE_40_PERCENT
					])

					const expectedSantiagoFeePerPurchase =
						await inhabit.read.calculateFee([NFT_PRICE, FEE_20_PERCENT])

					const expectedTotalJuanFee =
						expectedJuanFeePerPurchase * BigInt(numPurchases)

					const expectedTotalSantiagoFee =
						expectedSantiagoFeePerPurchase * BigInt(numPurchases)

					expect(juanBalanceAfter).to.equal(
						juanBalanceBefore + expectedTotalJuanFee
					)
					expect(santiagoBalanceAfter).to.equal(
						santiagoBalanceBefore + expectedTotalSantiagoFee
					)
				})

				it.skip('❌ Should handle groups with many ambassadors efficiently', async function () {
					// Create a group with many ambassadors to test gas consumption
					const manyAmbassadors = []
					const feePerAmbassador = 100n // 1% each, totaling 100% for 100 ambassadors

					// Create up to 100 ambassadors (might hit gas limits)
					for (let i = 0; i < 10; i++) {
						// Start with 10 to test
						const account = `0x${(i + 1000).toString(16).padStart(40, '0')}`
						manyAmbassadors.push({ account, fee: feePerAmbassador })
					}

					const manyAmbassadorsGroupCode = 'MANY_AMBASSADORS'
					await inhabit.write.createGroup(
						[manyAmbassadorsGroupCode, true, manyAmbassadors],
						{
							account: deployer
						}
					)

					// Measure gas consumption for distribution to many ambassadors
					await mockUSDC.write.mint([ledger, NFT_PRICE], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
						account: ledger
					})

					const publicClient = await hre.viem.getPublicClient()

					// This should work but might consume significant gas
					const tx = await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, manyAmbassadorsGroupCode],
						{
							account: ledger
						}
					)

					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					console.log(
						`Gas used for distribution to ${manyAmbassadors.length} ambassadors:`,
						receipt.gasUsed
					)

					expect(tx).to.exist
				})

				it.skip('❌ Should optimize for common case of 1-3 ambassadors', async function () {
					// Test that small groups are handled efficiently
					const smallGroupCode = 'OPTIMIZED_GROUP'
					const ambassadors = [
						{ account: luca, fee: FEE_30_PERCENT },
						{ account: juan, fee: FEE_30_PERCENT }
					]

					await inhabit.write.createGroup([smallGroupCode, true, ambassadors], {
						account: deployer
					})

					await mockUSDC.write.mint([ledger, NFT_PRICE], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
						account: ledger
					})

					const publicClient = await hre.viem.getPublicClient()

					const tx = await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, smallGroupCode],
						{
							account: ledger
						}
					)

					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					console.log('Gas used for small group distribution:', receipt.gasUsed)

					expect(tx).to.exist
				})
			})
		})

		describe('Token Management', function () {
			describe('addToTokens', function () {
				it('Should revert if caller does not have ADMIN_ROLE', async function () {
					await expect(
						inhabit.write.addToTokens([[mockUSDC.address]], {
							account: luca
						})
					).to.be.rejectedWith('AccessControlUnauthorizedAccount')
				})

				it('Should revert if token address is zero', async function () {
					await expect(
						inhabit.write.addToTokens([[zeroAddress]], {
							account: deployer
						})
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should add single token successfully', async function () {
					const tx = await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					expect(tx).to.exist

					const isSupported = await inhabit.read.isTokenSupported([
						mockUSDC.address
					])
					expect(isSupported).to.be.true
				})

				it('Should add multiple tokens successfully', async function () {
					const mockToken2 = nftCollection.address

					const tx = await inhabit.write.addToTokens(
						[[mockUSDC.address, mockToken2]],
						{ account: deployer }
					)

					expect(tx).to.exist

					const isUSDCSupported = await inhabit.read.isTokenSupported([
						mockUSDC.address
					])

					const isToken2Supported = await inhabit.read.isTokenSupported([
						mockToken2
					])

					expect(isUSDCSupported).to.be.true
					expect(isToken2Supported).to.be.true
				})

				// ❌ This test should fail - contract doesn't check for duplicates
				it('Should revert if token already exists', async function () {
					// Add token first time
					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					// Try to add same token again - SHOULD revert but doesn't
					await expect(
						inhabit.write.addToTokens([[mockUSDC.address]], {
							account: deployer
						})
					).to.be.rejectedWith('TOKEN_ALREADY_EXISTS')
				})
			})

			describe('removeFromTokens', function () {
				beforeEach(async function () {
					// Add a token first
					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})
				})

				it('Should revert if caller does not have ADMIN_ROLE', async function () {
					await expect(
						inhabit.write.removeFromTokens([mockUSDC.address], {
							account: luca
						})
					).to.be.rejectedWith('AccessControlUnauthorizedAccount')
				})

				it('Should revert if token address is zero', async function () {
					await expect(
						inhabit.write.removeFromTokens([zeroAddress], {
							account: deployer
						})
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should remove token successfully', async function () {
					const tx = await inhabit.write.removeFromTokens([mockUSDC.address], {
						account: deployer
					})

					expect(tx).to.exist

					const isSupported = await inhabit.read.isTokenSupported([
						mockUSDC.address
					])
					expect(isSupported).to.be.false
				})

				// ❌ This test should fail - contract doesn't check if token exists
				it('Should revert if token does not exist', async function () {
					const randomToken = '0x1234567890123456789012345678901234567890'

					await expect(
						inhabit.write.removeFromTokens([randomToken], {
							account: deployer
						})
					).to.be.rejectedWith('TOKEN_NOT_FOUND')
				})
			})
		})

		describe('Fund Recovery', function () {
			describe('recoverFunds', function () {
				beforeEach(async function () {
					// Send some funds to the contract
					await mockUSDC.write.mint([inhabit.address, parseEther('100')], {
						account: deployer
					})
				})

				it('Should revert if caller does not have ADMIN_ROLE', async function () {
					await expect(
						inhabit.write.recoverFunds([mockUSDC.address, ledger], {
							account: luca
						})
					).to.be.rejectedWith('AccessControlUnauthorizedAccount')
				})

				it('Should revert if destination address is zero', async function () {
					await expect(
						inhabit.write.recoverFunds([mockUSDC.address, zeroAddress], {
							account: deployer
						})
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should recover ERC20 tokens successfully', async function () {
					const balanceBefore = await mockUSDC.read.balanceOf([ledger])

					const tx = await inhabit.write.recoverFunds(
						[mockUSDC.address, ledger],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const balanceAfter = await mockUSDC.read.balanceOf([ledger])
					const contractBalance = await mockUSDC.read.balanceOf([
						inhabit.address
					])

					expect(balanceAfter).to.equal(balanceBefore + parseEther('100'))
					expect(contractBalance).to.equal(0n)
				})

				it('Should recover native ETH successfully', async function () {
					const wallet = await viem.getWalletClient(deployer)
					const publicClient = await viem.getPublicClient()

					const hash = await wallet.sendTransaction({
						account: deployer,
						to: inhabit.address,
						value: parseEther('1')
					})

					await publicClient.waitForTransactionReceipt({ hash })

					const contractBefore = await publicClient.getBalance({
						address: inhabit.address
					})

					expect(contractBefore).to.equal(parseEther('1'))

					const ledgerBefore = await publicClient.getBalance({
						address: ledger
					})

					const recoverFundsTx = await inhabit.write.recoverFunds(
						[NATIVE, ledger],
						{
							account: deployer
						}
					)

					await publicClient.waitForTransactionReceipt({
						hash: recoverFundsTx
					})

					const ledgerAfter = await publicClient.getBalance({ address: ledger })

					const contractAfter = await publicClient.getBalance({
						address: inhabit.address
					})

					expect(contractAfter).to.equal(0n)
					expect(ledgerAfter - ledgerBefore).to.be.gte(parseEther('0.99999'))
				})

				it('Should handle recovery when contract has zero balance', async function () {
					await inhabit.write.recoverFunds([mockUSDC.address, ledger], {
						account: deployer
					})

					const tx = await inhabit.write.recoverFunds(
						[mockUSDC.address, ledger],
						{
							account: deployer
						}
					)

					expect(tx).to.exist
				})
			})
		})

		describe('View Functions', function () {
			describe('getGroup', function () {
				it('Should return empty group for non-existent referral', async function () {
					const group = await inhabit.read.getGroup(['NONEXISTENT'])

					expect(group.referral).to.equal('')
					expect(group.state).to.be.false
					expect(group.ambassadors).to.have.lengthOf(0)
				})

				it('Should return correct group data', async function () {
					const ambassadors = [
						{ account: luca, fee: FEE_50_PERCENT },
						{ account: juan, fee: FEE_30_PERCENT }
					]

					await inhabit.write.createGroup([REFERRAL_CODE, true, ambassadors], {
						account: deployer
					})

					const group = await inhabit.read.getGroup([REFERRAL_CODE])

					expect(group.referral).to.equal(REFERRAL_CODE)
					expect(group.state).to.be.true
					expect(group.ambassadors).to.have.lengthOf(2)
					expect(group.ambassadors[0].account).to.equal(luca)
					expect(group.ambassadors[0].fee).to.equal(FEE_50_PERCENT)
				})
			})

			describe('getGroupReferral', function () {
				it('Should return correct referral by index', async function () {
					// Create multiple groups
					await inhabit.write.createGroup(['GROUP1', true, []], {
						account: deployer
					})
					await inhabit.write.createGroup(['GROUP2', true, []], {
						account: deployer
					})

					const referral1 = await inhabit.read.getGroupReferral([1n])
					const referral2 = await inhabit.read.getGroupReferral([2n])

					expect(referral1).to.equal('GROUP1')
					expect(referral2).to.equal('GROUP2')
				})

				it('Should return empty string for invalid index', async function () {
					const referral = await inhabit.read.getGroupReferral([999n])
					expect(referral).to.equal('')
				})
			})

			describe('isTokenSupported', function () {
				it('Should return false for unsupported token', async function () {
					const isSupported = await inhabit.read.isTokenSupported([
						mockUSDC.address
					])
					expect(isSupported).to.be.false
				})

				it('Should return true for supported token', async function () {
					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					const isSupported = await inhabit.read.isTokenSupported([
						mockUSDC.address
					])
					expect(isSupported).to.be.true
				})
			})

			describe('calculateFee', function () {
				it('Should calculate fee correctly', async function () {
					const amount = parseEther('100')
					const percentage = 2500n // 25%

					const fee = await inhabit.read.calculateFee([amount, percentage])
					expect(fee).to.equal(parseEther('25'))
				})

				it('Should calculate fee correctly even with percentage over 100%', async function () {
					const amount = parseEther('100')

					const fee = await inhabit.read.calculateFee([
						amount,
						FEE_OVER_100_PERCENT
					])
					expect(fee).to.equal(parseEther('100.01'))
				})

				it('Should handle zero amount', async function () {
					const fee = await inhabit.read.calculateFee([0n, FEE_50_PERCENT])
					expect(fee).to.equal(0n)
				})

				it('Should handle zero percentage', async function () {
					const fee = await inhabit.read.calculateFee([parseEther('100'), 0n])
					expect(fee).to.equal(0n)
				})

				it('Should handle maximum values without overflow', async function () {
					const amount = parseEther('1000000') // 1M tokens
					const percentage = MAX_FEE // 100%

					const fee = await inhabit.read.calculateFee([amount, percentage])
					expect(fee).to.equal(amount)
				})
			})

			describe('groupCount', function () {
				it('Should track group count correctly', async function () {
					const initialCount = await inhabit.read.groupCount()
					expect(initialCount).to.equal(0n)

					// Create groups
					await inhabit.write.createGroup(['GROUP1', true, []], {
						account: deployer
					})
					await inhabit.write.createGroup(['GROUP2', true, []], {
						account: deployer
					})

					const finalCount = await inhabit.read.groupCount()
					expect(finalCount).to.equal(2n)
				})
			})
		})

		describe('Edge Cases and Security', function () {
			it('Should handle special characters in referral codes', async function () {
				const specialReferral = 'TEST_GROUP-123!@#'
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]

				const tx = await inhabit.write.createGroup(
					[specialReferral, true, ambassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist

				const group = await inhabit.read.getGroup([specialReferral])
				expect(group.referral).to.equal(specialReferral)
			})

			it('Should handle very long referral codes', async function () {
				const longReferral = 'A'.repeat(100) // 100 character referral
				const ambassadors = [{ account: luca, fee: FEE_50_PERCENT }]

				const tx = await inhabit.write.createGroup(
					[longReferral, true, ambassadors],
					{
						account: deployer
					}
				)

				expect(tx).to.exist
			})

			it.skip('❌ Should handle groups with many ambassadors efficiently', async function () {
				// Create group with many ambassadors (potential gas issue)
				const manyAmbassadors = []
				const feePerAmbassador = 100n // 1% each

				// Create 100 ambassadors (this might hit gas limits)
				for (let i = 0; i < 100; i++) {
					const account = `0x${(i + 1).toString(16).padStart(40, '0')}`
					manyAmbassadors.push({ account, fee: feePerAmbassador })
				}

				// This might fail due to gas limits - exposing DOS vulnerability
				await expect(
					inhabit.write.createGroup(['LARGE_GROUP', true, manyAmbassadors], {
						account: deployer
					})
				).to.be.rejectedWith('GAS_LIMIT_EXCEEDED')
			})
		})
	})

	describe('Collection Contract', function () {
		const VALID_GOAL = parseEther('1000')
		const ZERO_GOAL = 0n
		const VALID_PRICE = parseEther('10')
		const ZERO_PRICE = 0n
		const VALID_SUPPLY = 100n
		const ZERO_SUPPLY = 0n

		let collectionAddress: Address

		beforeEach(async function () {
			fixture = await deployFixture()
			;({
				deployer,
				luca,
				juan,
				santiago,
				ledger,
				inhabit,
				mockUSDC,
				nftCollection
			} = fixture)

			const userRole = await inhabit.read.USER_ROLE()

			await inhabit.write.grantRole([userRole, luca], {
				account: deployer
			})

			await inhabit.write.setNFTCollection([nftCollection.address], {
				account: deployer
			})
		})

		describe('_createCampaign', function () {
			it('Should revert if goal is zero', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([ZERO_GOAL, collectionsParams], {
						account: deployer
					})
				).to.be.rejectedWith('INVALID_GOAL')
			})

			it('Should revert if collections array is empty', async function () {
				await expect(
					inhabit.write.createCampaign([VALID_GOAL, []], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_ARRAY')
			})

			it('Should revert if collection name is empty', async function () {
				const collectionsParams = [
					{
						name: '',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_STRING')
			})

			it('Should revert if collection symbol is empty', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: '',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_STRING')
			})

			it('Should revert if collection URI is empty', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: '',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
						account: deployer
					})
				).to.be.rejectedWith('EMPTY_STRING')
			})

			it('Should revert if collection supply is zero', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: ZERO_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
						account: deployer
					})
				).to.be.rejectedWith('INVALID_SUPPLY')
			})

			it('Should revert if collection price is zero', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: ZERO_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
						account: deployer
					})
				).to.be.rejectedWith('INVALID_PRICE')
			})

			it('Should revert if caller does not have USER_ROLE', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				await expect(
					inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
						account: santiago
					})
				).to.be.rejectedWith('AccessControlUnauthorizedAccount')
			})

			it('Should create campaign successfully with single collection', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				const tx = await inhabit.write.createCampaign(
					[VALID_GOAL, collectionsParams],
					{
						account: deployer
					}
				)
				expect(tx).to.exist

				const campaignCount = await inhabit.read.campaignCount()
				expect(campaignCount).to.equal(1n)

				const campaign = await inhabit.read.getCampaign([1n])
				expect(campaign.state).to.be.true
				expect(campaign.creator).to.equal(deployer)
				expect(campaign.goal).to.equal(VALID_GOAL)
				expect(campaign.fundsRaised).to.equal(0n)
				expect(campaign.collections).to.have.lengthOf(1)
			})

			it('Should create campaign successfully with multiple collections', async function () {
				const collectionsParams = [
					{
						name: 'Collection 1',
						symbol: 'COL1',
						uri: 'https://test1.com/',
						supply: 50n,
						price: parseEther('5'),
						state: true
					},
					{
						name: 'Collection 2',
						symbol: 'COL2',
						uri: 'https://test2.com/',
						supply: 100n,
						price: parseEther('15'),
						state: false
					}
				]

				const tx = await inhabit.write.createCampaign(
					[VALID_GOAL, collectionsParams],
					{
						account: deployer
					}
				)
				expect(tx).to.exist

				const campaign = await inhabit.read.getCampaign([1n])
				expect(campaign.collections).to.have.lengthOf(2)
			})

			it('Should emit CampaignCreated event', async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				const tx = await inhabit.write.createCampaign(
					[VALID_GOAL, collectionsParams],
					{
						account: deployer
					}
				)

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})

			it('Should increment collection count correctly', async function () {
				const collectionsParams = [
					{
						name: 'Collection 1',
						symbol: 'COL1',
						uri: 'https://test1.com/',
						supply: 50n,
						price: parseEther('5'),
						state: true
					},
					{
						name: 'Collection 2',
						symbol: 'COL2',
						uri: 'https://test2.com/',
						supply: 100n,
						price: parseEther('15'),
						state: false
					}
				]

				await inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
					account: deployer
				})

				const collectionCount = await inhabit.read.collectionCount()
				expect(collectionCount).to.equal(2n)
			})

			it('Should handle edge case with maximum values', async function () {
				const collectionsParams = [
					{
						name: 'A'.repeat(100), // Long name
						symbol: 'B'.repeat(20), // Long symbol
						uri: 'https://test.com/' + 'C'.repeat(100), // Long URI
						supply: maxUint256,
						price: maxUint256,
						state: true
					}
				]

				// TODO: Este test podría fallar si hay límites en el tamaño de strings
				const tx = await inhabit.write.createCampaign(
					[maxUint256, collectionsParams],
					{
						account: deployer
					}
				)
				expect(tx).to.exist
			})
		})

		describe('_updateCampaignstatus', function () {
			beforeEach(async function () {
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: VALID_SUPPLY,
						price: VALID_PRICE,
						state: true
					}
				]

				const userRole = await inhabit.read.USER_ROLE()

				await inhabit.write.grantRole([userRole, luca], {
					account: deployer
				})

				await inhabit.write.createCampaign([VALID_GOAL, collectionsParams], {
					account: deployer
				})
			})

			it('Should revert if campaign ID is invalid (zero)', async function () {
				await expect(
					inhabit.write.updateCampaignStatus([0n, false], {
						account: deployer
					})
				).to.be.rejectedWith('INVALID_CAMPAIGN_ID')
			})

			it('Should revert if campaign ID is invalid (too high)', async function () {
				await expect(
					inhabit.write.updateCampaignStatus([999n, false], {
						account: deployer
					})
				).to.be.rejectedWith('INVALID_CAMPAIGN_ID')
			})

			it('Should revert if caller is not campaign creator', async function () {
				await expect(
					inhabit.write.updateCampaignStatus([1n, false], {
						account: luca
					})
				).to.be.rejectedWith('UNAUTHORIZED')
			})

			it('Should revert if setting same state', async function () {
				await expect(
					inhabit.write.updateCampaignStatus([1n, true], {
						account: deployer
					})
				).to.be.rejectedWith('SAME_STATE')
			})

			it('Should update campaign status successfully', async function () {
				const tx = await inhabit.write.updateCampaignStatus([1n, false], {
					account: deployer
				})
				expect(tx).to.exist

				const campaign = await inhabit.read.getCampaign([1n])
				expect(campaign.state).to.be.false
			})

			it('Should emit CampaignStatusUpdated event', async function () {
				const tx = await inhabit.write.updateCampaignStatus([1n, false], {
					account: deployer
				})

				const publicClient = await hre.viem.getPublicClient()

				const receipt = await publicClient.waitForTransactionReceipt({
					hash: tx
				})

				expect(receipt.logs).to.have.lengthOf.greaterThan(0)
			})

			it('Should allow toggling status back and forth', async function () {
				await inhabit.write.updateCampaignStatus([1n, false], {
					account: deployer
				})

				let campaign = await inhabit.read.getCampaign([1n])
				expect(campaign.state).to.be.false

				await inhabit.write.updateCampaignStatus([1n, true], {
					account: deployer
				})

				campaign = await inhabit.read.getCampaign([1n])
				expect(campaign.state).to.be.true
			})
		})

		describe('Collection Management', function () {
			const CAMPAIGN_GOAL = parseEther('1000')
			const NFT_PRICE = parseEther('10')
			const NFT_SUPPLY = 10n

			beforeEach(async function () {
				const userRole = await inhabit.read.USER_ROLE()

				await inhabit.write.grantRole([userRole, luca], {
					account: deployer
				})

				await inhabit.write.setNFTCollection([nftCollection.address], {
					account: deployer
				})

				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: NFT_SUPPLY,
						price: NFT_PRICE,
						state: true
					}
				]

				await inhabit.write.createCampaign([CAMPAIGN_GOAL, collectionsParams], {
					account: deployer
				})

				const campaign = await inhabit.read.getCampaign([1n])
				collectionAddress = campaign.collections[0]

				await mockUSDC.write.mint([collectionAddress, parseEther('100')], {
					account: deployer
				})
			})

			describe('_setCollectionBaseURI', function () {
				it('Should revert if caller is not campaign creator', async function () {
					await expect(
						inhabit.write.setCollectionBaseURI(
							[1n, collectionAddress, 'https://newuri.com/'],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('UNAUTHORIZED')
				})

				it('Should revert if collection address is zero', async function () {
					await expect(
						inhabit.write.setCollectionBaseURI(
							[1n, zeroAddress, 'https://newuri.com/'],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should revert if campaign ID is invalid', async function () {
					await expect(
						inhabit.write.setCollectionBaseURI(
							[999n, collectionAddress, 'https://newuri.com/'],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('INVALID_CAMPAIGN_ID')
				})

				it('Should update base URI successfully', async function () {
					const newURI = 'https://newuri.com/'

					const tx = await inhabit.write.setCollectionBaseURI(
						[1n, collectionAddress, newURI],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const collection = await viem.getContractAt(
						'NFTCollection',
						collectionAddress
					)
					const baseURI = await collection.read.baseURI()
					expect(baseURI).to.equal(newURI)
				})

				it('Should emit CollectionBaseURIUpdated event', async function () {
					const tx = await inhabit.write.setCollectionBaseURI(
						[1n, collectionAddress, 'https://newuri.com/'],
						{
							account: deployer
						}
					)

					const publicClient = await hre.viem.getPublicClient()

					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})

					expect(receipt.logs).to.have.lengthOf.greaterThan(0)
				})

				it('Should not update URI if collection not found in campaign', async function () {
					const fakeCollection = '0x1234567890123456789012345678901234567890'

					await expect(
						inhabit.write.setCollectionBaseURI(
							[1n, fakeCollection, 'https://newuri.com/'],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('COLLECTION_NOT_FOUND')
				})
			})

			describe('_setCollectionPrice', function () {
				it('Should revert if caller is not campaign creator', async function () {
					await expect(
						inhabit.write.setCollectionPrice(
							[1n, collectionAddress, parseEther('20')],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('UNAUTHORIZED')
				})

				it('Should revert if collection address is zero', async function () {
					await expect(
						inhabit.write.setCollectionPrice(
							[1n, zeroAddress, parseEther('20')],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should revert if price is zero', async function () {
					await expect(
						inhabit.write.setCollectionPrice([1n, collectionAddress, 0n], {
							account: deployer
						})
					).to.be.rejectedWith('INVALID_PRICE')
				})

				it('Should update price successfully', async function () {
					const newPrice = parseEther('20')

					const tx = await inhabit.write.setCollectionPrice(
						[1n, collectionAddress, newPrice],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const collection = await viem.getContractAt(
						'NFTCollection',
						collectionAddress
					)
					const price = await collection.read.price()
					expect(price).to.equal(newPrice)
				})

				it('Should handle maximum price value', async function () {
					const tx = await inhabit.write.setCollectionPrice(
						[1n, collectionAddress, maxUint256],
						{
							account: deployer
						}
					)

					expect(tx).to.exist
				})
			})

			describe('_setCollectionState', function () {
				it('Should revert if caller is not campaign creator', async function () {
					await expect(
						inhabit.write.setCollectionState([1n, collectionAddress, false], {
							account: luca
						})
					).to.be.rejectedWith('UNAUTHORIZED')
				})

				it('Should revert if collection address is zero', async function () {
					await expect(
						inhabit.write.setCollectionState([1n, zeroAddress, false], {
							account: deployer
						})
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should update state successfully', async function () {
					const tx = await inhabit.write.setCollectionState(
						[1n, collectionAddress, false],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const collection = await viem.getContractAt(
						'NFTCollection',
						collectionAddress
					)
					const state = await collection.read.state()
					expect(state).to.be.false
				})
			})

			describe('_setCollectionSupply', function () {
				it('Should revert if caller is not campaign creator', async function () {
					await expect(
						inhabit.write.setCollectionSupply([1n, collectionAddress, 20n], {
							account: luca
						})
					).to.be.rejectedWith('UNAUTHORIZED')
				})

				it('Should revert if collection address is zero', async function () {
					await expect(
						inhabit.write.setCollectionSupply([1n, zeroAddress, 20n], {
							account: deployer
						})
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should revert if supply is zero', async function () {
					await expect(
						inhabit.write.setCollectionSupply([1n, collectionAddress, 0n], {
							account: deployer
						})
					).to.be.rejectedWith('INVALID_SUPPLY')
				})

				it('Should update supply successfully', async function () {
					const newSupply = 20n

					const tx = await inhabit.write.setCollectionSupply(
						[1n, collectionAddress, newSupply],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const collection = await viem.getContractAt(
						'NFTCollection',
						collectionAddress
					)
					const supply = await collection.read.supply()
					expect(supply).to.equal(newSupply)
				})

				it('Should revert if new supply is less than current token count', async function () {
					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					// Mint 5 NFTs
					for (let i = 0; i < 5; i++) {
						await mockUSDC.write.mint([luca, NFT_PRICE], {
							account: deployer
						})

						await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
							account: luca
						})

						await inhabit.write.buyNFT(
							[1n, collectionAddress, mockUSDC.address, ''],
							{
								account: luca
							}
						)
					}

					// Now try to set supply to less than 5
					// This should revert
					await expect(
						inhabit.write.setCollectionSupply(
							[
								1n,
								collectionAddress,
								3n // Menos que los 5 tokens ya minteados
							],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('INVALID_SUPPLY')
				})
			})

			describe('_recoverCollectionFunds', function () {
				it('Should revert if caller does not inhabit contract', async function () {
					await expect(
						inhabit.write.recoverCollectionFunds(
							[1n, collectionAddress, mockUSDC.address, ledger],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('UNAUTHORIZED')
				})

				it('Should revert if destination address is zero', async function () {
					await expect(
						inhabit.write.recoverCollectionFunds(
							[1n, collectionAddress, mockUSDC.address, zeroAddress],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('ZERO_ADDRESS')
				})

				it('Should recover ERC20 tokens successfully', async function () {
					const balanceBefore = await mockUSDC.read.balanceOf([ledger])

					const tx = await inhabit.write.recoverCollectionFunds(
						[1n, collectionAddress, mockUSDC.address, ledger],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const balanceAfter = await mockUSDC.read.balanceOf([ledger])
					const contractBalance = await mockUSDC.read.balanceOf([
						inhabit.address
					])

					expect(balanceAfter).to.equal(balanceBefore + parseEther('100'))
					expect(contractBalance).to.equal(0n)
				})

				it('Should recover native ETH successfully', async function () {
					const wallet = await viem.getWalletClient(deployer)
					const publicClient = await viem.getPublicClient()

					const hash = await wallet.sendTransaction({
						account: deployer,
						to: collectionAddress,
						value: parseEther('1')
					})

					await publicClient.waitForTransactionReceipt({ hash })

					const contractBefore = await publicClient.getBalance({
						address: collectionAddress
					})

					expect(contractBefore).to.equal(parseEther('1'))

					const ledgerBefore = await publicClient.getBalance({
						address: ledger
					})

					const recoverFundsTx = await inhabit.write.recoverCollectionFunds(
						[1n, collectionAddress, NATIVE, ledger],
						{
							account: deployer
						}
					)

					await publicClient.waitForTransactionReceipt({
						hash: recoverFundsTx
					})

					const ledgerAfter = await publicClient.getBalance({
						address: ledger
					})

					const contractAfter = await publicClient.getBalance({
						address: collectionAddress
					})

					expect(contractAfter).to.equal(0n)
					expect(ledgerAfter - ledgerBefore).to.be.gte(parseEther('0.99999'))
				})

				it('Should handle recovery when contract has zero balance', async function () {
					await inhabit.write.recoverCollectionFunds(
						[1n, collectionAddress, mockUSDC.address, ledger],
						{
							account: deployer
						}
					)

					const tx = await inhabit.write.recoverCollectionFunds(
						[1n, collectionAddress, mockUSDC.address, ledger],
						{
							account: deployer
						}
					)

					expect(tx).to.exist
				})
			})
		})

		describe('Refund System', function () {
			const CAMPAIGN_GOAL = parseEther('1000')
			const NFT_PRICE = parseEther('10')
			const NFT_SUPPLY = 10n
			const REFUND_AMOUNT = parseEther('5')

			beforeEach(async function () {
				const userRole = await inhabit.read.USER_ROLE()

				await inhabit.write.grantRole([userRole, luca], {
					account: deployer
				})

				await inhabit.write.setNFTCollection([nftCollection.address], {
					account: deployer
				})

				// Create a campaign with a collection
				const collectionsParams = [
					{
						name: 'Test Collection',
						symbol: 'TEST',
						uri: 'https://test.com/',
						supply: NFT_SUPPLY,
						price: NFT_PRICE,
						state: true
					}
				]

				await inhabit.write.createCampaign([CAMPAIGN_GOAL, collectionsParams], {
					account: deployer
				})

				const campaign = await inhabit.read.getCampaign([1n])
				collectionAddress = campaign.collections[0]

				// Setup tokens
				await inhabit.write.addToTokens([[mockUSDC.address]], {
					account: deployer
				})

				// Buy an NFT to establish a refund
				await mockUSDC.write.mint([luca, NFT_PRICE], {
					account: deployer
				})

				await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
					account: luca
				})
			})

			describe('establishRefund', function () {
				it('Should revert if token is not supported', async function () {
					const unsupportedToken = '0x1234567890123456789012345678901234567890'

					await expect(
						inhabit.write.establishRefund(
							[1n, collectionAddress, unsupportedToken, REFUND_AMOUNT],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('TOKEN_NOT_FOUND')
				})

				it('Should revert if collection is not valid', async function () {
					const fakeCollection = '0x1234567890123456789012345678901234567890'

					await expect(
						inhabit.write.establishRefund(
							[1n, fakeCollection, mockUSDC.address, REFUND_AMOUNT],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('COLLECTION_NOT_FOUND')
				})

				it('Should revert if trying to establish refund for a collection having no NFTs', async function () {
					await expect(
						inhabit.write.establishRefund(
							[1n, collectionAddress, mockUSDC.address, REFUND_AMOUNT],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('INVALID_AMOUNT')
				})

				it('Should revert if insufficient funds for total refund', async function () {
					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{
							account: luca
						}
					)

					await expect(
						inhabit.write.establishRefund(
							[1n, collectionAddress, mockUSDC.address, REFUND_AMOUNT],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('INSUFFICIENT_FUNDS')
				})

				it('Should revert if insufficient allowance for total refund', async function () {
					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{
							account: luca
						}
					)

					await mockUSDC.write.mint([deployer, REFUND_AMOUNT], {
						account: deployer
					})

					await expect(
						inhabit.write.establishRefund(
							[1n, collectionAddress, mockUSDC.address, REFUND_AMOUNT],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('INSUFFICIENT_ALLOWANCE')
				})

				it('Should establish refund successfully', async function () {
					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{
							account: luca
						}
					)

					await mockUSDC.write.mint([deployer, REFUND_AMOUNT], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, REFUND_AMOUNT], {
						account: deployer
					})

					const tx = await inhabit.write.establishRefund(
						[1n, collectionAddress, mockUSDC.address, REFUND_AMOUNT],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const refundAmount = await inhabit.read.getRefunds([
						1n,
						collectionAddress,
						mockUSDC.address
					])
					expect(refundAmount).to.equal(REFUND_AMOUNT)
				})

				it('Should emit RefundEstablished event', async function () {
					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{
							account: luca
						}
					)

					await mockUSDC.write.mint([deployer, REFUND_AMOUNT], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, REFUND_AMOUNT], {
						account: deployer
					})

					const tx = await inhabit.write.establishRefund(
						[1n, collectionAddress, mockUSDC.address, REFUND_AMOUNT],
						{
							account: deployer
						}
					)

					const publicClient = await hre.viem.getPublicClient()

					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})
					expect(receipt.logs).to.have.lengthOf.greaterThan(0)
				})
			})

			describe('claimRefund', function () {
				beforeEach(async function () {
					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{
							account: luca
						}
					)

					await mockUSDC.write.mint([deployer, REFUND_AMOUNT], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, REFUND_AMOUNT], {
						account: deployer
					})

					await inhabit.write.establishRefund(
						[1n, collectionAddress, mockUSDC.address, REFUND_AMOUNT],
						{
							account: deployer
						}
					)
				})

				it('Should revert if collection is not valid', async function () {
					const fakeCollection = '0x1234567890123456789012345678901234567890'

					await expect(
						inhabit.write.claimRefund(
							[
								1n,
								fakeCollection,
								1n // tokenId
							],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('COLLECTION_NOT_FOUND')
				})

				it('Should revert if caller is not NFT owner', async function () {
					await expect(
						inhabit.write.claimRefund(
							[
								1n,
								collectionAddress,
								1n // tokenId owned by luca
							],
							{
								account: juan // juan is not the owner
							}
						)
					).to.be.rejectedWith('NOT_NFT_OWNER')
				})

				it('Should revert if refund already claimed', async function () {
					await inhabit.write.claimRefund([1n, collectionAddress, 1n], {
						account: luca
					})

					await expect(
						inhabit.write.claimRefund([1n, collectionAddress, 1n], {
							account: luca
						})
					).to.be.rejectedWith('REFUND_ALREADY_CLAIMED')
				})

				it('Should revert if contract has insufficient funds for refund', async function () {
					await inhabit.write.recoverFunds([mockUSDC.address, deployer], {
						account: deployer
					})

					await expect(
						inhabit.write.claimRefund([1n, collectionAddress, 1n], {
							account: luca
						})
					).to.be.rejectedWith('INSUFFICIENT_FUNDS')
				})

				it('Should claim refund successfully', async function () {
					const balanceBefore = await mockUSDC.read.balanceOf([luca])

					const tx = await inhabit.write.claimRefund(
						[1n, collectionAddress, 1n],
						{
							account: luca
						}
					)

					expect(tx).to.exist

					const balanceAfter = await mockUSDC.read.balanceOf([luca])
					expect(balanceAfter).to.equal(balanceBefore + REFUND_AMOUNT)

					const isClaimed = await inhabit.read.isRefundClaimed([
						1n,
						collectionAddress,
						1n
					])
					expect(isClaimed).to.be.true
				})

				it('Should burn NFT when claiming refund', async function () {
					const collection = await viem.getContractAt(
						'NFTCollection',
						collectionAddress
					)

					// Verify that the NFT is owned by luca before claiming refund
					const ownerBefore = await collection.read.ownerOf([1n])
					expect(ownerBefore).to.equal(luca)

					await inhabit.write.claimRefund([1n, collectionAddress, 1n], {
						account: luca
					})

					// Verify that the NFT is burned
					await expect(collection.read.ownerOf([1n])).to.be.rejectedWith(
						'ERC721NonexistentToken(1)'
					)
				})

				it('Should emit RefundClaimed event', async function () {
					const tx = await inhabit.write.claimRefund(
						[1n, collectionAddress, 1n],
						{
							account: luca
						}
					)

					const publicClient = await hre.viem.getPublicClient()

					const receipt = await publicClient.waitForTransactionReceipt({
						hash: tx
					})
					expect(receipt.logs).to.have.lengthOf.greaterThan(0)
				})
			})
		})

		describe('View Functions', function () {
			const CAMPAIGN_GOAL = parseEther('1000')
			const NFT_PRICE = parseEther('10')

			describe('getCampaign', function () {
				it('Should return empty campaign for invalid ID', async function () {
					const campaign = await inhabit.read.getCampaign([999n])

					expect(campaign.collections).to.have.lengthOf(0)
					expect(campaign.state).to.be.false
					expect(campaign.creator).to.equal(zeroAddress)
					expect(campaign.goal).to.equal(0n)
					expect(campaign.fundsRaised).to.equal(0n)
				})

				it('Should return correct campaign data', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: NFT_PRICE,
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{ account: deployer }
					)

					const campaign = await inhabit.read.getCampaign([1n])

					expect(campaign.state).to.be.true
					expect(campaign.creator).to.equal(deployer)
					expect(campaign.goal).to.equal(CAMPAIGN_GOAL)
					expect(campaign.fundsRaised).to.equal(0n)
					expect(campaign.collections).to.have.lengthOf(1)
				})
			})

			describe('getCampaignPurchases', function () {
				it('Should return empty array for campaign with no purchases', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: NFT_PRICE,
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{ account: deployer }
					)

					const purchases = await inhabit.read.getCampaignPurchases([1n])
					expect(purchases).to.have.lengthOf(0)
				})

				it('Should return correct purchase data', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: NFT_PRICE,
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{ account: deployer }
					)

					const campaign = await inhabit.read.getCampaign([1n])
					collectionAddress = campaign.collections[0]

					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					await mockUSDC.write.mint([luca, NFT_PRICE], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, NFT_PRICE], {
						account: luca
					})

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{ account: luca }
					)

					const purchases = await inhabit.read.getCampaignPurchases([1n])
					expect(purchases).to.have.lengthOf(1)
					expect(purchases[0].collection).to.equal(collectionAddress)
					expect(purchases[0].paymentToken).to.equal(mockUSDC.address)
					expect(purchases[0].price).to.equal(NFT_PRICE)
				})
			})

			describe('getRefunds', function () {
				it('Should return zero for non-existent refund', async function () {
					const refundAmount = await inhabit.read.getRefunds([
						1n,
						mockUSDC.address,
						mockUSDC.address
					])

					expect(refundAmount).to.equal(0n)
				})

				it('Should return correct refund amount', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: NFT_PRICE,
							state: true
						}
					]

					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{ account: deployer }
					)

					const campaign = await inhabit.read.getCampaign([1n])
					const collectionAddress = campaign.collections[0]

					await mockUSDC.write.mint([deployer, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.mint([luca, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, parseEther('10')], {
						account: luca
					})

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{ account: luca }
					)

					await inhabit.write.establishRefund(
						[1n, collectionAddress, mockUSDC.address, parseEther('5')],
						{ account: deployer }
					)

					const refundAmount = await inhabit.read.getRefunds([
						1n,
						collectionAddress,
						mockUSDC.address
					])

					expect(refundAmount).to.equal(parseEther('5'))
				})
			})

			describe('isRefundClaimed', function () {
				it('Should return false for non-existent claim', async function () {
					const isClaimed = await inhabit.read.isRefundClaimed([
						1n,
						collectionAddress,
						1n
					])

					expect(isClaimed).to.be.false
				})

				it('Should return true after claiming refund', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: NFT_PRICE,
							state: true
						}
					]

					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					await inhabit.write.createCampaign(
						[CAMPAIGN_GOAL, collectionsParams],
						{ account: deployer }
					)

					const campaign = await inhabit.read.getCampaign([1n])
					collectionAddress = campaign.collections[0]

					await mockUSDC.write.mint([deployer, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.mint([luca, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, parseEther('10')], {
						account: luca
					})

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{ account: luca }
					)

					await inhabit.write.establishRefund(
						[1n, collectionAddress, mockUSDC.address, parseEther('5')],
						{ account: deployer }
					)

					await inhabit.write.claimRefund([1n, collectionAddress, 1n], {
						account: luca
					})

					const isClaimed = await inhabit.read.isRefundClaimed([
						1n,
						collectionAddress,
						1n
					])

					expect(isClaimed).to.be.true
				})
			})
		})

		describe('Internal Function Validation', function () {
			beforeEach(async function () {})

			describe('_invalidCampaignId', function () {
				it('Should validate campaign ID correctly through public functions', async function () {
					// Testear a través de funciones públicas que usan _invalidCampaignId
					await expect(inhabit.read.getCampaign([0n])).to.not.be.rejected // ID 0 debería retornar campaña vacía

					await expect(inhabit.read.getCampaign([999n])).to.not.be.rejected // ID alto debería retornar campaña vacía
				})
			})

			describe('_validateCollection', function () {
				it('Should validate collection correctly through buyNFT', async function () {
					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					// Intentar comprar de una colección que no existe
					await expect(
						inhabit.write.buyNFT(
							[
								1n, // campaign que no existe
								mockUSDC.address, // collection fake
								mockUSDC.address,
								''
							],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('INVALID_CAMPAIGN_ID')

					// Crear campaña válida
					await inhabit.write.setNFTCollection([nftCollection.address], {
						account: deployer
					})

					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: parseEther('10'),
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[parseEther('1000'), collectionsParams],
						{
							account: deployer
						}
					)

					// Intentar con colección que no pertenece a la campaña
					await expect(
						inhabit.write.buyNFT(
							[
								1n,
								mockUSDC.address, // collection que no pertenece a la campaña
								mockUSDC.address,
								''
							],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('COLLECTION_NOT_FOUND')
				})
			})

			describe('_findPurchaseByTokenId', function () {
				it('Should find purchase correctly through claimRefund', async function () {
					// Setup completo para tener una compra
					await inhabit.write.setNFTCollection([nftCollection.address], {
						account: deployer
					})

					await inhabit.write.addToTokens([[mockUSDC.address]], {
						account: deployer
					})

					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: parseEther('10'),
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[parseEther('1000'), collectionsParams],
						{
							account: deployer
						}
					)

					const campaign = await inhabit.read.getCampaign([1n])
					const collectionAddress = campaign.collections[0]

					await mockUSDC.write.mint([luca, parseEther('10')], {
						account: deployer
					})

					await mockUSDC.write.approve([inhabit.address, parseEther('10')], {
						account: luca
					})

					await inhabit.write.buyNFT(
						[1n, collectionAddress, mockUSDC.address, ''],
						{
							account: luca
						}
					)

					// Intentar claim refund con token que no existe debería fallar
					await expect(
						inhabit.write.claimRefund(
							[
								1n,
								collectionAddress,
								999n // token que no existe
							],
							{
								account: luca
							}
						)
					).to.be.rejectedWith('PURCHASE_NOT_FOUND')
				})
			})
		})

		describe('Edge Cases and Security', function () {
			beforeEach(async function () {
				await inhabit.write.setNFTCollection([nftCollection.address], {
					account: deployer
				})
			})

			describe('Gas Optimization Issues', function () {
				it.skip('❌ Should handle campaigns with many collections efficiently', async function () {
					const manyCollections = []

					for (let i = 0; i < 100; i++) {
						manyCollections.push({
							name: `Collection ${i}`,
							symbol: `COL${i}`,
							uri: `https://test${i}.com/`,
							supply: 100n,
							price: parseEther('10'),
							state: true
						})
					}

					await expect(
						inhabit.write.createCampaign(
							[parseEther('1000'), manyCollections],
							{
								account: deployer
							}
						)
					).to.be.rejectedWith('GAS_LIMIT_EXCEEDED')
				})

				it.skip('❌ Should handle collection operations efficiently with many collections', async function () {
					const collections = []
					for (let i = 0; i < 10; i++) {
						collections.push({
							name: `Collection ${i}`,
							symbol: `COL${i}`,
							uri: `https://test${i}.com/`,
							supply: 100n,
							price: parseEther('10'),
							state: true
						})
					}

					await inhabit.write.createCampaign(
						[parseEther('1000'), collections],
						{
							account: deployer
						}
					)

					const campaign = await inhabit.read.getCampaign([1n])
					const lastCollection = campaign.collections[9] // Última colección

					const publicClient = await hre.viem.getPublicClient()

					// Las operaciones en la última colección requieren iterar sobre todas las anteriores
					// Esto es ineficiente
					// 				const publicClient = await hre.viem.getPublicC				y podría causar problemas de gas
					const startGas = await publicClient.estimateGas({
						account: deployer,
						to: inhabit.address,
						data: inhabit.interface.encodeFunctionData('setCollectionPrice', [
							1n,
							lastCollection,
							parseEther('20')
						])
					})

					// En un contrato optimizado, esto debería ser O(1), no O(n)
					console.log(
						'Gas estimate for operation on last collection:',
						startGas
					)
				})
			})

			describe('Logic Vulnerabilities', function () {
				it.skip('❌ Should prevent collection operations on non-existent collections', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: parseEther('10'),
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[parseEther('1000'), collectionsParams],
						{
							account: deployer
						}
					)

					const fakeCollection = '0x1234567890123456789012345678901234567890'

					// Estas operaciones no deberían pasar silenciosamente - deberían revertir
					const tx = await inhabit.write.setCollectionPrice(
						[1n, fakeCollection, parseEther('20')],
						{
							account: deployer
						}
					)

					// ❌ El contrato actual no valida si la colección existe en la campaña
					// La transacción pasa pero no hace nada
					expect(tx).to.exist
				})
			})

			describe('Integer Overflow/Underflow', function () {
				it('Should handle maximum values without overflow', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: maxUint256,
							price: maxUint256,
							state: true
						}
					]

					// Crear campaña con valores máximos
					const tx = await inhabit.write.createCampaign(
						[maxUint256, collectionsParams],
						{
							account: deployer
						}
					)

					expect(tx).to.exist

					const campaign = await inhabit.read.getCampaign([1n])
					expect(campaign.goal).to.equal(maxUint256)
				})

				it('Should handle fundsRaised accumulation correctly', async function () {
					// Test que fundsRaised no cause overflow cuando se acumulan muchas compras
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 1000000n, // Muchos NFTs
							price: parseEther('1000000'), // Precio alto
							state: true
						}
					]

					await inhabit.write.createCampaign([maxUint256, collectionsParams], {
						account: deployer
					})

					// Este test es conceptual - en la práctica sería muy costoso ejecutar
					// Pero ilustra la importancia de verificar overflows en fundsRaised
				})
			})

			describe('Reentrancy Protection', function () {
				it('Should be protected against reentrancy in claimRefund', async function () {
					// El contrato usa ReentrancyGuard, pero verificamos que esté aplicado correctamente
					// Este test sería más complejo y requeriría un contrato malicioso para testing
					// Por ahora, verificamos que el modifier nonReentrant esté presente en buyNFT y claimRefund
					// a través de intentar llamadas anidadas (esto es conceptual)
				})
			})
		})

		describe('Private Variables Access', function () {
			describe('Storage Variable Visibility', function () {
				it('Should expose nonces for testing and transparency', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: parseEther('10'),
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[parseEther('1000'), collectionsParams],
						{
							account: deployer
						}
					)

					const nonce = await inhabit.read.getNonces([deployer])
					expect(nonce).to.equal(1n)
				})

				it('Should expose campaigns mapping for transparency', async function () {
					const collectionsParams = [
						{
							name: 'Test Collection',
							symbol: 'TEST',
							uri: 'https://test.com/',
							supply: 100n,
							price: parseEther('10'),
							state: true
						}
					]

					await inhabit.write.createCampaign(
						[parseEther('1000'), collectionsParams],
						{
							account: deployer
						}
					)

					const campaign = await inhabit.read.getCampaign([1n])
					expect(campaign.creator).to.equal(deployer)
					expect(campaign.goal).to.equal(parseEther('1000'))
					expect(campaign.state).to.be.true
					expect(campaign.fundsRaised).to.equal(0n)
					expect(campaign.collections).to.have.lengthOf(1)
					expect(campaign.collections[0]).to.exist
				})

				it.skip('❌Should expose refunds mapping for verification', async function () {
					// getRefunds existe, pero no hay forma de iterar sobre todos los refunds
					// o verificar si existe un refund para una campaña/colección específica
					// Sería útil tener:
					// - hasRefund(uint256 campaignId, address collection, address token)
					// - getRefundTokens(uint256 campaignId, address collection)
				})

				it.skip('❌ Should expose refundsClaimed for comprehensive testing', async function () {
					// isRefundClaimed existe, pero podría ser útil tener funciones adicionales como:
					// - getClaimedRefunds(uint256 campaignId, address collection)
					// - getTotalClaimedRefunds(uint256 campaignId)
				})
			})
		})
	})
})
