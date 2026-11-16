#!/bin/sh
# Take the four game screenshots with headless Chromium and convert them to JPEG.
# Usage: scripts/shots.sh [out-dir]  (default: screenshots)
# Serves game/ on 127.0.0.1 only, loads each ?shot= scene at 1280x720, and writes
# screenshots/1-title.jpg, 2-play.jpg, 3-win.jpg, 4-lose.jpg.
set -e
OUT="${1:-screenshots}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-$HOME/workspace/tools/makefun/headless-shell/chrome-headless-shell-linux64/chrome-headless-shell}"
PORT="${PORT:-8124}"
TMP="$(mktemp -d)"

cd "$ROOT/game"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 1

shot() {
  name="$1"; url="$2"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1280,720 \
    --virtual-time-budget=15000 \
    --screenshot="$TMP/$name.png" "$url" >/dev/null 2>&1
}

BASE="http://127.0.0.1:$PORT/index.html"
shot 1-title "$BASE?shot=start&seed=1"
shot 2-play "$BASE?shot=play&seed=1"
shot 3-win "$BASE?shot=win&seed=1"
shot 4-lose "$BASE?shot=lose&seed=1"

python3 - "$TMP" "$ROOT/$OUT" << 'EOF'
import sys
from PIL import Image
tmp, dest = sys.argv[1], sys.argv[2]
import os
for name in ('1-title', '2-play', '3-win', '4-lose'):
    im = Image.open(os.path.join(tmp, name + '.png')).convert('RGB')
    out = os.path.join(dest, name + '.jpg')
    im.save(out, 'JPEG', quality=82, optimize=True)
    print(f"{name}.jpg: {im.size[0]}x{im.size[1]}, {os.path.getsize(out)} bytes")
EOF
