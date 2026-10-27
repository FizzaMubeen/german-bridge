#!/usr/bin/env python3
"""Builds dist/wortzi-standalone.html: the whole app in ONE file.
You can open it by double-click, send it on WhatsApp, or upload it anywhere.
(Progress is saved in whatever browser opens it.)"""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/"index.html").read_text(encoding="utf-8")
css = (root/"assets/css/app.css").read_text(encoding="utf-8")
js = (root/"assets/js/app.js").read_text(encoding="utf-8")
deck = (root/"data/deck.txt").read_text(encoding="utf-8")
guide = (root/"data/guide.html").read_text(encoding="utf-8")
stories = (root/"data/stories.json").read_text(encoding="utf-8")
extras = (root/"data/extras.json").read_text(encoding="utf-8")
mode = sys.argv[1] if len(sys.argv) > 1 else "standalone"

def safe(s): return s.replace("</script", "<\\/script")
inline = (f'<script type="text/plain" id="deck-src">{safe(deck)}</script>\n'
          f'<script type="text/plain" id="guide-src">{safe(guide)}</script>\n'
          f'<script type="text/plain" id="stories-src">{safe(stories)}</script>\n'
          f'<script type="text/plain" id="extras-src">{safe(extras)}</script>\n'
          f'<script>{safe(js)}</script>')
html = html.replace('<script src="assets/js/app.js" defer></script>', inline)
html = html.replace('<link rel="stylesheet" href="assets/css/app.css">', f"<style>{css}</style>")
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n', "", html)
html = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n', "", html)
html = html.replace('<img src="assets/icons/icon-192.png" alt="" width="30" height="30">', '<span style="display:inline-grid;place-items:center;width:30px;height:30px;border-radius:8px;background:var(--ink);color:var(--accent);font:600 12px var(--f-mono)">DE</span>')
if mode == "preview":
    html = html.replace('<link rel="stylesheet" href="assets/css/fonts.css">',
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Noto+Nastaliq+Urdu&family=Noto+Sans+Devanagari:wght@400;600&family=Young+Serif&family=JetBrains+Mono:wght@400;600&display=swap">')
    body = re.search(r"<!--APP-->(.*)<!--/APP-->", html, re.S).group(1)
    head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
    head = re.sub(r'<meta (charset|name="viewport"|name="apple)[^>]*>\n', "", head)
    out = '<meta name="claude:viewport-fit-sides" content="cover">\n' + head + body
    target = root/"dist/preview.html"
else:
    html = html.replace('<link rel="stylesheet" href="assets/css/fonts.css">', "")
    out = html
    target = root/"dist/wortzi-standalone.html"
target.parent.mkdir(exist_ok=True)
target.write_text(out, encoding="utf-8")
print("✓", target.relative_to(root))
