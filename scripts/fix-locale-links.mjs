/**
 * Post-build script: rewrites internal links in static HTML output
 * to include the correct locale prefix matching the page's own locale.
 *
 * Nextra's sidebar, breadcrumb, and pagination components generate
 * links without the locale prefix (e.g. href="/api-reference/account").
 * Vercel redirects catch these with 308s, but that wastes crawl budget
 * and hurts SEO. This script fixes the links at build time.
 *
 * For a page at out/{locale}/foo.html, bare hrefs are prefixed with /{locale}/.
 * Pages at the out/ root (e.g. 404.html) use the default locale.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const OUT_DIR = join(import.meta.dirname, '..', 'out');
const LOCALES = ['en', 'es', 'pt-BR', 'de'];
const DEFAULT_LOCALE = 'en';

// Path segments that should NOT be prefixed with a locale.
// Locales themselves are added to this dynamically.
const STATIC_SKIP_PREFIXES = ['_next/', 'ingest/', 'favicon', 'logo', 'og-', 'apple-', 'manifest'];

async function getHtmlFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getHtmlFiles(full)));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function localeForFile(file) {
  const rel = relative(OUT_DIR, file).split(sep);
  const first = rel[0];
  if (LOCALES.includes(first)) return first;
  return DEFAULT_LOCALE;
}

function buildSkipPattern() {
  // Build alternation: en\/|es\/|pt-BR\/|de\/|_next\/|...
  const parts = [
    ...LOCALES.map((l) => l.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\/'),
    ...STATIC_SKIP_PREFIXES,
  ];
  return parts.join('|');
}

const SKIP_PATTERN = buildSkipPattern();

function fixLinks(html, locale) {
  // Match href="/<path>" where <path> does NOT start with a skipped prefix
  const re = new RegExp(`href="\\/(?!(?:${SKIP_PATTERN}))`, 'g');
  return html.replace(re, `href="/${locale}/`);
}

async function main() {
  const files = await getHtmlFiles(OUT_DIR);
  let totalFixed = 0;
  const re = new RegExp(`href="\\/(?!(?:${SKIP_PATTERN}))`, 'g');

  for (const file of files) {
    const locale = localeForFile(file);
    const original = await readFile(file, 'utf8');
    const fixed = fixLinks(original, locale);
    if (fixed !== original) {
      await writeFile(file, fixed, 'utf8');
      const before = (original.match(re) || []).length;
      totalFixed += before;
      console.log(`  ${file.replace(OUT_DIR + '/', '')} [${locale}]: ${before} links fixed`);
    }
  }

  console.log(`\nFixed ${totalFixed} links across ${files.length} HTML files`);
}

main().catch((err) => {
  console.error('fix-locale-links failed:', err);
  process.exit(1);
});
