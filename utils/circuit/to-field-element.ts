import { BN254_FIELD_MODULUS } from '@/config/constants'

export function toFieldElement(value) {
	if (typeof value === 'string') {
		const bigIntValue = value.startsWith('0x') ? BigInt(value) : BigInt(value)
		return (bigIntValue % BN254_FIELD_MODULUS).toString()
	}
	return value.toString()
}
