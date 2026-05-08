'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

// Patterns for errors that are browser/extension noise, not real bugs
const IGNORED_PATTERNS = [
  /ResizeObserver loop/,
  /^Script error\.?$/,
  /chrome-extension:\/\//,
  /moz-extension:\/\//,
  /ChunkLoadError/,
  /Loading chunk/,
  // PrismJS-based browser extensions inject a global Prism whose dynamic-import
  // chunks fail to resolve. Generalized from the prism_bash_exports special-case
  // shipped in SHA-2240 to also cover prism_python_exports and future variants.
  /prism_\w+_exports/,
  /Export 'prism_/,
  /local binding for export 'prism_/,
  // React hydration/render errors (#418, #423, #425) — mismatches are from Nextra
  // internals (next-themes localStorage reads, Switchers conditional rendering).
  // Suppressed at the DOM level via suppressHydrationWarning. The unminified-message
  // patterns below remain for dev/local builds; production minification emits as
  // "Minified React error #N" — that's the form PostHog actually captures, so we
  // need to match both shapes.
  /Minified React error #(310|418|423|425)/,
  /Hydration failed/,
  /There was an error while hydrating/,
  /Text content did not match/,
]

function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some(p => p.test(message))
}

function extractMessage(value: unknown): string {
  if (value instanceof Error)
    return value.message || value.name || 'Error'
  if (typeof value === 'string')
    return value
  if (value && typeof value === 'object' && 'message' in value)
    return String((value as { message: unknown }).message)
  try {
    return String(value)
  }
  catch {
    return 'unknown'
  }
}

if (typeof window !== 'undefined') {
  posthog.init('phc_NwXZnWwvpuCzrhpjDGcrmh8TVLIx8B20hbXq0gYdz5a', {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    capture_exceptions: false,
    cross_subdomain_cookie: true,
    persistence: 'localStorage+cookie',
  })

  // Custom exception capture with extension-noise filtering.
  // capture_exceptions: false disables PostHog's built-in autocapture,
  // which was recording browser-extension errors (e.g. prism_bash_exports)
  // as if they were docs-site bugs.
  window.addEventListener('error', (event) => {
    const error = event.error
    const message = error ? extractMessage(error) : (event.message || 'unknown')
    if (shouldIgnore(message))
      return

    posthog.captureException(error ?? new Error(message), {
      $exception_message: message,
      $exception_source: 'window_onerror',
      $exception_lineno: event.lineno,
      $exception_colno: event.colno,
      $exception_filename: event.filename,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = extractMessage(reason)
    if (shouldIgnore(message))
      return

    posthog.captureException(
      reason instanceof Error ? reason : new Error(message),
      {
        $exception_message: message,
        $exception_source: 'unhandledrejection',
      },
    )
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

export function PostHogProvider({ children }: { children?: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <DocsEventCapture />
      {children}
    </PHProvider>
  )
}
