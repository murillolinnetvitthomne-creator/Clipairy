import type { Metadata, Viewport } from 'next'
import { Manrope, Newsreader } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/components/cart-provider'
import { CartDrawer } from '@/components/cart-drawer'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Willow & Paw | Thoughtful Pet Accessories', template: '%s | Willow & Paw' },
  description: 'Natural, thoughtfully made collars, tags, bandanas and walking accessories for well-loved pets.',
  generator: 'v0.app',
}

export const viewport: Viewport = { themeColor: '#f4f1ea', colorScheme: 'light', userScalable: true }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${manrope.variable} ${newsreader.variable} bg-background`}><body className="font-sans antialiased"><CartProvider>{children}<CartDrawer /></CartProvider>{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
