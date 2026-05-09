#!/usr/bin/env node

/**
 * Translates content/en/**\/*.{mdx,js} into content/{es,pt-BR,de}/.
 *
 * Backend: invokes `claude -p` (Claude Code CLI in non-interactive mode),
 * which uses the active Claude Code session's auth — no separate API key.
 *
 * Strict preservation rules: code, JSX, frontmatter, URLs, API identifiers,
 * brand names. For _meta.js files, only string values are translated.
 *
 * Idempotent: skips files where target mtime >= source mtime unless --force.
 *
 * Usage:
 *   node scripts/translate-content.mjs [--force] [--locale es] [--file path]
 *   node scripts/translate-content.mjs --concurrency 4   # parallel translations
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC_DIR = join(ROOT, 'content', 'en')

const LOCALE_NAMES = {
  es: 'Spanish (Spain)',
  'pt-BR': 'Brazilian Portuguese',
  de: 'German',
}

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const ONLY_LOCALE = args.includes('--locale') ? args[args.indexOf('--locale') + 1] : null
const ONLY_FILE = args.includes('--file') ? args[args.indexOf('--file') + 1] : null
const CONCURRENCY = args.includes('--concurrency')
  ? parseInt(args[args.indexOf('--concurrency') + 1], 10)
  : 2

const DISALLOWED_TOOLS = 'Read,Write,Edit,Bash,Glob,Grep,WebFetch,WebSearch,Agent,Skill,TaskCreate,TaskUpdate,TaskList'

function buildSystemPrompt(targetLanguage, fileType) {
  const common = `You are a professional technical documentation translator. You translate API documentation from English to ${targetLanguage}. Output ONLY the translated content, no preamble, no explanation, no markdown code fence wrapping the whole output, no "Here is the translation" prefix.

PRESERVATION RULES (CRITICAL — never translate these):
- Code blocks (\`\`\`...\`\`\`) — copy exactly, including comments inside code
- Inline code spans (\`code\`)
- JSX/HTML tags, component names, prop names, attribute values that are identifiers
- import / export statements
- URLs in markdown links [text](url) — translate the [text], keep the (url) verbatim
- API endpoint paths (e.g. /api/v1/odds, GET /events)
- HTTP method names, status codes, header names (X-API-Key, Authorization, Bearer)
- Parameter names, field names in tables (sportsbook, market_type, event_id)
- Environment variable names (ANTHROPIC_API_KEY, NODE_ENV)
- Brand and product names: SharpAPI, OpticOdds, OddsJam, Pinnacle, DraftKings, FanDuel, Stripe, Clerk, Unkey, Vercel, Valkey, Redis, Next.js, Nextra, Crowdin, Tailwind, PostHog, OpenAPI, Cloudflare, GitHub
- Numeric values, currency codes (USD, EUR), country codes (US, UK, BR)
- Frontmatter YAML keys (description:, title:, sidebarTitle:) — translate the value, not the key
- File paths and directory names
- Library/framework names (React, TypeScript, Python, Go)

TRANSLATION RULES:
- Translate prose, headings, link text, alt text, image captions, table cell contents that are descriptive English
- Preserve markdown structure exactly (heading levels, list markers, blockquote chevrons, table pipes)
- Use the formal/professional register appropriate for technical documentation
- Common technical terms: keep "API key", "endpoint", "webhook", "rate limit" in English in parens after first translation if natural in target language

OUTPUT: Return ONLY the translated file content. No markdown fence wrapper, no explanation. Start with the first character of the file (e.g., the --- of frontmatter, or the import statement).`

  if (fileType === 'meta') {
    return `${common}

THIS FILE IS A _meta.js FILE: It is a JavaScript module that exports a configuration object. Translate ONLY the string values that are sidebar/page titles. Do NOT translate object keys, do NOT change syntax. Preserve the exact JS structure.`
  }
  return common
}

function translateViaClaude(content, targetLanguage, fileType) {
  const system = buildSystemPrompt(targetLanguage, fileType)
  return new Promise((resolveP, reject) => {
    const proc = spawn('claude', [
      '-p',
      '--output-format', 'text',
      '--append-system-prompt', system,
      '--disallowedTools', DISALLOWED_TOOLS,
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`claude exited ${code}: ${stderr.slice(0, 500)}`))
      else resolveP(stdout)
    })
    proc.stdin.write(`Translate the following file to ${targetLanguage}:\n\n${content}`)
    proc.stdin.end()
  })
}

async function walk(dir) {
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(mdx|js)$/.test(e.name)) out.push(full)
  }
  return out
}

async function shouldTranslate(srcPath, dstPath) {
  if (FORCE) return true
  try {
    const [srcStat, dstStat] = await Promise.all([stat(srcPath), stat(dstPath)])
    return srcStat.mtimeMs > dstStat.mtimeMs
  } catch {
    return true
  }
}

function fileType(path) {
  return path.endsWith('_meta.js') ? 'meta' : 'mdx'
}

function stripWrapper(text) {
  // Strip a leading ```mdx ... ``` wrapper if the model added one despite instructions
  const fence = text.match(/^```(?:mdx|markdown|md|js|javascript)?\n([\s\S]*)\n```\s*$/)
  if (fence) return fence[1]
  return text
}

function swapLocaleLinks(text, locale) {
  // Source files hardcode /en/... internal links. Rewrite them to the target locale
  // so the translated page links stay within its own locale tree.
  // Only matches inside markdown link parens (X) or href="X" attributes.
  return text
    .replace(/\]\(\/en\//g, `](/${locale}/`)
    .replace(/href="\/en\//g, `href="/${locale}/`)
}

async function processOne(src, locale, language) {
  const rel = relative(SRC_DIR, src)
  const dst = join(ROOT, 'content', locale, rel)
  if (!(await shouldTranslate(src, dst))) return { skipped: true, rel }

  const content = await readFile(src, 'utf8')
  const ft = fileType(src)
  let translated = stripWrapper(await translateViaClaude(content, language, ft))
  if (ft === 'mdx') translated = swapLocaleLinks(translated, locale)
  await mkdir(dirname(dst), { recursive: true })
  await writeFile(dst, translated, 'utf8')
  return { skipped: false, rel, srcLen: content.length, dstLen: translated.length }
}

async function runWithConcurrency(items, fn, concurrency) {
  const queue = items.slice()
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift()
      await fn(item)
    }
  })
  await Promise.all(workers)
}

async function main() {
  const allFiles = await walk(SRC_DIR)
  const files = ONLY_FILE
    ? allFiles.filter((f) => f.includes(ONLY_FILE))
    : allFiles

  const locales = ONLY_LOCALE ? [ONLY_LOCALE] : Object.keys(LOCALE_NAMES)

  console.log(`Source files: ${files.length}`)
  console.log(`Target locales: ${locales.join(', ')}`)
  console.log(`Concurrency: ${CONCURRENCY}, Force: ${FORCE}\n`)

  let translated = 0
  let skipped = 0
  let failed = 0
  const startTime = Date.now()

  for (const locale of locales) {
    const language = LOCALE_NAMES[locale]
    console.log(`\n=== ${locale} (${language}) ===`)
    await runWithConcurrency(files, async (src) => {
      try {
        const r = await processOne(src, locale, language)
        if (r.skipped) {
          skipped++
          return
        }
        translated++
        console.log(`  ✓ ${r.rel} (${r.srcLen} → ${r.dstLen} bytes)`)
      } catch (err) {
        failed++
        console.log(`  ✗ ${relative(SRC_DIR, src)}: ${err.message}`)
      }
    }, CONCURRENCY)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== Summary ===`)
  console.log(`Translated: ${translated}, Skipped: ${skipped}, Failed: ${failed}`)
  console.log(`Elapsed: ${elapsed}s`)
}

main().catch((err) => {
  console.error('translate-content failed:', err)
  process.exit(1)
})
