#!/usr/bin/env node

/**
 * Fetches sportsbook data from the SharpAPI and regenerates the
 * dynamic tables in content/en/api-reference/sportsbooks.mdx.
 *
 * Sections between {/* AUTO:START:<name> *\/} and {/* AUTO:END:<name> *\/}
 * markers are replaced. Everything else is left untouched.
 *
 * Usage: node scripts/generate-sportsbooks.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MDX_PATH = resolve(__dirname, '../content/en/api-reference/sportsbooks.mdx');
const API_URL = 'https://api.sharpapi.io/api/v1/sportsbooks';

// -- Classification ----------------------------------------------------------

const EXCHANGES = new Set(['prophetx', 'betfair']);
const PREDICTION_MARKETS = new Set(['polymarket', 'kalshi']);

function classify(book) {
  if (PREDICTION_MARKETS.has(book.id)) return 'prediction';
  if (EXCHANGES.has(book.id)) return 'exchange';
  if (book.is_sharp) return 'sharp';
  const regions = book.regions.map(r => r.toUpperCase());
  if (!regions.includes('US')) return 'international';
  return 'us';
}

// -- Table Helpers -----------------------------------------------------------

function yn(val) { return val ? 'Yes' : 'No'; }

function tierLabel(tier) {
  if (!tier || tier === 'free') return 'Free';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function tierDisplay(tier) {
  const label = tierLabel(tier);
  return label === 'Sharp' ? '**Sharp**' : label;
}

function bookTable(books) {
  const rows = books
    .sort((a, b) => {
      // Sort by tier weight then alphabetically
      const tw = { free: 0, hobby: 1, pro: 2, sharp: 3, enterprise: 4 };
      const ta = tw[a.requires_tier] ?? 0;
      const tb = tw[b.requires_tier] ?? 0;
      if (ta !== tb) return ta - tb;
      return a.display_name.localeCompare(b.display_name);
    })
    .map(b =>
      `| \`${b.id}\` | ${b.display_name} | ${yn(b.has_live_odds)} | ${yn(b.has_player_props)} | ${tierDisplay(b.requires_tier)} |`
    );

  return [
    '| ID | Name | Live | Props | Tier |',
    '|----|------|------|-------|------|',
    ...rows,
  ].join('\n');
}

// -- Tier Summary ------------------------------------------------------------

function tierSummary(books) {
  const free  = books.filter(b => !b.requires_tier || b.requires_tier === 'free');
  const hobby = books.filter(b => b.requires_tier === 'hobby');
  const pro   = books.filter(b => b.requires_tier === 'pro');
  const sharp = books.filter(b => b.requires_tier === 'sharp');

  const freeCount = free.length;
  const hobbyCount = freeCount + hobby.length;
  const proCount = hobbyCount + pro.length;
  const totalCount = books.length;

  const freeNames = free.slice(0, 4).map(b => b.display_name).join(', ');
  const freeSuffix = free.length > 4 ? `, and ${free.length - 4} more` : '';
  const hobbyNames = hobby.length ? hobby.map(b => b.display_name).join(', ') : '';
  const proNames = pro.length ? pro.map(b => b.display_name).join(', ') : '';

  return [
    '| Tier | Books Available | Included Sportsbooks |',
    '|------|-----------------|----------------------|',
    `| **Free** | ${freeCount} | ${freeNames}${freeSuffix} |`,
    `| **Hobby** | ${hobbyCount} | ${hobbyNames ? `+ ${hobbyNames}` : 'Same as Free'} |`,
    `| **Pro** | ${proCount} | ${proNames ? `+ ${proNames}` : 'Same as Hobby'} |`,
    `| **Sharp** | ${totalCount} | All available sportsbooks |`,
    `| **Enterprise** | ${totalCount} | All available sportsbooks |`,
  ].join('\n');
}

// -- MDX Replacement ---------------------------------------------------------

function replaceSection(content, name, replacement) {
  // Matches {/* AUTO:START:<name> */} ... {/* AUTO:END:<name> */}
  const pattern = new RegExp(
    `(\\{/\\* AUTO:START:${name} \\*/\\})\n[\\s\\S]*?\n(\\{/\\* AUTO:END:${name} \\*/\\})`,
    'm'
  );
  if (!pattern.test(content)) {
    console.error(`Warning: marker AUTO:START:${name} / AUTO:END:${name} not found in MDX`);
    return content;
  }
  return content.replace(pattern, `$1\n${replacement}\n$2`);
}

// -- Main --------------------------------------------------------------------

async function main() {
  console.log(`Fetching sportsbooks from ${API_URL}...`);

  const res = await fetch(API_URL);
  if (!res.ok) {
    // Non-fatal: keep existing MDX so builds don't break if API is down
    console.error(`API returned ${res.status} — skipping sportsbook generation, keeping existing content.`);
    process.exit(0);
  }

  const { data: books } = await res.json();
  console.log(`Received ${books.length} sportsbooks from API.`);

  // Filter out unlisted books
  const active = books.filter(b => !b.unlisted);

  // Classify
  const grouped = { us: [], sharp: [], international: [], exchange: [], prediction: [] };
  for (const book of active) {
    grouped[classify(book)].push(book);
  }

  // Read existing MDX
  let mdx = readFileSync(MDX_PATH, 'utf-8');

  // Replace tier summary
  mdx = replaceSection(mdx, 'tier-summary', tierSummary(active));

  // Replace each category table
  if (grouped.us.length)            mdx = replaceSection(mdx, 'us-books', bookTable(grouped.us));
  if (grouped.sharp.length)         mdx = replaceSection(mdx, 'sharp-books', bookTable(grouped.sharp));
  if (grouped.international.length) mdx = replaceSection(mdx, 'intl-books', bookTable(grouped.international));
  if (grouped.exchange.length)      mdx = replaceSection(mdx, 'exchange-books', bookTable(grouped.exchange));
  if (grouped.prediction.length)    mdx = replaceSection(mdx, 'prediction-books', bookTable(grouped.prediction));

  writeFileSync(MDX_PATH, mdx);
  console.log(`Updated ${MDX_PATH}`);

  // Summary
  console.log(`  US: ${grouped.us.length}, Sharp: ${grouped.sharp.length}, International: ${grouped.international.length}, Exchanges: ${grouped.exchange.length}, Prediction: ${grouped.prediction.length}`);
}

main().catch(err => {
  console.error('Sportsbook generation failed (non-fatal):', err.message);
  process.exit(0); // Don't break the build
});
