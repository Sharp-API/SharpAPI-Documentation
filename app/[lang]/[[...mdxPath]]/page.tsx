import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath, params.lang)
  const path = params.mdxPath ? `/${params.lang}/${params.mdxPath.join('/')}` : `/${params.lang}`
  const ogTitle = metadata.title ? `${metadata.title} - SharpAPI Docs` : 'SharpAPI Docs'
  return {
    ...metadata,
    alternates: {
      canonical: `https://docs.sharpapi.io${path}`,
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
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
