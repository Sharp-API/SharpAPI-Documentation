'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

if (typeof window !== 'undefined') {
  posthog.init('phc_NwXZnWwvpuCzrhpjDGcrmh8TVLIx8B20hbXq0gYdz5a', {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    cross_subdomain_cookie: true,
    persistence: 'localStorage+cookie',
  })
}

function DocsEventCapture() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Track code copy clicks
      const copyButton = target.closest('button[title="Copy code"]')
      if (copyButton) {
        posthog.capture('docs_code_copied', {
          page: window.location.pathname,
        })
      }

      // Track CTA clicks to main site
      const link = target.closest('a[href*="sharpapi.io"]') as HTMLAnchorElement
      if (link && !link.href.includes('docs.sharpapi.io')) {
        posthog.capture('docs_cta_clicked', {
          destination: link.href,
          from_page: window.location.pathname,
        })
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <DocsEventCapture />
      {children}
    </PHProvider>
  )
}
