#!/usr/bin/env bash
# Downloads the open-source (SIL OFL) fonts once, so the app never loads
# anything from Google or another server while people use it (GDPR-friendly).
# Run from the project root:  bash scripts/get-fonts.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/fonts
base="https://cdn.jsdelivr.net/fontsource/fonts"
get(){ # family file
  if [ ! -s "assets/fonts/$1-$2" ]; then
    echo "↓ $1 $2"; curl -fsSL --retry 3 --connect-timeout 15 --max-time 60 "$base/$1@latest/$2" -o "assets/fonts/$1-$2"
  fi
}
get noto-nastaliq-urdu arabic-400-normal.woff2
get noto-sans-devanagari devanagari-400-normal.woff2
get noto-sans-devanagari devanagari-600-normal.woff2
get atkinson-hyperlegible latin-400-normal.woff2
get atkinson-hyperlegible latin-700-normal.woff2
get young-serif latin-400-normal.woff2
get jetbrains-mono latin-400-normal.woff2
get jetbrains-mono latin-600-normal.woff2
echo "Fonts ready in assets/fonts/"
