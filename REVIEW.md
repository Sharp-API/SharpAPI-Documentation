# Review rules — docs.sharpapi.io

Guidance for the automated Claude PR reviewer (`.github/workflows/claude-review.yml`).
Read together with `CLAUDE.md`. Read-only reviewer: it comments, it doesn't build the site.

## Severity
- **[Critical]** — factually wrong docs, a broken/incorrect code example, or an OpenAPI spec that contradicts the real API. Customer-facing reference errors are bugs.
- **[Important]** — misleading or incomplete docs; missing version bump where required.
- **[Nit]** — wording, formatting, link style.

## Always check
- **Accuracy vs the real API** — endpoints, params, auth headers, tiers, response shapes.
- **Examples** — code samples are correct, runnable, and current (SDK + curl).
- **OpenAPI** — `public/openapi.json` changes are consistent and version-bumped per policy.
- **Links & anchors** — no broken internal/external links.

## Don't
- Don't flag pre-existing content this PR didn't touch.
- Don't speculate — cite the file/line or omit. "LGTM" is valid; never invent issues.
