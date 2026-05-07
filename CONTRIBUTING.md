# Contributing

Thanks for your interest in improving the SharpAPI docs. This repo is the source for [docs.sharpapi.io](https://docs.sharpapi.io) — a Next.js + Nextra static site.

## Filing issues

- **Found a typo, broken link, or stale example?** Open an issue or send a PR — small fixes welcome and don't need prior discussion.
- **Found a bug in the SharpAPI product (not the docs)?** File it at the appropriate product channel — we describe behavior here but don't implement it. See `SECURITY.md` for security-sensitive reports.
- **Want a new section / large reorganization?** Open an issue first so we can discuss scope before you spend time writing.

## Local setup

```bash
pnpm install
pnpm dev          # http://localhost:3002
```

Edit MDX files under `content/en/`. The site hot-reloads on save. Sidebar order is controlled by `_meta.js` files alongside each section.

## Pull requests

Before opening a PR:

1. `pnpm typecheck` — must pass.
2. `pnpm build` — must succeed (this also runs `linkinator` to catch dead internal links).
3. Conventional Commit style for the title (e.g., `docs(api): clarify SSE reconnection semantics`). Scopes commonly used: `docs`, `api`, `mcp`, `sdk`, `seo`, `fix`, `chore(deps)`.

PRs that fix a single issue are easier to review than batched ones.

## Style

- **Tone**: terse and concrete. Show the request, the response, and the interesting details. Skip filler.
- **Code samples**: prefer `curl` for protocol clarity; the SDK pages cover language-specific usage.
- **Placeholders**: use `sk_live_xxx` or `YOUR_API_KEY` — never paste a real key, even a test one.
- **Links**: prefer relative links inside the docs (e.g. `/en/api-reference/odds`); external links should be intentional.

## What this repo is not

- Not the SharpAPI source code.
- Not a place to discuss billing, account, or support questions — those go through the SharpAPI dashboard or `support@sharpapi.io`.

## License

By contributing, you agree your contribution may be incorporated into the docs under the terms of the repository [LICENSE](LICENSE).
