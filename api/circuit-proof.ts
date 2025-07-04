import axios, { AxiosError } from 'axios'

export interface ProofData {
	publicInputs: string[]
	proof: Uint8Array
}

export interface GenerateZkProofParams {
	[key: string]: string | string[] | number | number[]
	_proposalId: string
	_secret: string
	_voter: string
	_weight: string
	_choice: number
	_snapshot_merkle_tree: string
	_leaf: string
	_index: string
	_path: string[]
	_pub_key_x: number[]
	_pub_key_y: number[]
	_signature: number[]
	_hashed_message: number[]
}

export class CircuitAPIClient {
	private baseUrl: string

	constructor(baseUrl: string = 'http://localhost:4000') {
		this.baseUrl = baseUrl
	}

	async generateZKProof(zkProofParams: GenerateZkProofParams): Promise<{
		proofBytes: string
		publicInputs: string[]
		proof: Uint8Array<ArrayBufferLike>
	}> {
		const url = `http://localhost:4000/generate-zk-proof`
		console.log(`🌐 Generating ZK proof at: ${url}`)

		try {
			const response = await axios.post<{
				proofBytes: string
				publicInputs: string[]
				proof: Uint8Array<ArrayBufferLike>
			}>(url, zkProofParams)

			const data = response.data

			return data
		} catch (error) {
			console.error('❌ Failed to fetch ZK proof:', error)

			if (axios.isAxiosError(error)) {
				const axiosError = error as AxiosError
				if (axiosError.response) {
					throw new Error(
						`HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`
					)
				} else if (axiosError.request) {
					throw new Error('No response received from server')
				} else {
					throw new Error(`Request setup error: ${axiosError.message}`)
				}
			}

			throw new Error(
				`Failed to fetch Merkle proof: ${(error as Error).message}`
			)
		}
	}
}

// Default export for easy importing
export const merkleApiClient = new CircuitAPIClient()
