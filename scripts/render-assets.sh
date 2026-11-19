#!/usr/bin/env bash
# Renders the link preview image and app icons with headless Chrome.
# Usage: bash scripts/render-assets.sh   (run from the repository root)
set -euo pipefail
# Any Chromium browser works; set CHROME to override.
CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" "$(command -v chromium || true)" "$(command -v google-chrome || true)"; do
    if [ -n "$c" ] && [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "No Chromium browser found. Set CHROME=/path/to/chrome" >&2; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
shot() { # out width height url
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor=1 --default-background-color=00000000 \
    --virtual-time-budget=3000 --window-size="$2,$3" --screenshot="$1" "$4" >/dev/null 2>&1
}
shot "$ROOT/public/og.png" 1200 630 "file://$ROOT/scripts/og.html"
shot "$ROOT/public/icon-512.png" 512 512 "file://$ROOT/scripts/icon.html"
shot "$ROOT/public/icon-maskable-512.png" 512 512 "file://$ROOT/scripts/icon.html?s=48%25"
# Headless windows have a minimum size, so small icons are scaled down from the 512 render (macOS sips).
sips -z 192 192 "$ROOT/public/icon-512.png" --out "$ROOT/public/icon-192.png" >/dev/null
sips -z 180 180 "$ROOT/public/icon-512.png" --out "$ROOT/public/apple-touch-icon.png" >/dev/null
echo "Rendered: og.png, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png"
