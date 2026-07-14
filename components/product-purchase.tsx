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
  return <div>
    <div className="flex items-center justify-between"><p className="text-sm font-semibold">{selected ? formatMoney(selected.price) : formatMoney(product.priceRange.minVariantPrice)}</p><p className="eyebrow text-muted-foreground">Taxes calculated at checkout</p></div>
    {product.variants.nodes.length > 1 && <fieldset className="mt-8"><legend className="eyebrow">Select option</legend><div className="mt-4 grid grid-cols-3 gap-2">{product.variants.nodes.map((variant) => <button type="button" key={variant.id} onClick={() => setVariantId(variant.id)} disabled={!variant.availableForSale} className={`border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${variant.id === variantId ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'} disabled:opacity-35`}>{variant.title}</button>)}</div></fieldset>}
    <div className="mt-8 flex gap-2"><div className="flex items-center border bg-card"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-4" aria-label="Decrease quantity"><Minus className="size-3" /></button><span className="w-6 text-center text-xs">{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(20, quantity + 1))} className="p-4" aria-label="Increase quantity"><Plus className="size-3" /></button></div><button type="button" onClick={() => variantId && add(variantId, quantity)} disabled={!variantId || busy || !selected?.availableForSale} className="flex-1 bg-primary px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-45">{busy ? 'Adding…' : selected?.availableForSale ? 'Add to bag' : 'Sold out'}</button></div>
    <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{['Free US shipping over $75','30-day returns'].map((item) => <li key={item} className="flex items-center gap-2"><Check className="size-3 text-accent" />{item}</li>)}</ul>
  </div>
}
