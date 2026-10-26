#!/usr/bin/env bash
# Builds dist/german-bridge-wp.zip — a WordPress plugin that contains the whole app.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/get-fonts.sh || echo "⚠ Fonts could not be downloaded; the app will use the device's fonts."
P=wordpress-plugin/german-bridge
rm -rf "$P/app" && mkdir -p "$P/app"
cp -r index.html manifest.webmanifest sw.js assets data "$P/app/"
mkdir -p dist && rm -f dist/german-bridge-wp.zip
(cd wordpress-plugin && zip -qr ../dist/german-bridge-wp.zip german-bridge -x '*.DS_Store')
rm -rf "$P/app"
echo "✓ dist/german-bridge-wp.zip"
