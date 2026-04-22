#!/usr/bin/env bash
# Broken-link check for the static export in out/.
#
# Why a wrapper: next build produces HTML with absolute paths like
# href="/en/api-reference". linkinator doesn't resolve absolute paths
# against a filesystem dir without being given a URL endpoint, and the
# --server-root flag is rejected whenever the first arg is a URL. So
# we do the obvious thing: serve out/ on a throwaway local port, then
# point linkinator at that URL.
#
# Exits 0 on clean scan, non-zero if any internal link is broken.
# External links (not localhost) are skipped — third-party drift is
# a separate concern from our own docs integrity.

set -euo pipefail

PORT=${PORT:-8765}
OUT_DIR=${OUT_DIR:-out}
ENTRY_PATH=${ENTRY_PATH:-/en.html}

if [ ! -d "$OUT_DIR" ]; then
    echo "ERROR: $OUT_DIR not found — run \`pnpm build\` first" >&2
    exit 1
fi

# Start static server in the out/ directory.
python3 -m http.server "$PORT" --directory "$OUT_DIR" >/tmp/linkcheck-server.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null || true" EXIT

# Wait for the server to come up (avoids a race on slower hosts).
for _ in $(seq 1 20); do
    if curl -sf "http://127.0.0.1:${PORT}${ENTRY_PATH}" >/dev/null 2>&1; then
        break
    fi
    sleep 0.2
done

# Skip external links (they're out of our control), skip in-page
# anchors only (linkinator treats them as valid by default). Retry
# on 429 since nextra prefetches can trigger rate limits.
exec npx linkinator "http://127.0.0.1:${PORT}${ENTRY_PATH}" \
    --recurse \
    --silent \
    --timeout 10000 \
    --retry \
    --skip "^https?://(?!127\\.0\\.0\\.1)"
