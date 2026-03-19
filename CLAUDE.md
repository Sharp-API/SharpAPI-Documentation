# CLAUDE.md — docs.sharpapi.io

This file provides guidance to Claude Code when working with the SharpAPI documentation site.

> **See [`../CLAUDE.md`](../CLAUDE.md) for shared infrastructure:** SSH aliases, environment architecture, monitoring URLs, global `.env`.

<!-- AUTO-MANAGED: project-description -->
## Overview

**SharpAPI Documentation Site** - Next.js 15 static documentation site built with Nextra 4.6 (App Router). Provides comprehensive API documentation, SDK guides, examples, and streaming concepts for the SharpAPI real-time sports betting odds platform.

Extracted from sharp-api/docs-vercel repository for standalone deployment.

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->
## Build & Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server (port 3002)

# Production
npm run build        # Build static site (output to ./out/)
npm run start        # Serve production build

# Package management
npm install          # Install dependencies (uses pnpm-lock.yaml)
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->
## Architecture

```
/root/sharpapi.io/docs.sharpapi.io/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout (metadata only, returns children)
│   └── [lang]/                  # i18n locale segment
│       ├── layout.tsx           # Locale layout (html/body, Nextra Layout, Navbar, Footer)
│       └── [[...mdxPath]]/
│           └── page.tsx         # Catch-all route for MDX content
│
├── content/                     # MDX documentation pages (Nextra 4 content dir)
│   └── en/                      # English locale (add more locales as siblings)
│       ├── _meta.js             # Top-level sidebar navigation config
│       ├── index.mdx            # Homepage
│       ├── authentication.mdx   # Auth guide
│       ├── quickstart.mdx       # Getting started
│       ├── pricing.mdx          # Pricing tiers
│       ├── api-reference/       # API endpoint documentation (+_meta.js)
│       ├── concepts/            # Core concepts (+_meta.js)
│       ├── examples/            # Code examples (+_meta.js)
│       ├── sdks/                # SDK documentation (+_meta.js)
│       └── streaming/           # WebSocket streaming docs (+_meta.js)
│
├── components/
│   └── PostHogProvider.tsx      # PostHog analytics provider
│
├── styles/
│   └── globals.css              # Global styles (footer padding customization)
│
├── proxy.ts                     # Nextra locale detection proxy (redirects / → /en/)
├── mdx-components.tsx           # MDX component overrides (nextra-theme-docs)
├── next.config.mjs              # Next.js config (static export, Nextra plugin, i18n)
├── knip.json                    # Knip config (ignores convention-based _meta.js)
├── tsconfig.json                # TypeScript config (ES2017, strict: false)
├── package.json                 # Dependencies (Next.js 16, Nextra 4.6)
├── pnpm-lock.yaml               # Lock file
├── vercel.json                  # Vercel deployment config (with legacy → /en/ redirects)
└── out/                         # Build output (static export, /en/ prefixed paths)
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->
## Code Conventions

- **TypeScript**: ES2017 target, `strict: false`, JSX preserve mode
- **Next.js 16**: App Router with `[lang]` i18n segment, root layout is metadata-only passthrough
- **Nextra 4**: MDX content in `content/{locale}/` directories, `_meta.js` files for sidebar nav
- **i18n**: Locales configured via `next.config.mjs` `i18n` field; Nextra reads and manages internally
- **Styling**: Global CSS in `styles/globals.css`, custom footer padding reduction
- **Static Export**: `output: 'export'` with unoptimized images
- **Analytics**: PostHog via client-side provider component
- **Metadata**: Next.js Metadata API in `app/layout.tsx` (title template, OG tags)

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
## Detected Patterns

**Nextra/Next.js:**
- Static site generation with `output: 'export'` for deployment
- Nextra plugin wraps Next.js config with `defaultShowCopyCode: true`
- Custom footer styling uses `!important` to override Nextra defaults
- Logo links to sharpapi.io with Next.js Link component and inline styles
- Navbar includes "Back to SharpAPI" button linking to main site
- Metadata via Next.js Metadata API with `%s - SharpAPI Docs` template

**Branding:**
- Primary hue: 210 (blue tone, set via `<Head color={{ hue: 210 }} />`)
- Logo: "SharpAPI" text with fontWeight 700 + `/logo.svg` icon
- Footer: Copyright with current year
- Page titles: "[Page] - SharpAPI Docs" format

**Content Organization:**
- Locale-scoped MDX in `content/{locale}/` with subdirectories for major sections
- `_meta.js` files define sidebar ordering, labels, and separators
- Sidebar default collapse level: 1
- Table of contents with "back to top" enabled
- Toggle button enabled for sidebar

<!-- END AUTO-MANAGED -->
