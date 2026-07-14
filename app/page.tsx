import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ProductCard } from '@/components/product-card'
import { getProducts } from '@/lib/shopify'

export default async function HomePage() {
  const products = await getProducts(8)
  const hero = products[0]
  const story = products[2] || products[1] || hero

  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="relative min-h-[calc(100svh-7rem)] overflow-hidden bg-secondary">
      {hero?.featuredImage && <Image src={hero.featuredImage.url} alt={hero.featuredImage.altText || hero.title} fill priority className="object-cover" sizes="100vw" />}
      <div className="absolute inset-0 bg-foreground/25" />
      <div className="relative flex min-h-[calc(100svh-7rem)] flex-col justify-between px-5 py-8 text-primary-foreground lg:px-10 lg:py-12">
        <p className="eyebrow">Willow & Paw · New York</p>
        <div className="max-w-4xl"><p className="eyebrow mb-5">The everyday collection</p><h1 className="font-serif text-[clamp(3.75rem,8vw,8.5rem)] leading-[.82] tracking-[-0.04em] text-balance">Quiet luxury,<br />made to wander.</h1><div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center"><Link href="/shop" className="inline-flex items-center gap-3 bg-primary-foreground px-7 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">Explore the collection <ArrowRight className="size-4" /></Link><p className="max-w-xs text-sm leading-relaxed text-primary-foreground/80">Considered objects for dogs, cats, and the people who never leave them behind.</p></div></div>
      </div>
    </section>

    <section className="px-5 py-20 lg:px-10 lg:py-28">
      <div className="flex items-end justify-between border-b pb-6"><div><p className="eyebrow text-accent">The edit</p><h2 className="mt-3 font-serif text-5xl tracking-tight sm:text-6xl">Best sellers</h2></div><Link href="/shop" className="text-link hidden sm:inline-flex">View all <ArrowRight className="size-3" /></Link></div>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5">{products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div>
      <Link href="/shop" className="text-link mt-10 sm:hidden">View all <ArrowRight className="size-3" /></Link>
    </section>

    <section id="story" className="grid bg-primary text-primary-foreground lg:grid-cols-2">
      <div className="relative min-h-[70svh] bg-secondary">{story?.featuredImage && <Image src={story.featuredImage.url} alt={story.featuredImage.altText || story.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />}</div>
      <div className="flex min-h-[70svh] flex-col justify-between p-7 sm:p-12 lg:p-16"><div className="flex justify-between"><p className="eyebrow opacity-55">Our philosophy</p><span className="font-serif text-2xl italic">01</span></div><div><h2 className="max-w-xl font-serif text-5xl leading-[.95] text-balance sm:text-7xl">Nothing extra.<br />Everything considered.</h2><p className="mt-8 max-w-md text-sm leading-7 text-primary-foreground/65">We choose tactile natural materials, honest construction, and a palette that belongs at home. Each piece is designed to become part of the rituals you share.</p><Link href="/shop" className="mt-9 inline-flex items-center gap-3 border-b border-primary-foreground pb-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Discover our pieces <ArrowRight className="size-4" /></Link></div></div>
    </section>

    <section className="grid border-b md:grid-cols-3">{[['01','Thoughtful materials','Soft, resilient fibers chosen for comfort and a beautiful life in.'],['02','Made for every day','Easy silhouettes that move from city blocks to open trails.'],['03','A slower standard','Fewer, better pieces designed to age with character.']].map(([number,title,text]) => <div key={number} className="border-b p-8 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 lg:p-12"><span className="eyebrow text-muted-foreground">{number}</span><h3 className="mt-12 font-serif text-3xl">{title}</h3><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p></div>)}</section>
  </main><SiteFooter /></div>
}
