#!/usr/bin/env bash
# Verify a Dead Men on Thrones chapter actually renders via chapter.html.
#
# Usage: bash verify_render.sh <chapter-number>
# Run from anywhere — paths are resolved relative to this script's own
# location and to the repo's dead-men-on-thrones/ directory.
#
# Copies chapter.html to a throwaway temp file, points it at a locally
# vendored copy of marked.js (the production page loads marked from a CDN,
# which this sandboxed environment can't always reach), serves it over a
# random local port, dumps the rendered DOM with headless Chromium, and
# checks that the chapter's content actually appears and the "not found"
# error state is NOT visible. Cleans up the server and temp files on exit
# no matter how the script ends.

set -uo pipefail

CHAPTER_NUM="${1:?Usage: bash verify_render.sh <chapter-number>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
MARKED_SRC="$SKILL_DIR/references/marked.umd.js"

# Assumes this script is invoked with CWD anywhere inside the repo; find the
# dead-men-on-thrones directory by walking up from CWD, falling back to a
# search from the script's own location.
DMOT_DIR=""
d="$PWD"
while [ "$d" != "/" ]; do
  if [ -d "$d/dead-men-on-thrones" ]; then
    DMOT_DIR="$d/dead-men-on-thrones"
    break
  fi
  d="$(dirname "$d")"
done
if [ -z "$DMOT_DIR" ]; then
  echo "Could not locate dead-men-on-thrones/ above $PWD — run this from inside the repo." >&2
  exit 1
fi

if [ ! -f "$MARKED_SRC" ]; then
  echo "Vendored marked.js not found at $MARKED_SRC" >&2
  exit 1
fi

CHROME_BIN="$(find /opt/pw-browsers -maxdepth 3 -iname "chrome" -type f 2>/dev/null | head -1)"
if [ -z "$CHROME_BIN" ]; then
  echo "Could not find a headless Chromium binary under /opt/pw-browsers" >&2
  exit 1
fi

TMP_HTML="$DMOT_DIR/_verify_test_chapter.html"
TMP_MARKED="$DMOT_DIR/_verify_marked.umd.js"
DOM_OUT="$(mktemp /tmp/dmot_verify_dom_XXXXXX.html)"
SERVER_PID=""
PORT=$(( (RANDOM % 5000) + 20000 ))

cleanup() {
  # Kill by port rather than by captured PID — in this sandboxed environment
  # the PID from a backgrounded subshell job hasn't reliably matched the
  # host-visible process, so `kill "$SERVER_PID"` has silently failed to
  # stop the server. Killing whatever is actually listening on our port is
  # more robust than trusting the PID chain.
  fuser -k "${PORT}/tcp" >/dev/null 2>&1
  if [ -n "$SERVER_PID" ]; then
    kill -9 "$SERVER_PID" >/dev/null 2>&1
  fi
  rm -f "$TMP_HTML" "$TMP_MARKED" "$DOM_OUT"
}
trap cleanup EXIT

cp "$DMOT_DIR/chapter.html" "$TMP_HTML"
cp "$MARKED_SRC" "$TMP_MARKED"
sed -i "s|https://cdn.jsdelivr.net/npm/marked/marked.min.js|_verify_marked.umd.js|" "$TMP_HTML"

( cd "$DMOT_DIR" && python3 -m http.server "$PORT" >/tmp/dmot_verify_http_"$PORT".log 2>&1 & echo $! > /tmp/dmot_verify_pid_"$PORT" )
sleep 1
SERVER_PID="$(cat /tmp/dmot_verify_pid_"$PORT" 2>/dev/null)"
rm -f /tmp/dmot_verify_pid_"$PORT"

URL="http://localhost:$PORT/_verify_test_chapter.html?c=$CHAPTER_NUM"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$URL")"
if [ "$HTTP_CODE" != "200" ]; then
  echo "FAIL: local server did not return 200 for $URL (got $HTTP_CODE)" >&2
  exit 1
fi

"$CHROME_BIN" --headless --disable-gpu --no-sandbox --virtual-time-budget=15000 \
  --dump-dom "$URL" > "$DOM_OUT" 2>/tmp/dmot_verify_chrome_"$PORT".log

if [ ! -s "$DOM_OUT" ]; then
  echo "FAIL: headless Chrome produced no output — check /tmp/dmot_verify_chrome_$PORT.log" >&2
  exit 1
fi

PASS=1

if grep -Eq 'id="error-msg"[^>]*style="display: ?block' "$DOM_OUT"; then
  echo "FAIL: error-msg is visibly displayed — chapter $CHAPTER_NUM did not load (map entry missing or file path wrong?)"
  PASS=0
fi

if ! grep -q "DEAD MEN ON THRONES" "$DOM_OUT"; then
  echo "FAIL: closing attribution footer not found in rendered content"
  PASS=0
fi

if ! grep -Eq 'id="loading"[^>]*style="display: ?none;?"' "$DOM_OUT"; then
  echo "WARN: loading indicator does not show as hidden — page may not have finished rendering"
fi

if [ "$PASS" -eq 1 ]; then
  echo "PASS: chapter $CHAPTER_NUM rendered correctly via chapter.html?c=$CHAPTER_NUM"
  exit 0
else
  echo "See $DOM_OUT before cleanup removes it — re-run with the DOM_OUT path copied out if you need to inspect it." >&2
  exit 1
fi
