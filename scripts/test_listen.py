"""Used by .github/workflows/test-listen.yml: plays out/test.wav into a virtual microphone and checks
that Wortzi's offline engine writes it down. Results are printed as GitHub notices."""
import json, time, traceback
from playwright.sync_api import sync_playwright

def note(kind, msg):
    msg = str(msg).replace("%", "%25").replace("\r", "").replace("\n", "%0A")
    print(f"::{kind}::{msg}", flush=True)

logs = []
ok = False
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
                                 "--use-file-for-fake-audio-capture=out/test.wav", "--autoplay-policy=no-user-gesture-required"])
    c = b.new_context(viewport={"width": 390, "height": 844}, permissions=["microphone"])
    p = c.new_page()
    p.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    p.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    try:
        p.goto("http://localhost:8765/#unit-greet"); p.wait_for_timeout(1500)
        for i in range(3):
            p.locator(".word").nth(i).locator("[data-known]").click()
        p.goto("http://localhost:8765/#unit-food"); p.wait_for_timeout(600)
        for w in ["Brot", "Kaffee"]:
            p.locator(f'.word:has-text("{w}")').first.locator("[data-known]").click()
        p.goto("http://localhost:8765/#listen"); p.wait_for_timeout(800)
        p.click("#lOk"); p.wait_for_timeout(300)
        if p.locator('[data-stt="offline"]').count():
            p.click('[data-stt="offline"]')
        p.screenshot(path="out/listen-1-start.png")
        t = time.time()
        p.click("#sttGet")
        p.wait_for_selector("#micBtn", timeout=180000)
        note("notice", f"model downloaded in {time.time()-t:.1f}s")
        p.screenshot(path="out/listen-2-ready.png")
        t = time.time()
        p.click("#micBtn")
        try:
            p.wait_for_function("document.querySelectorAll('#liveBox .lline:not(.interim)').length > 0", timeout=90000)
        except Exception:
            pass
        p.wait_for_timeout(6000)
        p.screenshot(path="out/listen-3-heard.png")
        heard = p.eval_on_selector_all("#liveBox .lline", "els => els.map(e => e.textContent.replace(/\\s+/g,' ').trim())")
        score = p.text_content("#liveScore") or ""
        cheer = p.text_content("#cheer") or ""
        err = p.text_content("#micErr") or ""
        note("notice", f"first text after {time.time()-t:.1f}s")
        note("notice", "HEARD: " + json.dumps(heard, ensure_ascii=False))
        note("notice", f"SCORE: {' '.join(score.split())} | CHEER: {cheer} | ERROR: {err}")
        ok = bool(heard)
    except Exception:
        note("error", traceback.format_exc()[-1500:])
        try: p.screenshot(path="out/listen-error.png")
        except Exception: pass
    note("notice", "LOGS: " + " || ".join(logs[-25:])[:3500])
    b.close()
if not ok:
    note("error", "Nothing was recognised")
    raise SystemExit(1)
