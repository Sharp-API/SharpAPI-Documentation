import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.sharpapi.io'),
  title: {
    default: 'SharpAPI Docs',
    template: '%s - SharpAPI Docs',
  },
  description: 'SharpAPI documentation — real-time sports betting odds API with +EV detection, arbitrage alerts, low-hold markets, and SSE streaming from 16+ sportsbooks.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'SharpAPI Docs',
    images: [{ url: 'https://sharpapi.io/og-image.png', width: 1200, height: 630, alt: 'SharpAPI - Sports Betting Odds API' }],
  },
}

export default function RootLayout({ children }) {
  return children
}
