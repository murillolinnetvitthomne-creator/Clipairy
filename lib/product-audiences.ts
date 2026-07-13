export const PRODUCT_AUDIENCES = {
  human: {
    label: 'Human',
    instruction: 'The product is designed for a human user. Show a human wearing or using it naturally when appropriate.',
  },
  dog: {
    label: 'Dog',
    instruction: 'The product is exclusively for dogs. A dog must be the wearer or end user. Never show a human wearing, trying on, or using the product. A human hand may briefly help put it on the dog, but the dog remains the clear subject.',
  },
  cat: {
    label: 'Cat',
    instruction: 'The product is exclusively for cats. A cat must be the wearer or end user. Never show a human wearing, trying on, or using the product. A human hand may briefly help put it on the cat, but the cat remains the clear subject.',
  },
  other_pet: {
    label: 'Other pet',
    instruction: 'The product is exclusively for the pet species stated in the selling points. That animal must be the wearer or end user. Never show a human wearing, trying on, or using the product. A human hand may briefly assist, but the pet remains the clear subject.',
  },
  product_only: {
    label: 'Product only',
    instruction: 'Use a product-only demonstration. No human or animal may wear or use the product. Focus on the product, packaging, details, and permitted functional demonstrations.',
  },
} as const

export type ProductAudience = keyof typeof PRODUCT_AUDIENCES

export const PRODUCT_AUDIENCE_IDS = Object.keys(PRODUCT_AUDIENCES) as ProductAudience[]

export function getProductAudience(value: unknown) {
  return typeof value === 'string' && value in PRODUCT_AUDIENCES
    ? PRODUCT_AUDIENCES[value as ProductAudience]
    : undefined
}

export function allowsCharacterReference(audience: ProductAudience) {
  return audience === 'human'
}
