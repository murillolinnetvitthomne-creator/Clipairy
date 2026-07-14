'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

const links = [
  { label: 'New arrivals', href: '/shop' },
  { label: 'Collars', href: '/shop?type=Collars' },
  { label: 'Walk', href: '/shop?type=Leashes' },
  { label: 'Accessories', href: '/shop?type=ID%20Tags' },
  { label: 'Journal', href: '/#story' },
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { cart, setOpen } = useCart()

  return <>
    <div className="border-b border-primary-foreground/15 bg-primary px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.25em] text-primary-foreground">Complimentary US delivery on orders over $75</div>
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md">
      <div className="grid h-20 grid-cols-3 items-center px-5 lg:h-24 lg:px-10">
        <div className="flex items-center gap-7">
          <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">{links.slice(0, 3).map((link) => <Link key={link.label} href={link.href} className="text-[10px] font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-50">{link.label}</Link>)}</nav>
        </div>
        <Link href="/" className="justify-self-center font-serif text-2xl tracking-[0.08em] sm:text-3xl">WILLOW & PAW</Link>
        <div className="flex items-center justify-end gap-5">
          <Link href="/shop" className="hidden lg:block" aria-label="Search products"><Search className="size-[18px]" /></Link>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2" aria-label={`Open bag with ${cart?.totalQuantity || 0} items`}><ShoppingBag className="size-[18px]" /><span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Bag ({cart?.totalQuantity || 0})</span></button>
        </div>
      </div>
    </header>
    {menuOpen && <div className="fixed inset-0 z-[70] flex flex-col bg-background p-6 lg:hidden">
      <div className="flex items-center justify-between border-b pb-6"><span className="font-serif text-2xl tracking-[0.06em]">WILLOW & PAW</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X className="size-6" /></button></div>
      <nav className="flex flex-1 flex-col justify-center gap-5" aria-label="Mobile navigation">{links.map((link, index) => <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="flex items-baseline gap-4 border-b pb-4 font-serif text-4xl"><span className="font-sans text-[9px] text-muted-foreground">0{index + 1}</span>{link.label}</Link>)}</nav>
      <p className="eyebrow text-muted-foreground">Designed for a life well walked</p>
    </div>}
  </>
}
