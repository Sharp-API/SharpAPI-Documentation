#!/usr/bin/env node

/**
 * Fetches sportsbook data from the SharpAPI and regenerates the
 * dynamic tables in content/{locale}/api-reference/sportsbooks.mdx
 * for every locale that has the file.
 *
 * Sections between {/* AUTO:START:<name> *\/} and {/* AUTO:END:<name> *\/}
 * markers are replaced. Everything else (translated prose) is left untouched.
 *
 * Tier names (Free, Hobby, Pro, Sharp, Enterprise) and book display names
 * stay in English by design — they're product/brand identifiers.
 *
 * Usage: node scripts/generate-sportsbooks.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '../content');
const REL_PATH = 'api-reference/sportsbooks.mdx';
const LOCALES = ['en', 'es', 'pt-BR', 'de'];
const API_URL = 'https://api.sharpapi.io/api/v1/sportsbooks';

// -- Locale strings ----------------------------------------------------------

const STRINGS = {
  en: {
    cols: ['ID', 'Name', 'Live', 'Props', 'Tier'],
    tierCols: ['Tier', 'Books Available', 'Included Sportsbooks'],
    yes: 'Yes', no: 'No',
    sameAsFree: 'Same as Free',
    sameAsHobby: 'Same as Hobby',
    allBooks: 'All available sportsbooks',
    andMore: (n) => `, and ${n} more`,
  },
  es: {
    cols: ['ID', 'Nombre', 'En vivo', 'Props', 'Plan'],
    tierCols: ['Plan', 'Casas disponibles', 'Casas de apuestas incluidas'],
    yes: 'Sí', no: 'No',
    sameAsFree: 'Igual que Free',
    sameAsHobby: 'Igual que Hobby',
    allBooks: 'Todas las casas de apuestas disponibles',
    andMore: (n) => `, y ${n} más`,
  },
  'pt-BR': {
    cols: ['ID', 'Nome', 'Ao vivo', 'Props', 'Plano'],
    tierCols: ['Plano', 'Casas disponíveis', 'Casas de apostas incluídas'],
    yes: 'Sim', no: 'Não',
    sameAsFree: 'Igual ao Free',
    sameAsHobby: 'Igual ao Hobby',
    allBooks: 'Todas as casas de apostas disponíveis',
    andMore: (n) => `, e mais ${n}`,
  },
  de: {
    cols: ['ID', 'Name', 'Live', 'Props', 'Tarif'],
    tierCols: ['Tarif', 'Verfügbare Bücher', 'Enthaltene Sportwettenanbieter'],
    yes: 'Ja', no: 'Nein',
    sameAsFree: 'Wie Free',
    sameAsHobby: 'Wie Hobby',
    allBooks: 'Alle verfügbaren Sportwettenanbieter',
    andMore: (n) => `, und ${n} weitere`,
  },
};

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

function yn(val, s) { return val ? s.yes : s.no; }

function tierLabel(tier) {
  if (!tier || tier === 'free') return 'Free';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function tierDisplay(tier) {
  const label = tierLabel(tier);
  return label === 'Sharp' ? '**Sharp**' : label;
}

function bookTable(books, s) {
  const rows = books
    .sort((a, b) => {
      const tw = { free: 0, hobby: 1, pro: 2, sharp: 3, enterprise: 4 };
      const ta = tw[a.requires_tier] ?? 0;
      const tb = tw[b.requires_tier] ?? 0;
      if (ta !== tb) return ta - tb;
      return a.display_name.localeCompare(b.display_name);
    })
    .map(b =>
      `| \`${b.id}\` | ${b.display_name} | ${yn(b.has_live_odds, s)} | ${yn(b.has_player_props, s)} | ${tierDisplay(b.requires_tier)} |`
    );

  return [
    `| ${s.cols.join(' | ')} |`,
    `|${s.cols.map(() => '----').join('|')}|`,
    ...rows,
  ].join('\n');
}

// -- Tier Summary ------------------------------------------------------------

function tierSummary(books, s) {
  const free  = books.filter(b => !b.requires_tier || b.requires_tier === 'free');
  const hobby = books.filter(b => b.requires_tier === 'hobby');
  const pro   = books.filter(b => b.requires_tier === 'pro');

  const freeCount = free.length;
  const hobbyCount = freeCount + hobby.length;
  const proCount = hobbyCount + pro.length;
  const totalCount = books.length;

  const freeNames = free.slice(0, 4).map(b => b.display_name).join(', ');
  const freeSuffix = free.length > 4 ? s.andMore(free.length - 4) : '';
  const hobbyNames = hobby.length ? hobby.map(b => b.display_name).join(', ') : '';
  const proNames = pro.length ? pro.map(b => b.display_name).join(', ') : '';

  return [
    `| ${s.tierCols.join(' | ')} |`,
    `|${s.tierCols.map(() => '----').join('|')}|`,
    `| **Free** | ${freeCount} | ${freeNames}${freeSuffix} |`,
    `| **Hobby** | ${hobbyCount} | ${hobbyNames ? `+ ${hobbyNames}` : s.sameAsFree} |`,
    `| **Pro** | ${proCount} | ${proNames ? `+ ${proNames}` : s.sameAsHobby} |`,
    `| **Sharp** | ${totalCount} | ${s.allBooks} |`,
    `| **Enterprise** | ${totalCount} | ${s.allBooks} |`,
  ].join('\n');
}

// -- MDX Replacement ---------------------------------------------------------

function replaceSection(content, name, replacement) {
  const pattern = new RegExp(
    `(\\{/\\* AUTO:START:${name} \\*/\\})\n[\\s\\S]*?\n(\\{/\\* AUTO:END:${name} \\*/\\})`,
    'm'
  );
  if (!pattern.test(content)) {
    console.error(`Warning: marker AUTO:START:${name} / AUTO:END:${name} not found`);
    return content;
  }
  return content.replace(pattern, `$1\n${replacement}\n$2`);
}

function regenerateLocale(locale, grouped, active) {
  const path = resolve(CONTENT_DIR, locale, REL_PATH);
  if (!existsSync(path)) {
    console.log(`  ${locale}: skip (file missing)`);
    return false;
  }
  const s = STRINGS[locale];
  let mdx = readFileSync(path, 'utf-8');

  mdx = replaceSection(mdx, 'tier-summary', tierSummary(active, s));

  if (grouped.us.length)            mdx = replaceSection(mdx, 'us-books', bookTable(grouped.us, s));
  if (grouped.sharp.length)         mdx = replaceSection(mdx, 'sharp-books', bookTable(grouped.sharp, s));
  if (grouped.international.length) mdx = replaceSection(mdx, 'intl-books', bookTable(grouped.international, s));
  if (grouped.exchange.length)      mdx = replaceSection(mdx, 'exchange-books', bookTable(grouped.exchange, s));
  if (grouped.prediction.length)    mdx = replaceSection(mdx, 'prediction-books', bookTable(grouped.prediction, s));

  writeFileSync(path, mdx);
  console.log(`  ${locale}: updated ${path.replace(CONTENT_DIR + '/', '')}`);
  return true;
}

// -- Main --------------------------------------------------------------------

async function main() {
  console.log(`Fetching sportsbooks from ${API_URL}...`);

  const headers = {};
  const apiKey = process.env.SHARPAPI_KEY || process.env.SHARPAPI_DOCS_API_KEY;
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(API_URL, { headers });
  if (!res.ok) {
    console.error(`API returned ${res.status} — skipping sportsbook generation, keeping existing content.`);
    if (res.status === 401 && !apiKey) {
      console.error('Hint: set SHARPAPI_KEY env var so the build can fetch live sportsbook data.');
    }
    process.exit(0);
  }

  const { data: books } = await res.json();
  console.log(`Received ${books.length} sportsbooks from API.`);

  const active = books.filter(b => !b.unlisted);
  const grouped = { us: [], sharp: [], international: [], exchange: [], prediction: [] };
  for (const book of active) grouped[classify(book)].push(book);

  let updated = 0;
  for (const locale of LOCALES) {
    if (regenerateLocale(locale, grouped, active)) updated++;
  }

  console.log(`\nUpdated ${updated} locale(s).`);
  console.log(`  US: ${grouped.us.length}, Sharp: ${grouped.sharp.length}, International: ${grouped.international.length}, Exchanges: ${grouped.exchange.length}, Prediction: ${grouped.prediction.length}`);
}

main().catch(err => {
  console.error('Sportsbook generation failed (non-fatal):', err.message);
  process.exit(0);
});
