import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import Link from 'next/link'
import { PostHogProvider } from '../components/PostHogProvider'
import { SiteStructuredData } from '../components/StructuredData'

import 'nextra-theme-docs/style.css'
import '../styles/globals.css'

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
  alternates: {
    types: {
      'text/plain': [
        { url: 'https://docs.sharpapi.io/llms.txt', title: 'LLM-friendly documentation' },
        { url: 'https://docs.sharpapi.io/llms-full.txt', title: 'LLM-friendly full documentation' },
      ],
    },
  },
}

const logo = (
  <Link
    href="https://sharpapi.io"
    style={{
      textDecoration: 'none',
      color: 'inherit',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}
  >
    <img src="/logo.svg" alt="SharpAPI" width={24} height={24} />
    <span style={{ fontWeight: 700 }}>SharpAPI</span>
  </Link>
)

const navbarExtra = (
  <a
    href="https://sharpapi.io"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      padding: '0.5rem 1rem',
      marginLeft: '0.5rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      textDecoration: 'none',
    }}
  >
    Back to SharpAPI →
  </a>
)

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 210 }}>
        <SiteStructuredData />
      </Head>
      <body>
        <PostHogProvider>
          <Layout
            pageMap={await getPageMap('/')}
            search={<Search />}
            sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
            toc={{ backToTop: true }}
            feedback={{ content: null }}
            editLink={null}
            navbar={
              <Navbar
                logo={logo}
                children={navbarExtra}
              />
            }
            footer={
              <Footer>
                <div style={{ textAlign: 'center' }}>
                  <div>{new Date().getFullYear()} SharpAPI. Built with ♠️ for sharp bettors.</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <a href="https://status.sharpapi.io/en/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Status</a>
                  </div>
                </div>
              </Footer>
            }
          >
            {children}
          </Layout>
        </PostHogProvider>
      </body>
    </html>
  )
}
