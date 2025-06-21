import { ProofData, UltraHonkBackend } from '@aztec/bb.js'
import initACVM from '@noir-lang/acvm_js'
import { Noir } from '@noir-lang/noir_js'
import initNoirC from '@noir-lang/noirc_abi'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { poseidon2, poseidon3 } from 'poseidon-lite'
import { fileURLToPath } from 'url'

import circuit from '@/assets/circuits/zkDAO_circuit.json'
import { toFieldElement } from '@/utils/circuit/to-field-element.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface ZKInputs {
	[key: string]: string | string[] | number[]
	_proposalId: string
	_secret: string
	_voter: string
	_weight: string
	_snapshot_merkle_tree: string
	_leaf: string
	_index: string
	_path: string[]
	_pub_key_x: number[]
	_pub_key_y: number[]
	_signature: number[]
	_hashed_message: number[]
}

async function loadCircuit() {
	try {
		return circuit
	} catch (error) {
		console.log('⚠️ Direct import failed, loading from file...')
		try {
			const circuitPath = join(
				__dirname,
				'assets',
				'circuits',
				'zkDAO_circuit.json'
			)
			const circuitData = readFileSync(circuitPath, 'utf8')
			return JSON.parse(circuitData)
		} catch (fileError) {
			console.error('❌ Could not load circuit:', (fileError as Error).message)
			throw fileError
		}
	}
}

export async function generateZKProof(zkData: ZKInputs): Promise<ProofData> {
	console.log('🚀 === GENERATING ZK PROOF WITH REAL DATA ===')

	try {
		// Initialization
		console.log('📦 Initializing...')
		try {
			await initACVM()
			await initNoirC()
			console.log('✅ WASM initialized')
		} catch (wasmError) {
			console.log('⚠️ WASM error, continuing...')
		}

		const circuitData = await loadCircuit()
		const noir = new Noir(circuitData)
		const backend = new UltraHonkBackend(circuitData.bytecode)
		console.log('✅ Circuit loaded')

		console.log('📋 Preparing real data...')
		console.log('  - User address:', zkData._voter)
		console.log('  - User weight:', zkData._weight)
		console.log('  - Proposal ID:', zkData._proposalId)
		console.log('  - Merkle root:', zkData._snapshot_merkle_tree)
		console.log('  - Signature length:', zkData._signature.length)

		// Calculate correct hash with poseidon-lite
		console.log('\n🧮 Calculating hash with poseidon-lite...')

		const secret = BigInt(toFieldElement(zkData._secret))
		const weight = BigInt(zkData._weight)
		const voter = BigInt(toFieldElement(zkData._voter))

		const calculatedNullifier = poseidon2([secret, weight])
		const calculatedLeaf = poseidon3([voter, weight, calculatedNullifier])

		console.log('  ✅ Nullifier calculated:', calculatedNullifier.toString())
		console.log('  ✅ Leaf calculated:', calculatedLeaf.toString())
		console.log('  📋 Expected leaf from DB:', toFieldElement(zkData._leaf))
		console.log(
			'  🔍 Do they match?',
			calculatedLeaf.toString() === toFieldElement(zkData._leaf)
				? '✅ YES'
				: '❌ NO'
		)

		// Prepare final inputs
		console.log('\n📝 Preparing inputs for circuit...')

		const finalInputs: ZKInputs = {
			_proposalId: toFieldElement(zkData._proposalId),
			_secret: secret.toString(),
			_voter: voter.toString(),
			_weight: weight.toString(),
			_snapshot_merkle_tree: toFieldElement(zkData._snapshot_merkle_tree),
			_leaf: calculatedLeaf.toString(),
			_index: zkData._index.toString(),
			_path: zkData._path.map(p => toFieldElement(p)),
			_pub_key_x: zkData._pub_key_x,
			_pub_key_y: zkData._pub_key_y,
			_signature: zkData._signature,
			_hashed_message: zkData._hashed_message
		}

		console.log('📋 Final inputs:')
		console.log('  - _proposalId:', finalInputs._proposalId)
		console.log('  - _secret:', finalInputs._secret)
		console.log('  - _voter:', finalInputs._voter)
		console.log('  - _weight:', finalInputs._weight)
		console.log('  - _leaf:', finalInputs._leaf)
		console.log('  - _snapshot_merkle_tree:', finalInputs._snapshot_merkle_tree)
		console.log('  - _index:', finalInputs._index)

		// Execute circuit
		console.log('\n⚡ Executing ZK circuit...')

		const { witness } = await noir.execute(finalInputs)
		console.log('✅ Witness generated successfully!')

		// Generate ZK proof
		console.log('\n🔐 Generating ZK proof...')
		const proof = await backend.generateProof(witness, { keccak: true })
		console.log('✅ ZK proof generated successfully!')

		// Verify proof
		console.log('\n🔍 Verifying ZK proof...')
		const isValid = await backend.verifyProof(proof, { keccak: true })
		console.log(`✅ Proof is ${isValid ? 'VALID' : 'INVALID'}`)

		if (isValid) {
			const proofBytes =
				'0x' +
				Array.from(Object.values(proof.proof))
					.map(n => n.toString(16).padStart(2, '0'))
					.join('')

			console.log('\n🎉 === TOTAL SUCCESS ===')
			console.log('🚀 ZK proof generated and verified successfully!')
			console.log('📋 Proof bytes length:', proofBytes.length)
			console.log('📋 Public inputs:', proof.publicInputs)
			console.log('📋 Generated nullifier:', proof.publicInputs[0])
			console.log('📋 Proof preview:', proofBytes.substring(0, 100) + '...')

			console.log('\n📝 === FOR HARDHAT INTEGRATION ===')
			console.log('Use exactly these inputs:')
			console.log(JSON.stringify(finalInputs, null, 2))

			console.log('\n📝 === PROOF RESULT ===')
			console.log('Complete result:')
			console.log(JSON.stringify(proof, null, 2))

			return proof
		} else {
			throw new Error('Generated proof is not valid')
		}
	} catch (error) {
		console.error('\n❌ ERROR:')
		console.error('📍 Type:', (error as Error).constructor.name)
		console.error('📍 Message:', (error as Error).message)

		if ((error as Error).message.includes('Mismatch hashes')) {
			console.error('\n🔍 PROBLEM: Hash mismatch')
			console.error('💡 Calculated leaf does not match expected leaf')
		} else if ((error as Error).message.includes('Cannot satisfy constraint')) {
			console.error('\n🔍 PROBLEM: Constraint failed')
			console.error('💡 One of the circuit verifications failed')
		}

		throw error
	}
}
