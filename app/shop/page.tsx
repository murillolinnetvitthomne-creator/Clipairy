import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ProductCard } from '@/components/product-card'
import { getProducts } from '@/lib/shopify'

export const metadata: Metadata = { title: 'Shop All', description: 'Shop natural collars, tags, bandanas and walking accessories for dogs and cats.' }

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  const allProducts = await getProducts(50)
  const products = type ? allProducts.filter((product) => product.productType === type) : allProducts
  const categories = ['All', ...new Set(allProducts.map((product) => product.productType))]
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-5 py-14 lg:px-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-accent">Willow & Paw collection</p><div className="mt-4 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><h1 className="font-serif text-5xl sm:text-6xl">{type || 'Shop all'}</h1><p className="max-w-md text-sm leading-relaxed text-muted-foreground">Quietly refined essentials, thoughtfully selected for comfortable days together.</p></div><nav className="mt-10 flex flex-wrap gap-2" aria-label="Product categories">{categories.map((category) => <Link key={category} href={category === 'All' ? '/shop' : `/shop?type=${encodeURIComponent(category)}`} className={`rounded-full border px-5 py-2 text-sm ${(!type && category === 'All') || type === category ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{category}</Link>)}</nav><div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} />)}</div>{!products.length && <p className="py-24 text-center text-muted-foreground">No pieces found in this collection yet.</p>}</main><SiteFooter /></div>
}
