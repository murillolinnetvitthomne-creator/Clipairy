'use client'

import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { formatMoney, type Product } from '@/lib/shopify-types'

export function ProductPurchase({ product }: { product: Product }) {
  const available = product.variants.nodes.filter((variant) => variant.availableForSale)
  const [variantId, setVariantId] = useState(available[0]?.id || product.variants.nodes[0]?.id)
  const [quantity, setQuantity] = useState(1)
  const { add, busy } = useCart()
  const selected = product.variants.nodes.find((variant) => variant.id === variantId)
  return <div><p className="text-xl font-semibold">{selected ? formatMoney(selected.price) : formatMoney(product.priceRange.minVariantPrice)}</p>{product.variants.nodes.length > 1 && <fieldset className="mt-8"><legend className="text-sm font-semibold">Choose an option</legend><div className="mt-3 flex flex-wrap gap-2">{product.variants.nodes.map((variant) => <button key={variant.id} onClick={() => setVariantId(variant.id)} disabled={!variant.availableForSale} className={`rounded-full border px-5 py-2 text-sm ${variant.id === variantId ? 'bg-primary text-primary-foreground' : 'bg-card'} disabled:opacity-40`}>{variant.title}</button>)}</div></fieldset>}<div className="mt-8 flex gap-3"><div className="flex items-center rounded-full border bg-card"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-4" aria-label="Decrease quantity"><Minus className="size-4" /></button><span className="w-8 text-center text-sm">{quantity}</span><button onClick={() => setQuantity(Math.min(20, quantity + 1))} className="p-4" aria-label="Increase quantity"><Plus className="size-4" /></button></div><button onClick={() => variantId && add(variantId, quantity)} disabled={!variantId || busy || !selected?.availableForSale} className="flex-1 rounded-full bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Adding…' : selected?.availableForSale ? 'Add to bag' : 'Sold out'}</button></div><ul className="mt-8 grid gap-3 text-sm text-muted-foreground">{['Free US shipping over $75','30-day easy returns','Secure checkout powered by Shopify'].map((item) => <li key={item} className="flex items-center gap-3"><Check className="size-4 text-accent" />{item}</li>)}</ul></div>
}
