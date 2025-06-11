const { ethers } = require('ethers')
const dotenv = require('dotenv')
const CONTRACT_WHITELIST = require('../artifacts/contracts/factories/WhiteListTokenV2.sol/WhiteListTokenV2.json')
const CONTRACT_VENDOR = require('../artifacts/contracts/VendorV2.sol/VendorV2.json')
const CONTRACT_PARTNERS = require('../artifacts/contracts/patners/Group.sol/Group.json')

dotenv.config()

const CONTRACT_ADDRESS = '0x92A27811F43136E8cA396F057849f92c3d2eFcc0'

async function getProvider() {
	const provider = new ethers.providers.JsonRpcProvider(
		process.env.CELO_TEST_URL
	)
	return provider
}

async function getSigner(provider) {
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
	return wallet
}

// Get token list
async function getTokenList() {
	const provider = await getProvider()
	const signer = await getSigner(provider)

	const contractABI = CONTRACT_WHITELIST.abi
	const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

	try {
		const tokens = await contract.tokensList()
		console.log('\n=== Registered Tokens ===')

		tokens.forEach((token, index) => {
			console.log(`\nToken #${index + 1}:`)
			console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
			console.log(`Token Address: ${token.addr}`)
			console.log(`Oracle Address: ${token.oracle}`)
			console.log(`Oracle Decimals: ${token.orcDecimals.toString()}`)
			console.log(`Status: ${token.active ? 'Active' : 'Inactive'}`)
			console.log(`Type: ${token.isNative ? 'Native Token' : 'ERC20 Token'}`)
		})

		if (tokens.length === 0) {
			console.log('\nNo tokens registered yet.')
		}
		return tokens
	} catch (error) {
		console.error('Error fetching token list:', error)
		return []
	}
}

async function addNewToken(
	tokenAddress,
	oracleAddress,
	oracleDecimals,
	isActive,
	isNative
) {
	try {
		const provider = await getProvider()
		const signer = await getSigner(provider)

		const contractABI = CONTRACT_WHITELIST.abi
		const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

		const tx = await contract.addToken(
			tokenAddress,
			oracleAddress,
			oracleDecimals,
			isActive,
			isNative
		)

		console.log('Adding new token...')
		await tx.wait()
		console.log('Token added successfully!')
	} catch (error) {
		console.error('Error adding new token:', error)
	}
}

async function getCollectionList() {
	const provider = await getProvider()
	const signer = await getSigner(provider)

	const contractABI = CONTRACT_VENDOR.abi
	const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

	try {
		const collections = await contract.collectionList()
		console.log('\n=== Registered Collections ===')

		collections.forEach((collection, index) => {
			console.log(`\nCollection #${index + 1}:`)
			console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
			console.log(`Collection Address: ${collection.addr}`)
			console.log(`Price: ${collection.price.toString()}`)
			console.log(`Status: ${collection.active ? 'Active' : 'Inactive'}`)
		})

		if (collections.length === 0) {
			console.log('\nNo collections registered yet.')
		}

		console.log('\n=== End of Collection List ===\n')

		return collections
	} catch (error) {
		console.error('Error fetching collection list:', error)
		return []
	}
}

async function getAllGroups() {
	const provider = await getProvider()
	const signer = await getSigner(provider)

	const contractABI = CONTRACT_PARTNERS.abi
	const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

	try {
		// Get total number of groups
		const totalGroups = await contract._totalGroup()
		console.log('\n=== Registered Groups ===')

		if (totalGroups.toNumber() === 0) {
			console.log('\nNo groups registered yet.')
			return []
		}

		// Fetch all groups
		for (let i = 0; i < totalGroups; i++) {
			// Get group code from list
			const groupCode = await contract.groupList(i)
			// Get group details
			const group = await contract.getGroup(groupCode)

			console.log(`\nGroup #${i + 1}:`)
			console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
			console.log(`Group Name: ${group.group}`)
			console.log(`Status: ${group.state ? 'Active' : 'Inactive'}`)

			console.log('\nShared Members:')
			group.arrayShared.forEach((member, index) => {
				console.log(`Member #${index + 1}:`)
				console.log(`Address: ${member.addr}`)
				console.log(`Percentage: ${member.pcng.toString()}%`)
			})
		}

		console.log('\n=== End of Groups List ===\n')
	} catch (error) {
		console.error('Error fetching groups:', error)
		return []
	}
}

async function buyNativeToken(
	groupName,
	collectionIndex,
	tokenAddress,
	amount
) {
	try {
		const provider = await getProvider()
		const signer = await getSigner(provider)

		const contractABI = CONTRACT_VENDOR.abi
		const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

		console.log('\n=== Buying Native Token ===')
		console.log(`Group: ${groupName}`)
		console.log(`Collection Index: ${collectionIndex}`)
		console.log(`Token Address: ${tokenAddress}`)
		console.log(`Amount: ${amount}`)

		const tx = await contract.buyNative(
			groupName,
			collectionIndex,
			tokenAddress,
			amount,
			{ value: ethers.utils.parseEther('0.1') } // Sending some ETH value for the native transaction
		)

		console.log('Transaction submitted...')
		await tx.wait()
		console.log('Purchase successful!')
	} catch (error) {
		console.error('Error buying native token:', error)
	}
}

async function main() {
	// Get all groups first
	await getAllGroups()

	// Then get token and collection lists
	await getTokenList()
	await getCollectionList()

	// Add buyNative call
	await buyNativeToken(
		'alpha', // group name
		0, // collection index
		'0x471EcE3750Da237f93B8E339c536989b8978a438', // token address
		100 // amount
	)
}

main().catch(error => {
	console.error('Error in main:', error)
})
