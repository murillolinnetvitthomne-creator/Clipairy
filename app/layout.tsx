import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk, Noto_Sans_Thai, Noto_Sans_SC } from 'next/font/google'
import { I18nProvider } from '@/components/i18n-provider'
import './globals.css'

const inter = Inter({
  // Vietnamese is Latin-based with diacritics; include the subset so accents render.
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// Thai script fallback — Inter/Space Grotesk have no Thai glyphs.
const notoThai = Noto_Sans_Thai({
  subsets: ['thai'],
  variable: '--font-noto-thai',
  display: 'swap',
})

// Simplified Chinese fallback for reliable CJK rendering across environments.
const notoSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sc',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Clipairy — Turn viral videos into your product ads',
  description:
    'Clipairy is an AI short-video generator for TikTok, Instagram Reels and YouTube Shorts sellers. Upload one viral reference video and your product assets, and AI deconstructs the framework, rewrites the script, generates new footage and voiceover, then exports multi-platform video ads in one click.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#1a1c1e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${notoThai.variable} ${notoSC.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
