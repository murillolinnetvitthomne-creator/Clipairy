export type Money = { amount: string; currencyCode: string }
export type ShopifyImage = { url: string; altText: string | null; width: number; height: number }
export type Product = {
  id: string
  handle: string
  title: string
  description: string
  productType: string
  featuredImage: ShopifyImage | null
  priceRange: { minVariantPrice: Money }
  variants: { nodes: Array<{ id: string; title: string; availableForSale: boolean; price: Money }> }
}

export function formatMoney(money: Money) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currencyCode }).format(Number(money.amount))
}
