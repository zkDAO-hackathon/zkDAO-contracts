import axios, { AxiosError } from 'axios'

interface MerkleProof {
	secret: string
	weight: number
	snapshotMerkleTree: string
	leaf: string
	index: number
	nullifier: string
	path: string[]
}

export class MerkleProofAPIClient {
	private baseUrl: string

	constructor(baseUrl: string = 'http://localhost:3000') {
		this.baseUrl = baseUrl
	}

	async getMerkleProof(
		dao: string,
		proposalId: string,
		address: string
	): Promise<MerkleProof> {
		const url = `http://localhost:3000/merkle-tree/getMerkleProof/${dao}/proposals/${proposalId}/${address}`
		console.log(`🌐 Fetching Merkle proof from: ${url}`)

		try {
			const response = await axios.get<MerkleProof>(url)

			const data = response.data

			return data
		} catch (error) {
			console.error('❌ Failed to fetch Merkle proof:', error)

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
export const merkleApiClient = new MerkleProofAPIClient()
