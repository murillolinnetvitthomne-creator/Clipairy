import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { formatMoney, type Product } from '@/lib/shopify-types'

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <Link href={`/products/${product.handle}`} className="group block focus-visible:outline-none">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-secondary">
        {product.featuredImage ? <Image src={product.featuredImage.url} alt={product.featuredImage.altText || product.title} fill priority={priority} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width: 768px) 100vw, 33vw" /> : <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Image processing</div>}
        <span className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-background text-foreground opacity-0 transition-opacity group-hover:opacity-100"><ArrowUpRight className="size-4" aria-hidden="true" /></span>
      </div>
      <div className="flex items-start justify-between gap-4 py-4">
        <div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{product.productType}</p><h3 className="mt-1 font-serif text-xl">{product.title}</h3></div>
        <p className="pt-5 text-sm font-semibold">{formatMoney(product.priceRange.minVariantPrice)}</p>
      </div>
    </Link>
  )
}
