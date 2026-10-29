#!/usr/bin/env bash
# Offline listening for Wortzi: the Vosk speech engine (Apache-2.0) and the small German model (Apache-2.0).
# Puts stt/vosk.js and stt/de.tar.gz next to the app. Runs on GitHub during deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
VOSK_BROWSER=0.0.8
MODEL=vosk-model-small-de-0.15
mkdir -p stt
[ -s stt/vosk.js ] || curl -fsSL --retry 3 --max-time 120 -o stt/vosk.js "https://cdn.jsdelivr.net/npm/vosk-browser@${VOSK_BROWSER}/dist/vosk.js"
if [ ! -s stt/de.tar.gz ]; then
  tmp=$(mktemp -d)
  curl -fsSL --retry 3 --max-time 600 -o "$tmp/m.zip" "https://alphacephei.com/vosk/models/${MODEL}.zip"
  (cd "$tmp" && unzip -q m.zip && tar -czf de.tar.gz "$MODEL")
  mv "$tmp/de.tar.gz" stt/de.tar.gz
  rm -rf "$tmp"
fi
if [ ! -s stt/en.tar.gz ]; then
  tmp=$(mktemp -d)
  curl -fsSL --retry 3 --max-time 600 -o "$tmp/m.zip" "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
  (cd "$tmp" && unzip -q m.zip && tar -czf en.tar.gz vosk-model-small-en-us-0.15)
  mv "$tmp/en.tar.gz" stt/en.tar.gz
  rm -rf "$tmp"
fi
cat > stt/LICENSE.txt <<TXT
Offline listening in Wortzi uses:
- vosk-browser ${VOSK_BROWSER} (Apache License 2.0) https://github.com/ccoreilly/vosk-browser
- Vosk ${MODEL} and vosk-model-small-en-us-0.15 (Apache License 2.0) https://alphacephei.com/vosk/models
TXT
ls -la stt
