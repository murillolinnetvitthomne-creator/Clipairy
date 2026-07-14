import Image from 'next/image'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatMoney, type Product } from '@/lib/shopify-types'

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return <Link href={`/products/${product.handle}`} className="group block focus-visible:outline-none">
    <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
      {product.featuredImage ? <Image src={product.featuredImage.url} alt={product.featuredImage.altText || product.title} fill priority={priority} className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]" sizes="(max-width: 768px) 50vw, 33vw" /> : <div className="flex size-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">Image processing</div>}
      <span className="absolute bottom-3 right-3 flex size-9 translate-y-2 items-center justify-center bg-card opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true"><Plus className="size-4" /></span>
    </div>
    <div className="flex items-start justify-between gap-3 border-b py-4">
      <div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{product.productType}</p><h3 className="mt-1 truncate font-serif text-lg sm:text-xl">{product.title}</h3></div>
      <p className="shrink-0 pt-4 text-[11px] font-semibold">{formatMoney(product.priceRange.minVariantPrice)}</p>
    </div>
  </Link>
}
