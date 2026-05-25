#!/usr/bin/env node
// Enforces the OpenAPI spec-versioning policy (CONTRIBUTING.md, issue #233):
// fails CI when public/openapi.json's paths or response schemas change without
// an info.version bump, and when a version bump lacks a CHANGELOG.md entry.
// Compares info only by version — the build stamps info["x-generated-at"] /
// info["x-commit-sha"], which must not count as a semantic change.
//
// Usage: node scripts/check-openapi-version.mjs <base-spec.json> <head-spec.json>

import { readFileSync, existsSync } from 'node:fs'

const [, , basePath, headPath] = process.argv
if (!basePath || !headPath) {
  console.error('usage: check-openapi-version.mjs <base-spec> <head-spec>')
  process.exit(2)
}

function load (p) {
  try {
    const raw = readFileSync(p, 'utf8').trim()
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.error(`[openapi-version] cannot parse ${p}: ${err.message}`)
    process.exit(2)
  }
}

// Stable stringify: recursively sort object keys so key-order churn isn't
// mistaken for a semantic change.
function canonical (value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, k) => {
      acc[k] = canonical(value[k])
      return acc
    }, {})
  }
  return value
}

function semantic (spec) {
  return JSON.stringify({
    paths: canonical(spec?.paths ?? {}),
    schemas: canonical(spec?.components?.schemas ?? {})
  })
}

const base = load(basePath)
const head = load(headPath)

if (!head) {
  console.error('[openapi-version] head spec missing or empty')
  process.exit(2)
}

// New spec (no base on the target branch) — nothing to compare against.
if (!base || Object.keys(base).length === 0) {
  console.log('[openapi-version] no base spec to compare; skipping.')
  process.exit(0)
}

const baseVersion = base?.info?.version
const headVersion = head?.info?.version

if (semantic(base) === semantic(head)) {
  console.log('[openapi-version] no path/schema changes detected; OK.')
  process.exit(0)
}

if (baseVersion === headVersion) {
  console.error(
    `[openapi-version] paths or schemas changed but info.version is still ${headVersion}.\n` +
    '  Bump info.version per the SemVer policy in CONTRIBUTING.md:\n' +
    '    MAJOR (x.0.0)  backward-incompatible redesign / removed-renamed field\n' +
    '    MINOR (2.x.0)  new path or field, or a shape fix aligning the spec to the live response\n' +
    '    PATCH (2.1.x)  description-only edits\n' +
    '  Removed paths and renamed fields bump the MINOR at minimum.'
  )
  process.exit(1)
}

// Version bumped — require a CHANGELOG.md entry for the new version.
const CHANGELOG = 'CHANGELOG.md'
if (existsSync(CHANGELOG)) {
  const log = readFileSync(CHANGELOG, 'utf8')
  const escaped = headVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const hasEntry = new RegExp(`^##\\s.*${escaped}(\\s|$)`, 'm').test(log)
  if (!hasEntry) {
    console.error(
      `[openapi-version] info.version bumped ${baseVersion} -> ${headVersion} but ` +
      `CHANGELOG.md has no "## ... ${headVersion}" entry. Add one describing the change.`
    )
    process.exit(1)
  }
}

console.log(`[openapi-version] info.version ${baseVersion} -> ${headVersion}; OK.`)
process.exit(0)
