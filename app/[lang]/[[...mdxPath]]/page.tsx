import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../mdx-components'
import { ApiReferenceJsonLd, PageBreadcrumb } from '../../../components/StructuredData'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

const LOCALES = ['en', 'es', 'pt-BR', 'de']
const DEFAULT_LOCALE = 'en'

export async function generateMetadata(props) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath, params.lang)
  const path = params.mdxPath ? `/${params.lang}/${params.mdxPath.join('/')}` : `/${params.lang}`
  const subPath = params.mdxPath ? `/${params.mdxPath.join('/')}` : ''
  const languages: Record<string, string> = {}
  for (const l of LOCALES) {
    languages[l] = `https://docs.sharpapi.io/${l}${subPath}`
  }
  languages['x-default'] = `https://docs.sharpapi.io/${DEFAULT_LOCALE}${subPath}`
  const ogTitle = metadata.title ? `${metadata.title} - SharpAPI Docs` : 'SharpAPI Docs'
  return {
    ...metadata,
    alternates: {
      canonical: `https://docs.sharpapi.io${path}`,
      languages,
    },
    openGraph: {
      title: ogTitle,
      description: metadata.description || 'SharpAPI documentation — real-time sports betting odds API with +EV detection, arbitrage alerts, low-hold markets, and SSE streaming from 16+ sportsbooks.',
      url: `https://docs.sharpapi.io${path}`,
      type: 'website',
      siteName: 'SharpAPI Docs',
      images: [{ url: 'https://sharpapi.io/og-image.png', width: 1200, height: 630, alt: 'SharpAPI - Sports Betting Odds API' }],
    },
  }
}

const Wrapper = useMDXComponents({}).wrapper

export default async function Page(props) {
  const params = await props.params
  const result = await importPage(params.mdxPath, params.lang)
  const { default: MDXContent, toc, metadata } = result
  const pathname = params.mdxPath
    ? `/${params.lang}/${params.mdxPath.join('/')}`
    : `/${params.lang}`
  const isApiRef = params.mdxPath?.[0] === 'api-reference'
  const pageUrl = `https://docs.sharpapi.io${pathname}`

  return (
    <>
      <PageBreadcrumb pathname={pathname} title={metadata?.title as string | undefined} />
      {isApiRef && metadata?.title && (
        <ApiReferenceJsonLd
          title={String(metadata.title)}
          description={String(metadata.description ?? '')}
          url={pageUrl}
        />
      )}
      <Wrapper toc={toc} metadata={metadata}>
        <MDXContent {...props} params={params} />
      </Wrapper>
    </>
  )
}
