#!/usr/bin/env node
// Stamps public/openapi.json's `info` block with freshness metadata before
// Next.js copies it into the static export. Runs in CI on every Vercel deploy
// so consumers can see how stale the spec is even though `info.version` is
// hand-maintained and only bumped on intentional API revisions.
//
// Fields written:
//   info["x-generated-at"]  — ISO-8601 timestamp of the spec file's last git commit
//   info["x-commit-sha"]    — short SHA of that commit
//
// Both fields are advisory — they don't affect the OpenAPI semantics. Tools
// that don't recognise the `x-` extensions ignore them.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SPEC_PATH = 'public/openapi.json'

function git (args) {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const commitISO = git(`log -1 --format=%cI -- ${SPEC_PATH}`)
const commitSHA = git(`log -1 --format=%h -- ${SPEC_PATH}`)

if (!commitISO || !commitSHA) {
  console.warn(`[stamp-openapi] git log returned empty for ${SPEC_PATH}; skipping stamp.`)
  process.exit(0)
}

const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))
spec.info ??= {}
spec.info['x-generated-at'] = commitISO
spec.info['x-commit-sha'] = commitSHA

writeFileSync(SPEC_PATH, JSON.stringify(spec, null, 2) + '\n')
console.log(`[stamp-openapi] ${SPEC_PATH} → x-generated-at=${commitISO} x-commit-sha=${commitSHA}`)
