'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { cart, setOpen } = useCart()
  const links = [{ label: 'Shop all', href: '/shop' }, { label: 'Collars', href: '/shop?type=Collars' }, { label: 'Walk', href: '/shop?type=Leashes' }, { label: 'Our story', href: '/#story' }]
  return <><div className="bg-primary px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">Complimentary US shipping on orders over $75</div><header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8"><button className="md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button><Link href="/" className="font-serif text-2xl tracking-tight">Willow & Paw</Link><nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">{links.map((link) => <Link key={link.label} href={link.href} className="text-sm transition-opacity hover:opacity-60">{link.label}</Link>)}</nav><button onClick={() => setOpen(true)} className="relative flex items-center gap-2 text-sm" aria-label={`Open bag with ${cart?.totalQuantity || 0} items`}><ShoppingBag className="size-5" /><span className="hidden sm:inline">Bag</span><span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{cart?.totalQuantity || 0}</span></button></div></header>{menuOpen && <div className="fixed inset-0 z-[70] bg-background p-6 md:hidden"><div className="flex justify-between"><span className="font-serif text-2xl">Willow & Paw</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div><nav className="mt-16 flex flex-col gap-6">{links.map((link) => <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="font-serif text-4xl">{link.label}</Link>)}</nav></div>}</>
}
