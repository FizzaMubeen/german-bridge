#!/usr/bin/env bash
# Builds dist/wortzi-wp.zip — a WordPress plugin that contains the whole app.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/get-fonts.sh || echo "⚠ Fonts could not be downloaded; the app will use the device's fonts."
P=wordpress-plugin/wortzi
rm -rf "$P/app" && mkdir -p "$P/app"
cp -r index.html manifest.webmanifest sw.js assets data "$P/app/"
mkdir -p dist && rm -f dist/wortzi-wp.zip
(cd wordpress-plugin && zip -qr ../dist/wortzi-wp.zip wortzi -x '*.DS_Store')
rm -rf "$P/app"
echo "✓ dist/wortzi-wp.zip"
