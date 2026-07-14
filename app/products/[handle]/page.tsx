import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ProductPurchase } from '@/components/product-purchase'
import { ProductCard } from '@/components/product-card'
import { getProduct, getProducts } from '@/lib/shopify'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const product = await getProduct(handle)
  return product ? { title: product.title, description: product.description } : { title: 'Product not found' }
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const [product, allProducts] = await Promise.all([getProduct(handle), getProducts(8)])
  if (!product) notFound()
  const recommendations = allProducts.filter((item) => item.id !== product.id).slice(0, 3)
  return <div className="min-h-screen"><SiteHeader /><main>
    <div className="grid border-b lg:grid-cols-[1.15fr_.85fr]">
      <div className="relative min-h-[60svh] bg-secondary lg:min-h-[calc(100svh-7rem)]">{product.featuredImage ? <Image src={product.featuredImage.url} alt={product.featuredImage.altText || product.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 58vw" /> : <div className="flex size-full items-center justify-center text-muted-foreground">Image processing</div>}<Link href="/shop" className="absolute left-5 top-5 flex items-center gap-2 bg-card/90 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur"><ArrowLeft className="size-3" /> Collection</Link></div>
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:sticky lg:top-24 lg:h-[calc(100svh-6rem)] lg:p-14"><div><div className="flex items-center justify-between"><p className="eyebrow text-muted-foreground">{product.productType}</p><p className="eyebrow text-muted-foreground">Willow & Paw</p></div><h1 className="mt-10 max-w-xl font-serif text-5xl leading-[.95] tracking-tight text-balance sm:text-7xl">{product.title}</h1><p className="mt-7 max-w-lg text-sm leading-7 text-muted-foreground">{product.description}</p><div className="mt-10 border-t pt-8"><ProductPurchase product={product} /></div></div>
        <div className="mt-10 border-t"><details className="group border-b py-5" open><summary className="flex list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.17em]">Materials & care <Plus className="size-4 transition-transform group-open:rotate-45" /></summary><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Wipe clean or hand wash gently in cool water. Allow to air dry naturally. Natural materials develop a unique patina with use.</p></details><details className="group border-b py-5"><summary className="flex list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.17em]">Shipping & returns <Plus className="size-4 transition-transform group-open:rotate-45" /></summary><p className="mt-4 text-sm leading-6 text-muted-foreground">Complimentary US shipping over $75. Unused pieces may be returned within 30 days.</p></details></div>
      </div>
    </div>
    {recommendations.length > 0 && <section className="px-5 py-20 lg:px-10 lg:py-28"><div className="flex items-end justify-between border-b pb-6"><div><p className="eyebrow text-accent">Complete the ritual</p><h2 className="mt-3 font-serif text-5xl">You may also like</h2></div><Link href="/shop" className="text-link hidden sm:inline-flex">View collection</Link></div><div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-12 lg:grid-cols-3 lg:gap-x-5">{recommendations.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
  </main><SiteFooter /></div>
}
