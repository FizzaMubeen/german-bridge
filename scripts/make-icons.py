#!/usr/bin/env python3
"""Draws the Wortzi mascot icon: a friendly speech-bubble character with der/die/das coloured cheeks.
Original artwork (no third-party logo). Run: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw
import pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets/icons"
INK, GOLD, CREAM = (28, 34, 32, 255), (224, 179, 74, 255), (250, 246, 236, 255)
BLUE, RED, GREEN = (127, 166, 238, 255), (240, 133, 152, 255), (111, 208, 156, 255)

def mascot(size, pad=0.0, bg=True):
    S = 1024
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if bg:
        d.rounded_rectangle([0, 0, S - 1, S - 1], int(S * 0.23), fill=INK)
    k = 1 - pad * 2; o = S * pad
    P = lambda x, y: (o + x * k, o + y * k)
    R = lambda v: v * k
    # speech bubble body + tail
    x0, y0, x1, y1 = P(170, 190) + P(854, 760)
    d.rounded_rectangle([x0, y0, x1, y1], int(R(230)), fill=GOLD)
    d.polygon([P(300, 700), P(250, 880), P(450, 735)], fill=GOLD)
    # eyes with a sparkle
    for ex in (395, 629):
        cx, cy = P(ex, 440); r = R(62)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=INK)
        r2 = R(20); d.ellipse([cx + R(14) - r2, cy - R(22) - r2, cx + R(14) + r2, cy - R(22) + r2], fill=CREAM)
    # smile
    d.arc([*P(400, 470), *P(624, 640)], 20, 160, fill=INK, width=int(R(30)))
    # cheeks: der / die / das
    for (cx, cy), col in (((290, 560), BLUE), ((734, 560), RED)):
        x, y = P(cx, cy); r = R(44); d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    x, y = P(512, 690); r = R(26); d.ellipse([x - r, y - r, x + r, y + r], fill=GREEN)
    return im.resize((size, size), Image.LANCZOS)

OUT.mkdir(parents=True, exist_ok=True)
for name, size, pad in (("icon-192.png", 192, 0), ("icon-512.png", 512, 0), ("apple-touch-icon.png", 180, 0), ("favicon-32.png", 32, 0)):
    mascot(size, pad).save(OUT / name)
mascot(512, 0.12).save(OUT / "maskable-512.png")          # safe zone for Android adaptive icons
mascot(1024, 0.0).save(OUT / "wortzi-1024.png")            # store / social use
mascot(512, 0.0, bg=False).save(OUT / "wortzi-mascot.png") # transparent mascot for slides
print("icons written to", OUT)
