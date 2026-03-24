import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import Link from 'next/link'
import { PostHogProvider } from '../../components/PostHogProvider'

import 'nextra-theme-docs/style.css'
import '../../styles/globals.css'

export function generateStaticParams() {
  return [{ lang: 'en' }]
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

export default async function LangLayout({ children, params }) {
  const { lang } = await params
  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 210 }} />
      <body>
        <PostHogProvider>
          <Layout
            pageMap={await getPageMap(`/${lang}`)}
            search={<Search />}
            sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
            toc={{ backToTop: true }}
            feedback={{ content: null }}
            editLink={null}
            i18n={[
              { locale: 'en', name: 'English' },
            ]}
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
