import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import Link from 'next/link'
import { PostHogProvider } from '../../components/PostHogProvider'
import { SiteStructuredData } from '../../components/StructuredData'

import 'nextra-theme-docs/style.css'
import '../globals.css'

export function generateStaticParams() {
  return [{ lang: 'en' }]
}

const logo = (
  <Link href="https://sharpapi.io" className="sa-logo">
    <img src="/logo.svg" alt="SharpAPI" />
    <span>SharpAPI</span>
  </Link>
)

const navbarExtra = (
  <a
    href="https://sharpapi.io"
    target="_blank"
    rel="noopener noreferrer"
    className="sa-cta"
  >
    Back to SharpAPI →
  </a>
)

const footerContent = (
  <div className="sa-footer">
    <div className="sa-footer__copy">
      © {new Date().getFullYear()} SharpAPI · Built with ♠️ for sharp bettors
    </div>
    <nav className="sa-footer__links" aria-label="Footer">
      <a href="https://sharpapi.io">Home</a>
      <a href="https://sharpapi.io/pricing">Pricing</a>
      <a href="https://status.sharpapi.io/en/" target="_blank" rel="noopener noreferrer">Status</a>
      <a href="https://github.com/Sharp-API/SharpAPI-Documentation" target="_blank" rel="noopener noreferrer">GitHub</a>
    </nav>
  </div>
)

export default async function LangLayout({ children, params }) {
  const { lang } = await params
  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 210 }}>
        <SiteStructuredData />
      </Head>
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
              <Navbar logo={logo}>
                {navbarExtra}
              </Navbar>
            }
            footer={<Footer>{footerContent}</Footer>}
          >
            {children}
          </Layout>
        </PostHogProvider>
      </body>
    </html>
  )
}
