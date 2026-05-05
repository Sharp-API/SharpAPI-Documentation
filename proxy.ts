import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|logo.svg|apple-icon.png|manifest|_pagefind|ingest|og-image.png|robots.txt|sitemap.xml|BingSiteAuth.xml|.*\\.png$).*)'
  ]
}
