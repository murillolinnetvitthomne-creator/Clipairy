import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
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
  return <div className="min-h-screen"><SiteHeader /><main><div className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="size-4" /> Back to shop</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div className="relative aspect-square overflow-hidden rounded-3xl bg-secondary">{product.featuredImage ? <Image src={product.featuredImage.url} alt={product.featuredImage.altText || product.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 58vw" /> : <div className="flex size-full items-center justify-center text-muted-foreground">Image processing</div>}</div><div className="flex flex-col justify-center lg:py-12"><p className="text-xs font-semibold uppercase tracking-[.2em] text-accent">{product.productType}</p><h1 className="mt-4 font-serif text-5xl leading-none sm:text-6xl">{product.title}</h1><p className="mt-6 text-base leading-relaxed text-muted-foreground">{product.description}</p><div className="mt-8 border-t pt-8"><ProductPurchase product={product} /></div><details className="mt-8 border-t py-5"><summary className="cursor-pointer text-sm font-semibold">Materials & care</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Wipe clean or hand wash gently in cool water. Allow to air dry naturally. Natural materials develop a unique patina with use.</p></details></div></div></div>{recommendations.length > 0 && <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><h2 className="font-serif text-4xl">You may also like</h2><div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{recommendations.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}</main><SiteFooter /></div>
}
