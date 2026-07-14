import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ProductCard } from '@/components/product-card'
import { getProducts } from '@/lib/shopify'

export const metadata: Metadata = { title: 'The Collection', description: 'Shop Willow & Paw collars, tags, bandanas and walking accessories.' }

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  const allProducts = await getProducts(50)
  const products = type ? allProducts.filter((product) => product.productType === type) : allProducts
  const categories = ['All', ...new Set(allProducts.map((product) => product.productType))]
  const banner = allProducts[1] || allProducts[0]
  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="grid border-b lg:grid-cols-[.8fr_1.2fr]">
      <div className="flex min-h-[420px] flex-col justify-between p-6 sm:p-10 lg:min-h-[620px] lg:p-14"><p className="eyebrow text-muted-foreground">Collection / {type || 'Best sellers'}</p><div><h1 className="font-serif text-[clamp(4rem,8vw,8rem)] leading-[.82] tracking-[-0.04em]">{type || 'Best sellers'}</h1><p className="mt-8 max-w-sm text-sm leading-7 text-muted-foreground">Elevated essentials for daily companionship, selected for comfort, character, and a beautifully lived-in life.</p></div><span className="eyebrow text-muted-foreground">Willow & Paw · 2026</span></div>
      <div className="relative min-h-[440px] bg-secondary lg:min-h-[620px]">{banner?.featuredImage && <Image src={banner.featuredImage.url} alt={banner.featuredImage.altText || banner.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />}</div>
    </section>
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <nav className="flex gap-7 overflow-x-auto border-b pb-5" aria-label="Product categories">{categories.map((category) => { const active = (!type && category === 'All') || type === category; return <Link key={category} href={category === 'All' ? '/shop' : `/shop?type=${encodeURIComponent(category)}`} className={`shrink-0 pb-2 text-[10px] font-semibold uppercase tracking-[0.17em] ${active ? 'border-b border-foreground' : 'text-muted-foreground'}`}>{category}</Link> })}</nav>
      <div className="flex items-center justify-between py-7"><p className="eyebrow text-muted-foreground">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</p><span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em]">Featured <ChevronDown className="size-3" /></span></div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-12 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-16">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} />)}</div>
      {!products.length && <p className="py-28 text-center font-serif text-3xl text-muted-foreground">No pieces found in this collection.</p>}
    </section>
  </main><SiteFooter /></div>
}
