import chai, { expect } from 'chai'
import chaiBigint from 'chai-bigint'
import { log } from 'console'
import { BytesLike } from 'ethers'
import hre, { network, viem } from 'hardhat'
import { Address, encodeFunctionData } from 'viem'

import { DaoStruct, GovernorParams, GovernorTokenParams } from '@/models'

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

	beforeEach(async function () {
		fixture = await deployFixture()
		;({ deployer, user1, user2, user3, user4, mockZkDao } = fixture)
	})

	it('Workflow', async function () {
		log('🚩 1) Create DAO')

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

		const TO = [user1, user2, user3] // Addresses of the DAO members

		const AMOUNTS = [1000n, 1000n, 1000n] // Amounts of tokens to be allocated to each member

		const createDaoTx = await mockZkDao.write.createDao(
			[GOVERNOR_TOKEN_PARAMS, MIN_DELAY, GOVERNOR_PARAMS, TO, AMOUNTS],
			{ account: user1 }
		)

		const publicClient = await hre.viem.getPublicClient()

		await publicClient.waitForTransactionReceipt({
			hash: createDaoTx
		})

		expect(createDaoTx).to.be.ok

		log('🚩 2) propose')

		const DAO_ID = 1n

		const PROPOSAL_DESCRIPTION =
			'Add new members and give them 1000 tokens each'

		const dao: DaoStruct = await mockZkDao.read.getDao([DAO_ID])

		const token = await viem.getContractAt('GovernorToken', dao.token)
		const governor = await viem.getContractAt('Governor', dao.governor)

		const mintCallData = encodeFunctionData({
			abi: token.abi,
			functionName: 'mintBatch',
			args: [[user4], [1000n]]
		})

		const targets = [dao.token]
		const values = [0n]
		const calldatas = [mintCallData]

		// Delegate votes to user1, user2, and user3
		const delegateTx = await token.write.delegate([user1], { account: user1 })

		await publicClient.waitForTransactionReceipt({
			hash: delegateTx
		})

		await publicClient.waitForTransactionReceipt({ hash: delegateTx })

		const delegateTx2 = await token.write.delegate([user2], {
			account: user2
		})

		await publicClient.waitForTransactionReceipt({
			hash: delegateTx2
		})

		const delegateTx3 = await token.write.delegate([user3], {
			account: user3
		})

		await publicClient.waitForTransactionReceipt({
			hash: delegateTx3
		})

		// Propose transaction
		const txHash = await governor.write.propose(
			[targets, values, calldatas, PROPOSAL_DESCRIPTION],
			{ account: user1 }
		)

		expect(txHash).to.be.ok

		log('🚩 3) checkUpkeep')

		let upkeepNeeded = false
		let performData: BytesLike = ''

		while (!upkeepNeeded) {
			await network.provider.send('evm_increaseTime', [86400]) // 1 day;
			await mockZkDao.write.advanceTime([86400n]) //  1 day

			const [upkeepNeededResponse, performDataResponse]: [boolean, BytesLike] =
				await mockZkDao.read.checkUpkeep([dao.governor])

			upkeepNeeded = upkeepNeededResponse
			performData = performDataResponse
		}

		expect(upkeepNeeded).to.equal(true)

		log('🚩 4) performUpkeep')

		const performUpkeepTx = await mockZkDao.write.performUpkeep([performData], {
			account: deployer
		})

		await publicClient.waitForTransactionReceipt({ hash: performUpkeepTx })

		expect(performUpkeepTx).to.be.ok

		log('🚩 5) fulfillRequest')

		const CIDS = 'QmXy7Z5g8d9f3b2c4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t'

		const lastRequestId: bigint = await mockZkDao.read.s_lastRequestId([])

		const fulfillTx = await mockZkDao.write.mockFulfillRequest(
			[lastRequestId, CIDS],
			{ account: deployer }
		)

		await publicClient.waitForTransactionReceipt({
			hash: fulfillTx
		})

		expect(fulfillTx).to.be.ok

		const governorInstance = await viem.getContractAt('Governor', dao.governor)

		const proposalState = await governorInstance.read.state([
			'16640604756799479583065632839777932486736512847992019365521703800375735931445'
		])

		console.log(
			`Proposal state: ${proposalState}` // Should be 4 (Succeeded)
		)
	})
})
