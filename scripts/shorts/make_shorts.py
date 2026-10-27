#!/usr/bin/env python3
"""
German Bridge — 30-day shorts maker.

Turns the flashcards in data/deck.txt into vertical 1080x1920 videos
(Instagram Reels, TikTok, YouTube Shorts), plus captions and a posting calendar.

Each video: a hook, then 3 words (German spoken, then the English meaning spoken,
Urdu shown on screen), and an ending with the app address. About 20 seconds.

Voices: free, open-source Piper voices (German + English), downloaded automatically.
Run without voices for a quick visual test:  --no-voice

Usage:
  python scripts/shorts/make_shorts.py --days 30 --start 2026-11-02
  python scripts/shorts/make_shorts.py --days 2 --no-voice        # quick test
Output: out/shorts/day-01.mp4 … , out/shorts/calendar.csv, out/shorts/captions.md
"""
import argparse, csv, datetime as dt, html, json, os, pathlib, random, shutil, subprocess, sys, wave

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "out" / "shorts"
WORK = ROOT / "out" / "shorts-work"
SITE = "germanbridge.fizzamubeen.com"
VOICE_DE = os.environ.get("VOICE_DE", "de_DE-thorsten-medium")
VOICE_EN = os.environ.get("VOICE_EN", "en_US-lessac-medium")
W, H, FPS = 1080, 1920, 30

# ---------------------------------------------------------------- content
def parse_deck():
    units, cur = [], None
    for raw in (ROOT / "data/deck.txt").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or (line.startswith("#") and not line.startswith("##")):
            continue
        if line.startswith("##"):
            uid, level, emoji, title = [x.strip() for x in line[2:].split("|")]
            cur = {"id": uid, "level": level, "emoji": emoji, "title": title, "cards": []}
            units.append(cur)
            continue
        p = [x.strip() for x in line.split("|")]
        if cur and len(p) >= 6:
            cur["cards"].append({"v": p[0], "ur": p[1], "rom": p[2], "hi": p[3], "en": p[4], "de": p[5]})
    return units

HOOKS = [
    "3 German words for {t}",
    "Say this in Germany: {t}",
    "Learn German in 20 seconds: {t}",
    "You need these in Berlin: {t}",
    "Urdu → German: {t}",
]

def plan(units, days, start):
    """Pick 3 short, useful cards per day, cycling through units in learning order."""
    pools = {u["id"]: [c for c in u["cards"] if len(c["de"]) <= 30] for u in units}
    pos = {u["id"]: 0 for u in units}
    out, i = [], 0
    while len(out) < days:
        u = units[i % len(units)]
        pool = pools[u["id"]]
        k = pos[u["id"]]
        if k + 3 <= len(pool):
            pos[u["id"]] = k + 3
            day = len(out) + 1
            title = u["title"].split("&")[0].strip().lower() if u["id"] not in ("greet",) else "saying hello"
            out.append({
                "day": day, "date": (start + dt.timedelta(days=day - 1)).isoformat(),
                "unit": u, "cards": pool[k:k + 3],
                "hook": HOOKS[(day - 1) % len(HOOKS)].format(t=title).replace(
                    "3 German words", "3 German phrases" if any(len(c["de"].split()) > 2 for c in pool[k:k + 3]) else "3 German words"),
            })
        i += 1
        if i > 10000:
            break
    return out

def caption(p):
    words = ", ".join(c["de"] for c in p["cards"])
    tags = "#learngerman #deutschlernen #germanforbeginners #urdu #pakistanisingermany #berlin #languagelearning #germanbridge"
    return (f"{p['hook']} 🇩🇪\n\n{words}\n\n"
            f"Practise these and 1,000 more for free (works offline, no sign-up): {SITE}\n"
            f"Which word should be next? Comment below 👇\n\n{tags}")

# ---------------------------------------------------------------- visuals
GENDER = {"der": ("#2f5fb3", "#e6eefb"), "die": ("#c03a52", "#fbe8ec"), "das": ("#23845a", "#e1f3e9")}

def font_css():
    f = ROOT / "assets/fonts"
    def face(fam, file, wt):
        p = f / file
        return f"@font-face{{font-family:'{fam}';src:url('{p.as_uri()}') format('woff2');font-weight:{wt}}}" if p.exists() else ""
    return "".join([
        face("Atkinson Hyperlegible", "atkinson-hyperlegible-latin-400-normal.woff2", 400),
        face("Atkinson Hyperlegible", "atkinson-hyperlegible-latin-700-normal.woff2", 700),
        face("Young Serif", "young-serif-latin-400-normal.woff2", 400),
        face("Noto Nastaliq Urdu", "noto-nastaliq-urdu-arabic-400-normal.woff2", 400),
        face("JetBrains Mono", "jetbrains-mono-latin-600-normal.woff2", 600),
    ])

BASE_CSS = """
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;background:#f5f6f2;color:#1c2220;font-family:'Atkinson Hyperlegible',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:150px 80px 170px;overflow:hidden}
.brand{display:flex;align-items:center;gap:16px;font-family:'Young Serif',Georgia,serif;font-size:44px}
.bars{display:flex;align-items:flex-end;gap:7px;height:46px}.bars i{display:block;width:12px;border-radius:6px}
.main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;width:100%;text-align:center}
.card{width:100%;background:#fff;border:2px solid #dce1da;border-radius:56px;padding:90px 60px 80px;display:flex;flex-direction:column;align-items:center;gap:26px}
.vis{font-size:220px;line-height:1.1}
.vis.txt{font-family:'Young Serif',serif;font-size:150px;padding:10px 50px;border-radius:40px;background:#eef0ea}
.de{font-size:104px;font-weight:700;line-height:1.15}
.tag{font-family:'JetBrains Mono',monospace;font-size:.5em;font-weight:600;padding:4px 18px;border-radius:14px;vertical-align:.25em;margin-right:14px}
.ur{font-family:'Noto Nastaliq Urdu',serif;font-size:76px;line-height:2;direction:rtl}
.en{font-size:54px;color:#5b6561}
.rom{font-size:38px;color:#8a938f;font-style:italic}
.line{width:70%;border-top:4px dashed #dce1da;margin:10px 0}
.dots{display:flex;gap:18px}.dots i{width:22px;height:22px;border-radius:50%;background:#dce1da}.dots i.on{background:#23845a}
.site{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:40px;color:#a17306}
.hook{font-family:'Young Serif',serif;font-size:112px;line-height:1.12}
.sub{font-size:48px;color:#5b6561}
.cta{font-family:'Young Serif',serif;font-size:96px;line-height:1.15}
.pill{font-size:44px;font-weight:700;padding:22px 44px;border-radius:999px;background:#b8860b;color:#1d1606}
.list{display:flex;flex-direction:column;gap:22px;font-size:46px;text-align:left}
"""

def brand():
    return ('<div class="brand"><div class="bars"><i style="height:20px;background:#7fa6ee"></i>'
            '<i style="height:32px;background:#f08598"></i><i style="height:44px;background:#6fd09c"></i></div>German Bridge</div>')

def de_html(de):
    first = de.split(" ")[0]
    if first in GENDER and len(de.split(" ")) > 1 and de.split(" ")[1][:1].isupper():
        fg, bg = GENDER[first]
        rest = de[len(first) + 1:]
        return f'<span style="color:{fg}"><span class="tag" style="background:{bg}">{first}</span>{html.escape(rest)}</span>'
    return html.escape(de)

def border(de):
    first = de.split(" ")[0]
    return GENDER.get(first, ("#dce1da",))[0] if first in GENDER else "#dce1da"

def page(body):
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{font_css()}{BASE_CSS}</style></head><body>{body}</body></html>"

def dots(n, on):
    return '<div class="dots">' + "".join(f'<i class="{"on" if i <= on else ""}"></i>' for i in range(n)) + "</div>"

def slide_hook(p):
    u = p["unit"]
    return page(f'{brand()}<div class="main"><div class="vis">{html.escape(u["emoji"])}</div>'
                f'<div class="hook">{html.escape(p["hook"])}</div>'
                f'<div class="sub">German · اردو · English</div></div><div class="site">{SITE}</div>')

def slide_card(p, idx, reveal):
    c = p["cards"][idx]
    is_txt = all(ord(ch) < 128 or ch == "½" for ch in c["v"])
    back = (f'<div class="line"></div><div class="ur">{html.escape(c["ur"])}</div>'
            f'<div class="rom">{html.escape(c["rom"])}</div><div class="en">{html.escape(c["en"])}</div>') if reveal else \
           '<div class="sub" style="margin-top:20px">Do you know it?</div>'
    return page(f'{brand()}<div class="main"><div class="card" style="border-top:18px solid {border(c["de"])}">'
                f'<div class="vis{" txt" if is_txt else ""}">{html.escape(c["v"])}</div>'
                f'<div class="de">{de_html(c["de"])}</div>{back}</div>{dots(len(p["cards"]), idx)}</div>'
                f'<div class="site">{SITE}</div>')

def slide_cta(p):
    items = "".join(f'<div>✓ {de_html(c["de"])}</div>' for c in p["cards"])
    return page(f'{brand()}<div class="main"><div class="cta">Practise these + 1,000 more</div>'
                f'<div class="list">{items}</div>'
                f'<div class="sub">Free · works offline · no sign-up</div>'
                f'<div class="pill">{SITE}</div></div><div class="sub">Follow for a new word every day</div>')

# ---------------------------------------------------------------- audio
class Voice:
    def __init__(self, enabled):
        self.enabled = enabled
        self.data = WORK / "voices"
        if enabled:
            self.data.mkdir(parents=True, exist_ok=True)
            for v in (VOICE_DE, VOICE_EN):
                if any(self.data.glob(f"{v}*.onnx")):
                    continue
                # piper-tts changed its command line between versions: try the known forms
                for cmd in ([sys.executable, "-m", "piper.download_voices", "--data-dir", str(self.data), v],
                            [sys.executable, "-m", "piper.download_voices", "--download-dir", str(self.data), v],
                            [sys.executable, "-m", "piper.download_voices", v]):
                    subprocess.run(cmd, capture_output=True, text=True, cwd=self.data)
                    if any(self.data.glob(f"{v}*.onnx")):
                        break
                else:
                    sys.exit(f"Could not download the voice {v}")

    def say(self, text, voice, out):
        if not self.enabled:
            return None
        model = next(self.data.glob(f"{voice}*.onnx"))
        text = text.split(" / ")[0]
        r = subprocess.run([sys.executable, "-m", "piper", "-m", str(model), "-f", str(out), "--", text], capture_output=True, text=True)
        if r.returncode != 0 or not out.exists():   # older piper: text on stdin
            run_in = subprocess.run([sys.executable, "-m", "piper", "--model", str(model), "--output_file", str(out)], input=text, capture_output=True, text=True)
            if run_in.returncode != 0 or not out.exists():
                sys.exit(f"Piper failed for '{text}':\n{r.stderr[-800:]}\n{run_in.stderr[-800:]}")
        return out

def wav_len(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / float(w.getframerate())

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"Command failed: {' '.join(cmd)}\n{r.stderr[-2000:]}")
    return r

# ---------------------------------------------------------------- video
def segment(png, audio, dur, out, lead=0.35):
    """One still slide, with optional speech starting after a short lead-in."""
    vf = f"scale={W}:{H},format=yuv420p,fade=t=in:st=0:d=0.25"
    if audio:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", str(png), "-i", str(audio),
               "-filter_complex", f"[1:a]adelay={int(lead*1000)}|{int(lead*1000)},apad,aresample=44100,aformat=channel_layouts=stereo[a]",
               "-map", "0:v", "-map", "[a]", "-vf", vf, "-t", f"{dur:.2f}", "-r", str(FPS),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-tune", "stillimage", "-c:a", "aac", "-b:a", "160k", str(out)]
    else:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", str(png),
               "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-vf", vf, "-t", f"{dur:.2f}", "-r", str(FPS),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-tune", "stillimage", "-c:a", "aac", "-b:a", "160k", "-shortest", str(out)]
    run(cmd)

def concat(parts, out):
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", "-movflags", "+faststart", str(out)])
    lst.unlink()

def make(p, browser, voice):
    d = WORK / f"day-{p['day']:02d}"
    d.mkdir(parents=True, exist_ok=True)
    pg = browser.new_page(viewport={"width": W, "height": H})
    def shot(html_doc, name):
        pg.set_content(html_doc, wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        f = d / f"{name}.png"; pg.screenshot(path=str(f)); return f
    parts = []
    seg = lambda png, audio, dur, name: (segment(png, audio, dur, d / f"{name}.mp4"), parts.append(d / f"{name}.mp4"))
    seg(shot(slide_hook(p), "0-hook"), None, 2.2, "0-hook")
    for i, c in enumerate(p["cards"]):
        a1 = voice.say(c["de"], VOICE_DE, d / f"{i}-de.wav")
        seg(shot(slide_card(p, i, False), f"{i+1}a"), a1, (wav_len(a1) + 0.9) if a1 else 2.0, f"{i+1}a")
        a2 = voice.say(c["en"], VOICE_EN, d / f"{i}-en.wav")
        a3 = voice.say(c["de"], VOICE_DE, d / f"{i}-de2.wav")
        if a2 and a3:  # meaning, then German again
            both = d / f"{i}-both.wav"
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(a2), "-f", "lavfi", "-t", "0.45", "-i", "anullsrc=r=22050:cl=mono", "-i", str(a3),
                 "-filter_complex", "[0:a]aresample=22050,aformat=channel_layouts=mono[x];[2:a]aresample=22050,aformat=channel_layouts=mono[z];[x][1:a][z]concat=n=3:v=0:a=1", str(both)])
            dur = wav_len(both) + 1.1
        else:
            both, dur = None, 2.6
        seg(shot(slide_card(p, i, True), f"{i+1}b"), both, dur, f"{i+1}b")
    seg(shot(slide_cta(p), "9-cta"), None, 3.2, "9-cta")
    pg.close()
    out = OUT / f"day-{p['day']:02d}.mp4"
    concat(parts, out)
    shutil.copy(d / "1b.png", OUT / f"day-{p['day']:02d}-cover.png")
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--start", default=None, help="first posting date YYYY-MM-DD (default: next Monday)")
    ap.add_argument("--only", type=int, default=0, help="render just this day number")
    ap.add_argument("--no-voice", action="store_true")
    a = ap.parse_args()
    today = dt.date.today()
    start = dt.date.fromisoformat(a.start) if a.start else today + dt.timedelta(days=(7 - today.weekday()) % 7 or 7)
    units = parse_deck()
    days = plan(units, a.days, start)
    OUT.mkdir(parents=True, exist_ok=True)
    voice = Voice(not a.no_voice)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for p in days:
            if a.only and p["day"] != a.only:
                continue
            f = make(p, browser, voice)
            print(f"✓ {f.name}  {p['date']}  {p['hook']}")
        browser.close()
    with open(OUT / "calendar.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["day", "post_date", "post_time_berlin", "video", "cover", "title", "words", "caption"])
        for p in days:
            w.writerow([p["day"], p["date"], "18:30", f"day-{p['day']:02d}.mp4", f"day-{p['day']:02d}-cover.png",
                        p["hook"], " | ".join(c["de"] for c in p["cards"]), caption(p)])
    with open(OUT / "captions.md", "w", encoding="utf-8") as fh:
        fh.write("# German Bridge — 30 days of shorts\n\nPost each video on Instagram Reels, TikTok and YouTube Shorts.\n\n")
        for p in days:
            fh.write(f"## Day {p['day']} · {p['date']} · 18:30\n\n**Video:** day-{p['day']:02d}.mp4\n\n```\n{caption(p)}\n```\n\n")
    print(f"Done: {OUT}")

if __name__ == "__main__":
    main()
