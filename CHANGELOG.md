# OpenAPI Spec Changelog

History of `public/openapi.json` `info.version` bumps. See the
[spec-versioning policy](CONTRIBUTING.md#openapi-spec-versioning) for when and how
to bump. Every change to API paths or response schemas gets a one-line entry here;
the [OpenAPI Version Check](.github/workflows/openapi-version-check.yml) CI job
enforces that a bump has a matching entry.

## 2.3.0 — 2026-06-01

- Add `odds_changed_at` to the `Odds` schema — the canonical per-row freshness field (previously undocumented; also the only per-odd freshness timestamp OpticOdds exposes). Deprecate `last_seen_at`, `wire_received_at`, and the stale `timestamp` prop (`deprecated: true`) — being internalized; read `odds_changed_at` for freshness. Removal tracked in sharp-api-go #743.

## 2.2.0 — 2026-05-31

- Add `is_active` field to the `Odds` schema (`false` = market suspended/closed, price frozen; mirrors OpticOdds locked-odds; absent treated as `true`). SHA-3803.

## 2.1.0 — 2026-05-21

- Align `/account` response schema with the live flat shape (#230).

## 2.0.0

- Baseline versioned spec. (Note: `/sports/{sportId}` and `/sportsbooks/{bookId}`
  were removed under this version in #218 without a bump — the gap that motivated
  the versioning policy in #233.)
