import { NextResponse } from 'next/server'
import { z } from 'zod'
import { shopifyFetch } from '@/lib/shopify'

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), merchandiseId: z.string(), quantity: z.number().int().min(1).max(20) }),
  z.object({ action: z.literal('get'), cartId: z.string() }),
  z.object({ action: z.literal('add'), cartId: z.string(), merchandiseId: z.string(), quantity: z.number().int().min(1).max(20) }),
  z.object({ action: z.literal('update'), cartId: z.string(), lineId: z.string(), quantity: z.number().int().min(0).max(20) }),
  z.object({ action: z.literal('remove'), cartId: z.string(), lineId: z.string() }),
])

const cartFields = `id checkoutUrl totalQuantity cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } } lines(first: 50) { nodes { id quantity cost { totalAmount { amount currencyCode } } merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title handle featuredImage { url altText width height } } } } } }`

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid cart request.' }, { status: 400 })
  const input = parsed.data

  try {
    if (input.action === 'create') {
      const data = await shopifyFetch<{ cartCreate: { cart: unknown; userErrors: unknown[] } }>(`mutation CartCreate($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { ${cartFields} } userErrors { field message } } }`, { lines: [{ merchandiseId: input.merchandiseId, quantity: input.quantity }] }, 'no-store')
      return NextResponse.json(data.cartCreate)
    }
    if (input.action === 'get') {
      const data = await shopifyFetch<{ cart: unknown }>(`query Cart($id: ID!) { cart(id: $id) { ${cartFields} } }`, { id: input.cartId }, 'no-store')
      return NextResponse.json({ cart: data.cart, userErrors: [] })
    }
    if (input.action === 'add') {
      const data = await shopifyFetch<{ cartLinesAdd: { cart: unknown; userErrors: unknown[] } }>(`mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${cartFields} } userErrors { field message } } }`, { cartId: input.cartId, lines: [{ merchandiseId: input.merchandiseId, quantity: input.quantity }] }, 'no-store')
      return NextResponse.json(data.cartLinesAdd)
    }
    if (input.action === 'update') {
      const data = await shopifyFetch<{ cartLinesUpdate: { cart: unknown; userErrors: unknown[] } }>(`mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${cartFields} } userErrors { field message } } }`, { cartId: input.cartId, lines: [{ id: input.lineId, quantity: input.quantity }] }, 'no-store')
      return NextResponse.json(data.cartLinesUpdate)
    }
    const data = await shopifyFetch<{ cartLinesRemove: { cart: unknown; userErrors: unknown[] } }>(`mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${cartFields} } userErrors { field message } } }`, { cartId: input.cartId, lineIds: [input.lineId] }, 'no-store')
    return NextResponse.json(data.cartLinesRemove)
  } catch {
    return NextResponse.json({ error: 'We could not update your bag. Please try again.' }, { status: 502 })
  }
}
