import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function SiteFooter() {
  return <footer className="border-t bg-primary text-primary-foreground">
    <div className="grid gap-14 px-5 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_.6fr_.6fr] lg:px-10 lg:py-24">
      <div><p className="eyebrow opacity-60">The Willow Letter</p><h2 className="mt-5 max-w-xl font-serif text-4xl leading-tight text-balance sm:text-5xl">Notes on good design, slow walks, and life together.</h2><form className="mt-10 flex max-w-lg border-b border-primary-foreground/45" action="#"><label htmlFor="footer-email" className="sr-only">Email address</label><input id="footer-email" type="email" placeholder="EMAIL ADDRESS" className="min-w-0 flex-1 bg-transparent py-4 text-xs tracking-[0.16em] placeholder:text-primary-foreground/55 focus:outline-none" /><button type="submit" aria-label="Join newsletter" className="px-2"><ArrowRight className="size-5" /></button></form></div>
      <div><p className="eyebrow opacity-50">Shop</p><div className="mt-6 flex flex-col gap-4 text-sm"><Link href="/shop">All pieces</Link><Link href="/shop?type=Collars">Collars</Link><Link href="/shop?type=Leashes">Walk</Link><Link href="/shop?type=Bandanas">Bandanas</Link></div></div>
      <div><p className="eyebrow opacity-50">Information</p><div className="mt-6 flex flex-col gap-4 text-sm"><a href="mailto:hello@willowandpaw.co">Contact</a><span>Shipping & returns</span><span>Size guide</span><Link href="/#story">Our story</Link></div></div>
    </div>
    <div className="border-t border-primary-foreground/20 px-5 py-10 lg:px-10"><p className="font-serif text-[clamp(3.3rem,10vw,10rem)] leading-[.7] tracking-[-0.04em] text-primary-foreground/95">WILLOW & PAW</p><div className="mt-12 flex flex-col justify-between gap-4 text-[9px] uppercase tracking-[0.16em] opacity-55 sm:flex-row"><span>© 2026 Willow & Paw</span><span>New York · Made for companions</span><span>Privacy · Terms</span></div></div>
  </footer>
}
