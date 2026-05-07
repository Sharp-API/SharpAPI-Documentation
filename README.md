# SharpAPI Docs

Source for **[docs.sharpapi.io](https://docs.sharpapi.io)** — the developer documentation for [SharpAPI](https://sharpapi.io), a real-time sports betting odds API.

Built with [Next.js 16](https://nextjs.org) and [Nextra 4](https://nextra.site). Content lives in MDX under `content/en/`.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3002
```

## Build

```bash
pnpm build        # static export to ./out (also runs OpenAPI stamp + Pagefind index)
pnpm start        # serve the production build
pnpm typecheck    # tsc --noEmit
pnpm check-links  # linkinator over the built site
```

## Project layout

```
app/                Next.js App Router (i18n locale segment + MDX catch-all)
content/en/        MDX pages — edit these to change docs content
  api-reference/   Endpoint reference
  concepts/        Core concepts (EV, arbitrage, odds formats, etc.)
  examples/        Code examples
  sdks/            Python, TypeScript, MCP, other languages
  streaming/       SSE / WebSocket guides
components/        React components used inside MDX
public/            Static assets (openapi.json, llms-full.txt, logo, etc.)
scripts/           Build helpers (OpenAPI stamp, link checker, sportsbook generator)
styles/            Global CSS
```

Sidebar order and labels are configured via `_meta.js` files alongside each section.

## Deployment

Pushes to `main` deploy to Vercel automatically. The site is statically exported (`output: 'export'`).

## Contributing

PRs welcome — please run `pnpm typecheck` and `pnpm build` before opening one. For larger changes (new sections, navigation reshuffles), open an issue first to discuss. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## License

See [LICENSE](LICENSE). Documentation content is proprietary; code samples may be reused for SharpAPI integrations.
