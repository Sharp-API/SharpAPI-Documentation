#!/usr/bin/env bash
# Broken-link check for the static export in out/.
#
# Why a wrapper: next build produces HTML with absolute paths like
# href="/en/api-reference". linkinator doesn't resolve absolute paths
# against a filesystem dir without being given a URL endpoint, and the
# --server-root flag is rejected whenever the first arg is a URL. So
# we serve out/ on a throwaway local port and point linkinator at it.
#
# Scan policy:
#   Internal links (127.0.0.1:*) — strict. A broken internal link is
#       always a regression and fails this script.
#   External links (anywhere else) — soft. Third-party drift is not our
#       bug; a transient GitHub/npm/sharpapi.io outage must not block
#       a docs deploy. Broken externals are reported to $GITHUB_STEP_
#       SUMMARY if available and stderr otherwise, but don't fail.
#
# Both classes are retried on 429 + 5xx (--retry --retry-errors) so
# one bad network packet doesn't flap the result.

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

REPORT=$(mktemp)
trap "kill $SERVER_PID 2>/dev/null || true; rm -f $REPORT" EXIT

# Scan everything. --format json so we can classify results below.
# linkinator exits non-zero when anything is BROKEN — we deliberately
# don't propagate that exit code directly because "broken external"
# must not fail the deploy.
npx linkinator "http://127.0.0.1:${PORT}${ENTRY_PATH}" \
    --recurse \
    --timeout 15000 \
    --retry \
    --retry-errors \
    --retry-errors-count 2 \
    --format json \
    > "$REPORT" 2>/dev/null || true

python3 - "$REPORT" "${GITHUB_STEP_SUMMARY:-}" <<'PYEOF'
import json, os, sys

report_path, summary_path = sys.argv[1], sys.argv[2]
with open(report_path) as f:
    data = json.load(f)

links = data.get("links", [])
broken = [link for link in links if link.get("state") == "BROKEN"]

def is_internal(url: str) -> bool:
    return url.startswith("http://127.") or url.startswith("http://localhost")

internal_broken = [link for link in broken if is_internal(link["url"])]
external_broken = [link for link in broken if not is_internal(link["url"])]

total = len(links)
ok = total - len(broken)
print(f"Scanned {total} links: {ok} ok, {len(internal_broken)} broken (internal), {len(external_broken)} broken (external).")

if internal_broken:
    print("")
    print("::error::Broken internal links — these are docs regressions and fail the deploy:")
    for link in internal_broken:
        print(f"  {link.get('status', '?')} {link['url']}  (from {link.get('parent', '?')})")
    sys.exit(1)

if external_broken:
    msg_lines = [
        f"## External link drift: {len(external_broken)} broken",
        "",
        "These failed after retries but are non-blocking — third-party drift "
        "doesn't fail deploys. Fix at your leisure.",
        "",
        "| Status | URL | From |",
        "| --- | --- | --- |",
    ]
    for link in external_broken:
        msg_lines.append(f"| {link.get('status', '?')} | `{link['url']}` | `{link.get('parent', '?')}` |")
    msg = "\n".join(msg_lines)
    print("")
    print(f"::warning::{len(external_broken)} external link(s) broken — see step summary for the list (non-blocking).")
    for link in external_broken:
        print(f"  WARN {link.get('status', '?')} {link['url']}")
    if summary_path:
        with open(summary_path, "a") as f:
            f.write(msg + "\n")

sys.exit(0)
PYEOF
