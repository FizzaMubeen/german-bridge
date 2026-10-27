// Used by .github/workflows/test-listen.yml
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--use-file-for-fake-audio-capture=out/test.wav", "--autoplay-policy=no-user-gesture-required"] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  const p = await c.newPage();
  const logs = [];
  p.on("console", m => logs.push(m.type() + ": " + m.text()));
  p.on("pageerror", e => logs.push("pageerror: " + e.message));
  await p.goto("http://localhost:8765/#unit-greet");
  await p.waitForTimeout(1500);
  // the learner already knows a few words
  for (let i = 0; i < 3; i++) await p.click(`.word >> nth=${i} >> [data-known]`);
  await p.goto("http://localhost:8765/#unit-food"); await p.waitForTimeout(600);
  for (const w of ["das Brot", "der Kaffee"]) await p.click(`.word:has-text("${w.split(" ")[1]}") >> [data-known]`).catch(() => {});
  await p.goto("http://localhost:8765/#listen"); await p.waitForTimeout(800);
  await p.click("#lOk");
  await p.click('[data-stt="offline"]').catch(() => {});
  await p.screenshot({ path: "out/listen-1-start.png" });
  await p.click("#sttGet");
  await p.waitForFunction(() => document.querySelector("#micBtn"), null, { timeout: 180000 });
  await p.screenshot({ path: "out/listen-2-ready.png" });
  const t0 = Date.now();
  await p.click("#micBtn");
  await p.waitForFunction(() => document.querySelectorAll("#liveBox .lline:not(.interim)").length > 0, null, { timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(6000);
  await p.screenshot({ path: "out/listen-3-heard.png" });
  const heard = await p.$$eval("#liveBox .lline", els => els.map(e => e.textContent.replace(/\s+/g, " ").trim()));
  const score = await p.textContent("#liveScore").catch(() => "");
  const cheer = await p.textContent("#cheer").catch(() => "");
  const err = await p.textContent("#micErr").catch(() => "");
  console.log("seconds:", Math.round((Date.now() - t0) / 1000));
  console.log("HEARD:", JSON.stringify(heard, null, 1));
  console.log("SCORE:", score.replace(/\s+/g, " "), "| CHEER:", cheer, "| ERROR:", err);
  console.log("LOGS:\n" + logs.slice(-40).join("\n"));
  await p.click("#micBtn").catch(() => {});
  await b.close();
  if (!heard.length) { console.error("Nothing was recognised"); process.exit(1); }
})();
