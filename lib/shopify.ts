import 'server-only'
import type { Product } from '@/lib/shopify-types'

const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2025-10/graphql.json`

type ShopifyResponse<T> = { data?: T; errors?: Array<{ message: string }> }

export async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}, cache: RequestCache = 'force-cache') {
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  if (!token || !process.env.SHOPIFY_STORE_DOMAIN) throw new Error('Shopify storefront credentials are not configured.')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    cache,
    next: cache === 'force-cache' ? { revalidate: 300 } : undefined,
  })
  const result = (await response.json()) as ShopifyResponse<T>
  if (!response.ok || result.errors) throw new Error(result.errors?.map((error) => error.message).join(', ') || 'Shopify request failed')
  return result.data as T
}

const productFields = `
  id handle title description productType
  featuredImage { url altText width height }
  priceRange { minVariantPrice { amount currencyCode } }
  variants(first: 20) { nodes { id title availableForSale price { amount currencyCode } } }
`

export async function getProducts(first = 20) {
  const data = await shopifyFetch<{ products: { nodes: Product[] } }>(`query Products($first: Int!) { products(first: $first, query: "tag:pet-boutique", sortKey: CREATED_AT, reverse: true) { nodes { ${productFields} } } }`, { first })
  return data.products.nodes
}

export async function getProduct(handle: string) {
  const data = await shopifyFetch<{ product: Product | null }>(`query Product($handle: String!) { product(handle: $handle) { ${productFields} } }`, { handle })
  return data.product
}

export type { Product } from '@/lib/shopify-types'
