/**
 * Server component — renders Schema.org JSON-LD for search engines.
 *
 * Emitted on every docs page via app/[lang]/layout.tsx:
 *   - Organization (sitewide)
 *   - WebSite with SearchAction (enables in-search sitelinks search box)
 *
 * BreadcrumbList is generated per-page from the pathname; see PageBreadcrumb.
 */

const SITE_URL = 'https://docs.sharpapi.io'
const MAIN_URL = 'https://sharpapi.io'

function jsonLd(obj: object) {
  return { __html: JSON.stringify(obj).replace(/</g, '\\u003c') }
}

export function SiteStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': 'SharpAPI',
          'url': MAIN_URL,
          'logo': `${MAIN_URL}/logo.svg`,
          'sameAs': [
            'https://github.com/Mlaz-code',
          ],
        })}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'SharpAPI Docs',
          'url': SITE_URL,
          'publisher': { '@type': 'Organization', 'name': 'SharpAPI', 'url': MAIN_URL },
        })}
      />
    </>
  )
}

interface PageBreadcrumbProps {
  pathname: string
  title?: string
}

export function PageBreadcrumb({ pathname, title }: PageBreadcrumbProps) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0)
    return null

  // Skip the leading locale segment in the user-visible chain.
  // Always root the chain at "Docs" → optional subsection → leaf page.
  const trail = parts[0]?.length === 2 || parts[0] === 'pt-BR' ? parts.slice(1) : parts
  const items: Array<Record<string, unknown>> = [{
    '@type': 'ListItem',
    'position': 1,
    'name': 'Docs',
    'item': `${SITE_URL}/${parts[0]}`,
  }]
  trail.forEach((segment, i) => {
    const href = `${SITE_URL}/${parts[0]}/${trail.slice(0, i + 1).join('/')}`
    const name = i === trail.length - 1 && title
      ? title
      : segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    items.push({
      '@type': 'ListItem',
      'position': i + 2,
      'name': name,
      'item': href,
    })
  })

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': items,
      })}
    />
  )
}
