import Inhabit from '@/artifacts/contracts/core/Inhabit.sol/Inhabit.json'
import MockErc20 from '@/artifacts/contracts/core/mocks/MockErc20.sol/MockErc20.json'
import NFTCollection from '@/artifacts/contracts/strategies/NFTCollection/NFTCollection.sol/NFTCollection.json'

export const ABIS = {
	Inhabit: Inhabit.abi,
	MockErc20: MockErc20.abi,
	NFTCollection: NFTCollection.abi
}
