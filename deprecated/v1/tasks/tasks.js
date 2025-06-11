const { task, subtask, types } = require('hardhat/config')

/// PRODUCTION - npx hardhat storeTokens
const whiteList = [
	// {
	//     label: "CUSD",
	//     contract: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
	//     oracle: "0xe38A27BE4E7d866327e09736F3C570F256FFd048",
	//     oracleDecimals: 10,
	//     active: true,
	//     isNative: false
	// },
	{
		label: 'CELO',
		contract: '0x000000000000000000000000000000000000dEaD',
		oracle: '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e',
		oracleDecimals: 10,
		active: true,
		isNative: true
	}
]

const collections = [
	{
		addr: '0x96dF95230D5F6dA24f21ec3A3033A1573Fefd472',
		price: 1,
		active: true
	},
	{
		addr: '0xA439D377cFfF73bb68AcA588D990c07143D8546E',
		price: 1,
		active: true
	}
]

/**
 * Dirección del contrato con el cual interactuar
 */
const SMART_CONTRACT = '0x81a644a8250671A35047911564325D117d583aB4'

/// npx hardhat whiteList
task('whiteList', 'show WhiteList').setAction(
	async (taskArguments, hre, runSuper) => {
		const contractInstance = await hre.ethers.getContractAt(
			'VendorV2',
			SMART_CONTRACT
		)
		const tx = await contractInstance.tokensList()
		console.log({ tx })
		return
	}
)

/// npx hardhat addAdmin  --addr 0x2Ff876F9E71924564Af7C51739E2E9A17aAa7aC0
task('addAdmin', 'Adds a Admin')
	.addParam('addr', 'The address of the user', undefined, types.string)
	.setAction(async (taskArguments, hre, runSuper) => {
		const { addr = '0x2Ff876F9E71924564Af7C51739E2E9A17aAa7aC0' } =
			taskArguments
		const contractInstance = await hre.ethers.getContractAt(
			'VendorV2',
			SMART_CONTRACT
		)
		const tx = await contractInstance.addAdmin(addr)
		const hash = await tx.wait()
		console.log('Tx hash', hash.transactionHash)
		console.log('Wallet added', addr)
		return
	})

/**
 * TODO 1; Add a task to add a user
 * /// npx hardhat addUser  --addr 0x2Ff876F9E71924564Af7C51739E2E9A17aAa7aC0
 */

task('addUser', 'Adds a user')
	.addParam('addr', 'The address of the user', undefined, types.string)
	.setAction(async (taskArguments, hre, runSuper) => {
		const { addr = '0x2Ff876F9E71924564Af7C51739E2E9A17aAa7aC0' } =
			taskArguments
		const contractInstance = await hre.ethers.getContractAt(
			'VendorV2',
			SMART_CONTRACT
		)
		const tx = await contractInstance.addUser(addr)
		const hash = await tx.wait()
		console.log('Tx hash', hash.transactionHash)
		console.log('Wallet added', addr)
		return
	})

/**
* TODO 2: Add a task to add a collection
/// npx hardhat storeTokens 
*/

task('storeTokens', 'Stores the whitelist in the contract').setAction(
	async (taskArguments, hre, runSuper) => {
		for (const token of whiteList) {
			await hre.run('storeWL', {
				contract: SMART_CONTRACT,
				erc20: token.contract,
				oracle: token.oracle,
				oracleDecimals: token.oracleDecimals,
				active: token.active,
				isNative: token.isNative
			})
		}

		// const toAwait = whiteList.map((token) => );
		// await Promise.all(toAwait);

		console.log('All tokens added')
		return
	}
)

subtask('storeWL', 'Stores the whitelist in the contract')
	.addParam('contract', 'The address of the contract', undefined, types.string)
	.addParam(
		'erc20',
		'The address of the erc20 contract',
		undefined,
		types.string
	)
	.addParam(
		'oracle',
		'The address of the oracle contract',
		undefined,
		types.string
	)
	.addParam(
		'oracleDecimals',
		'The decimals of the oracle contract',
		10,
		types.int
	)
	.addParam('active', 'The active status of the token', true, types.boolean)
	.addParam('isNative', 'The native status of the token', false, types.boolean)
	.setAction(async (taskArguments, hre, runSuper) => {
		const { contract, erc20, oracle, oracleDecimals, active, isNative } =
			taskArguments

		console.log({ contract, erc20, oracle, oracleDecimals, active, isNative })

		const contractInstance = await hre.ethers.getContractAt(
			'VendorV2',
			contract
		)
		const [deployer] = await hre.ethers.getSigners()
		const feeTx = await deployer.getGasPrice()
		console.log('feeTx', feeTx.toHexString())

		const tx = await contractInstance.addToken(
			erc20,
			oracle,
			oracleDecimals,
			active,
			isNative
		)

		console.log({ erc20, tx })

		const hash = await tx.wait()
		console.log('Tx hash', hash.transactionHash)
		console.log('Token added', erc20)
		return
	})

/// npx hardhat collectionList
task('collectionList', 'show Collection List').setAction(
	async (taskArguments, hre, runSuper) => {
		const contractInstance = await hre.ethers.getContractAt(
			'VendorV2',
			SMART_CONTRACT
		)
		const tx = await contractInstance.collectionList()
		console.log({ tx })
		return
	}
)

/**
 * TODO 3: Add a task to add a collection
 * /// npx hardhat storeCollections
 */
task('storeCollections', 'Stores the collections in the contract').setAction(
	async (taskArguments, hre, runSuper) => {
		for (const collection of collections) {
			await hre.run('storeClltn', {
				contract: SMART_CONTRACT,
				addr: collection.addr,
				price: hre.ethers.utils
					.parseUnits(collection.price.toString(), 'ether')
					.toString(),
				active: collection.active
			})
		}

		console.log('All collections added')
		return
	}
)

/// npx hardhat storeClltn
subtask('storeClltn', 'Stores the collections in the contract')
	.addParam('contract', 'The address of the contract', undefined, types.string)
	.addParam('addr', 'The address of the collection', undefined, types.string)
	.addParam(
		'price',
		'The price of the collection',
		'1000000000000000000',
		types.string
	)
	.addParam(
		'active',
		'The active status of the collection',
		true,
		types.boolean
	)
	.setAction(async (taskArguments, hre, runSuper) => {
		const { contract, addr, price, active } = taskArguments

		console.log({
			contract,
			addr,
			price,
			active
		})

		const contractInstance = await hre.ethers.getContractAt(
			'VendorV2',
			contract
		)
		const [deployer] = await hre.ethers.getSigners()
		const feeTx = await deployer.getGasPrice()
		console.log('feeTx', feeTx.toString())

		const tx = await contractInstance.addCollection(addr, price, active, {
			gasPrice: feeTx.toString()
		})

		const hash = await tx.wait()
		console.log('Tx hash', hash.transactionHash)
		console.log('Collection added', addr)
		return
	})
