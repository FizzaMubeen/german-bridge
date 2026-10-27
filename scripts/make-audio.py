#!/usr/bin/env python3
# © 2026 Fizza Mubeen. All rights reserved. See LICENSE.
"""Makes natural German audio for every card, story line and grammar example, and English audio for every meaning.

Runs on GitHub (workflow "Make audio") with the free Piper voice de_DE-thorsten-medium.
Output: audio/<key>.mp3 (small mono files) and audio/index.json (the list of keys).
The app plays audio/<key>.mp3 when it exists and falls back to the phone's own voice.

key = FNV-1a 32-bit hash of the normalised German text, as 8 hex digits.
The same function lives in assets/js/app.js (audioKey). Keep them identical.
"""
import json, os, re, subprocess, sys, tempfile, unicodedata, wave, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "audio"
VOICE = os.environ.get("VOICE", "de_DE-thorsten-medium")
VOICE_EN = os.environ.get("VOICE_EN", "en_US-lessac-medium")
LENGTH_EN = float(os.environ.get("LENGTH_SCALE_EN", "1.15"))
LENGTH = float(os.environ.get("LENGTH_SCALE", "1.28"))   # >1 = slower and clearer for learners


def norm(t):
    t = unicodedata.normalize("NFC", str(t)).strip()
    return re.sub(r"\s+", " ", t)


def key(t):
    h = 0x811C9DC5
    for b in norm(t).encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def speakable(t):
    """What the voice should actually say: no '...', no '(m)', alternatives joined with a pause."""
    t = norm(t)
    t = re.sub(r"\s*\([^)]*\)", "", t)
    t = t.replace("...", "").replace("…", "")
    t = " , ".join(p.strip() for p in t.split(" / ") if p.strip())
    t = re.sub(r"\s+([,.!?])", r"\1", t).strip(" ,")
    return t


def collect():
    texts = set()
    for line in (ROOT / "data/deck.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 6 and p[5]:
            texts.add(p[5])
    st = json.loads((ROOT / "data/stories.json").read_text(encoding="utf-8"))
    for s in st.get("stories", []):
        for pnl in s.get("panels", []):
            if pnl.get("de"):
                texts.add(pnl["de"])
        for v in s.get("words", {}).values():
            if isinstance(v, dict) and v.get("de"):
                texts.add(v["de"])
    # grammar examples: run the G and ORD tables from app.js through node
    js = (ROOT / "assets/js/app.js").read_text(encoding="utf-8")
    a, b = js.find("const G = {"), js.find("const FILL = {")
    if a > 0 and b > a:
        snippet = js[a:b] + """
const out = [];
for (const rows of Object.values(G)) for (const r of rows) out.push(String(r[4]).replace(/<[^>]+>/g, ""));
for (const blocks of Object.values(ORD)) for (const o of blocks) out.push(o.g.map(w => w.replace(/^[*^~]/, "")).join(" "));
console.log(JSON.stringify(out));"""
        snippet = "const esc=s=>s, spk=()=>'', colorDe=s=>s;\n" + snippet
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
            f.write(snippet)
        try:
            r = subprocess.run(["node", f.name], capture_output=True, text=True, timeout=60)
            if r.returncode == 0:
                texts.update(json.loads(r.stdout))
            else:
                print("grammar examples skipped:", r.stderr[-400:])
        finally:
            os.unlink(f.name)
    return {key(t): t for t in texts if speakable(t)}


def collect_en():
    """English meanings, for learners who want to hear English (key = hash of "en:" + text)."""
    texts = set()
    for line in (ROOT / "data/deck.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        p = [x.strip() for x in line.split("|")]
        if len(p) >= 6 and p[4]:
            texts.add(p[4])
    st = json.loads((ROOT / "data/stories.json").read_text(encoding="utf-8"))
    for s in st.get("stories", []):
        for pnl in s.get("panels", []):
            if pnl.get("en"):
                texts.add(pnl["en"])
        for v in s.get("words", {}).values():
            if isinstance(v, dict) and v.get("en"):
                texts.add(v["en"])
    return {key("en:" + norm(t)): t for t in texts if speakable(t)}


def load_voice(name=None):
    name = name or VOICE
    from piper import PiperVoice
    data = ROOT / "out/voices"
    data.mkdir(parents=True, exist_ok=True)
    if not any(data.glob(f"{name}*.onnx")):
        for cmd in ([sys.executable, "-m", "piper.download_voices", "--data-dir", str(data), name],
                    [sys.executable, "-m", "piper.download_voices", "--download-dir", str(data), name]):
            subprocess.run(cmd, capture_output=True, text=True, cwd=data)
            if any(data.glob(f"{name}*.onnx")):
                break
        else:
            sys.exit(f"Could not download the voice {name}")
    return PiperVoice.load(str(next(data.glob(f"{name}*.onnx"))))


def synth(voice, text, wav_path, length=None):
    length = LENGTH if length is None else length
    with wave.open(str(wav_path), "wb") as wf:
        try:
            from piper import SynthesisConfig
            voice.synthesize_wav(text, wf, syn_config=SynthesisConfig(length_scale=length))
        except ImportError:
            voice.synthesize(text, wf, length_scale=length)


def main():
    OUT.mkdir(exist_ok=True)
    # if the voice or speed changed, record everything again
    sig = {"voice": VOICE, "length": LENGTH, "v": 1}
    sig_file = OUT / "settings.json"
    old = json.loads(sig_file.read_text()) if sig_file.exists() else None
    if old != sig:
        for p in OUT.glob("*.mp3"):
            p.unlink()
        print("voice settings changed: recording everything again")
    sig_file.write_text(json.dumps(sig))
    want_de, want_en = collect(), collect_en()
    want = {**want_de, **want_en}
    have = {p.stem for p in OUT.glob("*.mp3")}
    print(f"{len(want_de)} German + {len(want_en)} English texts, {len(have)} files already made")
    tmp = pathlib.Path(tempfile.mkdtemp())
    for lang, items, voice_name, length in (("de", want_de, VOICE, LENGTH), ("en", want_en, VOICE_EN, LENGTH_EN)):
        todo = sorted(k for k in items if k not in have)
        print(f"{lang}: {len(todo)} to make")
        if not todo:
            continue
        voice = load_voice(voice_name)
        for i, k in enumerate(todo, 1):
            wav = tmp / f"{k}.wav"
            synth(voice, speakable(items[k]), wav, length)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                            "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=60,apad=pad_dur=0.12,loudnorm=I=-18:TP=-2",
                            "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", "40k", str(OUT / f"{k}.mp3")], check=True)
            wav.unlink()
            if i % 100 == 0:
                print(f"  {lang} {i}/{len(todo)}")
    stale = [p for p in OUT.glob("*.mp3") if p.stem not in want]
    for p in stale:
        p.unlink()
    (OUT / "index.json").write_text(json.dumps(sorted(want)), encoding="utf-8")
    size = sum(p.stat().st_size for p in OUT.glob("*.mp3"))
    print(f"done: {len(want)} files, {size/1e6:.1f} MB, removed {len(stale)} old files")


if __name__ == "__main__":
    if "--list" in sys.argv:
        w = collect()
        print(len(w), "texts")
        for k, t in list(w.items())[:8]:
            print(k, "|", t, "→", speakable(t))
    else:
        main()
