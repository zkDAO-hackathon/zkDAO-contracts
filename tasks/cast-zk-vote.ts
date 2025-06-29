import { task } from 'hardhat/config'
import {
	type Address,
	getAddress,
	keccak256,
	recoverPublicKey,
	toBytes
} from 'viem'

import { CircuitAPIClient } from '@/api/circuit-proof'
import { MerkleProofAPIClient } from '@/api/merkle-proof'
import { AMOUNT } from '@/config/const'
import { DaoStruct, ProposalStruct } from '@/models'

task('cast-zk-vote', 'Cast a ZK vote to give tokens to an user').setAction(
	async (_, hre) => {
		const { viem } = hre
		const { getNamedAccounts, deployments, network } = hre
		const { user1, user3 } = await getNamedAccounts()

		const chain = network.name
		const publicClient = await viem.getPublicClient()

		const client1 = await hre.viem.getWalletClient(user1)

		const merkleProofAPI = new MerkleProofAPIClient()
		const circuitAPIClient = new CircuitAPIClient()

		console.log('----------------------------------------------------')
		console.log(`🤐 Voting on ${chain}...`)

		const { address: zkdaoAddress } = await deployments.get('ZKDAO')
		const zkdao = await viem.getContractAt('ZKDAO', zkdaoAddress as Address)

		const daoCounter = await zkdao.read.getDaoCounter()
		const dao = (await zkdao.read.getDao([daoCounter])) as DaoStruct

		const governor = await viem.getContractAt('Governor', dao.governor)
		const proposalCounter = await governor.read.getProposalCounter()

		const proposal = (await governor.read.getProposal([
			proposalCounter
		])) as ProposalStruct

		const proposalIdString = (
			proposal.id as string | number | bigint
		).toString()

		console.log('----------------------------------------------------')
		console.log(`🤐 Generating ZK proof for proposal ${proposalIdString}...`)

		const hashedMessage = keccak256(
			toBytes(`Add ${user3} to the DAO and give them ${AMOUNT} tokens`)
		)

		const signature = await client1.signMessage({
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
			getAddress(dao.governor),
			proposalIdString,
			getAddress(user1)
		)

		const zkproof = await circuitAPIClient.generateZKProof({
			_proposalId: proposalIdString,

			_secret: merkleProof.secret,
			_voter: getAddress(user1),
			_weight: merkleProof.weight.toString(),
			_choice: 1,
			_snapshot_merkle_tree: merkleProof.snapshotMerkleTree,
			_leaf: merkleProof.leaf,
			_index: merkleProof.index.toString(),
			_path: merkleProof.path,
			...ECDSA
		})

		console.log('----------------------------------------------------')
		console.log(`🤐 ${user1} is voting Anonymously...`)

		const castZKVoteTx = await governor.write.castZKVote(
			[proposal.id, zkproof.proofBytes, zkproof.publicInputs],
			{ account: user1 }
		)

		await publicClient.waitForTransactionReceipt({
			hash: castZKVoteTx
		})

		console.log(`✅ Voted. tx hash: ${castZKVoteTx}`)
	}
)
