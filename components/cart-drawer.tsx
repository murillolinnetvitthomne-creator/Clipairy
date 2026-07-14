'use client'

import Image from 'next/image'
import { Minus, Plus, X } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

export function CartDrawer() {
  const { cart, open, setOpen, update, remove, busy } = useCart()
  if (!open) return null
  const checkout = () => {
    if (!cart) return
    const url = new URL(cart.checkoutUrl)
    url.searchParams.set('channel', 'online_store')
    if (window.self !== window.top) window.open(url.toString(), '_blank', 'noopener,noreferrer')
    else window.location.href = url.toString()
  }
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-foreground/25" role="dialog" aria-modal="true" aria-label="Shopping bag" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <aside className="flex h-full w-full max-w-md flex-col bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-5"><h2 className="font-serif text-3xl">Your bag</h2><button onClick={() => setOpen(false)} aria-label="Close bag" className="rounded-full p-2 hover:bg-secondary"><X className="size-5" /></button></div>
        {!cart?.lines.nodes.length ? <div className="flex flex-1 flex-col items-center justify-center text-center"><p className="font-serif text-2xl">Your bag is waiting.</p><p className="mt-2 text-sm text-muted-foreground">Thoughtful things for very good companions.</p></div> : <div className="flex flex-1 flex-col overflow-hidden"><div className="flex-1 overflow-y-auto py-4">{cart.lines.nodes.map((line) => <div key={line.id} className="flex gap-4 border-b py-4">{line.merchandise.product.featuredImage && <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-secondary"><Image src={line.merchandise.product.featuredImage.url} alt={line.merchandise.product.featuredImage.altText || line.merchandise.product.title} fill className="object-cover" /></div>}<div className="flex flex-1 flex-col"><p className="font-serif text-lg">{line.merchandise.product.title}</p><p className="text-xs text-muted-foreground">{line.merchandise.title}</p><div className="mt-auto flex items-center justify-between"><div className="flex items-center rounded-full border"><button disabled={busy} onClick={() => line.quantity === 1 ? remove(line.id) : update(line.id, line.quantity - 1)} className="p-2" aria-label="Decrease quantity"><Minus className="size-3" /></button><span className="w-6 text-center text-xs">{line.quantity}</span><button disabled={busy} onClick={() => update(line.id, line.quantity + 1)} className="p-2" aria-label="Increase quantity"><Plus className="size-3" /></button></div><span className="text-sm font-semibold">${Number(line.cost.totalAmount.amount).toFixed(2)}</span></div></div></div>)}</div><div className="border-t pt-5"><div className="mb-4 flex justify-between font-semibold"><span>Subtotal</span><span>${Number(cart.cost.totalAmount.amount).toFixed(2)} USD</span></div><button onClick={checkout} disabled={busy} className="w-full rounded-full bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Checkout securely</button><p className="mt-3 text-center text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p></div></div>}
      </aside>
    </div>
  )
}
