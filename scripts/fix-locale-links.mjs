/**
 * Post-build script: rewrites internal links in static HTML output
 * to include the /en/ locale prefix.
 *
 * Nextra's sidebar, breadcrumb, and pagination components generate
 * links without the locale prefix (e.g. href="/api-reference/account").
 * Vercel redirects catch these with 308s, but that wastes crawl budget
 * and hurts SEO. This script fixes the links at build time.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = join(import.meta.dirname, '..', 'out');

// Paths that should NOT be prefixed with /en
const SKIP_PREFIXES = ['en/', '_next/', 'ingest/', 'favicon', 'logo', 'og-'];

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

function fixLinks(html) {
  // Match href="/<path>" where <path> does NOT start with a skipped prefix
  return html.replace(/href="\/(?!(?:en\/|_next\/|ingest\/|favicon|logo|og-))/g, 'href="/en/');
}

async function main() {
  const files = await getHtmlFiles(OUT_DIR);
  let totalFixed = 0;

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    const fixed = fixLinks(original);
    if (fixed !== original) {
      await writeFile(file, fixed, 'utf8');
      const count = (original.length - fixed.length + fixed.split('href="/en/').length - original.split('href="/en/').length);
      // Count actual replacements by comparing occurrences
      const before = (original.match(/href="\/(?!(?:en\/|_next\/|ingest\/|favicon|logo|og-))/g) || []).length;
      totalFixed += before;
      console.log(`  ${file.replace(OUT_DIR + '/', '')}: ${before} links fixed`);
    }
  }

  console.log(`\nFixed ${totalFixed} links across ${files.length} HTML files`);
}

main().catch((err) => {
  console.error('fix-locale-links failed:', err);
  process.exit(1);
});
