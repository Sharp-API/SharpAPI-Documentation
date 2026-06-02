# OpenAPI Spec Changelog

History of `public/openapi.json` `info.version` bumps. See the
[spec-versioning policy](CONTRIBUTING.md#openapi-spec-versioning) for when and how
to bump. Every change to API paths or response schemas gets a one-line entry here;
the [OpenAPI Version Check](.github/workflows/openapi-version-check.yml) CI job
enforces that a bump has a matching entry.

## 3.1.0 — 2026-06-02

- Add `player_id` to the `EVOpportunity` schema (`/opportunities/ev`) — the canonical cross-book player identifier resolved by atlas_players (e.g. `baseball_mlb_corbin_carroll`). Nullable and always present alongside `player_name`; `null` until the producer flips a book to active player-id capture. Consumers should group player props on `player_id` and fall back to `player_name`. Additive, backward-compatible. sharp-api-go #213.

## 3.0.0 — 2026-06-02

- **BREAKING:** the `Odds` response now exposes a single per-odd `timestamp` field and no longer emits `odds_changed_at`, `last_seen_at`, or `wire_received_at`. `timestamp` is the **delivery / last-refreshed** stamp (advances every ingest cycle — a feed-freshness/liveness signal, matching OpticOdds' `timestamp`), **not** a price-last-changed time. **Migration:** anyone reading `odds_changed_at` / `last_seen_at` / `wire_received_at` should read `timestamp`. Note there is no longer a field for *when the price last moved* (CLV / line-movement) — full OpticOdds-parity. Supersedes the 2.3.0 deprecations. SHA-1048.

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
