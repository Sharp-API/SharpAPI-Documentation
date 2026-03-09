# CLAUDE.md — docs.sharpapi.io

This file provides guidance to Claude Code when working with the SharpAPI documentation site.

> **See [`../CLAUDE.md`](../CLAUDE.md) for shared infrastructure:** SSH aliases, environment architecture, monitoring URLs, global `.env`.

<!-- AUTO-MANAGED: project-description -->
## Overview

**SharpAPI Documentation Site** - Next.js 14 static documentation site built with Nextra 2.13.4 theme. Provides comprehensive API documentation, SDK guides, examples, and streaming concepts for the SharpAPI real-time sports betting odds platform.

Extracted from sharp-api/docs-vercel repository for standalone deployment.

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->
## Build & Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server (default port 3000)

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
/root/docs.sharpapi.io/
├── pages/                       # MDX documentation pages
│   ├── _app.tsx                 # Next.js app wrapper (imports globals.css)
│   ├── index.mdx                # Homepage
│   ├── authentication.mdx       # Auth guide
│   ├── quickstart.mdx           # Getting started
│   ├── api-reference/           # API endpoint documentation
│   ├── concepts/                # Core concepts
│   ├── examples/                # Code examples
│   ├── sdks/                    # SDK documentation
│   └── streaming/               # WebSocket streaming docs
│
├── styles/
│   └── globals.css              # Global styles (footer padding customization)
│
├── theme.config.tsx             # Nextra theme configuration
├── next.config.mjs              # Next.js config (static export, Nextra plugin)
├── tsconfig.json                # TypeScript config (ES2017, strict: false)
├── package.json                 # Dependencies (Next.js 14.2, Nextra 2.13.4)
├── pnpm-lock.yaml               # Lock file
├── vercel.json                  # Vercel deployment config
└── out/                         # Build output (static export)
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->
## Code Conventions

- **TypeScript**: ES2017 target, `strict: false`, JSX preserve mode
- **Next.js**: App router pattern with `_app.tsx` wrapper
- **Nextra**: MDX pages in `pages/` directory, `theme.config.tsx` for theme
- **Styling**: Global CSS in `styles/globals.css`, custom footer padding reduction
- **Static Export**: `output: 'export'` with unoptimized images
- **Theme Config**: DocsThemeConfig type, Link wrapper for logo, useNextSeoProps for titles

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
## Detected Patterns

**Nextra/Next.js:**
- Static site generation with `output: 'export'` for deployment
- Nextra plugin wraps Next.js config with theme and default copy code enabled
- Custom footer styling uses `!important` to override Nextra defaults
- Logo uses Next.js Link component with inline styles for clickability
- SEO handled via `useNextSeoProps` with titleTemplate pattern

**Branding:**
- Primary hue: 210 (blue tone)
- Logo: "SharpAPI" text with fontWeight 700
- Footer: Copyright with current year
- Page titles: "[Page] - SharpAPI Docs" format

**Content Organization:**
- Flat MDX structure in `pages/` with subdirectories for major sections
- Sidebar default collapse level: 1
- Table of contents with "back to top" enabled
- Toggle button enabled for sidebar

<!-- END AUTO-MANAGED -->
