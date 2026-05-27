/**
 * Post-build script: inject sr-only text content into Nextra's empty heading
 * permalink anchors so SEO crawlers see anchor text.
 *
 * Nextra theme renders each heading permalink as
 *   <a href="#slug" class="...subheading-anchor" aria-label="Permalink for this section"></a>
 *
 * Semrush counts visible text only (not aria-label) when checking for anchor
 * text, so it flags every one of these as "Links with no anchor text". On a
 * doc site with hundreds of headings this dominates the audit (3,323 instances
 * across 220 pages at 2026-05-27).
 *
 * The fix injects a visually-hidden <span> with the same text as the aria-label
 * so the anchor has a real text node. CSS keeps it invisible to sighted users;
 * the existing CSS `::before` pseudo-element that renders the visible `#` glyph
 * is unaffected.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const OUT_DIR = join(import.meta.dirname, '..', 'out');

// Standard sr-only inline style — independent of Tailwind/utility CSS bundles
const SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

// Match empty <a ... class="...subheading-anchor..." ... aria-label="X"></a>
// Allow attribute order to vary and tolerate other classes alongside subheading-anchor.
const ANCHOR_RE = /<a\b([^>]*\bclass="[^"]*\bsubheading-anchor\b[^"]*"[^>]*)><\/a>/g;

function getAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function injectAnchorText(html) {
  let count = 0;
  const fixed = html.replace(ANCHOR_RE, (match, attrs) => {
    const label = getAttr(attrs, 'aria-label') || 'Permalink for this section';
    count++;
    return `<a${attrs}><span style="${SR_ONLY}">${label}</span></a>`;
  });
  return { fixed, count };
}

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

async function main() {
  const files = await getHtmlFiles(OUT_DIR);
  let totalInjected = 0;
  let pagesTouched = 0;

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    const { fixed, count } = injectAnchorText(original);
    if (count > 0) {
      await writeFile(file, fixed, 'utf8');
      totalInjected += count;
      pagesTouched++;
      console.log(`  ${relative(OUT_DIR, file)}: ${count} anchors`);
    }
  }

  console.log(`\nInjected anchor text into ${totalInjected} permalinks across ${pagesTouched} pages (${files.length} HTML files scanned)`);
}

main().catch((err) => {
  console.error('fix-subheading-anchors failed:', err);
  process.exit(1);
});
