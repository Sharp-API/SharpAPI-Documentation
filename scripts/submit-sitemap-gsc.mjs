#!/usr/bin/env node

/**
 * Submits the public sitemap to Google Search Console via the Webmasters API.
 *
 * Auth: a Google service account JSON key in the GSC_SERVICE_ACCOUNT_KEY env var.
 * The service account must be added as a user (Owner or Full role) on the
 * Search Console property for `docs.sharpapi.io`.
 *
 * No external deps — JWT is signed directly with node:crypto.
 *
 * Skips silently with exit 0 if the key isn't set so the workflow doesn't
 * fail on PR builds without secrets.
 */

import { createSign } from 'node:crypto'

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:docs.sharpapi.io'
const SITEMAP = process.env.GSC_SITEMAP || 'https://docs.sharpapi.io/sitemap.xml'

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')
  const signingInput = `${header}.${claim}`
  const sign = createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(credentials.private_key, 'base64url')
  const jwt = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(data)}`)
  }
  return data.access_token
}

async function main() {
  const credsJson = process.env.GSC_SERVICE_ACCOUNT_KEY
  if (!credsJson) {
    console.log('GSC_SERVICE_ACCOUNT_KEY not set — skipping submission.')
    process.exit(0)
  }

  let credentials
  try {
    credentials = JSON.parse(credsJson)
  } catch (err) {
    console.error('GSC_SERVICE_ACCOUNT_KEY is not valid JSON:', err.message)
    process.exit(1)
  }

  if (!credentials.client_email || !credentials.private_key) {
    console.error('GSC_SERVICE_ACCOUNT_KEY is missing client_email or private_key')
    process.exit(1)
  }

  console.log(`Authenticating as ${credentials.client_email}...`)
  const token = await getAccessToken(credentials)

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP)}`
  console.log(`Submitting ${SITEMAP} to ${SITE_URL}...`)

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sitemap submit failed (${res.status}): ${body}`)
  }

  console.log(`GSC sitemap submitted: ${SITEMAP}`)
}

main().catch((err) => {
  console.error('GSC submission failed:', err.message)
  process.exit(1)
})
