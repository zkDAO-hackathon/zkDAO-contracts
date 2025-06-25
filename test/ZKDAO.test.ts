import chai, { expect } from 'chai'
import chaiBigint from 'chai-bigint'
import { log } from 'console'
import { BytesLike } from 'ethers'
import { writeFileSync } from 'fs'
import hre, { network, viem } from 'hardhat'
import { join } from 'path'
import {
	Address,
	encodeFunctionData,
	getAddress,
	keccak256,
	parseEther,
	recoverPublicKey,
	toBytes
} from 'viem'

import { CircuitAPIClient } from '@/api/circuit-proof'
import { MerkleProofAPIClient } from '@/api/merkle-proof'
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
	let linkToken: any

	async function deployFixture(): Promise<any> {
		const { deployments, getNamedAccounts } = hre
		const { deployer, user1, user2, user3, user4 } = await getNamedAccounts()

		await deployments.fixture(['localhost'])

		// LINK token
		const linkTokenAddress = (await deployments.get('MockErc20'))
			.address as Address

		const linkToken = await viem.getContractAt('MockErc20', linkTokenAddress)

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
			mockZkDao,
			linkToken
		}
	}

	beforeEach(async function () {
		fixture = await deployFixture()
		;({ deployer, user1, user2, user3, user4, mockZkDao, linkToken } = fixture)
	})

	it('Workflow', async function () {
		log('🚩 0) pay for create DAO')

		const GOVERNOR_TOKEN_PARAMS: GovernorTokenParams = {
			name: 'Bogota DAO Token',
			symbol: 'BOG'
		}

		const MIN_DELAY = 300 // 5 minutes

		const GOVERNOR_PARAMS: GovernorParams = {
			name: 'Bogota DAO',
			description: 'DAO for Bogota',
			logo: 'https://black-fast-chipmunk-543.mypinata.cloud/ipfs/bafybeibendwijlnunkx7mpsgre2kquvtlt5tnfk7eeydqegyi4hpmrbxai',
			votingDelay: 604800n, // 1 week
			votingPeriod: 604800n, // 1 week
			proposalThreshold: 1n, // 1 token
			quorumFraction: 4n // 4% of total supply
		}

		const TO = [user1, user2, user3] // Addresses of the DAO members

		const AMOUNTS = [1000n, 1000n, 1000n] // Amounts of tokens to be allocated to each member

		const VALUE = parseEther('5')

		await linkToken.write.mint([user1, parseEther('10')], {
			account: deployer
		})

		await linkToken.write.approve([mockZkDao.address, parseEther('10')], {
			account: user1
		})

		const payForDaoCreationTx = await mockZkDao.write.payForDaoCreation(
			[GOVERNOR_TOKEN_PARAMS, MIN_DELAY, GOVERNOR_PARAMS, TO, AMOUNTS, VALUE],
			{ account: user1 }
		)

		expect(payForDaoCreationTx).to.be.ok

		log('🚩 1) Create DAO')

		const publicClient = await hre.viem.getPublicClient()

		// 🚩 1) Create DAO
		const createDaoTx = await mockZkDao.write.createDao(
			[GOVERNOR_TOKEN_PARAMS, MIN_DELAY, GOVERNOR_PARAMS, TO, AMOUNTS],
			{ account: user1 }
		)

		const createDaoReceipt = await publicClient.getTransactionReceipt({
			hash: createDaoTx
		})

		const DAO_CREATED_TOPIC = keccak256(
			toBytes('DaoCreated(uint256,address,address,address,address)')
		)

		const daoCreatedLog = createDaoReceipt.logs.find(
			log => log.topics[0] === DAO_CREATED_TOPIC
		)

		const DAO_ID = BigInt(daoCreatedLog.topics[1])

		log('🚩 2) propose')

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

		const proposetx = await governor.write.propose(
			[targets, values, calldatas, PROPOSAL_DESCRIPTION],
			{ account: user1 }
		)

		expect(proposetx).to.be.ok

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

		log('🚩 4.5) Generate Merkle Tree')

		const merkleProofAPI = new MerkleProofAPIClient()

		const descriptionHash = keccak256(toBytes(PROPOSAL_DESCRIPTION))

		const currentBlock = await publicClient.getBlockNumber()
		const proposalReceipt = await publicClient.getTransactionReceipt({
			hash: proposetx
		})

		let actualProposalId: string | null = null

		for (const log of proposalReceipt.logs) {
			try {
				const decodedLog = await publicClient.parseLogs({
					abi: governor.abi,
					logs: [log]
				})

				if (
					decodedLog.length > 0 &&
					decodedLog[0].eventName === 'ProposalCreated'
				) {
					actualProposalId = decodedLog[0].args.proposalId.toString()
					break
				}
			} catch (error) {
				continue
			}
		}

		if (!actualProposalId) {
			try {
				actualProposalId = (await governor.read.hashProposal([
					targets,
					values,
					calldatas,
					descriptionHash
				])) as string
				actualProposalId = actualProposalId.toString()
			} catch (error) {
				throw new Error('Proposal ID not found in logs or hashProposal')
			}
		}

		const merkleTreeParams = [
			`dao=${dao.governor}`,
			`daoId=${DAO_ID}`,
			`proposalId=${actualProposalId}`,
			`snapshot=${currentBlock}`,
			`voteToken=${dao.token}`
		].join(';')

		const cids = await merkleProofAPI.generateMerkleTrees([merkleTreeParams])

		log('🚩 5) fulfillRequest')

		const lastRequestId: bigint = await mockZkDao.read.s_lastRequestId([])

		const fulfillTx = await mockZkDao.write.mockFulfillRequest(
			[lastRequestId, cids],
			{ account: deployer }
		)

		await publicClient.waitForTransactionReceipt({
			hash: fulfillTx
		})

		expect(fulfillTx).to.be.ok

		log('🚩 6) Get Merkle Tree')

		const hashedMessage = keccak256(toBytes('Vote for proposal 1'))

		const client = await hre.viem.getWalletClient(user2)

		const signature = await client.signMessage({
			message: { raw: hashedMessage }
		})

		const pubKey = await recoverPublicKey({
			signature,
			hash: hashedMessage
		})

		const pubKeyBytes = pubKey.slice(2) // remove 0x
		const pubKeyX = pubKeyBytes.slice(0, 64)
		const pubKeyY = pubKeyBytes.slice(64, 128)

		function hexToByteArray(hex: string): number[] {
			return Array.from(Buffer.from(hex, 'hex'))
		}

		const fullSigBytes = hexToByteArray(signature.slice(2))
		const sig64 = fullSigBytes.slice(0, 64)

		const ECDSA = {
			_pub_key_x: hexToByteArray(pubKeyX),
			_pub_key_y: hexToByteArray(pubKeyY),
			_signature: sig64,
			_hashed_message: hexToByteArray(hashedMessage.slice(2))
		}

		const merkleProof = await merkleProofAPI.getMerkleProof(
			dao.governor,
			actualProposalId,
			user2
		)

		log('🚩 7) Generate ZK Proof')

		const circuitAPIClient = new CircuitAPIClient()
		const zkproof = await circuitAPIClient.generateZKProof({
			_proposalId: actualProposalId,
			_secret: merkleProof.secret,
			_voter: getAddress(user2),
			_weight: merkleProof.weight.toString(),
			_choice: 1,
			_snapshot_merkle_tree: merkleProof.snapshotMerkleTree,
			_leaf: merkleProof.leaf,
			_index: merkleProof.index.toString(),
			_path: merkleProof.path,
			...ECDSA
		})

		// 🎯 SAVE DATA FOR REMIX TESTING
		const remixTestData = {
			contractCall: {
				merkleProof,
				ecdsa: ECDSA,
				zkProof: {
					proofBytes: zkproof.proofBytes,
					publicInputs: zkproof.publicInputs,
					proofLength: zkproof.proofBytes.length
				}
			}
		}

		// Save to JSON file
		const outputPath = join(process.cwd(), 'remix-test-data.json')
		writeFileSync(outputPath, JSON.stringify(remixTestData, null, 2))

		log('🚩 8) castZKVote')
		const castZKVoteTx = await governor.write.castZKVote(
			[actualProposalId, zkproof.proofBytes, zkproof.publicInputs],
			{ account: user2 }
		)

		await publicClient.getTransactionReceipt({
			hash: castZKVoteTx
		})

		expect(castZKVoteTx).to.be.ok

		log('🚩 8.5) Advance time to end voting period')

		const votingPeriodSeconds = Number(GOVERNOR_PARAMS.votingPeriod)

		const snapshot = await governor.read.proposalSnapshot([actualProposalId])
		const nextTime = Number(snapshot) + votingPeriodSeconds + 1

		await network.provider.send('evm_setNextBlockTimestamp', [nextTime])
		await network.provider.send('evm_mine', [])

		await mockZkDao.write.advanceTime([BigInt(votingPeriodSeconds + 1)])

		const proposalState = await governor.read.state([actualProposalId])
		log('Proposal state after voting period:', proposalState)

		log('🚩 9) Queue proposal')

		await governor.write.queue([targets, values, calldatas, descriptionHash], {
			account: user1
		})

		const proposalStateQueued = await governor.read.state([actualProposalId])
		expect(proposalStateQueued).to.equal(5)
		log('Proposal state after queue:', proposalStateQueued)

		log('🚩 9) Advance time to end delay perioriod')

		const MIN_DELAY_SECONDS = MIN_DELAY
		await network.provider.send('evm_increaseTime', [MIN_DELAY_SECONDS + 1])
		await network.provider.send('evm_mine', [])
		await mockZkDao.write.advanceTime([BigInt(MIN_DELAY_SECONDS + 1)])

		const proposalStateAfterDelay = await governor.read.state([
			actualProposalId
		])
		expect(proposalStateAfterDelay).to.equal(5)
		log('Proposal state after delay period:', proposalStateAfterDelay)

		log('🚩 10) Advance time to allow execution')
		await network.provider.send('evm_increaseTime', [MIN_DELAY + 1])
		await network.provider.send('evm_mine', [])

		await mockZkDao.write.advanceTime([BigInt(MIN_DELAY + 1)])

		log('🚩 11) Execute proposal')
		const executeTx = await governor.write.execute(
			[targets, values, calldatas, descriptionHash],
			{ account: user1 }
		)
		await publicClient.waitForTransactionReceipt({ hash: executeTx })

		expect(executeTx).to.be.ok

		expect(await token.read.balanceOf([user4])).to.equal(
			1000n,
			'User4 should have 1000 tokens after execution'
		)
	})
})
