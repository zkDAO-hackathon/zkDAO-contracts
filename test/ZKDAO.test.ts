import chai, { expect } from 'chai'
import chaiBigint from 'chai-bigint'
import hre, { viem } from 'hardhat'
import { Address } from 'viem'

import { GovernorParams, GovernorTokenParams } from '@/models'

chai.use(chaiBigint)

describe('MockZKDAO', function () {
	let fixture: any
	let deployer: string
	let user1: string
	let user2: string
	let user3: string
	let user4: string
	let mockZkDao: any

	async function deployFixture(): Promise<any> {
		const { deployments, getNamedAccounts } = hre
		const { deployer, user1, user2, user3, user4 } = await getNamedAccounts()

		await deployments.fixture(['localhost'])

		// Mock ZKDAO
		const mockZkDaoAddress = (await deployments.get('MockZKDAO'))
			.address as Address

		const mockZkDao = await viem.getContractAt('MockZKDAO', mockZkDaoAddress)

		return {
			deployer,
			user1,
			user2,
			user3,
			user4,
			mockZkDao
		}
	}

	describe('ZKDAO - workflow', function () {
		beforeEach(async function () {
			fixture = await deployFixture()
			;({ deployer, user1, user2, user3, user4, mockZkDao } = fixture)
		})

		describe('🚩 1) Create DAO', function () {
			it('createDao', async function () {
				/*
				 * TODO: save metadata for the DAO
				 * Metadata for the DAO
				 * - name: Name of the DAO token
				 * - description: The name of the DAO token that will be created.
				 * - logo: Image URL for the DAO token logo
				 */

				const GOVERNOR_TOKEN_PARAMS: GovernorTokenParams = {
					name: 'Bogota DAO Token',
					symbol: 'BOG'
				}

				const MIN_DELAY = 300 // 5 minutes

				const GOVERNOR_PARAMS: GovernorParams = {
					name: 'Bogota DAO',
					votingDelay: 604800n, // 1 week
					votingPeriod: 604800n, // 1 week
					proposalThreshold: 1n, // 1 token
					quorumFraction: 4n // 4% of total supply
				}

				const TO = [user1, user2, user3, user4] // Addresses of the DAO members

				const AMOUNTS = [1000n, 1000n, 1000n, 1000n] // Amounts of tokens to be allocated to each member

				const createDaoTx = await mockZkDao.write.createDao(
					[GOVERNOR_TOKEN_PARAMS, MIN_DELAY, GOVERNOR_PARAMS, TO, AMOUNTS],
					{ account: user1 }
				)

				const publicClient = await hre.viem.getPublicClient()

				await publicClient.waitForTransactionReceipt({
					hash: createDaoTx
				})

				expect(createDaoTx).to.be.ok
			})
		})
	})
})
