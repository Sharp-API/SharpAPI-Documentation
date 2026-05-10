#!/usr/bin/env node

/**
 * Submits the public sitemap to Google Search Console via the Webmasters API.
 *
 * Accepts either credential JSON shape in GSC_SERVICE_ACCOUNT_KEY:
 *   - service_account: { type: 'service_account', client_email, private_key, ... }
 *   - authorized_user: { type: 'authorized_user', client_id, client_secret, refresh_token }
 *
 * For service accounts, sign a JWT and exchange for an access token.
 * For authorized users, exchange the refresh token for an access token.
 *
 * The credential identity (SA email or user account) must have access to
 * the Search Console property for `docs.sharpapi.io` — Owner or Full role.
 *
 * No external deps. Skips silently with exit 0 if the key isn't set.
 */

import { createSign } from 'node:crypto'

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:docs.sharpapi.io'
const SITEMAP = process.env.GSC_SITEMAP || 'https://docs.sharpapi.io/sitemap.xml'

async function getAccessTokenFromServiceAccount(credentials) {
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

async function getAccessTokenFromRefreshToken(credentials) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${JSON.stringify(data)}`)
  }
  return data.access_token
}

async function getAccessToken(credentials) {
  if (credentials.type === 'service_account') {
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('service_account credentials missing client_email or private_key')
    }
    return getAccessTokenFromServiceAccount(credentials)
  }
  if (credentials.type === 'authorized_user') {
    if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
      throw new Error('authorized_user credentials missing client_id, client_secret, or refresh_token')
    }
    return getAccessTokenFromRefreshToken(credentials)
  }
  throw new Error(`Unsupported credential type: ${credentials.type}`)
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

  const identity = credentials.client_email || credentials.account || credentials.client_id || '<unknown>'
  console.log(`Authenticating as ${identity} (type: ${credentials.type})...`)
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
