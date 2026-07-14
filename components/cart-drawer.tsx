'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Minus, Plus, X } from 'lucide-react'
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
  return <div className="fixed inset-0 z-[80] flex justify-end bg-foreground/40" role="dialog" aria-modal="true" aria-label="Shopping bag" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
    <aside className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b px-6 py-6 sm:px-8"><div><p className="eyebrow text-muted-foreground">Your selection</p><h2 className="mt-1 font-serif text-3xl">Shopping bag</h2></div><button onClick={() => setOpen(false)} aria-label="Close bag" className="border p-3 transition-colors hover:bg-secondary"><X className="size-4" /></button></div>
      {!cart?.lines.nodes.length ? <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><span className="font-serif text-7xl italic text-accent">0</span><p className="mt-5 font-serif text-3xl">Your bag is quiet.</p><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Discover considered pieces for the everyday rituals you share.</p><Link href="/shop" onClick={() => setOpen(false)} className="mt-8 inline-flex items-center gap-3 bg-primary px-7 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">Explore the collection <ArrowRight className="size-4" /></Link></div> : <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 sm:px-8">{cart.lines.nodes.map((line) => <div key={line.id} className="grid grid-cols-[110px_1fr] gap-5 border-b py-6"><div className="relative aspect-[4/5] bg-secondary">{line.merchandise.product.featuredImage && <Image src={line.merchandise.product.featuredImage.url} alt={line.merchandise.product.featuredImage.altText || line.merchandise.product.title} fill className="object-cover" />}</div><div className="flex min-w-0 flex-col"><p className="eyebrow text-muted-foreground">{line.merchandise.title}</p><p className="mt-2 font-serif text-xl">{line.merchandise.product.title}</p><button onClick={() => remove(line.id)} disabled={busy} className="mt-2 w-fit text-[9px] uppercase tracking-[0.14em] text-muted-foreground underline">Remove</button><div className="mt-auto flex items-center justify-between"><div className="flex items-center border"><button disabled={busy} onClick={() => line.quantity === 1 ? remove(line.id) : update(line.id, line.quantity - 1)} className="p-2.5" aria-label="Decrease quantity"><Minus className="size-3" /></button><span className="w-5 text-center text-[10px]">{line.quantity}</span><button disabled={busy} onClick={() => update(line.id, line.quantity + 1)} className="p-2.5" aria-label="Increase quantity"><Plus className="size-3" /></button></div><span className="text-xs font-semibold">${Number(line.cost.totalAmount.amount).toFixed(2)}</span></div></div></div>)}</div>
        <div className="border-t bg-card px-6 py-6 sm:px-8"><div className="flex items-baseline justify-between"><div><p className="eyebrow text-muted-foreground">Subtotal</p><p className="mt-1 text-xs text-muted-foreground">Shipping calculated at checkout</p></div><span className="font-serif text-2xl">${Number(cart.cost.totalAmount.amount).toFixed(2)}</span></div><button onClick={checkout} disabled={busy} className="mt-6 flex w-full items-center justify-between bg-primary px-6 py-5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-50"><span>Secure checkout</span><ArrowRight className="size-4" /></button></div>
      </div>}
    </aside>
  </div>
}
