#!/usr/bin/env node

/**
 * Generates public/sitemap.xml from content/{locale}/**\/*.mdx.
 *
 * Each translated page becomes its own <url> entry with hreflang alternates
 * for every other locale and an x-default pointing at the en version.
 *
 * Run as part of pnpm build (before next build) so the generated sitemap is
 * copied into out/ as a static asset.
 */

import { readdir, writeFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CONTENT = join(ROOT, 'content')
const OUT = join(ROOT, 'public', 'sitemap.xml')

const LOCALES = ['en', 'es', 'pt-BR', 'de']
const DEFAULT_LOCALE = 'en'
const HOST = 'https://docs.sharpapi.io'

// Priority overrides — keyed by route (without locale prefix)
const PRIORITY = {
  '': 1.0,
  'quickstart': 0.9,
  'api-reference/overview': 0.9,
  'authentication': 0.8,
  'pricing': 0.8,
}

const DEFAULT_PRIORITY = 0.7

async function walk(dir) {
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith('_')) continue // skip _meta.js etc.
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (e.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

function fileToRoute(file, localeRoot) {
  const rel = relative(localeRoot, file)
    .replace(/\\/g, '/')
    .replace(/\.mdx$/, '')
  // index.mdx → ''
  return rel === 'index' ? '' : rel
}

function priorityFor(route) {
  return PRIORITY[route] ?? DEFAULT_PRIORITY
}

async function lastmod(file) {
  const s = await stat(file)
  return s.mtime.toISOString().slice(0, 10)
}

function url(locale, route) {
  const path = route ? `/${locale}/${route}` : `/${locale}`
  return `${HOST}${path}`
}

async function main() {
  // Use English tree as the source of truth for routes.
  // Translated locales should mirror the structure.
  const enRoot = join(CONTENT, DEFAULT_LOCALE)
  const enFiles = await walk(enRoot)
  const routes = enFiles.map((f) => fileToRoute(f, enRoot)).sort()

  const entries = []
  for (const route of routes) {
    for (const locale of LOCALES) {
      const localeFile = join(CONTENT, locale, route ? `${route}.mdx` : 'index.mdx')
      let lm
      try {
        lm = await lastmod(localeFile)
      } catch {
        // Translation missing — skip this locale for this route
        continue
      }

      const alternates = LOCALES
        .map((alt) =>
          `    <xhtml:link rel="alternate" hreflang="${alt}" href="${url(alt, route)}" />`
        )
        .join('\n')
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(DEFAULT_LOCALE, route)}" />`

      entries.push(
        `  <url>\n` +
        `    <loc>${url(locale, route)}</loc>\n` +
        `    <lastmod>${lm}</lastmod>\n` +
        `    <priority>${priorityFor(route).toFixed(1)}</priority>\n` +
        alternates + '\n' +
        xDefault + '\n' +
        `  </url>`
      )
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    entries.join('\n') +
    `\n</urlset>\n`

  await writeFile(OUT, xml, 'utf8')
  console.log(`Wrote ${OUT}`)
  console.log(`Routes: ${routes.length}, Locales: ${LOCALES.length}, URL entries: ${entries.length}`)
}

main().catch((err) => {
  console.error('generate-sitemap failed:', err)
  process.exit(1)
})
