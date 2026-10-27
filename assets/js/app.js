/*!
 * Wortzi — learn everyday German from Urdu, Hindi or English.
 * Plain JavaScript, no build step, no tracking. All personal data stays in the browser (localStorage).
 * Content lives in data/deck.txt (flashcards) and data/guide.html (grammar lessons).
 */
(() => {
"use strict";
const APP_VERSION = "1.7.1";
const KEY = "gb-v1";

/* =====================================================================
   SMALL HELPERS
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const DAY = 86400000;
const dayKey = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today = () => dayKey(new Date());
const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d.getTime(); };
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const uniq = arr => [...new Map(arr.map(c => [c.id, c])).values()];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, {day:"numeric", month:"short", year:"numeric"});
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

/* Running inside the Claude preview? Printing and downloads are blocked there. */
const SANDBOX = (() => {
  try { const ao = location.ancestorOrigins; if(ao && ao.length && [...ao].some(o => /claude\.ai|claudeusercontent/.test(o))) return true; } catch(e){}
  return /claudeusercontent|claude\.ai/.test(location.hostname);
})();

const PLURAL = /^(Bücher|Eltern|Kinder|Geschwister|Leute|Haare|Socken|Handschuhe|Trauben|Linsen|USA|Nebenkosten|Ersparnisse|Zinsen|Kenntnisse|Hausaufgaben|Ferien|Tropfen|Zähne|Kopfschmerzen)$/;
function genderOf(de){ const m = /^(der|die|das)\s+([A-ZÄÖÜ]\S*)/.exec(de||""); if(!m) return ""; if(m[1]==="die" && PLURAL.test(m[2])) return "p"; return {der:"m",die:"f",das:"n"}[m[1]]; }
function colorDe(s){
  return esc(s).replace(/\b(der|die|das)\s+([A-ZÄÖÜ][\wäöüß-]*)/g, (m,a,w) => {
    const c = a==="die" && PLURAL.test(w) ? "p" : {der:"m",die:"f",das:"n"}[a];
    return `<span class="${c}"><span class="tag ${c}">${a}</span> ${w}</span>`;
  });
}
const isTextVisual = v => /^[\x00-\x7F½]+$/.test(v||"");

/* ---------- line icons (one consistent set for every control) ---------- */
const ICONS = {
  volume:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  play:'<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  quiz:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  cards:'<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
  left:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  right:'<path d="M5 12h14M12 5l7 7-7 7"/>',
  printer:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
const ic = (n, cls="") => `<svg class="ic${cls?" "+cls:""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||""}</svg>`;
/* =====================================================================
   SPEECH — recorded natural voice first (audio/*.mp3, made by scripts/make-audio.py),
   the device's own German voice as a fallback. Nothing is sent anywhere.
   ===================================================================== */
let voice = null, AUDIO = null;
const canTTS = "speechSynthesis" in window;
const canSpeak = true;                    // recordings play everywhere; the 🔊 buttons always show
const normTxt = t => String(t||"").normalize("NFC").trim().replace(/\s+/g," ");
function audioKey(t){ let h = 0x811c9dc5; for(const b of new TextEncoder().encode(normTxt(t))){ h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8,"0"); }
function pickVoice(){
  try{ const vs = speechSynthesis.getVoices().filter(v => /^de([-_]|$)/i.test(v.lang));
    const score = v => (/de[-_]DE/i.test(v.lang)?4:0) + (/google|natural|neural|premium|enhanced|anna|helena|katja|petra|markus/i.test(v.name)?3:0) + (v.localService?1:0);
    voice = vs.sort((a,b) => score(b)-score(a))[0] || null; }catch(e){}
}
if(canTTS){ try{ pickVoice(); speechSynthesis.addEventListener("voiceschanged", pickVoice); }catch(e){} }
const player = typeof Audio !== "undefined" ? new Audio() : null;
let lastSaid = {t:"", at:0};
function ttsText(t){ return normTxt(t).replace(/\s*\([^)]*\)/g,"").replace(/\.\.\.|…/g,"").split(" / ").join(", ").replace(/\s+([,.!?])/g,"$1").replace(/^[ ,]+|[ ,]+$/g,""); }
function speakTTS(text, slow){
  if(!canTTS){ toast("This browser has no German voice. Try Chrome or Safari."); return; }
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(ttsText(text));
    u.lang = "de-DE"; if(voice) u.voice = voice; u.rate = slow ? .68 : .88;
    speechSynthesis.resume(); speechSynthesis.speak(u);
    // Chrome sometimes drops an utterance spoken straight after cancel(): try once more if it never started
    setTimeout(() => { try{ if(!speechSynthesis.speaking && !speechSynthesis.pending) speechSynthesis.speak(u); }catch(e){} }, 250);
  }catch(e){}
}
function playRecording(k, slow, text){
  // play() must run straight from the tap (iPhone/Safari block sound that starts later), so no awaiting before it
  player.pause();
  player.src = "audio/"+k+".mp3";
  player.playbackRate = slow ? .75 : 1;
  try{ player.preservesPitch = true; player.webkitPreservesPitch = true; }catch(e){}
  const pr = player.play();
  if(pr && pr.catch) pr.catch(err => { if(err && err.name !== "AbortError") speakTTS(text, slow); });
}
function say(text, cardId){
  const t = normTxt(text), now = Date.now();
  const slow = lastSaid.t === t && now - lastSaid.at < 5000;     // tap again = slower
  lastSaid = {t, at: now};
  const k = audioKey(t);
  if(player && AUDIO && AUDIO.has(k)) playRecording(k, slow, t);
  else speakTTS(t, slow);
  if(slow) toast("Slower", {kind:"info"});
  if(cardId && S){ const r = S.cards[cardId] || (S.cards[cardId] = {b:-1}); r.l = (r.l||0) + 1; S.listens = (S.listens||0) + 1; save(); }
}
async function saveAllAudio(btn){
  if(!AUDIO) return;
  const keys = [...AUDIO]; let done = 0, failed = 0; btn.disabled = true;
  const work = async () => { while(keys.length){ const k = keys.pop(); try{ const r = await fetch("audio/"+k+".mp3"); if(!r.ok) failed++; }catch(e){ failed++; } done++; if(done % 25 === 0) btn.textContent = `Saving audio… ${Math.round(done/AUDIO.size*100)}%`; } };
  await Promise.all([work(), work(), work(), work(), work(), work()]);
  btn.textContent = failed ? `Saved ${done-failed} of ${done}. Try again on Wi-Fi.` : "✓ All audio saved. It works offline now.";
  if(!failed) toast("All audio is saved on this device", {kind:"ok"});
}
async function loadAudioIndex(){
  try{ const r = await fetch("audio/index.json", {cache:"no-cache"}); if(r.ok){ const a = await r.json(); if(Array.isArray(a)) AUDIO = new Set(a); } }catch(e){}
}
const spk = (t, id) => canSpeak ? `<button class="speak" type="button" data-say="${esc(t)}" ${id?`data-sid="${esc(id)}"`:""} aria-label="Listen to the German">${ic("volume")}Listen</button>` : "";
document.addEventListener("click", e => { const b = e.target.closest("[data-say]"); if(b){ e.preventDefault(); e.stopPropagation(); say(b.dataset.say, b.dataset.sid); } }, true);

/* =====================================================================
   CONTENT
   ===================================================================== */
let UNITS = [], DECK = [], GUIDE = null, STORIES = [], EXTRAS = {tricks:[], facts:[], jokes:[]};
async function getText(inlineId, url){
  const el = document.getElementById(inlineId);
  if(el) return el.textContent;
  const r = await fetch(url, {cache:"no-cache"});
  if(!r.ok) throw new Error(url+" "+r.status);
  return r.text();
}
function parseDeck(txt){
  const units = [], deck = []; let cur = null, n = 0;
  txt.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if(!line || (line.startsWith("#") && !line.startsWith("##"))) return;
    if(line.startsWith("##")){
      const [id,level,emoji,title] = line.slice(2).trim().split("|").map(s=>s.trim());
      cur = {id, level, emoji, title, n: ++n, cards: []}; units.push(cur); return;
    }
    if(!cur) return;
    const p = line.split("|").map(s=>s.trim());
    if(p.length < 6) return;
    const [v,u,r,hi,en,de] = p;
    const c = {id: cur.id+":"+de, unit: cur.id, level: cur.level, v, u, r, hi, en, de, g: genderOf(de)};
    cur.cards.push(c); deck.push(c);
  });
  return {units, deck};
}

/* =====================================================================
   STATE — saved only in this browser
   ===================================================================== */
const DEFAULTS = () => ({
  format:1, created: Date.now(),
  cards:{}, known:{}, want:{}, custom:[], storiesRead:{}, listenSessions:[],
  xp:0, days:{}, badges:{}, sessions:0, perfect:0, quizzes:0, listens:0, reports:0, written:0, spoken:0,
  settings:{level:"A1", name:"", base:"ur", front:"de", mode:"flip", goal:20, theme:"system", autoplay:false, hideInstall:0, extra:{rom:true, en:true, ur:false, hi:false}}
});
let S = null;
function sanitize(raw){
  const d = DEFAULTS(); if(!raw || typeof raw !== "object") return d;
  const num = (v, def=0) => Number.isFinite(+v) ? +v : def;
  const out = d;
  out.created = num(raw.created, Date.now());
  for(const [k,v] of Object.entries(raw.cards||{})){ if(typeof k==="string" && k.length<300 && v && typeof v==="object") out.cards[k] = {b: Math.max(-1, Math.min(8, num(v.b,-1))), due: num(v.due,0), seen: num(v.seen,0), l: num(v.l,0)}; }
  for(const key of ["known","want"]) for(const [k,v] of Object.entries(raw[key]||{})) if(typeof k==="string" && k.length<300) out[key][k] = num(v, Date.now());
  out.custom = (Array.isArray(raw.custom)?raw.custom:[]).filter(c => c && /^my-[a-z0-9]{4,24}$/.test(c.id) && c.de).slice(0,5000).map(c => ({
    id:c.id, v:clip(c.v,8)||"📝", de:clip(c.de,200), my:clip(c.my,200), en:clip(c.en,200), note:clip(c.note,300), created:num(c.created,Date.now())}));
  for(const k of ["xp","sessions","perfect","quizzes","listens","reports","written","spoken"]) out[k] = Math.max(0, num(raw[k],0));
  out.listenSessions = (Array.isArray(raw.listenSessions)?raw.listenSessions:[]).slice(0,40).map(x => ({at:num(x&&x.at,0), w:Math.max(0,num(x&&x.w,0)), k:Math.max(0,num(x&&x.k,0)), src: (x&&x.src)==="text"?"text":"mic"})).filter(x => x.w > 0);
  for(const [k,v] of Object.entries(raw.storiesRead||{})) if(/^[a-z0-9-]{1,40}$/.test(k)) out.storiesRead[k] = num(v, Date.now());
  for(const [k,v] of Object.entries(raw.days||{})) if(/^\d{4}-\d{2}-\d{2}$/.test(k)) out.days[k] = Math.max(0, num(v,0));
  for(const [k,v] of Object.entries(raw.badges||{})) if(typeof k==="string" && k.length<40) out.badges[k] = clip(v,20);
  const s = raw.settings||{};
  out.settings = {
    level: ["A1","A2","B1"].includes(s.level)?s.level:"A1", name: clip(s.name,60), base: ["ur","hi","en"].includes(s.base)?s.base:"ur", front: s.front==="base"?"base":"de",
    mode: s.mode==="quiz"?"quiz":"flip", goal: [10,20,40].includes(+s.goal)?+s.goal:20, theme: ["light","dark"].includes(s.theme)?s.theme:"system",
    autoplay: !!s.autoplay, listenOk: !!s.listenOk, hideInstall: Math.max(0, num(s.hideInstall,0)), extra: {rom: s.extra?.rom!==false, en: s.extra?.en!==false, ur: !!s.extra?.ur, hi: !!s.extra?.hi}
  };
  return out;
}
function load(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  if(!raw){ // carry over progress from the first preview versions
    try{
      const old = JSON.parse(localStorage.getItem("udb-v3"));
      if(old){ raw = old; Object.values(raw.cards||{}).forEach(r => { r.due = Date.now(); }); }
    }catch(e){}
  }
  S = sanitize(raw);
}
let saveWarned = false;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }
  catch(e){ if(!saveWarned){ saveWarned = true; toast("Your browser is not saving progress (private mode or storage full). Use Me → Backup to keep it."); } }
}

/* =====================================================================
   CARDS, LISTS, SPACED REPETITION
   ===================================================================== */
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60, 120]; // days until the next review, by box
let CUSTOM = [], BYID = new Map();
function rebuildIndex(){
  CUSTOM = S.custom.map(c => ({id:c.id, unit:"mine", level:"Mine", custom:true, v:c.v||"📝", de:c.de, my:c.my, en:c.en, note:c.note, created:c.created, g:genderOf(c.de)}));
  BYID = new Map([...DECK, ...CUSTOM].map(c => [c.id, c]));
}
const allCards = () => [...DECK, ...CUSTOM];
const rec = c => S.cards[c.id];
const boxOf = c => { const r = rec(c); return r ? r.b : -1; };
const seen = c => boxOf(c) >= 0;
const mastered = c => boxOf(c) >= 3;
const isLearned = c => !!S.known[c.id] || mastered(c);
const isWanted = c => !!S.want[c.id] && !isLearned(c);
const isDue = c => seen(c) && (rec(c).due||0) <= endOfToday();
const learnedList = () => allCards().filter(isLearned);
const wantList = () => allCards().filter(isWanted);

function markKnown(c, on = true){
  const r = S.cards[c.id] || (S.cards[c.id] = {b:-1});
  if(on){ S.known[c.id] = Date.now(); delete S.want[c.id]; r.b = Math.max(r.b, 3); r.due = Date.now() + 7*DAY; r.seen = r.seen || Date.now(); }
  else { delete S.known[c.id]; if(r.b >= 3){ r.b = 2; r.due = Date.now(); } }
  save();
}
function toggleWant(c){
  if(S.want[c.id] && !isLearned(c)){ delete S.want[c.id]; save(); return false; }
  S.want[c.id] = Date.now();
  if(isLearned(c)){ delete S.known[c.id]; const r = S.cards[c.id]; if(r && r.b >= 3){ r.b = 2; r.due = Date.now(); } }
  save(); return true;
}

function unitStats(u){
  const total = u.cards.length, s = u.cards.filter(seen).length, m = u.cards.filter(isLearned).length;
  const stars = s===total || m===total ? (m===total ? 3 : m*2>=total ? 2 : 1) : 0;
  return {total, seen:s, mastered:m, stars};
}
const unitById = id => UNITS.find(u => u.id===id);
const levelInfo = () => { const per = 250; return {lvl: Math.floor(S.xp/per)+1, into: S.xp % per, per}; };
const todayCount = () => S.days[today()] || 0;
function streak(){
  let n = 0; const d = new Date();
  if(!S.days[dayKey(d)]) d.setDate(d.getDate()-1);
  while(S.days[dayKey(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}
const curLevel = () => UNITS.some(u => u.level===S.settings.level) ? S.settings.level : (UNITS[0]||{}).level;
const nextUnit = () => UNITS.find(u => u.level===curLevel() && unitStats(u).stars < 3) || UNITS.find(u => unitStats(u).stars < 3) || UNITS[0];
function wordOfDay(){
  const pool = DECK.filter(c => !isLearned(c) && c.de.length < 40);
  const list = pool.length ? pool : DECK;
  const k = today().split("-").join("") * 1;
  return list[k % list.length];
}

/* =====================================================================
   BADGES
   ===================================================================== */
const BADGES = [
  {id:"first", e:"🌱", t:"Erster Schritt", d:"Finish your first practice", ok:()=>S.sessions>=1},
  {id:"goal", e:"🎯", t:"Goal reached", d:"Hit your daily goal", ok:()=>Object.values(S.days).some(v=>v>=S.settings.goal)},
  {id:"perfect", e:"💯", t:"Perfekt!", d:"A practice with no mistakes", ok:()=>S.perfect>=1},
  {id:"own", e:"✍️", t:"My own words", d:"Add 5 words of your own", ok:()=>S.custom.length>=5},
  {id:"wish", e:"☆", t:"Wish list", d:"Put 10 words on I want to learn", ok:()=>Object.keys(S.want).length>=10},
  {id:"listen", e:"🎧", t:"Good listener", d:"Listen to German 50 times", ok:()=>S.listens>=50},
  {id:"streak3", e:"🔥", t:"3-day streak", d:"Practise 3 days in a row", ok:()=>streak()>=3},
  {id:"streak7", e:"🗓️", t:"Week strong", d:"Practise 7 days in a row", ok:()=>streak()>=7},
  {id:"streak30", e:"🏔️", t:"30-day streak", d:"Practise 30 days in a row", ok:()=>streak()>=30},
  {id:"stars3", e:"⭐", t:"Three stars", d:"Learn every card in one unit", ok:()=>UNITS.some(u=>unitStats(u).stars===3)},
  {id:"m50", e:"🧠", t:"50 words", d:"Have 50 words in I learned", ok:()=>learnedList().length>=50},
  {id:"m150", e:"📚", t:"150 words", d:"Have 150 words in I learned", ok:()=>learnedList().length>=150},
  {id:"report", e:"🖨️", t:"On paper", d:"Make your first PDF", ok:()=>S.reports>=1},
  {id:"a1", e:"🥉", t:"A1 complete", d:"Learn every A1 card", ok:()=>DECK.filter(c=>c.level==="A1").every(isLearned)},
  {id:"a2", e:"🥈", t:"A2 complete", d:"Learn every A2 card", ok:()=>DECK.filter(c=>c.level==="A2").every(isLearned)},
  {id:"b1", e:"🥇", t:"B1 complete", d:"Learn every B1 card", ok:()=>DECK.some(c=>c.level==="B1") && DECK.filter(c=>c.level==="B1").every(isLearned)},
  {id:"write20", e:"✍️", t:"Schreiber", d:"Write 20 words correctly", ok:()=>S.written>=20},
  {id:"speak20", e:"🗣️", t:"Sprecher", d:"Say 20 words correctly", ok:()=>S.spoken>=20},
  {id:"listen1", e:"👂", t:"Good ears", d:"Finish a listening session", ok:()=>S.listenSessions.some(x=>x.src==="mic" && x.w>=10)},
  {id:"listen50", e:"🎯", t:"Half way there", d:"Understand 50% in a listening session", ok:()=>S.listenSessions.some(x=>x.w>=10 && x.k/x.w>=0.5)},
  {id:"stories3", e:"📖", t:"Storyteller", d:"Read 3 stories", ok:()=>Object.keys(S.storiesRead).length>=3},
  {id:"xp1000", e:"💎", t:"1,000 XP", d:"Earn 1,000 XP", ok:()=>S.xp>=1000},
];
function checkBadges(){ const fresh = []; BADGES.forEach(b => { if(!S.badges[b.id] && b.ok()){ S.badges[b.id] = today(); fresh.push(b); } }); if(fresh.length) save(); return fresh; }

/* =====================================================================
   LANGUAGES
   ===================================================================== */
const LANG_NAME = {ur:"Urdu", hi:"Hindi", en:"English", de:"German"};
function shown(lang){
  const st = S.settings;
  if(lang==="de" || lang===st.base) return true;
  if(lang==="rom") return !!st.extra.rom && (shown("ur") || shown("hi"));
  return !!st.extra[lang];
}
function applyPrefs(){
  ["ur","hi","rom","en"].forEach(l => document.body.classList.toggle("hide-"+l, !shown(l)));
  const t = S.settings.theme; if(t==="system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
}
/* the card's text in the learner's own language */
function myText(c){ if(c.custom) return c.my || c.en || ""; return {ur:c.u, hi:c.hi, en:c.en}[S.settings.base]; }
function myHTML(c, cls=""){
  if(c.custom) return `<span class="my ${cls}" dir="auto">${esc(c.my || c.en)}</span>`;
  const b = S.settings.base;
  if(b==="ur") return `<span class="ur ${cls}">${esc(c.u)}</span>`;
  if(b==="hi") return `<span class="hi ${cls}">${esc(c.hi)}</span>`;
  return `<span class="${cls}">${esc(c.en)}</span>`;
}
/* compact translation line for lists */
function trHTML(c){
  if(c.custom) return `<span dir="auto">${esc(c.my)}</span>${c.en && shown("en") && c.en!==c.my ? `<span>${esc(c.en)}</span>`:""}`;
  const parts = [];
  ["ur","hi","en"].sort((a,b)=> (a===S.settings.base?-1:0) - (b===S.settings.base?-1:0)).forEach(l => {
    if(!shown(l)) return;
    if(l==="ur") parts.push(`<span class="ur">${esc(c.u)}</span>`);
    if(l==="hi") parts.push(`<span class="hi">${esc(c.hi)}</span>`);
    if(l==="en") parts.push(`<span>${esc(c.en)}</span>`);
  });
  if(shown("rom") && (shown("ur")||shown("hi"))) parts.push(`<span class="rom">${esc(c.r)}</span>`);
  return parts.join("");
}
const visHTML = (c, cls="visual") => `<span class="${cls}${isTextVisual(c.v)?" txt":""}" aria-hidden="true">${esc(c.v)}</span>`;

/* =====================================================================
   UI BITS
   ===================================================================== */
const app = $("#app");
let toastTimer = null, toastUndo = null;
/* toast(msg) or toast(msg, {kind:"ok"|"want"|"info", undo: fn}) — a small notice at the top, never over the buttons */
function toast(msg, o={}){
  let t = $(".toast");
  if(!t){ t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); t.setAttribute("aria-live","polite"); document.body.appendChild(t);
    t.addEventListener("click", e => { if(e.target.closest("[data-undo]") && toastUndo){ const f = toastUndo; toastUndo = null; t.hidden = true; f(); } else if(e.target.closest("[data-tclose]")) t.hidden = true; }); }
  const kind = o.kind || "info", icon = kind==="ok" ? "check" : kind==="want" ? "star" : "info";
  toastUndo = o.undo || null;
  t.className = "toast t-"+kind;
  t.innerHTML = `<span class="ti">${ic(icon, kind==="want"?"fill":"")}</span><span class="tm">${o.html ? msg : esc(msg)}</span>${o.undo?`<button type="button" class="tundo" data-undo>${ic("undo")}Undo</button>`:""}`;
  t.hidden = false; t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; toastUndo = null; }, o.undo ? 5000 : 2600);
}
const snapWord = id => ({id, card: S.cards[id] ? {...S.cards[id]} : undefined, known: S.known[id], want: S.want[id]});
function restoreWord(x){ if(x.card) S.cards[x.id] = x.card; else delete S.cards[x.id]; if(x.known) S.known[x.id] = x.known; else delete S.known[x.id]; if(x.want) S.want[x.id] = x.want; else delete S.want[x.id]; save(); }
const starsHTML = n => `<span class="stars" aria-label="${n} of 3 stars">${[1,2,3].map(i=>`<span class="${i<=n?"on":""}">★</span>`).join("")}</span>`;
const dotsHTML = c => `<span class="dots" title="${isLearned(c)?"Learned":seen(c)?"Learning":"New"}">${[0,1,2].map(i=>`<i class="${boxOf(c)>i||isLearned(c)?"on":""}"></i>`).join("")}</span>`;
function ringSVG(frac){
  const r=8, c=2*Math.PI*r, f=Math.min(1,frac);
  return `<svg class="ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="${r}" fill="none" stroke="var(--line)" stroke-width="3"/><circle cx="10" cy="10" r="${r}" fill="none" stroke="${f>=1?"var(--accent)":"var(--ok)"}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${c*f} ${c}" transform="rotate(-90 10 10)"/></svg>`;
}
function renderStats(){
  $("#stats").innerHTML = `<a class="stat" href="#me" title="Day streak">🔥 ${streak()}</a><a class="stat" href="#me" title="Today's goal">${ringSVG(todayCount()/S.settings.goal)} ${Math.min(todayCount(),S.settings.goal)}/${S.settings.goal}</a>`;
  const w = wantList().length, el = $("#wantCount");
  el.hidden = !w; el.textContent = w;
}
function wordActions(c, opts={}){
  const k = isLearned(c), w = isWanted(c);
  return `<span class="acts">
    ${canSpeak ? `<button class="iconbtn" type="button" data-say="${esc(c.de)}" data-sid="${esc(c.id)}" aria-label="Listen">${ic("volume")}</button>`:""}
    <button class="iconbtn w" type="button" data-want="${esc(c.id)}" aria-pressed="${w}" aria-label="${w?"Remove from I want to learn":"Add to I want to learn"}" title="I want to learn">${ic("star", w?"fill":"")}</button>
    <button class="iconbtn k" type="button" data-known="${esc(c.id)}" aria-pressed="${!!S.known[c.id] || k}" aria-label="${k?"Remove from I learned":"Mark as learned"}" title="I learned this">${ic("check")}</button>
    ${opts.edit && c.custom ? `<a class="iconbtn" href="#words-edit-${esc(c.id)}" aria-label="Edit">${ic("pen")}</a>`:""}
  </span>`;
}
function wordRow(c, opts={}){
  const r = rec(c)||{};
  const pills = [];
  if(c.custom) pills.push(`<span class="pill own">My word</span>`);
  else if(opts.showUnit){ const u = unitById(c.unit); if(u) pills.push(`<span class="pill">${esc(u.emoji)} ${esc(u.title)}</span>`); }
  if(S.known[c.id]) pills.push(`<span class="pill ok">✓ marked by you</span>`);
  else if(mastered(c)) pills.push(`<span class="pill ok">✓ learned in practice</span>`);
  if(r.l) pills.push(`<span class="pill">🔊 ${r.l}×</span>`);
  return `<div class="word">
    <span class="v${isTextVisual(c.v)?" txt":""}">${esc(c.v)}</span>
    <span class="t"><span class="de">${colorDe(c.de)}</span><span class="tr">${trHTML(c)}</span>
      ${c.note?`<span class="note" dir="auto">${esc(c.note)}</span>`:""}
      ${pills.length?`<span class="meta">${pills.join("")}</span>`:""}</span>
    ${wordActions(c, opts)}
  </div>`;
}

/* =====================================================================
   ROUTER
   ===================================================================== */
let session = null;
let words = {q:"", sort:"new"};
function setNav(nav){ $$("[data-nav]").forEach(a => a.dataset.nav===nav ? a.setAttribute("aria-current","page") : a.removeAttribute("aria-current")); }
function route(){
  stopConfetti(); speakStop();
  if(typeof stopListening === "function") stopListening(true);
  session = null; document.body.classList.remove("in-session");
  const h = (location.hash||"#today").slice(1);
  const nav = h.startsWith("learn")||h.startsWith("unit-")||h.startsWith("stor")||h.startsWith("fun")||h.startsWith("guide") ? "learn" : h.startsWith("words") ? "words" : h.startsWith("listen") ? "listen" : (h.startsWith("me")||h.startsWith("report")) ? "me" : "today";
  setNav(nav); applyPrefs(); renderStats();
  if(h==="learn" || h.startsWith("learn-")){ const [lv, tab] = h.slice(6).split("-"); return viewLearn(lv, tab); }
  if(h==="stories") return viewStories();
  if(h==="fun" || h.startsWith("fun-")) return viewFun(h.slice(4) || "tricks");
  if(h.startsWith("story-") && storyById(h.slice(6))) return viewStory(storyById(h.slice(6)));
  if(h.startsWith("unit-") && unitById(h.slice(5))) return viewUnit(unitById(h.slice(5)));
  if(h==="words" || h==="words-want") return viewWords("want");
  if(h==="words-learned") return viewWords("learned");
  if(h==="words-add") return viewAdd(null);
  if(h.startsWith("words-edit-")) return viewAdd(BYID.get(h.slice(11)) || null);
  if(h==="listen") return viewListen();
  if(h==="guide") return viewGuide();
  if(h.startsWith("guide-")) return viewLesson(h.slice(6));
  if(h==="me") return viewMe();
  if(h==="report") return viewReport();
  return viewToday();
}
addEventListener("hashchange", () => { window.scrollTo(0,0); route(); });
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if(a && a.getAttribute("href") === location.hash){ e.preventDefault(); window.scrollTo(0,0); route(); }
});

/* one delegated click handler for everything inside the app */
app.addEventListener("click", e => {
  const t = e.target;
  const chip = t.closest("[data-set] [data-v]");
  if(chip){ const key = chip.parentElement.dataset.set; let v = chip.dataset.v; if(key==="goal") v = +v;
    S.settings[key] = v; if(key==="base") S.settings.extra[v] = false; save(); return route(); }
  const ex = t.closest("[data-extra]");
  if(ex){ const k = ex.dataset.extra; S.settings.extra[k] = !S.settings.extra[k]; save(); return route(); }
  const kw = t.closest("[data-known]");
  if(kw){ const c = BYID.get(kw.dataset.known); if(!c) return; const snap = snapWord(c.id), on = !isLearned(c); markKnown(c, on);
    toast(on ? `<b>${esc(c.de)}</b> moved to I learned` : `<b>${esc(c.de)}</b> removed from I learned`, {html:true, kind: on?"ok":"info", undo: () => { restoreWord(snap); refresh(); }}); checkBadges(); return refresh(); }
  const ww = t.closest("[data-want]");
  if(ww){ const c = BYID.get(ww.dataset.want); if(!c) return; const snap = snapWord(c.id), on = toggleWant(c);
    toast(on ? `<b>${esc(c.de)}</b> added to I want to learn` : `<b>${esc(c.de)}</b> removed from I want to learn`, {html:true, kind: on?"want":"info", undo: () => { restoreWord(snap); refresh(); }}); checkBadges(); return refresh(); }
  const st = t.closest("[data-start]"); if(st && !st.disabled) return startSession(st.dataset.start, st.dataset.id, st.dataset.mode);
  if(!session) return;
  if(t.closest("[data-exit]")) return finishSession(true);
  if(t.closest("[data-flip]") || (session.mode==="flip" && session.state==="front" && t.closest(".card") && !t.closest("button"))){ session.state="back"; return drawSession(); }
  const a = t.closest("[data-ans]"); if(a) return grade(a.dataset.ans==="1");
  const o = t.closest("[data-opt]"); if(o && session.state==="front") return choose(+o.dataset.opt);
  if(t.closest("[data-continue]")) return grade(session.picked===session.queue[0]);
  if(t.closest("[data-sknow]")) return sessionKnow();
  const um = t.closest("[data-uml]"); if(um){ const i = $("#wIn"); if(i){ const a = i.selectionStart ?? i.value.length, b = i.selectionEnd ?? a; i.value = i.value.slice(0,a) + um.dataset.uml + i.value.slice(b); i.focus(); i.setSelectionRange(a+1,a+1); } return; }
  if(t.closest("[data-wshow]")){ session.result = {res:"wrong", given:"", note:"No problem. Look at it, then type it next time."}; session.state = "back"; return drawSession(); }
  if(t.closest("[data-next]")) return grade(!!session.lastOk);
  if(t.closest("[data-smic]")) return speakStart();
  if(t.closest("[data-sstop]")) return speakStop();
  if(t.closest("[data-sself]")){ session.result = null; session.state = "back"; return drawSession(); }
  if(t.closest("[data-swant]")){ const c = session.queue[0]; const on = toggleWant(c); toast(on?`<b>${esc(c.de)}</b> added to I want to learn`:"Removed from I want to learn", {html:true, kind: on?"want":"info"}); return drawSession(); }
});
function refresh(){ if(session) drawSession(); else { const y = window.scrollY; route(); window.scrollTo(0,y); } }

/* =====================================================================
   TODAY
   ===================================================================== */
function greetWords(d){
  const h = (d||new Date()).getHours();
  if (h>=5 && h<11)  return ["Guten Morgen","صبح بخیر","सुप्रभात","Good morning","morning"];
  if (h>=11 && h<18) return ["Guten Tag","السلام علیکم","नमस्ते","Good day","day"];
  if (h>=18 && h<22) return ["Guten Abend","شام بخیر","शुभ संध्या","Good evening","evening"];
  return ["Gute Nacht","شب بخیر","शुभ रात्रि","Good night","night"];
}
function greetingInner(){
  const g = greetWords(), b = S.settings.base, name = S.settings.name ? ", "+esc(S.settings.name) : "";
  const tr = b==="ur" ? `<span class="ur" style="font-size:16px">${g[1]}</span>` : b==="hi" ? `<span class="hi">${g[2]}</span>` : g[3];
  return `<h1>${g[0]}${name}!</h1><div class="muted">${tr}</div>`;
}
function greeting(){
  return `<div class="hello" id="hello" data-band="${greetWords()[4]}">${greetingInner()}</div>`;
}
// Keep the greeting in step with the real clock (morning → day → evening → night)
setInterval(()=>{
  const el = document.getElementById("hello");
  if (!el) return;
  const band = greetWords()[4];
  if (el.dataset.band !== band){ el.dataset.band = band; el.innerHTML = greetingInner(); }
}, 60000);
function todayPlan(){
  const due = allCards().filter(isDue).sort((a,b)=>(rec(a).due||0)-(rec(b).due||0));
  const want = wantList().filter(c => !isDue(c));
  const nu = nextUnit();
  const fresh = nu.cards.filter(c => !seen(c) && !isLearned(c));
  return {due, want, nu, fresh};
}
/* ---------- install reminder + keeping data safe ---------- */
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installCard(){
  if(SANDBOX || isStandalone() || S.sessions < 1) return "";
  if(S.settings.hideInstall && Date.now() - S.settings.hideInstall < 14*DAY) return "";
  const how = installEvt ? `<button class="btn primary sm" type="button" id="doInstall">${ic("phone")}Install</button>`
    : isIOS() ? `<span class="small">In Safari tap <b>Share</b> <span aria-hidden="true">⬆︎</span> then <b>Add to Home Screen</b>.</span>`
    : `<span class="small">Open your browser menu <b>⋮</b> and choose <b>Add to Home screen</b> or <b>Install app</b>.</span>`;
  return `<div class="panel installcard" role="note">
    <div class="stack" style="gap:6px"><b>📲 Put Wortzi on your home screen</b>
    <span class="small muted">It opens like an app, works offline${isIOS()?", and iPhone keeps your progress safe (Safari can delete website data after a week without visits)":", and keeps your progress safe"}.</span>
    <div class="row">${how}<button class="btn ghost sm" type="button" id="hideInstall">Not now</button></div></div></div>`;
}
function wireInstallCard(){
  const i = $("#doInstall"); if(i) i.onclick = async () => { try{ installEvt.prompt(); await installEvt.userChoice; }catch(e){} installEvt = null; route(); };
  const h = $("#hideInstall"); if(h) h.onclick = () => { S.settings.hideInstall = Date.now(); save(); route(); };
}
async function askPersist(){
  try{ if(navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); }catch(e){}
}
function viewToday(){
  const p = todayPlan(), left = Math.max(0, S.settings.goal - todayCount());
  const w = wordOfDay(), L = levelInfo();
  const nDue = Math.min(p.due.length, 15), nWant = Math.min(p.want.length, 5), nNew = Math.min(p.fresh.length, Math.max(3, 10 - nDue - nWant));
  app.innerHTML = `${greeting()}${installCard()}
    <div class="panel plan">
      <div class="row between"><span class="label">Today's plan · about 10 minutes</span><span class="small muted">${left ? `${left} cards to your goal` : "🎯 Goal done today"}</span></div>
      <ol class="steps">
        <li class="${nDue?"":"complete"}"><span class="n">${nDue?1:"✓"}</span><span>Review cards that are due</span><b>${p.due.length}</b></li>
        <li class="${nWant?"":"complete"}"><span class="n">${nWant?2:"✓"}</span><span>Practise from <a href="#words">I want to learn</a></span><b>${p.want.length}</b></li>
        <li><span class="n">3</span><span>New from Unit ${p.nu.n}: ${esc(p.nu.title)} <a class="lvlchange" href="#learn-${esc(curLevel())}" title="Change level">${esc(curLevel())} · change</a></span><b>${nNew}</b></li>
      </ol>
      <button class="btn primary big block" data-start="today">${ic("play")}Start today's practice</button>
    </div>
    <div class="section-title"><h2>My words</h2><a class="btn sm" href="#words-add">${ic("plus")}Add a word or sentence</a></div>
    <div class="duo">
      <a class="listtile learned" href="#words-learned"><span class="label">✓ I learned</span><b>${learnedList().length}</b><span class="small muted">words and sentences</span></a>
      <a class="listtile want" href="#words"><span class="label">☆ I want to learn</span><b>${wantList().length}</b><span class="small muted">on your list</span></a>
    </div>
    ${storyTodayCard()}
    ${didYouKnow()}
    <div class="section-title"><h2>Word of the day</h2><span class="small muted">${fmtDate(Date.now())}</span></div>
    <div class="panel wotd">
      <span class="vis${isTextVisual(w.v)?" txt":""}" aria-hidden="true">${esc(w.v)}</span>
      <span class="de" style="font-size:22px">${colorDe(w.de)}</span>
      <span class="tr" style="display:flex;flex-wrap:wrap;gap:0 12px;color:var(--muted)">${trHTML(w)}</span>
      <span>${wordActions(w)}</span>
    </div>
    <div class="section-title"><h2>Keep going</h2><span class="small muted">Level ${L.lvl} · ${S.xp} XP · 🔥 ${streak()}</span></div>
    <div class="row">
      <a class="btn" href="#unit-${p.nu.id}">${esc(p.nu.emoji)} Unit ${p.nu.n}: ${esc(p.nu.title)}</a>
      <button class="btn" data-start="weak" ${allCards().some(c=>seen(c)&&!isLearned(c))?"":"disabled"}>${ic("repeat")}Weak cards</button>
      <button class="btn" data-start="learned" data-mode="write" ${learnedList().length?"":"disabled"}>${ic("pen")}Write what I learned</button>
      <button class="btn" data-start="learned" data-mode="speak" ${learnedList().length?"":"disabled"}>${ic("mic")}Speak what I learned</button>
      <a class="btn" href="#guide-method">How this app teaches</a>
    </div>`;
  wireInstallCard();
}

/* =====================================================================
   LEARN (units)
   ===================================================================== */
function practiceChips(){
  const st = S.settings;
  return `<div class="setup" style="margin:14px 0 0">
    <div><span class="label">Card front</span><div class="chips" data-set="front">
      <button class="chip" data-v="de" aria-pressed="${st.front==="de"}">German first</button>
      <button class="chip" data-v="base" aria-pressed="${st.front==="base"}">${LANG_NAME[st.base]} first</button></div></div>
    <div><span class="label">Mode</span><div class="chips" data-set="mode">
      <button class="chip" data-v="flip" aria-pressed="${st.mode==="flip"}">${ic("cards")}Flip cards</button>
      <button class="chip" data-v="quiz" aria-pressed="${st.mode==="quiz"}">${ic("quiz")}Quiz</button></div></div>
  </div>`;
}
const LEVELS = {
  A1:{name:"Beginner", ur:"ابتدائی", hi:"शुरुआती", about:"Your first weeks: greetings, shopping, numbers, transport, the doctor."},
  A2:{name:"Elementary", ur:"بنیادی", hi:"प्रारंभिक", about:"Everyday life: appointments, work, housing, the past tense, invitations."},
  B1:{name:"Intermediate", ur:"درمیانہ", hi:"मध्यम", about:"Independent: job interviews, contracts, offices, opinions, polite German."},
};
const lvlName = lv => `${lv} · ${(LEVELS[lv]||{}).name||lv}`;
function levelStats(lv){
  const cards = DECK.filter(c=>c.level===lv), us = UNITS.filter(u=>u.level===lv);
  return {cards, units: us, learned: cards.filter(isLearned).length, done: us.filter(u=>unitStats(u).stars===3).length};
}
function levelPicker(cur){
  const lvls = [...new Set(UNITS.map(u=>u.level))];
  return `<nav class="levelpick" aria-label="Choose your level">${lvls.map(lv => { const x = levelStats(lv), pct = x.cards.length ? Math.round(x.learned/x.cards.length*100) : 0, L = LEVELS[lv]||{};
    const tr = S.settings.base==="ur" ? `<span class="ur">${esc(L.ur||"")}</span>` : S.settings.base==="hi" ? `<span class="hi">${esc(L.hi||"")}</span>` : "";
    return `<a class="lvltile lv-${esc(lv)}" href="#learn-${esc(lv)}" ${lv===cur?'aria-current="page"':""}>
      <span class="code">${esc(lv)}</span><b>${esc(L.name||lv)}</b>${tr?`<span class="tr">${tr}</span>`:""}
      <span class="bar"><i style="width:${pct}%"></i></span><span class="small muted">${x.learned}/${x.cards.length} words</span></a>`; }).join("")}</nav>`;
}
function viewLearn(lv, tab){
  if(lv && !UNITS.some(u=>u.level===lv)) lv = null;
  if(lv && lv !== S.settings.level){ S.settings.level = lv; save(); }
  lv = lv || curLevel();
  tab = ["units","stories","grammar"].includes(tab) ? tab : "units";
  const x = levelStats(lv), nu = nextUnit();
  const stories = STORIES.filter(st => st.level===lv);
  const lessons = guideSections().filter(sec => sec.dataset.level===lv || (lv==="A1" && sec.dataset.level==="Start"));
  const tabs = [["units","Units",x.units.length],["stories","Stories",stories.length],["grammar","Grammar",lessons.length]];
  let body = "";
  if(tab==="units") body = `<div class="units">${x.units.map(u => { const st = unitStats(u);
      return `<a class="unit${u===nu?" next":""}" href="#unit-${u.id}"><span class="ico">${esc(u.emoji)}</span><span class="num">Unit ${u.n}</span><b>${esc(u.title)}</b><span class="meta">${starsHTML(st.stars)}<span>${st.mastered}/${st.total}</span></span></a>`; }).join("")}</div>`;
  if(tab==="stories") body = stories.length ? `<p class="small muted" style="margin:0 0 10px">Short scenes from daily life. Words you know are underlined in green.</p><div class="stories">${stories.map(storyTile).join("")}</div>`
      : `<div class="empty"><span class="e">📖</span>Stories for ${esc(lv)} are coming soon.</div>`;
  if(tab==="grammar") body = lessons.length ? `<div class="lessons">${lessons.map(sec=>`<a class="lesson${sec.dataset.level==="Start"?" start":""}" href="#guide-${esc(sec.dataset.id)}"><b>${esc(sec.dataset.title)}</b><span>${esc(sec.dataset.sum)}</span></a>`).join("")}</div>`
      : `<div class="empty"><span class="e">📐</span>Grammar for ${esc(lv)} is coming soon.</div>`;
  app.innerHTML = `<h1>Learn</h1><p class="muted" style="margin:4px 0 12px">Pick your level. Everything below changes to match it.</p>
    ${levelPicker(lv)}
    <section class="panel lvlpanel" aria-label="${esc(lvlName(lv))}">
      <div class="row between" style="align-items:flex-start"><div class="stack" style="gap:2px"><h2>${esc(lvlName(lv))}</h2><span class="small muted">${esc((LEVELS[lv]||{}).about||"")}</span></div>
        <span class="small muted">${x.done}/${x.units.length} units done</span></div>
      <div class="row">
        <button class="btn primary" data-start="level" data-id="${esc(lv)}">${ic("play")}Practise ${esc(lv)}</button>
        ${nu && nu.level===lv ? `<a class="btn" href="#unit-${nu.id}">${esc(nu.emoji)} Continue: ${esc(nu.title)}</a>` : ""}
      </div>
      <nav class="seg seg3" aria-label="${esc(lv)} sections">${tabs.map(([k,t,n])=>`<a href="#learn-${esc(lv)}-${k}" ${k===tab?'aria-current="page"':""}><b>${n}</b>${t}</a>`).join("")}</nav>
      ${body}
    </section>
    ${funStrip()}
    <details class="panel prefs"><summary>${ic("gear")}<b>Practice settings</b><span class="small muted">card front, flip or quiz</span></summary>${practiceChips()}</details>
    <p class="small" style="margin-top:14px"><a href="#guide">All grammar lessons</a> · <a href="#stories">All stories</a></p>`;
}
function viewUnit(u){
  const st = unitStats(u), next = UNITS[UNITS.indexOf(u)+1], pct = Math.round(st.mastered/st.total*100);
  app.innerHTML = `<a class="back" href="#learn-${esc(u.level)}">${ic("left")}${esc(u.level)} units</a>
    <div class="unithead"><div class="ico">${esc(u.emoji)}</div>
      <div class="stack" style="gap:4px;flex:1;min-width:0"><span class="label">Unit ${u.n} · <span class="lvl ${esc(u.level)}">${esc(u.level)}</span></span><h1>${esc(u.title)}</h1>
      <div class="unitprog"><div class="bar"><i style="width:${pct}%"></i></div><span class="small muted">${st.mastered}/${st.total} learned</span>${starsHTML(st.stars)}</div></div></div>
    <div class="actionbar">
      <button class="btn primary big" data-start="unit" data-id="${u.id}">${ic("play")}Practise 10 cards</button>
      <div class="modes" role="group" aria-label="More ways to practise">
        <button class="btn" data-start="unitall" data-id="${u.id}">${ic("cards")}All ${st.total}</button>
        <button class="btn" data-start="unit" data-id="${u.id}" data-mode="write">${ic("pen")}Write</button>
        <button class="btn" data-start="unit" data-id="${u.id}" data-mode="speak">${ic("mic")}Speak</button>
      </div>
    </div>
    <details class="panel prefs"><summary>${ic("gear")}<b>Practice settings</b><span class="small muted">card front, flip or quiz</span></summary>${practiceChips()}</details>
    <div class="section-title"><h2>${st.total} words</h2><span class="small muted">${ic("star")} want to learn · ${ic("check")} already know</span></div>
    <div class="words">${u.cards.map(c => wordRow(c)).join("")}</div>
    ${next?`<a class="nextunit" href="#unit-${next.id}"><span class="small muted">Next unit</span><b>${esc(next.emoji)} ${esc(next.title)}</b>${ic("right")}</a>`:""}`;
}

/* =====================================================================
   MY WORDS — two lists: I learned · I want to learn
   ===================================================================== */
function filterSort(list){
  const q = words.q.trim().toLowerCase();
  let out = q ? list.filter(c => [c.de,c.u,c.hi,c.en,c.my,c.r,c.note].some(x => (x||"").toLowerCase().includes(q))) : list;
  const ts = c => Math.max(S.want[c.id]||0, S.known[c.id]||0, (rec(c)||{}).seen||0, c.created||0);
  if(words.sort==="az") out = [...out].sort((a,b)=>a.de.replace(/^(der|die|das) /,"").localeCompare(b.de.replace(/^(der|die|das) /,""),"de"));
  else if(words.sort==="unit") out = [...out].sort((a,b)=>(unitById(a.unit)?.n||99)-(unitById(b.unit)?.n||99));
  else out = [...out].sort((a,b)=>ts(b)-ts(a));
  return out;
}
function viewWords(tab){
  const L = learnedList(), W = wantList();
  const list = tab==="learned" ? L : W;
  const shownList = filterSort(list);
  const empty = tab==="learned"
    ? `<div class="empty"><span class="e">✓</span><b>Nothing here yet</b><span>Words move here when you learn them in practice (3 right answers), or when you tap ✓ on a word you already know.</span><a class="btn" href="#learn">Browse units</a></div>`
    : `<div class="empty"><span class="e">☆</span><b>Your wish list is empty</b><span>Tap ☆ on any word in a unit, or add your own words and sentences, the ones you need at work, at the doctor or with neighbours.</span><a class="btn primary" href="#words-add">${ic("plus")}Add my own word</a></div>`;
  app.innerHTML = `<div class="row between" style="margin-bottom:12px"><h1>My words</h1><a class="btn primary sm" href="#words-add">${ic("plus")}Add</a></div>
    <nav class="seg" aria-label="Lists">
      <a class="want" href="#words" ${tab==="want"?'aria-current="page"':""}><b>${W.length}</b>☆ I want to learn</a>
      <a class="learned" href="#words-learned" ${tab==="learned"?'aria-current="page"':""}><b>${L.length}</b>✓ I learned</a>
    </nav>
    ${list.length ? `
    <div class="toolbar">
      <input class="input" id="wq" type="search" placeholder="Search your list" value="${esc(words.q)}" aria-label="Search your list" autocomplete="off">
      <div class="chips" id="wsort">
        <button class="chip" data-sort="new" aria-pressed="${words.sort==="new"}">Newest</button>
        <button class="chip" data-sort="az" aria-pressed="${words.sort==="az"}">A–Z</button>
        <button class="chip" data-sort="unit" aria-pressed="${words.sort==="unit"}">By unit</button>
      </div>
    </div>
    <div class="row" style="margin-bottom:12px">
      <button class="btn ${tab==="want"?"want":"good"}" data-start="${tab}">${tab==="want"?ic("play")+"Practise my wish list":ic("repeat")+"Review"}</button>
      ${tab==="learned" ? `<button class="btn" data-start="learned" data-mode="write">${ic("pen")}Write them</button><button class="btn" data-start="learned" data-mode="speak">${ic("mic")}Say them</button>` : ""}
      ${S.custom.length?`<button class="btn sm" data-start="mine">${ic("pen")}Only my own words (${S.custom.length})</button>`:""}
      <a class="btn sm ghost" href="#report" id="toReport">${ic("printer")}Make a PDF</a>
    </div>
    <div class="words" id="wlist">${shownList.map(c=>wordRow(c,{edit:true, showUnit:true})).join("") || `<p class="muted">No match for “${esc(words.q)}”.</p>`}</div>` : `<div style="margin-top:16px">${empty}</div>`}`;
  const q = $("#wq");
  if(q){
    q.addEventListener("input", () => { words.q = q.value; $("#wlist").innerHTML = filterSort(list).map(c=>wordRow(c,{edit:true, showUnit:true})).join("") || `<p class="muted">No match for “${esc(words.q)}”.</p>`; });
    $("#wsort").addEventListener("click", e => { const b = e.target.closest("[data-sort]"); if(b){ words.sort = b.dataset.sort; refresh(); } });
  }
  const tr = $("#toReport"); if(tr) tr.addEventListener("click", () => { reportOpts.type = "wordbook"; reportOpts.source = tab; });
}

const EMOJI = ["📝","💬","🏠","🍽️","🛒","🚇","💼","🏥","👪","❤️","☕","🧾","📞","🌍","🎓","⭐"];
let addPrefill = null;
function viewAdd(c){
  if(c && !c.custom) c = null;
  const pre = !c && addPrefill ? addPrefill : null; addPrefill = null;
  const st = S.settings, inWant = c ? !!S.want[c.id] : true;
  app.innerHTML = `<a class="back" href="#words">${ic("left")}My words</a>
    <h1>${c?"Edit my word":"Add a word or sentence"}</h1>
    <p class="muted" style="margin:6px 0 16px">Add what you need in your own life: a sentence for work, your street name, what you say at the doctor. It becomes a flashcard like all the others.</p>
    <form class="panel stack" id="addForm" autocomplete="off" novalidate>
      <div class="field"><label for="f-de">German</label>
        <input class="input" id="f-de" maxlength="200" required placeholder="z. B. Ich arbeite als Webentwicklerin." value="${esc(c?.de ?? pre?.de)}" lang="de" spellcheck="true">
        <span class="help">For nouns, write the article too: <b>der</b>, <b>die</b> or <b>das</b>. It gets its color automatically.</span></div>
      <div class="field"><label for="f-my">Meaning in ${LANG_NAME[st.base]} (or any language)</label>
        <input class="input" id="f-my" maxlength="200" dir="auto" value="${esc(c?.my)}" placeholder="${st.base==="ur"?"مثلاً: میں ویب ڈویلپر کے طور پر کام کرتی ہوں":st.base==="hi"?"जैसे: मैं वेब डेवलपर के रूप में काम करती हूँ":"e.g. I work as a web developer."}"></div>
      ${st.base!=="en"?`<div class="field"><label for="f-en">English <span class="muted small">(optional)</span></label><input class="input" id="f-en" maxlength="200" value="${esc(c?.en)}"></div>`:""}
      <div class="field"><label for="f-note">Note <span class="muted small">(optional: where you heard it, a tip)</span></label><input class="input" id="f-note" maxlength="300" dir="auto" value="${esc(c?.note)}"></div>
      <div class="field"><span class="label" style="font-size:12px">Picture</span>
        <div class="emojis" id="f-emojis">${EMOJI.map(e=>`<button type="button" data-emoji="${e}" aria-pressed="${(c?.v||"📝")===e}">${e}</button>`).join("")}</div>
        <input class="input" id="f-v" maxlength="8" style="max-width:140px" value="${esc(c?.v||"📝")}" aria-label="Or type any emoji"></div>
      <div class="field"><span class="label" style="font-size:12px">Put it in</span>
        <div class="radio">
          <label><input type="radio" name="f-list" value="want" ${inWant?"checked":""}> ☆ I want to learn</label>
          <label><input type="radio" name="f-list" value="learned" ${!inWant?"checked":""}> ✓ I already know it</label>
        </div></div>
      <div id="f-match"></div>
      <p id="f-err" class="small" style="color:var(--bad);margin:0" hidden></p>
      <div class="row">
        <button class="btn primary big" type="submit">${c?"Save changes":"Save word"}</button>
        ${c?`<button class="btn bad" type="button" id="f-del">Delete</button>`:`<button class="btn" type="submit" data-again="1">Save and add another</button>`}
      </div>
    </form>`;
  const form = $("#addForm");
  $("#f-emojis").addEventListener("click", e => { const b = e.target.closest("[data-emoji]"); if(!b) return; $("#f-v").value = b.dataset.emoji; $$("#f-emojis button").forEach(x=>x.setAttribute("aria-pressed", x===b)); });
  const findMatches = () => {
    const a = $("#f-de").value.trim().toLowerCase(), b = $("#f-my").value.trim().toLowerCase();
    const hits = (a.length>2||b.length>2) ? DECK.filter(x => (a.length>2 && x.de.toLowerCase().includes(a)) || (b.length>2 && [x.u,x.hi,x.en].some(y=>(y||"").toLowerCase().includes(b)))).slice(0,4) : [];
    $("#f-match").innerHTML = hits.length && !c ? `<div class="match"><span class="label">Already in the app: add it to your list instead</span>${hits.map(x=>wordRow(x,{showUnit:true})).join("")}</div>` : "";
  };
  $("#f-de").addEventListener("input", findMatches); $("#f-my").addEventListener("input", findMatches);
  let again = false;
  form.addEventListener("click", e => { if(e.target.closest("[data-again]")) again = true; });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const de = clip($("#f-de").value,200), my = clip($("#f-my").value,200), en = clip($("#f-en")?.value,200), note = clip($("#f-note").value,300), v = clip($("#f-v").value,8) || "📝";
    const err = $("#f-err");
    if(!de){ err.textContent = "Please write the German word or sentence."; err.hidden = false; $("#f-de").focus(); again=false; return; }
    if(!my && !en){ err.textContent = "Please add what it means, so the card has a back side."; err.hidden = false; $("#f-my").focus(); again=false; return; }
    const list = form.querySelector('input[name="f-list"]:checked').value;
    let id;
    if(c){ const it = S.custom.find(x=>x.id===c.id); Object.assign(it, {de, my, en, note, v}); id = c.id; }
    else { id = "my-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); S.custom.push({id, de, my, en, note, v, created: Date.now()}); }
    rebuildIndex();
    const card = BYID.get(id);
    if(list==="want"){ delete S.known[id]; S.want[id] = S.want[id] || Date.now(); const r=S.cards[id]; if(r && r.b>=3){ r.b=2; } }
    else { markKnown(card, true); }
    save(); checkBadges(); renderStats();
    toast(c ? "Saved" : `Saved to ${list==="want"?"☆ I want to learn":"✓ I learned"}`);
    if(again && !c){ again = false; viewAdd(null); $("#f-de").focus(); }
    else location.hash = list==="want" ? "words" : "words-learned";
  });
  const del = $("#f-del");
  if(del) del.addEventListener("click", () => {
    if(del.dataset.sure){ S.custom = S.custom.filter(x=>x.id!==c.id); delete S.want[c.id]; delete S.known[c.id]; delete S.cards[c.id]; save(); rebuildIndex(); toast("Deleted"); location.hash = "words"; }
    else { del.dataset.sure = "1"; del.textContent = "Tap again to delete"; }
  });
}

/* =====================================================================
   PRACTICE SESSION
   ===================================================================== */
function pickCards(kind, id){
  const lowFirst = arr => arr.map((c,i)=>({c,i})).sort((a,b)=>(boxOf(a.c)-boxOf(b.c))||(a.i-b.i)).map(x=>x.c);
  if(kind==="today"){
    const p = todayPlan();
    const due = p.due.slice(0,15), want = shuffle([...p.want]).slice(0,5);
    let fresh = p.fresh.slice(0, Math.max(3, 10 - due.length - want.length));
    if(!fresh.length && due.length + want.length < 5) fresh = lowFirst(p.nu.cards).slice(0,8);
    return shuffle(uniq([...due, ...want, ...fresh]));
  }
  if(kind==="level"){ const pool = DECK.filter(c => c.level===id && !isLearned(c)); return shuffle(lowFirst(pool.length ? pool : DECK.filter(c=>c.level===id)).slice(0,12)); }
  if(kind==="unit") return shuffle(lowFirst(unitById(id).cards).slice(0,10));
  if(kind==="unitall") return shuffle([...unitById(id).cards]);
  if(kind==="weak") return lowFirst(shuffle(allCards().filter(c=>seen(c)&&!isLearned(c)))).slice(0,12);
  if(kind==="want") return shuffle(wantList()).slice(0,15);
  if(kind==="learned") return shuffle(learnedList()).slice(0,15);
  if(kind==="mine") return shuffle([...CUSTOM]).slice(0,15);
  if(kind==="story"){ const st = storyById(id); return st ? shuffle(storyEntries(st).map(e=>e.card).filter(Boolean)) : []; }
  return [];
}
function startSession(kind, id, mode){
  let cards = pickCards(kind, id);
  if(mode==="write" || mode==="speak") cards = cards.filter(c => c.de && c.de.replace(/\.\.\.|…/g,"").trim().length > 1);
  if(!cards.length){ toast("No cards to practise here yet."); return; }
  session = {kind, storyId: kind==="story" ? id : null, unitId: (kind==="unit"||kind==="unitall") ? id : null, levelId: kind==="level" ? id : null, queue:[...cards], done:0, xp:0, right:0, wrong:0, retried:new Set(), moved:[], state:"front", picked:null, opts:null, mode: ["write","speak"].includes(mode) ? mode : S.settings.mode, result:null, lastOk:false,
    before: (kind==="unit"||kind==="unitall") ? unitStats(unitById(id)).stars : 0};
  document.body.classList.add("in-session"); setNav(""); window.scrollTo(0,0); drawSession();
}
const frontLang = () => S.settings.front==="de" ? "de" : "my";
function sideHTML(side, c){
  if(side==="de") return `<div class="dd">${colorDe(c.de)}</div>`;
  if(c.custom) return `<div class="my" dir="auto">${esc(c.my||c.en)}</div>`;
  const b = S.settings.base;
  const rom = shown("rom") ? `<div class="rom">${esc(c.r)}</div>` : "";
  if(b==="ur") return `<div class="ur">${esc(c.u)}</div>${rom}`;
  if(b==="hi") return `<div class="hi">${esc(c.hi)}</div>${rom}`;
  return `<div class="en">${esc(c.en)}</div>`;
}
function extrasHTML(c){
  if(c.custom) return `${c.en && c.my && shown("en") ? `<div class="en">${esc(c.en)}</div>`:""}${c.note?`<div class="note" dir="auto">${esc(c.note)}</div>`:""}`;
  const b = S.settings.base, out = [];
  if(b!=="ur" && shown("ur")) out.push(`<div class="ur">${esc(c.u)}</div>`);
  if(b!=="hi" && shown("hi")) out.push(`<div class="hi">${esc(c.hi)}</div>`);
  if(b!=="en" && shown("en")) out.push(`<div class="en">${esc(c.en)}</div>`);
  return out.join("");
}
function makeOptions(c){
  const ans = frontLang()==="de" ? "my" : "de";
  const key = x => ans==="de" ? x.de : myText(x);
  const pool0 = c.custom ? CUSTOM : unitById(c.unit).cards;
  let pool = pool0.filter(x => x!==c && key(x) && key(x)!==key(c));
  if(pool.length < 3) pool = pool.concat(DECK.filter(x => x!==c && x.level===(c.custom?"A1":c.level) && key(x)!==key(c)));
  return {ans, opts: shuffle([c, ...shuffle(uniq(pool)).slice(0,3)])};
}
function drawSession(){
  const s = session, c = s.queue[0];
  if(!c) return finishSession(false);
  const front = frontLang(), back = front==="de" ? "my" : "de";
  const cat = c.custom ? "My word" : unitById(c.unit)?.title || "";
  const pct = Math.round(s.done/(s.done+s.queue.length)*100);
  const dots = `<span class="boxdots">${dotsHTML(c)}</span>`;
  const answer = `<div class="answer">${sideHTML(back,c)}${extrasHTML(c)}${spk(c.de,c.id)}</div>`;
  const tools = `<div class="cardtools">
      <button class="btn sm ${isWanted(c)?"want":""}" type="button" data-swant>${ic("star", isWanted(c)?"fill":"")}${isWanted(c)?"On my list":"Want to learn"}</button>
      <button class="btn sm" type="button" data-sknow>${ic("check")}I already know this</button></div>`;
  let body;
  const isBack = s.state==="back";
  if(s.mode==="write") body = writeBody(c, cat, dots, isBack);
  else if(s.mode==="speak") body = speakBody(c, cat, dots, isBack);
  else if(s.mode==="flip"){
    body = `<div class="card ${c.g}${isBack?" is-back":""}" role="button" tabindex="0" aria-label="Card. Tap to show the answer">
        <span class="cat">${esc(cat)}</span>${dots}
        ${visHTML(c)}
        <div class="face">${sideHTML(front,c)}</div>
        ${front==="de"&&!isBack?spk(c.de,c.id):""}
        ${isBack ? answer : `<div class="hint">Say the answer in your head, then tap the card</div>`}
      </div>
      ${isBack ? "" : tools}
      <div class="sactions">${isBack
        ? `<button class="btn bad big" data-ans="0">${ic("x")}Not yet</button><button class="btn good big" data-ans="1">${ic("check")}Got it</button>`
        : `<button class="btn primary big full" data-flip>Show answer</button>`}</div>`;
  } else {
    if(!s.opts) s.opts = makeOptions(c);
    const {ans, opts} = s.opts;
    const label = x => ans==="de" ? colorDe(x.de) : myHTML(x);
    const ok = s.picked===c;
    body = isBack
      ? `<div class="card ${c.g} is-back" style="cursor:default">
          <span class="cat">${esc(cat)}</span>${dots}
          ${visHTML(c)}
          <div class="face">${sideHTML(front,c)}</div>
          <div class="flash ${ok?"ok":"no"}">${ok?"✓ Richtig! +10 XP":`✗ Not quite. You chose: ${label(s.picked)}`}</div>
          ${answer}
        </div>
        <div class="sactions"><button class="btn primary big full" data-continue>Continue</button></div>`
      : `<div class="card ${c.g} quiz" style="cursor:default">
          <span class="cat">${esc(cat)}</span>${dots}
          ${visHTML(c)}
          <div class="face">${sideHTML(front,c)}</div>
          ${front==="de"?spk(c.de,c.id):""}
        </div>
        <div class="options">${opts.map((x,i)=>`<button class="opt" data-opt="${i}"><span class="k">${i+1}</span>${label(x)}</button>`).join("")}</div>
        ${tools}`;
  }
  app.innerHTML = `<div class="session">
    <div class="sbar"><button class="iconbtn" data-exit aria-label="End practice">${ic("x")}</button><div class="bar"><i style="width:${pct}%"></i></div><span class="xpchip">${s.done}/${s.done+s.queue.length} · +${s.xp} XP</span></div>
    ${body}
  </div>`;
  if(s.state==="back" && S.settings.autoplay) say(c.de, c.id);
  if(s.mode==="write" && s.state==="front") wireWrite();
}

/* =====================================================================
   WRITE & SPEAK — type the German, or say it out loud
   ===================================================================== */
const normDe = x => String(x||"").normalize("NFC").replace(/[.,!?¿¡;:"„“”‚‘'’()…]/g," ").replace(/\s+/g," ").trim();
const foldDe = x => normDe(x).toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss");
function lev(a, b){
  if(a===b) return 0; if(!a.length) return b.length; if(!b.length) return a.length;
  let prev = Array.from({length:b.length+1}, (_,i)=>i);
  for(let i=1;i<=a.length;i++){ const cur=[i]; for(let j=1;j<=b.length;j++) cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev = cur; }
  return prev[b.length];
}
/* every acceptable German answer for a card: "morgen / gestern" accepts either, "..." placeholders are dropped */
function targetsOf(c){
  return String(c.de).split(/\s+\/\s+/).map(t => t.replace(/\.\.\.|…/g,"").replace(/\s*\([^)]*\)/g,"").replace(/,\s*$/,"").trim()).filter(Boolean);
}
const ART = /^(der|die|das)\s+/i;
const plainU = x => foldDe(x).replace(/ae/g,"a").replace(/oe/g,"o").replace(/ue/g,"u").replace(/ss/g,"s");
const UML_NOTE = "Use ä, ö, ü and ß. The buttons under the box type them for you.";
function compareDe(g, t){
  if(g===t) return {res:"right", note:"", d:0};
  if(g.toLowerCase()===t.toLowerCase()) return {res:"almost", note:"Watch the capital letters: German nouns always start with a capital.", d:0};
  if(foldDe(g)===foldDe(t) || (/[äöüß]/i.test(t) && plainU(g)===plainU(t))) return {res:"almost", note:UML_NOTE, d:0};
  const d = lev(foldDe(g), foldDe(t)), allow = Math.max(1, Math.floor(foldDe(t).length*0.12));
  if(d <= allow) return {res:"almost", note: d===1 ? "One letter off. Compare carefully:" : "A small typo. Compare carefully:", d};
  return {res:"wrong", note:"", d};
}
function checkWrite(given, c){
  const g = normDe(given);
  if(!g) return {res:"wrong", note:"Type the German, then tap Check."};
  let best = {res:"wrong", note:"", d:1e9};
  const better = r => { const rank = x => x.res==="right"?0:x.res==="almost"?1:2; if(rank(r)<rank(best) || (rank(r)===rank(best) && r.d<best.d)) best = r; };
  for(const t0 of targetsOf(c)){
    const t = normDe(t0), tm = ART.exec(t), gm = ART.exec(g);
    const r = compareDe(g, t); if(r.res==="right") return r; better(r);
    if(tm && !gm){ const r2 = compareDe(g, t.replace(ART,""));
      if(r2.res!=="wrong") better({res:"almost", note:`Don't forget the article: <b>${esc(tm[1])}</b> ${esc(t.replace(ART,""))}.${r2.res==="almost"?" "+r2.note.replace(/ Compare carefully:$/,""):""}`, d:r2.d+1}); }
    if(tm && gm && tm[1].toLowerCase()!==gm[1].toLowerCase() && compareDe(g.replace(ART,""), t.replace(ART,"")).res!=="wrong")
      better({res:"wrong", note:`Right word, wrong article. It's <b>${esc(tm[1])}</b>. The colour helps: ${tm[1]==="der"?"blue = der":tm[1]==="die"?"red = die":"green = das"}.`, d:1});
  }
  return best;
}
const UMLAUTS = ["ä","ö","ü","ß","Ä","Ö","Ü"];
function writeBody(c, cat, dots, isBack){
  const s = session, prompt = `<div class="face">${sideHTML("my",c)}</div>`;
  if(!isBack) return `<div class="card ${c.g} write" style="cursor:default">
      <span class="cat">${esc(cat)}</span>${dots}
      ${visHTML(c)}${prompt}
      <div class="hint">Write it in German${ART.test(c.de) ? ", with der / die / das" : ""}</div>
    </div>
    <form class="writebox" id="wForm" autocomplete="off">
      <label class="sr" for="wIn">Your answer in German</label>
      <input class="input" id="wIn" lang="de" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Auf Deutsch …">
      <div class="umls" aria-label="Special letters">${UMLAUTS.map(u=>`<button type="button" class="chip" data-uml="${u}">${u}</button>`).join("")}</div>
      <div class="sactions"><button type="button" class="btn ghost big" data-wshow>Show me</button><button type="submit" class="btn primary big">Check</button></div>
    </form>`;
  const r = s.result || {res:"wrong"}, ok = r.res !== "wrong";
  s.lastOk = ok;
  const head = r.res==="right" ? "✓ Richtig! Perfectly written." : r.res==="almost" ? "✓ Almost! Counted as right." : r.given ? "✗ Not yet" : "Here it is";
  return `<div class="card ${c.g} is-back" style="cursor:default">
      <span class="cat">${esc(cat)}</span>${dots}
      ${visHTML(c)}${prompt}
      <div class="flash ${ok?"ok":"no"}">${head}</div>
      ${r.given && r.res!=="right" ? `<div class="yours"><span class="label">You wrote</span><span class="${ok?"":"strike"}">${esc(r.given)}</span></div>` : ""}
      <div class="answer"><div class="dd">${colorDe(c.de)}</div>${r.note?`<div class="note">${r.note}</div>`:""}${spk(c.de,c.id)}</div>
    </div>
    <div class="sactions"><button class="btn ${ok?"good":"primary"} big full" data-next>${ok?"Continue":"Got it, continue"}</button></div>`;
}
function wireWrite(){
  const f = $("#wForm"), i = $("#wIn"); if(!f) return;
  setTimeout(() => { try{ i.focus({preventScroll:true}); }catch(e){} }, 60);
  f.addEventListener("submit", e => { e.preventDefault(); const s = session; if(!s) return;
    const r = checkWrite(i.value, s.queue[0]); if(!normDe(i.value)){ toast(r.note); return; }
    s.result = {...r, given: i.value.trim()}; s.state = "back"; drawSession(); });
}

/* ---------- speak ---------- */
let SPK = {rec:null, on:false, media:null, chunks:[], url:""};
const wordsOf = x => foldDe(x).split(" ").filter(Boolean);
function lcs(a, b){ const m = Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) m[i][j] = a[i-1]===b[j-1] ? m[i-1][j-1]+1 : Math.max(m[i-1][j], m[i][j-1]);
  return m[a.length][b.length]; }
function scoreSpeech(heard, c){
  let best = 0;
  for(const t of targetsOf(c)){ const tw = wordsOf(t); if(!tw.length) continue;
    for(const h of heard){ const hw = wordsOf(h);
      // allow near-misses on single words (recogniser spelling), then count words in the right order
      const fixed = hw.map(w => tw.find(x => x===w || (x.length>3 && lev(x,w)<=1)) || w);
      best = Math.max(best, lcs(tw, fixed) / tw.length); } }
  return Math.round(best*100);
}
function heardHTML(text, c){
  const tw = new Set(targetsOf(c).flatMap(wordsOf));
  return normDe(text).split(" ").map(w => `<span class="${tw.has(foldDe(w)) || [...tw].some(x=>x.length>3 && lev(x,foldDe(w))<=1) ? "hit" : "miss"}">${esc(w)}</span>`).join(" ");
}
function speakStart(){
  const s = session; if(!s) return;
  s.speakErr = "";
  if(SR){
    S.settings.listenOk = true; save();
    const rec = new SR(); SPK.rec = rec; SPK.on = true;
    rec.lang = "de-DE"; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 5;
    rec.onresult = e => { const alts = [...e.results[0]].map(a => a.transcript); SPK.on = false;
      const sc = scoreSpeech(alts, s.queue[0]); s.result = {heard: alts[0]||"", score: sc}; s.state = "back"; drawSession(); };
    rec.onerror = e => { SPK.on = false; s.speakErr = e.error==="no-speech" ? "I didn't hear anything. Tap the mic and speak clearly." : (e.error==="not-allowed"||e.error==="service-not-allowed") ? "The microphone is blocked. Allow it for this site in your browser settings." : e.error==="network" ? "Speech checking needs internet in this browser. You can still say it and check yourself." : "Couldn't hear that. Try again."; drawSession(); };
    rec.onend = () => { if(SPK.on){ SPK.on = false; drawSession(); } };
    try{ rec.start(); }catch(err){ SPK.on = false; }
    return drawSession();
  }
  // no speech recognition (e.g. some iPhones): record yourself and compare by ear
  if(!navigator.mediaDevices || !window.MediaRecorder){ s.result = null; s.state = "back"; return drawSession(); }
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
    SPK.chunks = []; const mr = new MediaRecorder(stream); SPK.media = mr; SPK.on = true;
    mr.ondataavailable = e => { if(e.data.size) SPK.chunks.push(e.data); };
    mr.onstop = () => { stream.getTracks().forEach(t=>t.stop()); SPK.on = false; if(SPK.url) URL.revokeObjectURL(SPK.url);
      SPK.url = URL.createObjectURL(new Blob(SPK.chunks, {type: mr.mimeType || "audio/mp4"})); s.result = {recorded:true}; s.state = "back"; drawSession(); };
    mr.start(); setTimeout(() => { if(mr.state==="recording") mr.stop(); }, 6000); drawSession();
  }).catch(() => { s.speakErr = "The microphone is blocked. Allow it for this site in your browser settings."; drawSession(); });
}
function speakStop(){ try{ if(SPK.rec) SPK.rec.stop(); }catch(e){} try{ if(SPK.media && SPK.media.state==="recording") SPK.media.stop(); }catch(e){} }
function speakBody(c, cat, dots, isBack){
  const s = session, prompt = `<div class="face">${sideHTML("my",c)}</div>`;
  if(!isBack){
    const how = SR ? "Say it in German. I'll check your pronunciation." : window.MediaRecorder ? "Say it in German. I'll record you so you can compare." : "Say it out loud in German, then check.";
    return `<div class="card ${c.g} speak" style="cursor:default">
        <span class="cat">${esc(cat)}</span>${dots}
        ${visHTML(c)}${prompt}
        <div class="hint">${how}</div>
        ${s.speakErr ? `<div class="flash no">${esc(s.speakErr)}</div>` : ""}
      </div>
      <div class="micwrap">
        <button class="micbtn${SPK.on?" on":""}" type="button" ${SPK.on?"data-sstop":"data-smic"} aria-label="${SPK.on?"Stop":"Speak"}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg></button>
        <span class="small muted">${SPK.on ? "Listening… tap to stop" : "Tap and speak"}</span>
      </div>
      <div class="sactions"><button class="btn ghost big full" data-sself>Show the answer instead</button></div>
      ${SR && !S.settings.listenOk ? `<p class="small muted" style="margin:0;text-align:center">Your browser turns your voice into text (Google in Chrome, Apple in Safari). Wortzi saves no audio.</p>` : ""}`;
  }
  const r = s.result;
  let verdict = "", self = false;
  if(r && r.score !== undefined){
    s.lastOk = r.score >= 70;
    verdict = `<div class="flash ${s.lastOk?"ok":"no"}">${r.score>=90?"✓ Sehr gut! Clear and correct.":r.score>=70?"✓ Gut! Nearly perfect.":r.score>=40?"Almost. Listen and try once more next time.":"Not yet. Listen to it, then say it again."} <b>${r.score}%</b></div>
      <div class="yours"><span class="label">I heard</span><span class="heard">${heardHTML(r.heard, c)}</span></div>`;
  } else self = true;
  return `<div class="card ${c.g} is-back" style="cursor:default">
      <span class="cat">${esc(cat)}</span>${dots}
      ${visHTML(c)}${prompt}
      ${verdict}
      <div class="answer"><div class="dd">${colorDe(c.de)}</div>${spk(c.de,c.id)}
        ${r && r.recorded && SPK.url ? `<audio controls src="${SPK.url}" class="myrec"></audio><span class="small muted">Your voice. Play both and compare.</span>` : ""}</div>
    </div>
    <div class="sactions">${self
      ? `<button class="btn bad big" data-ans="0">${ic("x")}Not yet</button><button class="btn good big" data-ans="1">${ic("check")}I said it right</button>`
      : `<button class="btn ${s.lastOk?"good":"primary"} big full" data-next>Continue</button>`}</div>`;
}
function choose(i){ const s = session; s.picked = s.opts.opts[i]; s.state = "back"; drawSession(); }
function tick(){ S.days[today()] = (S.days[today()]||0) + 1; }
function grade(ok){
  const s = session, c = s.queue.shift();
  const r = S.cards[c.id] || (S.cards[c.id] = {b:-1});
  const wasLearned = isLearned(c), wasWanted = !!S.want[c.id];
  if(ok && s.mode==="write") S.written++;
  if(ok && s.mode==="speak") S.spoken++;
  s.result = null; s.lastOk = false; s.speakErr = "";
  if(ok){ r.b = Math.min(INTERVALS.length-1, Math.max(0, r.b) + 1); r.due = Date.now() + INTERVALS[r.b]*DAY - 3600000; s.xp += 10; S.xp += 10; s.right++; }
  else { r.b = Math.max(0, r.b - 2); r.due = Date.now(); s.xp += 2; S.xp += 2; s.wrong++;
    if(!s.retried.has(c.id)){ s.retried.add(c.id); s.queue.splice(Math.min(3, s.queue.length), 0, c); } }
  r.seen = Date.now();
  if(!wasLearned && isLearned(c)){ s.moved.push(c); if(wasWanted) delete S.want[c.id]; }
  tick(); s.done++; s.state = "front"; s.picked = null; s.opts = null;
  save(); renderStats(); drawSession();
}
function sessionKnow(){
  const s = session, c = s.queue.shift(), snap = snapWord(c.id), qBefore = [c, ...s.queue], movedBefore = [...s.moved];
  const was = isLearned(c); markKnown(c, true); if(!was) s.moved.push(c);
  s.queue = s.queue.filter(x => x.id !== c.id);
  s.xp += 5; S.xp += 5; tick(); s.done++; s.state = "front"; s.picked = null; s.opts = null; s.result = null;
  save(); renderStats();
  toast(`<b>${esc(c.de)}</b> moved to I learned`, {html:true, kind:"ok", undo: () => {
    if(session !== s) { restoreWord(snap); return refresh(); }
    restoreWord(snap); s.queue = qBefore; s.moved = movedBefore; s.xp -= 5; S.xp -= 5; s.done--;
    S.days[today()] = Math.max(0, (S.days[today()]||1) - 1); s.state = "front"; save(); renderStats(); drawSession(); }});
  drawSession();
}
document.addEventListener("keydown", e => {
  const s = session; if(!s || e.target.closest("input,textarea,select")) return;
  if(e.key==="Escape") return finishSession(true);
  if(s.mode==="write" || s.mode==="speak"){
    if(s.state==="back" && s.result && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); grade(!!s.lastOk); }
    return;
  }
  if(s.mode==="flip"){
    if(s.state==="front" && (e.key===" "||e.key==="Enter")){ e.preventDefault(); s.state="back"; drawSession(); }
    else if(s.state==="back" && (e.key==="1"||e.key==="ArrowLeft")) grade(false);
    else if(s.state==="back" && (e.key==="2"||e.key==="ArrowRight")) grade(true);
  } else {
    if(s.state==="front" && /^[1-4]$/.test(e.key)) choose(+e.key-1);
    else if(s.state==="back" && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); grade(s.picked===s.queue[0]); }
  }
});
function finishSession(early){
  const s = session; if(!s) return;
  session = null; document.body.classList.remove("in-session");
  if(s.done===0) return route();
  S.sessions++; if(s.mode==="quiz") S.quizzes++;
  askPersist();
  const perfect = !early && s.wrong===0 && s.right>=5;
  if(perfect){ S.perfect++; S.xp += 20; s.xp += 20; }
  save();
  const fresh = checkBadges(); renderStats();
  const u = s.unitId ? unitById(s.unitId) : null, after = u ? unitStats(u) : null;
  const acc = Math.round(s.right/Math.max(1,s.right+s.wrong)*100);
  const msg = s.right+s.wrong===0 ? ["✓","Gut!","You sorted your cards."] : acc>=90 ? ["🏆","Ausgezeichnet!","Excellent work."] : acc>=70 ? ["🎉","Sehr gut!","Very good."] : acc>=50 ? ["💪","Gut gemacht!","Well done. Keep going."] : ["🌱","Weiter so!","Every round makes it stick."];
  const goalNow = todayCount()>=S.settings.goal && todayCount()-s.done < S.settings.goal;
  const backHash = u ? "#unit-"+u.id : s.kind==="story" ? "#story-"+s.storyId : (s.kind==="want"||s.kind==="mine") ? "#words" : s.kind==="learned" ? "#words-learned" : s.kind==="level" ? "#learn-"+s.levelId : "#today";
  history.replaceState(null,"", backHash); setNav(backHash.startsWith("#unit")?"learn":backHash.startsWith("#words")?"words":"today");
  app.innerHTML = `<div class="done pop">
    <div class="trophy">${msg[0]}</div>
    <h1>${msg[1]}</h1><p class="muted" style="margin:0">${msg[2]}${perfect?" No mistakes: +20 bonus XP.":""}</p>
    <div class="tiles">
      <div class="tile"><b>+${s.xp}</b><span>XP earned</span></div>
      <div class="tile"><b>${s.right+s.wrong?acc+"%":"–"}</b><span>correct</span></div>
      <div class="tile"><b>${Math.min(todayCount(),S.settings.goal)}/${S.settings.goal}</b><span>today's goal</span></div>
    </div>
    ${s.moved.length?`<div class="panel" style="width:100%;text-align:left;display:grid;gap:6px"><span class="label">✓ Moved to I learned (${s.moved.length})</span><div style="display:flex;flex-wrap:wrap;gap:6px">${s.moved.slice(0,12).map(c=>`<span class="pill ok">${esc(c.de)}</span>`).join("")}</div></div>`:""}
    ${u?`<div class="panel" style="width:100%;display:grid;gap:6px;text-align:left"><span class="label">Unit ${u.n} · ${esc(u.title)}</span>
      <div class="row between"><span style="font-size:22px">${starsHTML(after.stars)}</span><span class="small muted">${after.mastered}/${after.total} learned</span></div>
      <div class="bar"><i style="width:${Math.round(after.mastered/after.total*100)}%"></i></div>
      ${after.stars>s.before?`<b style="color:var(--accent)">New star earned!</b>`:""}</div>`:""}
    ${goalNow?`<div class="newbadge"><span class="e">🎯</span><div><b>Daily goal reached!</b><div class="small muted">Streak: ${streak()} day${streak()===1?"":"s"}</div></div></div>`:""}
    ${fresh.map(b=>`<div class="newbadge"><span class="e">${b.e}</span><div><b>New badge: ${esc(b.t)}</b><div class="small muted">${esc(b.d)}</div></div></div>`).join("")}
    <div class="row" style="justify-content:center">
      <button class="btn primary big" data-start="${s.kind}" ${s.unitId||s.levelId?`data-id="${s.unitId||s.levelId}"`:""} ${s.mode==="write"||s.mode==="speak"?`data-mode="${s.mode}"`:""}>Another round</button>
      <a class="btn ghost big" href="${backHash}">Done</a>
    </div></div>`;
  if(acc>=70 || fresh.length || goalNow) confetti();
}
let confettiRun = 0;
function stopConfetti(){ confettiRun++; const cv = $("#confetti"); if(cv) cv.hidden = true; }
function confetti(){
  if(reduceMotion) return;
  const run = ++confettiRun;
  const cv = $("#confetti"); cv.hidden = false; const ctx = cv.getContext("2d");
  const W = cv.width = innerWidth, H = cv.height = innerHeight;
  const cs = getComputedStyle(document.documentElement);
  const cols = ["--accent","--ok","--der","--die","--pl"].map(v=>cs.getPropertyValue(v).trim());
  const ps = Array.from({length:110}, () => ({x:W/2+(Math.random()-.5)*120, y:H*.35, vx:(Math.random()-.5)*11, vy:-Math.random()*11-3, r:Math.random()*6+3, c:cols[Math.random()*cols.length|0], a:Math.random()*6}));
  let t = 0;
  (function step(){
    ctx.clearRect(0,0,W,H);
    ps.forEach(p => { p.vy += .3; p.x += p.vx; p.y += p.vy; p.a += .1; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); ctx.restore(); });
    if(run !== confettiRun){ ctx.clearRect(0,0,W,H); return; }
    if(++t < 110) requestAnimationFrame(step); else { ctx.clearRect(0,0,W,H); cv.hidden = true; }
  })();
}

/* =====================================================================
   ME — progress, reports, backup, privacy, settings
   ===================================================================== */
let confirmReset = false, backupMsg = "", importState = {text:"", needPw:false, err:""};
let installEvt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if(!session && (location.hash==="" || location.hash==="#today")) route(); });
addEventListener("appinstalled", () => { installEvt = null; askPersist(); toast("✓ Installed. Find Wortzi on your home screen."); });
function viewMe(){
  const L = levelInfo(), st = S.settings;
  const days = []; const d = new Date(); d.setDate(d.getDate()-13);
  for(let i=0;i<14;i++){ days.push({k:dayKey(d), lab:"SMTWTFS"[d.getDay()], n:S.days[dayKey(d)]||0}); d.setDate(d.getDate()+1); }
  const max = Math.max(st.goal, ...days.map(x=>x.n));
  const extraChip = (k,label,cls="") => k===st.base ? "" : `<button class="chip ${cls}" data-extra="${k}" aria-pressed="${!!st.extra[k]}">${label}</button>`;
  const activeDays = Object.keys(S.days).length;
  app.innerHTML = `<h1 style="margin-bottom:16px">Me</h1>
    <div class="ptiles">
      <div class="ptile"><span>Level</span><b>⭐ ${L.lvl}</b><div class="bar gold"><i style="width:${Math.round(L.into/L.per*100)}%"></i></div><span>${L.per-L.into} XP to level ${L.lvl+1}</span></div>
      <div class="ptile"><span>Streak</span><b>🔥 ${streak()}</b><span>${activeDays} active day${activeDays===1?"":"s"} in total</span></div>
      <div class="ptile"><span>✓ I learned</span><b style="color:var(--ok)">${learnedList().length}</b><span>of ${DECK.length} app cards + ${S.custom.length} own</span></div>
      <div class="ptile"><span>☆ I want to learn</span><b style="color:var(--want)">${wantList().length}</b><span>🎧 ${S.listens||0} listens</span></div>
    </div>
    <div class="panel" style="margin-top:12px">
      <div class="row between"><h3>Last 14 days</h3><span class="small muted">cards per day · gold = goal met</span></div>
      <div class="week">${days.map(x=>`<div><i class="${x.n===0?"zero":x.n>=st.goal?"goal":""}" style="height:${Math.max(3,Math.round(x.n/max*88))}px" title="${x.k}: ${x.n}"></i><small>${x.lab}</small></div>`).join("")}</div>
    </div>

    <div class="section-title"><h2>PDF reports and printouts</h2><span class="small muted">Your learning, on paper</span></div>
    <div class="reports">
      <div class="report"><span class="e">📈</span><b>Progress report</b><p>Level, streak, every unit, your two lists and badges. Good for your German course teacher or for yourself.</p><a class="btn" href="#report" data-rep="progress">Open</a></div>
      <div class="report"><span class="e">📒</span><b>My word book</b><p>Your I learned and I want to learn lists as a pocket phrasebook in your languages.</p><a class="btn" href="#report" data-rep="wordbook">Open</a></div>
      <div class="report"><span class="e">✂️</span><b>Cut-out flashcards</b><p>Print your wish list as real cards with pictures. Cut, fold, carry them in your bag.</p><a class="btn" href="#report" data-rep="cards">Open</a></div>
      <div class="report"><span class="e">📘</span><b>Course book</b><p>Every unit of A1 or A2 with your status next to each word.</p><a class="btn" href="#report" data-rep="unitbook">Open</a></div>
    </div>

    <div class="section-title"><h2>Badges</h2><span class="small muted">${Object.keys(S.badges).length} of ${BADGES.length}</span></div>
    <div class="badges">${BADGES.map(b=>`<div class="badge ${S.badges[b.id]?"":"locked"}"><span class="e">${b.e}</span><b>${esc(b.t)}</b><span>${S.badges[b.id]?"Earned "+esc(S.badges[b.id]):esc(b.d)}</span></div>`).join("")}</div>

    <div class="section-title"><h2>Settings</h2></div>
    <div class="panel stack">
      <div class="field"><label for="s-name">Your name <span class="muted small">(only shown on your PDFs, stays on this device)</span></label><input class="input" id="s-name" maxlength="60" value="${esc(st.name)}" autocomplete="off" style="max-width:340px"></div>
      <div class="setup">
        <div><span class="label">I speak</span><div class="chips" data-set="base">
          <button class="chip ur" data-v="ur" aria-pressed="${st.base==="ur"}">اردو</button>
          <button class="chip" data-v="hi" aria-pressed="${st.base==="hi"}">हिन्दी</button>
          <button class="chip" data-v="en" aria-pressed="${st.base==="en"}">English</button></div></div>
        <div><span class="label">Also show</span><div class="chips">
          ${extraChip("ur","اردو","ur")}${extraChip("hi","हिन्दी")}${extraChip("en","English")}
          <button class="chip" data-extra="rom" aria-pressed="${!!st.extra.rom}">Roman script</button></div></div>
      </div>
      ${practiceChips()}
      <div class="setup">
        <div><span class="label">Daily goal</span><div class="chips" data-set="goal">${[10,20,40].map(g=>`<button class="chip" data-v="${g}" aria-pressed="${st.goal===g}">${g} cards</button>`).join("")}</div></div>
        <div><span class="label">Theme</span><div class="chips" data-set="theme">${[["system","Auto"],["light","Light"],["dark","Dark"]].map(([v,l])=>`<button class="chip" data-v="${v}" aria-pressed="${st.theme===v}">${l}</button>`).join("")}</div></div>
        <div><span class="label">Audio</span><div class="chips"><button class="chip" id="autoplay" aria-pressed="${!!st.autoplay}">Play German after each answer</button>
          ${AUDIO && !SANDBOX ? `<button class="chip" id="audioAll" type="button">${ic("download")}Save all audio for offline (${AUDIO.size} words, about ${Math.round(AUDIO.size*7/1000)} MB)</button>` : ""}</div>
          <span class="small muted">Words play with a natural recorded voice. Tap 🔊 twice for slow.</span></div>
      </div>
      ${installEvt?`<div><button class="btn" id="install">${ic("phone")}Install as an app</button></div>`:`<p class="small muted" style="margin:0">📲 Use it like an app: in your phone's browser menu choose <b>Add to Home screen</b>. It then works offline too.</p>`}
    </div>

    <div class="section-title"><h2>Your data is safe</h2></div>
    <div class="panel stack">
      <ul class="privacy" style="margin:0;padding-left:18px">
        <li><b>No account, no sign-up.</b> Nobody can see your lists or progress.</li>
        <li><b>Everything stays on this device</b>, in this browser. Nothing is sent to any server.</li>
        <li><b>No tracking, no ads, no cookies.</b> Fonts and audio come from your own device.</li>
        <li><b>You own your data:</b> make a backup file, protect it with a password, move it to a new phone, or delete it all.</li>
      </ul>
      <div class="field"><label for="b-pw">Backup password <span class="muted small">(optional, recommended)</span></label>
        <input class="input" id="b-pw" type="password" autocomplete="new-password" maxlength="100" style="max-width:340px" placeholder="Leave empty for no password">
        <span class="help">With a password the file is encrypted (AES-256). Without the password nobody, not even you, can open it.</span></div>
      <div class="row">
        <button class="btn" id="b-export">${ic("download")}Download backup</button>
        <button class="btn" id="b-copy">${ic("copy")}Copy backup as text</button>
      </div>
      ${backupMsg?`<p class="small" style="margin:0">${backupMsg}</p>`:""}
      <details ${importState.text||importState.err?"open":""}><summary style="cursor:pointer;font-weight:700">Restore from a backup</summary>
        <div class="stack" style="margin-top:10px">
          <input class="input" type="file" id="i-file" accept=".json,application/json,text/plain" aria-label="Choose a backup file">
          <textarea class="input" id="i-text" placeholder="…or paste the backup text here" aria-label="Backup text">${esc(importState.text)}</textarea>
          <input class="input" id="i-pw" type="password" autocomplete="off" placeholder="Password, if the backup has one" style="max-width:340px" aria-label="Backup password">
          ${importState.err?`<p class="small" style="color:var(--bad);margin:0">${esc(importState.err)}</p>`:""}
          <div><button class="btn primary" id="i-go">Restore and replace my current data</button></div>
        </div></details>
      <div class="confirm">${confirmReset
        ? `<span>Delete all progress, lists, own words and badges on this device?</span><button class="btn bad" id="r-yes">Yes, delete everything</button><button class="btn" id="r-no">Keep it</button>`
        : `<button class="btn ghost" id="r-ask">${ic("trash")}Delete all my data</button>`}</div>
    </div>
    <p class="small muted" style="margin-top:20px">Wortzi ${APP_VERSION} · open source · works offline once loaded.</p>`;

  $$("[data-rep]").forEach(a => a.addEventListener("click", () => { reportOpts.type = a.dataset.rep; }));
  $("#s-name").addEventListener("change", e => { S.settings.name = clip(e.target.value,60); save(); toast("Saved"); });
  $("#autoplay").onclick = () => { st.autoplay = !st.autoplay; save(); route(); };
  const aa = $("#audioAll"); if(aa) aa.onclick = () => saveAllAudio(aa);
  if($("#install")) $("#install").onclick = async () => { try{ installEvt.prompt(); await installEvt.userChoice; }catch(e){} installEvt = null; route(); };
  if($("#r-ask")) $("#r-ask").onclick = () => { confirmReset = true; route(); };
  if($("#r-no")) $("#r-no").onclick = () => { confirmReset = false; route(); };
  if($("#r-yes")) $("#r-yes").onclick = () => { S = DEFAULTS(); save(); rebuildIndex(); confirmReset = false; backupMsg = ""; toast("All data deleted"); route(); };
  $("#b-export").onclick = () => doExport(false);
  $("#b-copy").onclick = () => doExport(true);
  $("#i-file").addEventListener("change", async e => { const f = e.target.files[0]; if(!f) return; if(f.size > 5e6){ importState.err = "That file is too big to be a backup."; return route(); } $("#i-text").value = await f.text(); });
  $("#i-go").onclick = () => doImport($("#i-text").value, $("#i-pw").value);
}

/* ---------- backup (optionally encrypted with AES-GCM + PBKDF2) ---------- */
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function deriveKey(pw, salt){
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2", salt, iterations:250000, hash:"SHA-256"}, base, {name:"AES-GCM", length:256}, false, ["encrypt","decrypt"]);
}
async function makeBackup(pw){
  const payload = JSON.stringify({app:"wortzi", format:1, exported:new Date().toISOString(), data:S});
  if(!pw) return payload;
  if(!crypto?.subtle) throw new Error("Encryption needs a secure (https) page.");
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt);
  const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, new TextEncoder().encode(payload));
  return JSON.stringify({app:"wortzi", format:1, encrypted:true, kdf:"PBKDF2-SHA256-250000", salt:b64(salt), iv:b64(iv), data:b64(ct)});
}
async function doExport(asText){
  const pw = $("#b-pw").value;
  let text;
  try{ text = await makeBackup(pw); }catch(e){ backupMsg = "Could not make the backup: " + esc(e.message); return route(); }
  if(asText || SANDBOX){
    try{ await navigator.clipboard.writeText(text); backupMsg = `✓ Backup copied${pw?" (encrypted)":""}. Paste it into a note or email to yourself.`; }
    catch(e){ backupMsg = "Copying was blocked. Select the text below and copy it:"; importState.text = text; }
    return route();
  }
  const blob = new Blob([text], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `wortzi-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  backupMsg = `✓ Backup downloaded${pw?" and encrypted":""}. Keep it somewhere safe.`; route();
}
async function doImport(text, pw){
  importState = {text, needPw:false, err:""};
  let obj;
  try{ obj = JSON.parse(text); }catch(e){ importState.err = "This does not look like a Wortzi backup."; return route(); }
  if(!obj || !["wortzi","german-bridge"].includes(obj.app)){ importState.err = "This does not look like a Wortzi backup."; return route(); }
  if(obj.encrypted){
    if(!pw){ importState.err = "This backup is protected. Enter its password."; return route(); }
    try{
      const key = await deriveKey(pw, unb64(obj.salt));
      const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(obj.iv)}, key, unb64(obj.data));
      obj = JSON.parse(new TextDecoder().decode(plain));
    }catch(e){ importState.err = "Wrong password, or the backup is damaged."; return route(); }
  }
  S = sanitize(obj.data); save(); rebuildIndex();
  importState = {text:"", needPw:false, err:""}; backupMsg = "";
  toast("✓ Backup restored"); location.hash = "today";
}

/* =====================================================================
   PDF REPORTS (rendered as A4 pages, saved through the browser's print → Save as PDF)
   ===================================================================== */
const reportOpts = {type:"progress", source:"want", level:"A1", layout:"fold"};
function viewReport(){
  const o = reportOpts;
  const chips = (key, arr) => `<div class="chips" data-rset="${key}">${arr.map(([v,l])=>`<button class="chip" data-rv="${v}" aria-pressed="${o[key]===v}">${l}</button>`).join("")}</div>`;
  const levels = [...new Set(UNITS.map(u=>u.level))];
  app.innerHTML = `<a class="back" href="#me">${ic("left")}Me</a>
    <div class="report-bar">
      ${chips("type", [["progress","📈 Progress"],["wordbook","📒 Word book"],["cards","✂️ Flashcards"],["unitbook","📘 Course book"]])}
      ${o.type==="wordbook"||o.type==="cards" ? chips("source", [["want","☆ I want to learn"],["learned","✓ I learned"],["both","Both lists"],["mine","✍️ My own words"]]) : ""}
      ${o.type==="unitbook" || (o.type==="cards" && o.source==="unit") ? chips("level", levels.map(l=>[l,l]).concat([["all","All"]])) : ""}
      ${o.type==="cards" ? chips("layout", [["fold","Fold in half (one-sided)"],["duplex","Double-sided printing"]]) : ""}
      <button class="btn primary" id="doPrint" ${SANDBOX?"disabled":""}>${ic("printer")}Save as PDF</button>
    </div>
    ${SANDBOX?`<p class="small muted">This is a preview. Saving as PDF works when the app runs on your own website or GitHub Pages.</p>`:`<p class="small muted">Tip: in the print window choose <b>Save as PDF</b> as the printer. On a phone: Share → Print → pinch out on the preview → Save.</p>`}
    <div class="paper-wrap"><div class="paper" id="paper">${buildReport()}</div></div>`;
  $$("[data-rset]").forEach(g => g.addEventListener("click", e => { const b = e.target.closest("[data-rv]"); if(!b) return; o[g.dataset.rset] = b.dataset.rv; route(); }));
  const fit = () => { const pw = $("#paper"); if(!pw) return; const w = pw.parentElement.clientWidth, full = 210*96/25.4; pw.style.zoom = w < full ? (w/full).toFixed(3) : ""; };
  fit(); addEventListener("resize", fit, {once:true});
  const p = $("#doPrint");
  if(p) p.onclick = () => { S.reports++; save(); checkBadges(); const old = document.title; document.title = `Wortzi – ${({progress:"Progress report",wordbook:"My word book",cards:"Flashcards",unitbook:"Course book"})[o.type]} – ${today()}`; window.print(); setTimeout(()=>{ document.title = old; }, 500); };
}
function rHead(title, sub){
  const name = S.settings.name;
  return `<div class="rhead"><div><div class="label" style="color:#5b6561">Wortzi</div><h1>${esc(title)}</h1>${sub?`<div style="font-size:12px;color:#5b6561">${sub}</div>`:""}</div>
    <div class="meta">${name?`<b style="font-size:13px;color:#1c2220">${esc(name)}</b><br>`:""}${fmtDate(Date.now())}</div></div>`;
}
function rLangCols(){ const b = S.settings.base, cols = [b]; ["ur","hi","en"].forEach(l => { if(l!==b && shown(l)) cols.push(l); }); return cols; }
function rCell(c, l){
  if(c.custom){ if(l===S.settings.base) return `<span dir="auto">${esc(c.my)}</span>`; if(l==="en") return esc(c.en); return ""; }
  if(l==="ur") return `<span class="ur">${esc(c.u)}</span>`;
  if(l==="hi") return `<span class="hi">${esc(c.hi)}</span>`;
  return esc(c.en);
}
function rTable(cards, withStatus){
  const cols = rLangCols();
  return `<table class="rtable"><thead><tr><th></th><th>DEUTSCH</th>${cols.map(l=>`<th>${LANG_NAME[l].toUpperCase()}</th>`).join("")}${withStatus?"<th>STATUS</th>":""}</tr></thead><tbody>
    ${cards.map(c=>`<tr><td class="v">${esc(c.v)}</td><td class="de">${colorDe(c.de)}${c.note?`<div style="font-weight:400;font-size:11px;color:#5b6561" dir="auto">${esc(c.note)}</div>`:""}</td>${cols.map(l=>`<td>${rCell(c,l)}</td>`).join("")}${withStatus?`<td style="white-space:nowrap">${isLearned(c)?"✓ learned":isWanted(c)?"☆ want":seen(c)?"· learning":""}</td>`:""}</tr>`).join("")}
  </tbody></table>`;
}
function groupByUnit(cards){
  const groups = [];
  UNITS.forEach(u => { const g = cards.filter(c=>c.unit===u.id); if(g.length) groups.push({title:`${u.emoji} ${u.title}`, lvl:u.level, cards:g}); });
  const mine = cards.filter(c=>c.custom); if(mine.length) groups.push({title:"✍️ My own words", lvl:"", cards:mine});
  return groups;
}
function sourceCards(){
  const o = reportOpts;
  if(o.source==="learned") return learnedList();
  if(o.source==="both") return uniq([...wantList(), ...learnedList()]);
  if(o.source==="mine") return [...CUSTOM];
  return wantList();
}
function buildReport(){
  const o = reportOpts;
  if(o.type==="progress") return reportProgress();
  if(o.type==="wordbook") return reportWordbook();
  if(o.type==="cards") return reportCards();
  return reportUnitbook();
}
function reportProgress(){
  const L = levelInfo(), act = Object.keys(S.days).sort();
  const total = Object.values(S.days).reduce((a,b)=>a+b,0);
  const bars = []; const d = new Date(); d.setDate(d.getDate()-29);
  for(let i=0;i<30;i++){ bars.push(S.days[dayKey(d)]||0); d.setDate(d.getDate()+1); }
  const mx = Math.max(1,...bars);
  const lv = [...new Set(UNITS.map(u=>u.level))];
  const since = act.length ? fmtDate(new Date(act[0]).getTime()) : fmtDate(S.created);
  return `<div class="page">
    ${rHead("Progress report", `Learning since ${since} · ${LANG_NAME[S.settings.base]} → German`)}
    <div class="rgrid">
      <div><b>${L.lvl}</b><span>Level · ${S.xp} XP</span></div>
      <div><b>${act.length}</b><span>Active days · best streak now ${streak()}</span></div>
      <div><b>${learnedList().length}</b><span>✓ Words learned</span></div>
      <div><b>${wantList().length}</b><span>☆ On my wish list</span></div>
      <div><b>${total}</b><span>Cards practised</span></div>
      <div><b>${S.sessions}</b><span>Practice sessions</span></div>
      <div><b>${S.custom.length}</b><span>Own words added</span></div>
      <div><b>${S.listens||0}</b><span>Times listened</span></div>
    </div>
    <div class="rsec">Last 30 days <small>cards per day</small></div>
    <div class="rbars">${bars.map(n=>`<i style="height:${Math.round(n/mx*100)}%"></i>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;font-size:9px;color:#8a938f"><span>30 days ago</span><span>today</span></div>
    ${lv.map(l => { const us = UNITS.filter(u=>u.level===l), cs = DECK.filter(c=>c.level===l), m = cs.filter(isLearned).length;
      return `<div class="rsec">Level ${esc(l)} <small>${m} of ${cs.length} words learned (${Math.round(m/cs.length*100)}%)</small></div>
      <table class="rtable"><thead><tr><th>UNIT</th><th>STARS</th><th>LEARNED</th><th>PROGRESS</th></tr></thead><tbody>
      ${us.map(u=>{const s=unitStats(u); const pct=Math.round(s.mastered/s.total*100); return `<tr><td>${esc(u.emoji)} ${u.n}. ${esc(u.title)}</td><td style="color:#b8860b">${"★".repeat(s.stars)}<span style="color:#ccc">${"★".repeat(3-s.stars)}</span></td><td>${s.mastered}/${s.total}</td><td style="width:35%"><div style="height:6px;background:#eef0ea;border-radius:3px"><div style="height:6px;width:${pct}%;background:#23845a;border-radius:3px"></div></div></td></tr>`}).join("")}
      </tbody></table>`; }).join("")}
    <div class="rsec">Badges <small>${Object.keys(S.badges).length} of ${BADGES.length}</small></div>
    <div class="rbadges">${BADGES.filter(b=>S.badges[b.id]).map(b=>`<span>${b.e} ${esc(b.t)} · ${esc(S.badges[b.id])}</span>`).join("") || `<span>No badges yet</span>`}</div>
  </div>
  <div class="page">
    ${rHead("My words", "Everything on my two lists")}
    <div class="rsec">✓ I learned <small>${learnedList().length}</small></div>
    ${learnedList().length ? rTable(learnedList()) : `<p style="font-size:12px;color:#5b6561">Nothing yet.</p>`}
    <div class="rsec">☆ I want to learn <small>${wantList().length}</small></div>
    ${wantList().length ? rTable(wantList()) : `<p style="font-size:12px;color:#5b6561">Nothing yet.</p>`}
  </div>`;
}
function reportWordbook(){
  const o = reportOpts;
  const parts = [];
  const sec = (title, cards) => `<div class="rsec">${title} <small>${cards.length}</small></div>${groupByUnit(cards).map(g=>`<div style="font-weight:700;font-size:12px;margin:10px 0 4px">${esc(g.title)} ${g.lvl?`<span style="color:#8a938f;font-weight:400">${esc(g.lvl)}</span>`:""}</div>${rTable(g.cards)}`).join("") || `<p style="font-size:12px;color:#5b6561">Nothing yet.</p>`}`;
  if(o.source==="want"||o.source==="both") parts.push(sec("☆ I want to learn", wantList()));
  if(o.source==="learned"||o.source==="both") parts.push(sec("✓ I learned", learnedList()));
  if(o.source==="mine") parts.push(sec("✍️ My own words", [...CUSTOM]));
  return `<div class="page">${rHead("My word book", "der = blue · die = red · das = green · plural = purple")}${parts.join("")}</div>`;
}
function cutFront(c){ return `<div class="cut ${c.g?"g-"+c.g:""}"><span class="corner">Deutsch</span><span class="vis${isTextVisual(c.v)?" txt":""}">${esc(c.v)}</span><span class="de">${colorDe(c.de)}</span></div>`; }
function cutBack(c){
  const b = S.settings.base;
  let main = c.custom ? `<span class="my" dir="auto">${esc(c.my||c.en)}</span>` : b==="ur" ? `<span class="ur">${esc(c.u)}</span>` : b==="hi" ? `<span class="hi">${esc(c.hi)}</span>` : `<span class="my">${esc(c.en)}</span>`;
  const extra = c.custom ? (c.en && c.my ? `<span class="en">${esc(c.en)}</span>`:"") : [ (b!=="hi"&&shown("hi"))?`<span class="hi">${esc(c.hi)}</span>`:"", (b!=="ur"&&shown("ur"))?`<span class="ur" style="font-size:15px">${esc(c.u)}</span>`:"", (b!=="en"&&shown("en"))?`<span class="en">${esc(c.en)}</span>`:"", shown("rom")&&!c.custom?`<span class="en" style="font-style:italic">${esc(c.r)}</span>`:""].join("");
  return `<div class="cut"><span class="corner">${LANG_NAME[b]}</span>${main}${extra}${c.note?`<span class="en" dir="auto">${esc(c.note)}</span>`:""}</div>`;
}
function reportCards(){
  const o = reportOpts;
  let cards = sourceCards();
  if(!cards.length) return `<div class="page">${rHead("Cut-out flashcards")}<p>There are no cards in this list yet. Add words to <b>I want to learn</b> first, or pick another list above.</p></div>`;
  const pages = [];
  if(o.layout==="fold"){
    const per = 4;
    for(let i=0;i<cards.length;i+=per){
      const chunk = cards.slice(i,i+per);
      pages.push(`<div class="page">${i===0?`<p class="cutnote">✂️ Cut along the dashed lines, then fold each strip in the middle: German on one side, your language on the other. ${cards.length} cards.</p>`:""}
        <div class="cutgrid">${chunk.map(c=>cutFront(c)+cutBack(c)).join("")}</div></div>`);
    }
  } else {
    const per = 8;
    for(let i=0;i<cards.length;i+=per){
      const chunk = cards.slice(i,i+per);
      while(chunk.length % 2) chunk.push(null);
      const backs = []; for(let j=0;j<chunk.length;j+=2) backs.push(chunk[j+1], chunk[j]); // mirror each row for long-edge flipping
      pages.push(`<div class="page">${i===0?`<p class="cutnote">🖨️ Print double-sided, flip on the long edge. Then cut along the dashed lines. ${cards.length} cards.</p>`:""}<div class="cutgrid">${chunk.map(c=>c?cutFront(c):`<div class="cut"></div>`).join("")}</div></div>`);
      pages.push(`<div class="page">${i===0?`<p class="cutnote">&nbsp;</p>`:""}<div class="cutgrid">${backs.map(c=>c?cutBack(c):`<div class="cut"></div>`).join("")}</div></div>`);
    }
  }
  return pages.join("");
}
function reportUnitbook(){
  const lv = reportOpts.level;
  const us = UNITS.filter(u => lv==="all" || u.level===lv);
  return `<div class="page">${rHead(`Course book ${lv==="all"?"A1 + A2":lv}`, `${us.length} units · ${us.reduce((a,u)=>a+u.cards.length,0)} words · status from my practice`)}
    ${us.map(u=>{const s=unitStats(u); return `<div class="rsec">${esc(u.emoji)} Unit ${u.n}: ${esc(u.title)} <small>${s.mastered}/${s.total} learned</small></div>${rTable(u.cards,true)}`}).join("")}</div>`;
}

/* =====================================================================
   STORIES — short illustrated scenes built from the learner's words
   ===================================================================== */
let storyTr = false;
const storyById = id => STORIES.find(x => x.id === id);
function glossCard(g){ return S.custom.find(c => c.de.toLowerCase() === String(g.de||"").toLowerCase()) ? BYID.get(S.custom.find(c => c.de.toLowerCase() === String(g.de||"").toLowerCase()).id) : null; }
function storyEntries(st){
  return Object.entries(st.words||{}).map(([key, v]) => {
    if(typeof v === "string") return {key, card: BYID.get(v) || null, gloss: null};
    return {key, card: glossCard(v), gloss: v};
  }).filter(e => e.card || e.gloss);
}
const entryKnown = e => !!(e.card && isLearned(e.card));
function storyStats(st){
  const es = storyEntries(st), k = es.filter(entryKnown).length;
  return {known:k, total:es.length, pct: es.length ? Math.round(k/es.length*100) : 0};
}
function storiesSorted(){
  return [...STORIES].sort((a,b) => { const ra = S.storiesRead[a.id]?1:0, rb = S.storiesRead[b.id]?1:0; if(ra!==rb) return ra-rb; return storyStats(b).pct - storyStats(a).pct; });
}
const storyTitleTr = st => { const b = S.settings.base, t = st.t||{}; return b==="ur" ? `<span class="ur">${esc(t.ur)}</span>` : b==="hi" ? `<span class="hi">${esc(t.hi)}</span>` : esc(t.en); };
function storyTile(st){
  const x = storyStats(st), read = !!S.storiesRead[st.id];
  const tag = read ? `<span class="pill ok">✓ read</span>` : x.pct >= 60 ? `<span class="pill want">Ready for you</span>` : `<span class="pill">${esc(st.level)}</span>`;
  return `<a class="storytile" href="#story-${esc(st.id)}">
    <span class="cover" aria-hidden="true">${esc(st.cover)}</span>
    <span class="meta"><b>${esc(st.title)}</b><span class="tr">${storyTitleTr(st)}</span>
    <span class="bar"><i style="width:${x.pct}%"></i></span>
    <span class="row between small"><span class="muted">You know ${x.known} of ${x.total} words</span>${tag}</span></span>
  </a>`;
}
function storiesStrip(){
  if(!STORIES.length) return "";
  return `<div class="section-title"><h2>Stories</h2><a class="btn sm" href="#stories">All ${STORIES.length} stories</a></div>
    <p class="small muted" style="margin:-4px 0 10px">Short scenes from daily life. Words you know are underlined in green.</p>
    <div class="stories">${storiesSorted().slice(0,3).map(storyTile).join("")}</div>`;
}
function storyTodayCard(){
  const st = storiesSorted().find(x => !S.storiesRead[x.id]);
  if(!st) return "";
  return `<div class="section-title"><h2>Story for you</h2><a class="small muted" href="#stories">All stories</a></div>${storyTile(st)}`;
}
function viewStories(){
  app.innerHTML = `<a class="back" href="#learn-${esc(curLevel())}-stories">${ic("left")}Learn</a><h1>Stories</h1>
    <p class="muted" style="margin:6px 0 16px;max-width:60ch">Short scenes from life in Berlin. The more words you learn, the more of each story you understand. Tap any underlined word to see what it means.</p>
    <div class="stories">${storiesSorted().map(storyTile).join("")}</div>`;
}
function storyLine(st, text){
  const keys = Object.keys(st.words||{}).sort((a,b) => b.length - a.length);
  if(!keys.length) return esc(text);
  const rx = new RegExp(`(?<![\\p{L}])(${keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}])`, "giu");
  const es = new Map(storyEntries(st).map(e => [e.key.toLowerCase(), e]));
  let out = "", last = 0, m;
  while((m = rx.exec(text))){
    const e = es.get(m[1].toLowerCase());
    out += esc(text.slice(last, m.index));
    out += e ? `<button type="button" class="sw ${entryKnown(e)?"known":"new"}" data-sw="${esc(e.key)}">${esc(m[1])}</button>` : esc(m[1]);
    last = m.index + m[1].length;
  }
  return out + esc(text.slice(last));
}
function panelTr(p){
  const b = S.settings.base, parts = [];
  if(b==="ur") parts.push(`<span class="ur">${esc(p.ur)}</span>`); else if(b==="hi") parts.push(`<span class="hi">${esc(p.hi)}</span>`); else parts.push(esc(p.en));
  if(b!=="en" && shown("en")) parts.push(`<span class="muted">${esc(p.en)}</span>`);
  return parts.join("");
}
function viewStory(st){
  const x = storyStats(st), es = storyEntries(st);
  app.innerHTML = `<a class="back" href="#stories">${ic("left")}All stories</a>
    <div class="storyhead"><span class="cover" aria-hidden="true">${esc(st.cover)}</span>
      <div class="stack" style="gap:4px"><span class="label">${esc(st.level)} · Story</span><h1>${esc(st.title)}</h1><span class="muted">${storyTitleTr(st)}</span></div></div>
    <div class="panel storyknow">
      <div class="row between"><b>You know ${x.known} of ${x.total} words</b><span class="small muted">${x.pct}%</span></div>
      <div class="bar"><i style="width:${x.pct}%"></i></div>
      <div class="row small muted" style="gap:14px"><span><span class="sw known demo">green</span> you know it</span><span><span class="sw new demo">dotted</span> tap to learn it</span></div>
    </div>
    <div class="row" style="margin:12px 0"><button class="chip" type="button" id="stTr" aria-pressed="${storyTr}">${storyTr?"Hide":"Show"} translations</button></div>
    <div class="spanels">${st.panels.map((p,i) => `<figure class="spanel">
      <div class="scene" aria-hidden="true">${esc(p.v)}</div>
      <figcaption><span class="snum">${i+1}</span><p class="sde" lang="de">${storyLine(st, p.de)}</p>
        ${canSpeak?`<button class="speak" type="button" data-say="${esc(p.de)}">${ic("volume")}Listen</button>`:""}
        <p class="str" ${storyTr?"":"hidden"}>${panelTr(p)}</p></figcaption>
    </figure>`).join("")}</div>
    <div class="section-title"><h2>Words in this story</h2><span class="small muted">${x.known}/${x.total} known</span></div>
    <div class="words">${es.map(e => e.card ? wordRow(e.card) : glossRow(e)).join("")}</div>
    <div class="row" style="margin-top:16px">
      <button class="btn primary big" type="button" id="stDone">${ic("check")}${S.storiesRead[st.id]?"Read again":"I've read this story"}</button>
      ${es.some(e=>e.card)?`<button class="btn" data-start="story" data-id="${esc(st.id)}">${ic("cards")}Practise these words</button>`:""}
    </div>`;
  $("#stTr").onclick = () => { storyTr = !storyTr; $$(".str", app).forEach(el => el.hidden = !storyTr); $("#stTr").setAttribute("aria-pressed", storyTr); $("#stTr").textContent = (storyTr?"Hide":"Show")+" translations"; };
  $("#stDone").onclick = () => {
    const first = !S.storiesRead[st.id];
    S.storiesRead[st.id] = Date.now(); if(first){ S.xp += 15; S.days[today()] = S.days[today()] || 0; }
    save(); const fresh = checkBadges(); renderStats();
    toast(first ? `📖 Story read. +15 XP${fresh.length?` · New badge: ${fresh[0].t}`:""}` : "✓ Nice, read again");
    if(first) confetti();
    const nx = storiesSorted().find(y => !S.storiesRead[y.id]);
    $("#stDone").outerHTML = nx ? `<a class="btn primary big" href="#story-${esc(nx.id)}">Next story: ${esc(nx.title)}${ic("right")}</a>` : `<a class="btn primary big" href="#stories">All stories</a>`;
  };
  app.querySelectorAll("[data-sw]").forEach(b => b.addEventListener("click", () => openWordSheet(st, b.dataset.sw)));
}
function glossRow(e){
  const g = e.gloss, b = S.settings.base;
  const mine = b==="ur" ? `<span class="ur">${esc(g.ur)}</span>` : b==="hi" ? `<span class="hi">${esc(g.hi)}</span>` : esc(g.en);
  return `<div class="word"><span class="v txt">＋</span>
    <span class="t"><span class="de">${colorDe(g.de)}</span><span class="tr">${mine}${b!=="en"&&shown("en")?`<span>${esc(g.en)}</span>`:""}</span><span class="meta"><span class="pill">not in the units yet</span></span></span>
    <span class="acts">${canSpeak?`<button class="iconbtn" type="button" data-say="${esc(g.de)}" aria-label="Listen">${ic("volume")}</button>`:""}
      <button class="iconbtn w" type="button" data-gloss="${esc(e.key)}" data-to="want" aria-pressed="false" aria-label="Add to I want to learn">${ic("star")}</button>
      <button class="iconbtn k" type="button" data-gloss="${esc(e.key)}" data-to="known" aria-pressed="false" aria-label="Mark as learned">${ic("check")}</button></span></div>`;
}
/* turn a story dictionary word into one of the learner's own cards */
function adoptGloss(st, key){
  const g = (st.words||{})[key]; if(!g || typeof g === "string") return null;
  let c = glossCard(g); if(c) return c;
  const b = S.settings.base;
  const id = "my-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  S.custom.push({id, de: clip(g.de,200), my: clip(b==="ur"?g.ur:b==="hi"?g.hi:g.en,200), en: clip(g.en,200), note: clip("From the story “"+st.title+"”",300), v: clip(st.cover,8)||"📝", created: Date.now()});
  save(); rebuildIndex(); return BYID.get(id);
}
app.addEventListener("click", e => {
  const g = e.target.closest("[data-gloss]"); if(!g) return;
  const st = storyById((location.hash||"").replace("#story-","")); if(!st) return;
  const c = adoptGloss(st, g.dataset.gloss); if(!c) return;
  if(g.dataset.to === "want"){ toggleWant(c); toast(`“${c.de}” added to I want to learn`, {kind:"want"}); } else { markKnown(c, true); toast(`“${c.de}” moved to I learned`, {kind:"ok"}); }
  checkBadges(); refresh();
});
function openWordSheet(st, key){
  closeWordSheet();
  const e = storyEntries(st).find(x => x.key === key) || {key, card:null, gloss:(st.words||{})[key]};
  const c = e.card, g = e.gloss;
  const de = c ? c.de : g.de, b = S.settings.base;
  const mine = c ? `<div class="ws-my">${myHTML(c)}</div>${!c.custom && b!=="en" && shown("en") ? `<div class="muted">${esc(c.en)}</div>`:""}`
    : `<div class="ws-my">${b==="ur"?`<span class="ur">${esc(g.ur)}</span>`:b==="hi"?`<span class="hi">${esc(g.hi)}</span>`:esc(g.en)}</div>${b!=="en"&&shown("en")?`<div class="muted">${esc(g.en)}</div>`:""}`;
  const k = c && isLearned(c), w = c && isWanted(c);
  const sh = document.createElement("div");
  sh.className = "wsheet"; sh.setAttribute("role","dialog"); sh.setAttribute("aria-label","Word");
  sh.innerHTML = `<div class="ws-inner">
    <button class="iconbtn ws-x" type="button" aria-label="Close">${ic("x")}</button>
    ${c ? `<span class="ws-v${isTextVisual(c.v)?" txt":""}" aria-hidden="true">${esc(c.v)}</span>` : ""}
    <div class="ws-de">${colorDe(de)}</div>${mine}
    <div class="row" style="justify-content:center">
      ${canSpeak?`<button class="speak" type="button" data-say="${esc(de)}" ${c?`data-sid="${esc(c.id)}"`:""}>${ic("volume")}Listen</button>`:""}
      <button class="btn sm ${w?"want":""}" type="button" data-ws="want">${ic("star", w?"fill":"")}${w?"On my list":"Want to learn"}</button>
      <button class="btn sm ${k?"good":""}" type="button" data-ws="known">${ic("check")}${k?"Learned":"I know it"}</button>
    </div></div>`;
  document.body.appendChild(sh);
  sh.querySelector(".ws-x").onclick = closeWordSheet;
  sh.addEventListener("click", ev => { if(ev.target === sh) closeWordSheet(); });
  sh.querySelectorAll("[data-ws]").forEach(btn => btn.onclick = () => {
    const card = c || adoptGloss(st, key); if(!card) return;
    if(btn.dataset.ws === "want"){ const on = toggleWant(card); toast(on?`☆ “${card.de}” added to I want to learn`:"Removed from I want to learn"); }
    else { const on = !isLearned(card); markKnown(card, on); toast(on?`✓ “${card.de}” is in I learned`:"Removed from I learned"); }
    checkBadges(); closeWordSheet(); const y = window.scrollY; viewStory(st); window.scrollTo(0,y); renderStats();
  });
}
function closeWordSheet(){ $$(".wsheet").forEach(x => x.remove()); }
document.addEventListener("keydown", e => { if(e.key === "Escape") closeWordSheet(); });
addEventListener("hashchange", closeWordSheet);

/* =====================================================================
   FUN & TRICKS — learning tricks, facts, idioms, jokes
   ===================================================================== */
let dykOffset = 0, jokeOpen = {};
const funItems = () => [
  ...EXTRAS.tricks.map(x => ({...x, kind:"Trick"})),
  ...EXTRAS.facts.map(x => ({...x, kind:"Fact"})),
  ...EXTRAS.jokes.map(x => ({e:"😄", kind:"Joke", t:x.q, d:x.a, joke:x}))
];
function jokeTr(j){ const b = S.settings.base; return b==="ur" ? `<span class="ur">${esc(j.ur)}</span>` : b==="hi" ? `<span class="hi">${esc(j.hi)}</span>` : esc(j.en); }
function didYouKnow(){
  const items = funItems(); if(!items.length) return "";
  const k = today().split("-").join("") * 1;
  const it = items[(k + dykOffset) % items.length];
  return `<div class="section-title"><h2>Did you know?</h2><a class="small muted" href="#fun">Fun &amp; tricks</a></div>
    <div class="panel dyk">
      <div class="row between"><span class="pill">${esc(it.e)} ${esc(it.kind)}</span><button class="btn sm ghost" type="button" id="dykNext">Next →</button></div>
      <b class="dyk-t" ${it.joke?'lang="de"':""}>${esc(it.t)}</b>
      ${it.joke ? `<p class="dyk-d"><b lang="de">${esc(it.d)}</b></p><p class="small muted" style="margin:0">${jokeTr(it.joke)}</p>` : `<p class="dyk-d">${esc(it.d)}</p>`}
    </div>`;
}
document.addEventListener("click", e => { if(e.target.closest("#dykNext")){ dykOffset++; const y = window.scrollY; route(); window.scrollTo(0,y); } });
function funStrip(){
  const idi = unitById("idioms");
  return `<div class="section-title"><h2>Fun &amp; tricks</h2><a class="btn sm" href="#fun">Open</a></div>
    <div class="funtiles">
      <a class="funtile" href="#fun-tricks"><span>💡</span><b>Learning tricks</b><small>${EXTRAS.tricks.length} quick tips</small></a>
      <a class="funtile" href="#fun-facts"><span>🇩🇪</span><b>Facts</b><small>${EXTRAS.facts.length} things to know</small></a>
      <a class="funtile" href="#fun-idioms"><span>🦉</span><b>Idioms</b><small>${idi?idi.cards.length:0} sayings</small></a>
      <a class="funtile" href="#fun-jokes"><span>😄</span><b>Jokes</b><small>${EXTRAS.jokes.length} German jokes</small></a>
    </div>`;
}
function viewFun(tab){
  if(!["tricks","facts","idioms","jokes"].includes(tab)) tab = "tricks";
  const idi = unitById("idioms");
  const tabs = [["tricks","💡 Tricks"],["facts","🇩🇪 Facts"],["idioms","🦉 Idioms"],["jokes","😄 Jokes"]];
  let body = "";
  if(tab==="tricks" || tab==="facts"){
    body = `<div class="funlist">${EXTRAS[tab].map(x => `<div class="panel funcard"><span class="fe" aria-hidden="true">${esc(x.e)}</span><div><b>${esc(x.t)}</b><p>${esc(x.d)}</p></div></div>`).join("")}</div>`;
  } else if(tab==="idioms"){
    body = idi ? `<p class="muted small" style="margin:0 0 10px">Germans use these every day. The English shows the meaning, with the word-for-word version in brackets.</p>
      <div class="row" style="margin-bottom:12px"><button class="btn primary" data-start="unitall" data-id="idioms">${ic("cards")}Practise all idioms</button></div>
      <div class="words">${idi.cards.map(c => wordRow(c)).join("")}</div>` : `<p class="muted">No idioms yet.</p>`;
  } else {
    body = `<p class="muted small" style="margin:0 0 10px">Read the question, guess, then tap to see the answer. Most German jokes are word plays, so each one teaches you a word.</p>
      <div class="funlist">${EXTRAS.jokes.map((j,i) => `<div class="panel funcard joke">
        <span class="fe" aria-hidden="true">😄</span>
        <div><b lang="de">${esc(j.q)}</b>
          ${jokeOpen[i] ? `<p class="punch" lang="de">${esc(j.a)}</p><p class="small">${jokeTr(j)}</p>${S.settings.base!=="en"&&shown("en")?`<p class="small muted">${esc(j.en)}</p>`:""}` : ""}
          <div class="row" style="margin-top:8px">
            ${jokeOpen[i] ? "" : `<button class="btn sm" type="button" data-joke="${i}">Show the answer</button>`}
            ${canSpeak ? `<button class="speak" type="button" data-say="${esc(j.q+" "+j.a)}">${ic("volume")}Listen</button>` : ""}
          </div></div></div>`).join("")}</div>`;
  }
  app.innerHTML = `<a class="back" href="#learn">${ic("left")}Learn</a><h1>Fun &amp; tricks</h1>
    <p class="muted" style="margin:6px 0 14px;max-width:60ch">Small things that make German easier and more fun: memory tricks, facts about life in Germany, idioms and jokes.</p>
    <nav class="chips" style="margin-bottom:16px" aria-label="Fun sections">${tabs.map(([k,l]) => `<a class="chip" href="#fun-${k}" aria-pressed="${k===tab}" style="text-decoration:none">${l}</a>`).join("")}</nav>
    ${body}`;
  $$("[data-joke]", app).forEach(b => b.onclick = () => { jokeOpen[+b.dataset.joke] = true; const y = window.scrollY; viewFun("jokes"); window.scrollTo(0,y); });
}

/* =====================================================================
   LISTEN & UNDERSTAND — live speech to text, coloured by what you know
   ===================================================================== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
/* irregular and short forms → the form used on the cards */
const IRR = (() => {
  const m = {};
  const add = (base, forms) => forms.split(" ").forEach(f => m[f] = base);
  add("sein","bin bist ist sind seid war warst waren wart gewesen");
  add("haben","habe hast hat habt hatte hattest hatten gehabt");
  add("werden","werde wirst wird werdet wurde wurden geworden");
  add("gehen","ging gingen gegangen"); add("kommen","kam kamen gekommen"); add("essen","isst aß aßen gegessen");
  add("trinken","trank getrunken"); add("sehen","siehst sieht sah sahen gesehen"); add("fahren","fährst fährt fuhr fuhren gefahren");
  add("sprechen","sprichst spricht sprach gesprochen"); add("nehmen","nimmst nimmt nahm genommen"); add("geben","gibst gibt gab gegeben");
  add("wissen","weiß weißt wisst wusste wussten gewusst"); add("lesen","liest las gelesen"); add("schlafen","schläfst schläft schlief geschlafen");
  add("schreiben","schrieb geschrieben"); add("verstehen","verstand verstanden"); add("bleiben","blieb geblieben"); add("finden","fand gefunden");
  add("können","kann kannst konnte konnten gekonnt"); add("müssen","muss musst musste mussten"); add("wollen","will willst wollte wollten");
  add("dürfen","darf darfst durfte"); add("sollen","soll sollst sollte sollten"); add("möchten","möchte möchtest");
  add("der","den dem des"); add("ein","eine einen einem einer eines"); add("kein","keine keinen keinem keiner");
  add("ich","mich mir"); add("du","dich dir"); add("er","ihn ihm"); add("wir","uns"); add("ihr","euch");
  add("mein","meine meinen meinem meiner"); add("dein","deine deinen deinem deiner");
  add("im","in"); add("zum","zu"); add("beim","bei");
  return m;
})();
const normW = w => w.toLowerCase().replace(/[^\p{L}ß-]/gu, "");
let lexCache = null, lexKey = "";
function lexicon(){
  const key = allCards().length + ":" + S.custom.length;
  if(lexCache && lexKey === key) return lexCache;
  const idx = new Map();
  const put = (t, id) => { if(!t || t.length < 1) return; if(!idx.has(t)) idx.set(t, new Set()); idx.get(t).add(id); };
  for(const c of allCards()){
    for(const raw of (c.de.match(/[\p{L}ß]+/gu) || [])){
      const t = raw.toLowerCase(); put(t, c.id);
      if(t.length > 4 && /en$/.test(t)){ const st = t.slice(0,-2); ["e","st","t","en","te","ten"].forEach(e => put(st+e, c.id)); put("ge"+st+"t", c.id); }
    }
  }
  lexCache = idx; lexKey = key; return idx;
}
function lookupWord(w){
  const idx = lexicon(), t = normW(w); if(!t) return [];
  const tryKeys = [t, IRR[t]];
  for(const suf of ["en","em","er","es","e","n","s","st","t"]) if(t.length > suf.length + 2 && t.endsWith(suf)) tryKeys.push(t.slice(0, -suf.length));
  tryKeys.push(t.replace(/ä/g,"a").replace(/ö/g,"o").replace(/ü/g,"u"));
  for(const k of tryKeys){ if(k && idx.has(k)) return [...idx.get(k)].map(id => BYID.get(id)).filter(Boolean); }
  return [];
}
function wordStatus(w){
  const cards = lookupWord(w);
  if(!cards.length) return {st:"unknown", cards};
  if(cards.some(isLearned)) return {st:"known", cards};
  if(cards.some(c => isWanted(c) || seen(c))) return {st:"learning", cards};
  return {st:"new", cards};
}
function analyse(text){
  const parts = String(text).split(/([\p{L}ß]+(?:-[\p{L}ß]+)*)/u);
  let total = 0, known = 0; const out = [];
  for(let i = 0; i < parts.length; i++){
    const p = parts[i]; if(!p) continue;
    if(i % 2 === 1 && !/^\d+$/.test(p)){ const s = wordStatus(p); total++; if(s.st === "known") known++; out.push({w:p, ...s}); }
    else out.push({txt:p});
  }
  return {parts: out, total, known, pct: total ? Math.round(known/total*100) : 0};
}
const LST = {listening:false, rec:null, lines:[], interim:"", err:"", startedAt:0, text:""};
function renderTokens(a){
  return a.parts.map(x => x.txt !== undefined ? esc(x.txt) : `<button type="button" class="lw ${x.st}" data-lw="${esc(x.w)}">${esc(x.w)}</button>`).join("");
}
function sessionTotals(){ let w = 0, k = 0; LST.lines.forEach(l => { const a = analyse(l); w += a.total; k += a.known; }); return {w, k, pct: w ? Math.round(k/w*100) : 0}; }
function ringBig(pct){
  const r = 44, c = 2*Math.PI*r, f = Math.min(1, pct/100);
  return `<svg viewBox="0 0 100 100" class="bigring" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--ok)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c*f} ${c}" transform="rotate(-90 50 50)"/></svg>`;
}
function renderLive(){
  const box = $("#liveBox"); if(!box) return;
  const t = sessionTotals();
  $("#liveScore").innerHTML = `${ringBig(t.pct)}<div class="bigpct"><b>${t.pct}%</b><span>${t.k} of ${t.w} words you know</span></div>`;
  box.innerHTML = (LST.lines.length || LST.interim) ? LST.lines.slice(-30).map(l => { const a = analyse(l); return `<p class="lline"><span class="lpct ${a.pct>=60?"hi":a.pct>=30?"mid":"lo"}">${a.pct}%</span><span lang="de">${renderTokens(a)}</span></p>`; }).join("") + (LST.interim ? `<p class="lline interim"><span class="lpct">…</span><span lang="de">${esc(LST.interim)}</span></p>` : "")
    : `<p class="muted small" style="margin:0">${LST.listening ? "Listening… play a German video or speak German near your phone." : "Your words will appear here."}</p>`;
  box.scrollTop = box.scrollHeight;
  const nw = newWordsFrom(LST.lines.join(" ")); const b = $("#addNew");
  if(b){ b.hidden = !nw.length; b.textContent = `☆ Add ${nw.length} new word${nw.length===1?"":"s"} to I want to learn`; }
  const m = $("#micBtn"); if(m){ m.classList.toggle("on", LST.listening); m.setAttribute("aria-pressed", LST.listening); $("#micLabel").textContent = LST.listening ? "Listening… tap to stop" : "Tap to start listening"; }
  const e = $("#micErr"); if(e){ e.hidden = !LST.err; e.textContent = LST.err; }
}
function newWordsFrom(text){
  const seenIds = new Set(), out = [];
  for(const p of analyse(text).parts){ if(p.st === "new" || p.st === "unknown"){ const c = p.cards && p.cards.find(x => !isLearned(x) && !isWanted(x) && x.de.replace(/^(der|die|das)\s+/i, "").split(/\s+/).length === 1); if(c && !seenIds.has(c.id)){ seenIds.add(c.id); out.push(c); } } }
  return out;
}
function startListening(){
  if(!SR) return;
  LST.err = ""; LST.lines = []; LST.interim = ""; LST.startedAt = Date.now();
  const rec = new SR(); LST.rec = rec;
  rec.lang = "de-DE"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.onresult = e => {
    let interim = "";
    for(let i = e.resultIndex; i < e.results.length; i++){
      const r = e.results[i];
      if(r.isFinal){ const t = r[0].transcript.trim(); if(t) LST.lines.push(t); } else interim += r[0].transcript;
    }
    LST.interim = interim.trim(); renderLive();
  };
  rec.onerror = e => {
    if(e.error === "no-speech" || e.error === "aborted") return;
    LST.err = e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is blocked. Allow microphone access for this site in your browser settings, then try again."
      : e.error === "network" ? "Speech recognition needs an internet connection in this browser." : "Listening stopped: " + e.error;
    LST.listening = false; renderLive();
  };
  rec.onend = () => { if(LST.listening){ try{ rec.start(); }catch(err){} } else renderLive(); };
  try{ rec.start(); LST.listening = true; }catch(err){ LST.err = "Could not start the microphone."; }
  renderLive();
}
function stopListening(silent){
  if(!LST.rec) return;
  const was = LST.listening; LST.listening = false;
  try{ LST.rec.stop(); }catch(e){}
  LST.rec = null;
  if(LST.interim){ LST.lines.push(LST.interim); LST.interim = ""; }
  const t = sessionTotals();
  if(was && t.w >= 3){
    S.listenSessions.unshift({at: Date.now(), w: t.w, k: t.k, src: "mic"}); S.listenSessions = S.listenSessions.slice(0,40);
    if(t.w >= 10){ S.xp += 10; } save(); const fresh = checkBadges(); renderStats();
    if(!silent) toast(`👂 Saved: you knew ${t.pct}% of ${t.w} words${t.w>=10?" · +10 XP":""}${fresh.length?` · New badge: ${fresh[0].t}`:""}`);
  }
  if(!silent) renderLive();
}
function historyHTML(){
  const hs = S.listenSessions.slice(0,10);
  if(!hs.length) return `<p class="muted small" style="margin:0">Your listening sessions will show here, so you can watch your percentage grow.</p>`;
  return `<div class="lhist">${hs.map(x => { const pc = Math.round(x.k/x.w*100); return `<div class="lh"><span class="small muted">${fmtDate(x.at)} · ${x.src==="mic"?"🎤":"📄"}</span><div class="bar"><i style="width:${pc}%"></i></div><b>${pc}%</b><span class="small muted">${x.k}/${x.w}</span></div>`; }).join("")}</div>`;
}
function viewListen(){
  const st = S.settings;
  const intro = `<h1>Listen &amp; understand</h1>
    <p class="muted" style="margin:6px 0 14px;max-width:62ch">Hear German around you and see how much you already understand. Words you know turn <b style="color:var(--ok)">green</b>, words you're learning <b style="color:var(--accent)">yellow</b>, new words stay <b>grey</b>. Tap any word to learn it.</p>`;
  const consent = !st.listenOk ? `<div class="panel stack listenok">
      <b>Before you start</b>
      <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px">
        <li>Wortzi does <b>not record or save audio</b>. Only your score and the words you choose are kept on this phone.</li>
        <li>Your browser turns speech into text. In Chrome and Edge this is done by Google's or Microsoft's speech service, in Safari by Apple.</li>
        <li>Use it for TV, videos, podcasts, announcements and conversations you're part of. Recording other people's private conversations is not allowed in Germany.</li>
      </ul>
      <div><button class="btn primary" type="button" id="lOk">I understand, let's start</button></div></div>` : "";
  const mic = SR ? `<div class="micwrap">
      <button class="micbtn" type="button" id="micBtn" aria-pressed="false" ${st.listenOk?"":"disabled"} aria-label="Start or stop listening">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg></button>
      <span id="micLabel" class="small" style="font-weight:700">Tap to start listening</span>
      <p id="micErr" class="small" style="color:var(--bad);margin:0;text-align:center" hidden></p></div>`
    : `<div class="panel small"><b>Live listening isn't available in this browser.</b> It works in Chrome, Edge and Safari. You can still paste German text below.</div>`;
  app.innerHTML = `${intro}${consent}
    <div class="listengrid">
      <div class="panel stack">
        ${mic}
        <div class="lscore" id="liveScore"></div>
        <div class="legend small" style="margin:0"><div><span class="lw known demo">green</span> you know it</div><div><span class="lw learning demo">yellow</span> learning</div><div><span class="lw new demo">grey</span> new</div></div>
      </div>
      <div class="panel stack">
        <div class="row between"><b>What I heard</b><button class="btn sm ghost" type="button" id="lClear">Clear</button></div>
        <div class="livebox" id="liveBox" aria-live="polite"></div>
        <button class="btn want" type="button" id="addNew" hidden></button>
      </div>
    </div>
    <div class="section-title"><h2>Check a German text</h2></div>
    <div class="panel stack">
      <label class="small" for="lText" style="font-weight:700">Paste a letter, a message or any German text to see how much of it you know.</label>
      <textarea class="input" id="lText" lang="de" placeholder="z. B. Sehr geehrte Frau Khan, bitte bringen Sie Ihren Reisepass und die Wohnungsgeberbestätigung zum Termin mit.">${esc(LST.text)}</textarea>
      <div class="row"><button class="btn primary" type="button" id="lCheck">Check this text</button></div>
      <div id="lResult"></div>
    </div>
    <div class="section-title"><h2>My listening progress</h2></div>
    <div class="panel">${historyHTML()}</div>`;
  if($("#lOk")) $("#lOk").onclick = () => { S.settings.listenOk = true; save(); viewListen(); };
  if($("#micBtn")) $("#micBtn").onclick = () => { if(LST.listening) stopListening(false); else startListening(); };
  $("#lClear").onclick = () => { LST.lines = []; LST.interim = ""; renderLive(); };
  $("#addNew").onclick = () => {
    const nw = newWordsFrom(LST.lines.join(" ")); nw.forEach(c => { if(!isWanted(c)) toggleWant(c); });
    checkBadges(); renderStats(); toast(`${nw.length} word${nw.length===1?"":"s"} added to I want to learn`, {kind:"want"}); renderLive();
  };
  $("#lCheck").onclick = () => {
    const txt = $("#lText").value.trim(); LST.text = txt;
    if(!txt){ $("#lResult").innerHTML = ""; return; }
    const a = analyse(txt), nw = newWordsFrom(txt);
    if(a.total >= 3){ S.listenSessions.unshift({at: Date.now(), w: a.total, k: a.known, src: "text"}); S.listenSessions = S.listenSessions.slice(0,40); save(); }
    $("#lResult").innerHTML = `<div class="row" style="gap:14px;align-items:center"><div class="lscore">${ringBig(a.pct)}<div class="bigpct"><b>${a.pct}%</b><span>${a.known} of ${a.total} words you know</span></div></div></div>
      <p class="ltext" lang="de">${renderTokens(a)}</p>
      ${nw.length ? `<button class="btn want" type="button" id="addNewT">${ic("star")}Add ${nw.length} new word${nw.length===1?"":"s"} from the app to I want to learn</button>` : ""}`;
    const b = $("#addNewT"); if(b) b.onclick = () => { nw.forEach(c => { if(!isWanted(c)) toggleWant(c); }); renderStats(); toast(`${nw.length} words added to I want to learn`, {kind:"want"}); b.remove(); };
  };
  renderLive();
}
app.addEventListener("click", e => {
  const b = e.target.closest("[data-lw]"); if(!b || b.classList.contains("demo")) return;
  openListenSheet(b.dataset.lw);
});
function openListenSheet(w){
  closeWordSheet();
  const s = wordStatus(w);
  const sh = document.createElement("div");
  sh.className = "wsheet"; sh.setAttribute("role","dialog"); sh.setAttribute("aria-label","Word");
  const list = s.cards.slice(0,3);
  sh.innerHTML = `<div class="ws-inner" style="justify-items:stretch;text-align:left">
    <button class="iconbtn ws-x" type="button" aria-label="Close">${ic("x")}</button>
    <div class="ws-de" style="text-align:center">${esc(w)}</div>
    ${list.length ? `<p class="small muted" style="margin:0;text-align:center">Found in ${s.cards.length} card${s.cards.length===1?"":"s"}</p><div class="words">${list.map(c => wordRow(c, {showUnit:true})).join("")}</div>`
      : `<p class="small muted" style="margin:0;text-align:center">This word isn't in the app yet. Add it as your own word with its meaning.</p>
         <div class="row" style="justify-content:center">${canSpeak?`<button class="speak" type="button" data-say="${esc(w)}">${ic("volume")}Listen</button>`:""}<a class="btn primary sm" href="#words-add" id="lsAdd">${ic("plus")}Add as my word</a></div>`}
  </div>`;
  document.body.appendChild(sh);
  sh.querySelector(".ws-x").onclick = closeWordSheet;
  sh.addEventListener("click", ev => { if(ev.target === sh) closeWordSheet(); });
  const a = sh.querySelector("#lsAdd"); if(a) a.addEventListener("click", () => { addPrefill = {de: w}; stopListening(true); });
  sh.addEventListener("click", ev => { if(ev.target.closest("[data-want],[data-known]")) setTimeout(() => { closeWordSheet(); if($("#liveBox")){ renderLive(); const r = $("#lCheck"); if(r && LST.text) r.click(); } }, 0); });
}

/* =====================================================================
   GRAMMAR GUIDE
   ===================================================================== */
function guideSections(){ if(!GUIDE) return []; const t = document.createElement("template"); t.innerHTML = GUIDE; return [...t.content.querySelectorAll("section")]; }
function viewGuide(){
  const L = guideSections().map(s => ({id:s.dataset.id, title:s.dataset.title, level:s.dataset.level, sum:s.dataset.sum}));
  const groups = [...new Set(L.map(l=>l.level))];
  app.innerHTML = `<h1>Guide</h1><p class="muted" style="margin:6px 0 4px;max-width:64ch">Short lessons that compare German with Urdu, Hindi and English. Read one, then practise the matching unit.</p>
    ${groups.map(g=>`<div class="lvlhead"><h2>${g==="Start"?"Start here":g==="A1"?"A1 · Beginner":g==="A2"?"A2 · Elementary":g==="B1"?"B1 · Intermediate":esc(g)}</h2>${g!=="Start"?`<span class="lvl ${esc(g)}">${esc(g)}</span>`:""}</div>
    <div class="lessons">${L.filter(l=>l.level===g).map(l=>`<a class="lesson${g==="Start"?" start":""}" href="#guide-${esc(l.id)}"><b>${esc(l.title)}</b><span>${esc(l.sum)}</span></a>`).join("")}</div>`).join("")}`;
}
function viewLesson(id){
  const secs = guideSections(), i = secs.findIndex(s=>s.dataset.id===id);
  if(i<0) return viewGuide();
  const nx = secs[i+1];
  const blv = secs[i].dataset.level==="Start" ? "A1" : secs[i].dataset.level;
  app.innerHTML = `<a class="back" href="#learn-${esc(blv)}-grammar">${ic("left")}${esc(blv)} grammar</a><div class="guide-body"></div>
    ${nx?`<div class="row" style="margin-top:22px"><a class="btn" href="#guide-${esc(nx.dataset.id)}">Next: ${esc(nx.dataset.title)}${ic("right")}</a></div>`:""}`;
  $(".guide-body", app).appendChild(secs[i]);
  $$("[data-fill]", app).forEach(el => { const f = FILL[el.dataset.fill]; if(f) el.innerHTML = f(); });
}
function bridge(u, r, hi, en, de, note, opts={}){
  return `<div class="bridge">
    <div class="cell u L-ur"><span class="lab">اردو</span><span class="ur">${esc(u)}</span>${r?`<div class="rom L-rom">${esc(r)}</div>`:""}</div>
    <div class="cell h L-hi"><span class="lab">हिन्दी</span><span class="hi">${esc(hi)}</span></div>
    <div class="cell e L-en"><span class="lab">English</span>${esc(en)}</div>
    <div class="cell g"><span class="lab">Deutsch</span><span class="de">${opts.html ? de : colorDe(de)}</span> ${spk(opts.speak || de)}</div>
    ${note?`<div class="note">${note}</div>`:""}</div>`;
}
const tok = (w,cls) => { const v=w[0]==="*", s=w[0]==="^", x=w[0]==="~"; const t=w.replace(/^[*^~]/,""); return `<span class="w${cls?" "+cls:""}${v?" v":""}${s?" s":""}${x?" x":""}">${esc(t)}</span>`; };
const plain = arr => arr.map(w=>w.replace(/^[*^~]/,"")).join(" ");
const orderBlock = o => `<div class="order"><h4>${o.t}</h4>
  <div class="orow L-ur" dir="rtl"><span class="olbl" dir="ltr">UR</span>${o.u.map(w=>tok(w,"ur")).join("")}</div>
  <div class="orow L-hi"><span class="olbl">HI</span>${o.h.map(w=>tok(w,"hi")).join("")}</div>
  <div class="orow L-rom"><span class="olbl"></span><span class="rom">${esc(o.r)}</span></div>
  <div class="orow L-en"><span class="olbl">EN</span>${o.e.map(w=>tok(w)).join("")}</div>
  <div class="orow"><span class="olbl">DE</span>${o.g.map(w=>tok(w)).join("")} ${spk(plain(o.g))}</div>
  <p>${o.n}</p></div>`;
const G = {
 b1conn:[["اگرچہ بارش ہو رہی ہے، میں جا رہی ہوں","agarche baarish ho rahi hai, main ja rahi hoon","हालाँकि बारिश हो रही है, मैं जा रही हूँ","Although it is raining, I'm going","Obwohl es <b>regnet</b>, gehe ich.","obwohl: verb (regnet) at the end of its part."],["بارش ہو رہی ہے، پھر بھی میں جا رہی ہوں","baarish ho rahi hai, phir bhi main ja rahi hoon","बारिश हो रही है, फिर भी मैं जा रही हूँ","It is raining, but I'm going anyway","Es regnet. Trotzdem <b>gehe</b> ich.","trotzdem: verb straight after it."],["میں بیمار ہوں، اس لیے گھر پر ہوں","main beemar hoon, is liye ghar par hoon","मैं बीमार हूँ, इसलिए घर पर हूँ","I'm ill, so I'm at home","Ich bin krank. Deshalb <b>bleibe</b> ich zu Hause.","deshalb = is liye. Verb next."],["میں سیکھتی ہوں تاکہ نوکری مل جائے","main seekhti hoon taake naukri mil jaaye","मैं सीखती हूँ ताकि नौकरी मिल जाए","I learn so that I find a job","Ich lerne, damit ich eine Arbeit <b>finde</b>.","damit = taake. Verb last, just like جائے / जाए."],["جب میں برلن آئی، سردی تھی","jab main Berlin aayi, sardi thi","जब मैं बर्लिन आई, ठंड थी","When I came to Berlin, it was cold","Als ich nach Berlin <b>kam</b>, war es kalt.","als: one time in the past. Verb last."],["مجھے نہیں معلوم کہ وہ آئے گا یا نہیں","mujhe nahin maaloom ke woh aayega ya nahin","मुझे नहीं पता कि वह आएगा या नहीं","I don't know whether he will come","Ich weiß nicht, ob er <b>kommt</b>.","ob = whether. Verb last."]],
 konj2:[["میں ایک کافی چاہوں گی","main aik coffee chahoongi","मैं एक कॉफ़ी चाहूँगी","I'd like a coffee","Ich <b>hätte</b> gern einen Kaffee.","The polite way to order."],["کیا آپ میری مدد کریں گے؟","kya aap meri madad karenge?","क्या आप मेरी मदद करेंगे?","Would you help me?","<b>Würden</b> Sie mir helfen?","würde + infinitive at the end."],["یہ بہت اچھا ہو گا","ye bohat achha hoga","यह बहुत अच्छा होगा","That would be great","Das <b>wäre</b> toll.",""],["اگر میرے پاس وقت ہوتا تو میں آتی","agar mere paas waqt hota to main aati","अगर मेरे पास समय होता तो मैं आती","If I had time, I would come","Wenn ich Zeit <b>hätte</b>, <b>würde</b> ich kommen.","Same shape as اگر … ہوتا / अगर … होता."],["میں تمہاری جگہ ہوتی تو ...","main tumhari jagah hoti to ...","मैं तुम्हारी जगह होती तो ...","If I were you ...","An deiner Stelle <b>würde</b> ich …","For advice."],["کاش میں جرمن اچھی بولتی","kaash main German achhi bolti","काश मैं जर्मन अच्छी बोलती","I wish I spoke good German","Ich <b>wünschte</b>, ich <b>würde</b> gut Deutsch sprechen.","کاش / काश = Ich wünschte …"]],
 gender:[["آدمی","aadmi","आदमी","the man","der Mann","Same gender in all three. Easy start."],["عورت","aurat","औरत","the woman","die Frau",""],["بچہ","bachcha","बच्चा","the child","das Kind","Neuter even though a child is a person."],["چائے","chai","चाय","the tea","der Tee","Feminine for us, masculine in German."],["پانی","paani","पानी","the water","das Wasser",""],["کتاب","kitaab","किताब","the book","das Buch",""],["دروازہ","darwaaza","दरवाज़ा","the door","die Tür","Masculine for us, feminine in German."],["گھر","ghar","घर","the house","das Haus",""],["شہر","shehar","शहर","the city","die Stadt",""],["گاڑی","gaari","गाड़ी","the car","das Auto",""],["لڑکی","larki","लड़की","the girl","das Mädchen","-chen words are always das, even for a girl."],["اخبار","akhbaar","अख़बार","the newspaper","die Zeitung","-ung is always die."],["کتابیں","kitaabein","किताबें","the books","die Bücher","Every plural takes die."]],
 akk:[["میرے پاس ایک کتاب ہے","mere paas aik kitaab hai","मेरे पास एक किताब है","I have a book","Ich habe ein Buch.","das Buch: no change."],["میں ایک کافی پیتی ہوں","main aik coffee peeti hoon","मैं एक कॉफ़ी पीती हूँ","I drink a coffee","Ich trinke einen Kaffee.","der Kaffee → einen Kaffee."],["میں آدمی کو دیکھتی ہوں","main aadmi ko dekhti hoon","मैं आदमी को देखती हूँ","I see the man","Ich sehe den Mann.","کو / को on a definite object = Akkusativ den."],["میرے پاس گاڑی نہیں ہے","mere paas gaari nahin hai","मेरे पास गाड़ी नहीं है","I don't have a car","Ich habe kein Auto.","kein = no / not a."]],
 time:[["کتنے بجے ہیں؟","kitne baje hain?","कितने बजे हैं?","What time is it?","Wie spät ist es?",""],["سوا تین","sawa teen","सवा तीन","quarter past three","Viertel nach drei",""],["ساڑھے تین","saarhe teen","साढ़े तीन","half past three","halb vier","Half toward four."],["پونے چار","paune chaar","पौने चार","quarter to four","Viertel vor vier","پونے / पौने and vor both count down to the hour."],["کل","kal","कल","tomorrow / yesterday","morgen / gestern","Our کل / कल means both. German has two words."]],
 dativ:[["مجھے سردی لگ رہی ہے","mujhe sardi lag rahi hai","मुझे ठंड लग रही है","I am cold","Mir ist kalt.","Literally: to me is cold."],["مجھے یہ پسند ہے","mujhe ye pasand hai","मुझे यह पसंद है","I like this","Das gefällt mir.","Literally: that pleases to me."],["مجھے مدد کی ضرورت ہے","mujhe madad ki zaroorat hai","मुझे मदद की ज़रूरत है","I need help","Können Sie mir helfen?","helfen always takes Dativ."],["تمہیں کیسا لگا؟","tumhein kaisa laga?","तुम्हें कैसा लगा?","How did you like it?","Wie hat es dir gefallen?",""],["اسے کتاب دو","use kitaab do","उसे किताब दो","Give him the book","Gib ihm das Buch.","ihm = Dativ, das Buch = Akkusativ."],["یہ کتاب میری ہے","ye kitaab meri hai","यह किताब मेरी है","This book is mine","Das Buch gehört mir.",""],["مجھے معلوم نہیں","mujhe maaloom nahin","मुझे मालूम नहीं","I don't know","Ich weiß es nicht.","Not every مجھے / मुझे is Dativ. This one uses ich."]],
 wechsel:[["میں کچن میں ہوں","main kitchen mein hoon","मैं किचन में हूँ","I am in the kitchen","Ich bin in <b>der</b> Küche.","Wo? Location → Dativ."],["میں کچن میں جا رہی ہوں","main kitchen mein ja rahi hoon","मैं किचन में जा रही हूँ","I am going into the kitchen","Ich gehe in <b>die</b> Küche.","Wohin? Movement → Akkusativ. We say میں / में both times."],["کتاب میز پر ہے","kitaab mez par hai","किताब मेज़ पर है","The book is on the table","Das Buch liegt auf <b>dem</b> Tisch.","Dativ."],["میں کتاب میز پر رکھتی ہوں","main kitaab mez par rakhti hoon","मैं किताब मेज़ पर रखती हूँ","I put the book on the table","Ich lege das Buch auf <b>den</b> Tisch.","Akkusativ."],["میں ڈاکٹر کے پاس ہوں","main doctor ke paas hoon","मैं डॉक्टर के पास हूँ","I am at the doctor's","Ich bin <b>beim</b> Arzt.","bei + dem = beim."],["میں ڈاکٹر کے پاس جا رہی ہوں","main doctor ke paas ja rahi hoon","मैं डॉक्टर के पास जा रही हूँ","I am going to the doctor","Ich gehe <b>zum</b> Arzt.","zu + dem = zum."]],
};
const ORD = {
 A1:[
  {t:"Simple statement", u:["^میں","روز","چائے","*پیتی ہوں"], h:["^मैं","रोज़","चाय","*पीती हूँ"], r:"main roz chai peeti hoon", e:["^I","*drink","tea","every day"], g:["^Ich","*trinke","jeden Tag","Tee"], n:"Verb in slot 2 in English and German. Urdu and Hindi wait until the end."},
  {t:"Start with time: German swaps verb and subject", u:["آج","^میں","برلن","*جا رہی ہوں"], h:["आज","^मैं","बर्लिन","*जा रही हूँ"], r:"aaj main Berlin ja rahi hoon", e:["Today","^I","*am going","to Berlin"], g:["Heute","*fahre","^ich","nach Berlin"], n:"The verb stays in slot 2, so the subject moves behind it."},
  {t:"Modal verb: the second verb goes to the end", u:["^میں","جرمن","*سیکھنا","*چاہتی ہوں"], h:["^मैं","जर्मन","*सीखना","*चाहती हूँ"], r:"main German seekhna chahti hoon", e:["^I","*want","*to learn","German"], g:["^Ich","*will","Deutsch","*lernen"], n:"lernen sits at the end, where we put سیکھنا / सीखना."},
  {t:"Yes/no question: verb first", u:["کیا","^آپ","جرمن","*بولتے ہیں؟"], h:["क्या","^आप","जर्मन","*बोलते हैं?"], r:"kya aap German bolte hain?", e:["*Do","^you","*speak","German?"], g:["*Sprechen","^Sie","Deutsch?"], n:"We add کیا / क्या at the front. German moves the verb to the front instead."},
  {t:"W-question: question word, then verb", u:["^آپ","کہاں","*رہتے ہیں؟"], h:["^आप","कहाँ","*रहते हैं?"], r:"aap kahan rehte hain?", e:["Where","*do","^you","*live?"], g:["Wo","*wohnen","^Sie?"], n:"We keep the question word in the middle. German puts it first, verb second."}],
 perfekt:[
  {t:"haben + participle at the end", u:["^میں نے","جرمن","*سیکھی"], h:["^मैंने","जर्मन","*सीखी"], r:"main ne German seekhi", e:["^I","*have","*learned","German"], g:["^Ich","*habe","Deutsch","*gelernt"], n:"نے / ने and haben both come with most past actions."},
  {t:"sein + participle for movement", u:["^میں","کل","دفتر","*گئی"], h:["^मैं","कल","दफ़्तर","*गई"], r:"main kal daftar gayi", e:["^I","*went","to the office","yesterday"], g:["^Ich","*bin","gestern","ins Büro","*gegangen"], n:"We drop نے / ने with جانا / जाना. German switches to sein."}],
 sep:[
  {t:"aufstehen · to get up", u:["^میں","سات بجے","*اٹھتی ہوں"], h:["^मैं","सात बजे","*उठती हूँ"], r:"main saat baje uthti hoon", e:["^I","*get up","at seven"], g:["^Ich","*stehe","um sieben Uhr","~auf"], n:"stehe stays in slot 2, auf goes to the end."},
  {t:"anrufen · to call", u:["^میں","تمہیں","*فون کروں گی"], h:["^मैं","तुम्हें","*फ़ोन करूँगी"], r:"main tumhein phone karoon gi", e:["^I","*will call","you"], g:["^Ich","*rufe","dich","~an"], n:"The present tense often covers the future."},
  {t:"With a modal, it stays together", u:["^مجھے","خریداری","*کرنی ہے"], h:["^मुझे","ख़रीदारी","*करनी है"], r:"mujhe khareedaari karni hai", e:["^I","*have to","*go shopping"], g:["^Ich","*muss","*einkaufen"], n:"The full verb sits unsplit at the end."}],
 conn:[
  {t:"weil · because", u:["^میں","نہیں آ سکتی","کیونکہ","^میں","بیمار","*ہوں"], h:["^मैं","नहीं आ सकती","क्योंकि","^मैं","बीमार","*हूँ"], r:"main nahin aa sakti kyunke main bimaar hoon", e:["^I","*can't","*come","because","^I","*am","sick"], g:["^Ich","*kann","nicht","*kommen,","weil","^ich","krank","*bin"], n:"The weil-clause ends with bin, as ours ends with ہوں / हूँ."},
  {t:"dass · that", u:["^مجھے","لگتا ہے","کہ","^وہ","صحیح","*ہے"], h:["^मुझे","लगता है","कि","^वह","सही","*है"], r:"mujhe lagta hai ke woh sahi hai", e:["^I","*think","that","^he","*is","right"], g:["^Ich","*glaube,","dass","^er","recht","*hat"], n:"dass = کہ / कि, and both clauses end with the verb."},
  {t:"wenn · if", u:["اگر","وقت","*ملا","تو","^میں","*آؤں گی"], h:["अगर","समय","*मिला","तो","^मैं","*आऊँगी"], r:"agar waqt mila to main aaoon gi", e:["If","^I","*have","time,","^I'll","*come"], g:["Wenn","^ich","Zeit","*habe,","*komme","^ich"], n:"The whole wenn-clause fills slot 1, so the main verb comes right after the comma."}],
};
const FILL = {
  b1conn: () => G.b1conn.map(([u,r,hi,en,de,n])=>bridge(u,r,hi,en,de,n,{html:true,speak:de.replace(/<[^>]+>/g,"")})).join(""),
  konj2: () => G.konj2.map(([u,r,hi,en,de,n])=>bridge(u,r,hi,en,de,n,{html:true,speak:de.replace(/<[^>]+>/g,"")})).join(""),
  gender: () => G.gender.map(x=>bridge(...x)).join(""),
  akk: () => G.akk.map(x=>bridge(...x)).join(""),
  time: () => G.time.map(x=>bridge(...x)).join(""),
  dativ: () => G.dativ.map(([u,r,hi,en,de,n])=>bridge(u,r,hi,en,esc(de).replace(/\b(mir|dir|ihm|Ihnen)\b/g,'<span class="m">$1</span>'),n,{html:true,speak:de})).join(""),
  wechsel: () => G.wechsel.map(([u,r,hi,en,de,n])=>bridge(u,r,hi,en,de,n,{html:true,speak:de.replace(/<[^>]+>/g,"")})).join(""),
  orderA1: () => ORD.A1.map(orderBlock).join(""),
  orderPerfekt: () => `<div class="legend"><div><b class="m">hat</b> with haben</div><div><b class="f">ist</b> with sein</div></div>` + ORD.perfekt.map(orderBlock).join(""),
  orderSep: () => ORD.sep.map(orderBlock).join(""),
  orderConn: () => ORD.conn.map(orderBlock).join(""),
  verbs: () => [
    ["sein · to be",[["میں ہوں","मैं हूँ","ich","bin"],["تم ہو","तुम हो","du","bist"],["وہ ہے","वह है","er / sie / es","ist"],["ہم ہیں","हम हैं","wir","sind"],["تم لوگ ہو","तुम लोग हो","ihr","seid"],["آپ ہیں","आप हैं","Sie / sie","sind"]]],
    ["haben · to have",[["میرے پاس ہے","मेरे पास है","ich","habe"],["تمہارے پاس ہے","तुम्हारे पास है","du","hast"],["اس کے پاس ہے","उसके पास है","er / sie / es","hat"],["ہمارے پاس ہے","हमारे पास है","wir","haben"],["تم لوگوں کے پاس ہے","तुम लोगों के पास है","ihr","habt"],["آپ کے پاس ہے","आपके पास है","Sie / sie","haben"]]],
    ["wohnen · to live",[["میں رہتی ہوں","मैं रहती हूँ","ich","wohne"],["تم رہتی ہو","तुम रहती हो","du","wohnst"],["وہ رہتا ہے","वह रहता है","er / sie / es","wohnt"],["ہم رہتے ہیں","हम रहते हैं","wir","wohnen"],["تم لوگ رہتے ہو","तुम लोग रहते हो","ihr","wohnt"],["آپ رہتے ہیں","आप रहते हैं","Sie / sie","wohnen"]]],
    ["sprechen · to speak",[["میں بولتی ہوں","मैं बोलती हूँ","ich","spreche"],["تم بولتی ہو","तुम बोलती हो","du","sprichst"],["وہ بولتا ہے","वह बोलता है","er / sie / es","spricht"],["ہم بولتے ہیں","हम बोलते हैं","wir","sprechen"],["تم لوگ بولتے ہو","तुम लोग बोलते हो","ihr","sprecht"],["آپ بولتے ہیں","आप बोलते हैं","Sie / sie","sprechen"]]],
  ].map(([t,rows])=>`<div class="tablebox"><table><thead><tr><th colspan="4">${t}</th></tr></thead><tbody>${rows.map(([u,h,p,f])=>`<tr><td class="L-ur"><span class="ur">${u}</span></td><td class="L-hi"><span class="hi">${h}</span></td><td>${p}</td><td class="de">${f}</td></tr>`).join("")}</tbody></table></div>`).join(""),
  numbers: () => [["ایک","एक","one","eins"],["دو","दो","two","zwei"],["تین","तीन","three","drei"],["چار","चार","four","vier"],["پانچ","पाँच","five","fünf"],["چھ","छह","six","sechs"],["سات","सात","seven","sieben"],["آٹھ","आठ","eight","acht"],["نو","नौ","nine","neun"],["دس","दस","ten","zehn"],["گیارہ","ग्यारह","eleven","elf"],["بارہ","बारह","twelve","zwölf"],["سولہ","सोलह","sixteen","sechzehn"],["بیس","बीस","twenty","zwanzig"],["اکیس","इक्कीस","twenty-one","einundzwanzig"],["بتیس","बत्तीस","thirty-two","zweiunddreißig"],["پچاس","पचास","fifty","fünfzig"],["سو","सौ","hundred","hundert"],["ہزار","हज़ार","thousand","tausend"]]
    .map(([u,h,e,d])=>`<tr><td class="L-ur"><span class="ur">${u}</span></td><td class="L-hi"><span class="hi">${h}</span></td><td class="L-en">${e}</td><td class="de">${d} ${spk(d)}</td></tr>`).join(""),
  sounds: () => [["w","و","व","Like English v. Wasser"],["v","ف","फ़","Usually f. Vater"],["z","تس","त्स","Always ts. Zeit"],["sch","ش","श","Schule"],["st- / sp-","شٹ / شپ","श्ट / श्प","At the start: Straße, Sport"],["ei","آئی","आइ","Like English eye. mein"],["ie","ای","ई","Long ee. Liebe"],["eu / äu","اوئے","ऑय","Like oy. heute"],["ch","خ","ख़","After a, o, u: hard. Buch. After e, i: softer, like a whispered ی / य. ich"],["j","ی","य","ja"],["s + vowel","ز","ज़","sagen"],["ü","—","—","Say ee with lips rounded for oo. müde"],["ö","—","—","Say e with lips rounded. schön"],["r","غ","ग़","A soft throat sound. Fades at word ends: Lehrer"],["ß","س","स","Sharp s. Straße"],["vowel + h","—","—","h is silent and makes the vowel long. Sohn"]]
    .map(([k,u,h,d])=>`<div class="snd"><div class="k">${k}</div><div><span class="ur L-ur">${u}</span> <span class="hi L-hi" style="font-size:18px">${h}</span><small>${d}</small></div></div>`).join(""),
  pron: () => [["میں","मैं","I","ich","mich","mir"],["تم","तुम","you (informal)","du","dich","dir"],["وہ (مرد)","वह (पुरुष)","he","er","ihn","ihm"],["وہ (عورت)","वह (स्त्री)","she","sie","sie","ihr"],["ہم","हम","we","wir","uns","uns"],["آپ","आप","you (formal)","Sie","Sie","Ihnen"],["وہ (جمع)","वे","they","sie","sie","ihnen"]]
    .map(([u,h,e,n,a,d])=>`<tr><td class="L-ur"><span class="ur">${u}</span></td><td class="L-hi"><span class="hi">${h}</span></td><td class="L-en">${e}</td><td class="mono">${n}</td><td class="mono">${a}</td><td class="mono"><b>${d}</b></td></tr>`).join(""),
  parts: () => [["کرنا","करना","to do","machen","hat gemacht"],["سیکھنا","सीखना","to learn","lernen","hat gelernt"],["کام کرنا","काम करना","to work","arbeiten","hat gearbeitet"],["کھانا","खाना","to eat","essen","hat gegessen"],["پینا","पीना","to drink","trinken","hat getrunken"],["لکھنا","लिखना","to write","schreiben","hat geschrieben"],["دیکھنا","देखना","to see","sehen","hat gesehen"],["خریداری کرنا","ख़रीदारी करना","to shop","einkaufen","hat eingekauft"],["فون کرنا","फ़ोन करना","to call","anrufen","hat angerufen"],["پڑھائی کرنا","पढ़ाई करना","to study","studieren","hat studiert"],["جانا","जाना","to go","gehen","ist gegangen"],["سفر کرنا","सफ़र करना","to travel","fahren","ist gefahren"],["آنا","आना","to come","kommen","ist gekommen"],["ٹھہرنا","ठहरना","to stay","bleiben","ist geblieben"],["اٹھنا","उठना","to get up","aufstehen","ist aufgestanden"]]
    .map(([u,h,e,i,p])=>`<tr><td class="L-ur"><span class="ur">${u}</span></td><td class="L-hi"><span class="hi">${h}</span></td><td class="L-en">${e}</td><td class="mono">${i}</td><td class="mono"><b class="${p.startsWith("ist")?"f":"m"}">${p}</b></td></tr>`).join(""),
  modals: () => [["können","can","سکنا","सकना","kann","kannst","können"],["müssen","must","پڑنا / ہے","पड़ना / है","muss","musst","müssen"],["wollen","want","چاہنا","चाहना","will","willst","wollen"],["möchten","would like","چاہوں گی","चाहूँगी","möchte","möchtest","möchten"],["dürfen","may","اجازت ہونا","इजाज़त होना","darf","darfst","dürfen"],["sollen","should","چاہیے","चाहिए","soll","sollst","sollen"]]
    .map(([m,e,u,h,a,b,c])=>`<tr><td class="mono"><b>${m}</b></td><td class="L-en">${e}</td><td class="L-ur"><span class="ur">${u}</span></td><td class="L-hi"><span class="hi">${h}</span></td><td class="mono">${a}</td><td class="mono">${b}</td><td class="mono">${c}</td></tr>`).join(""),
  prepGroups: () => [
    {h:"Always Dativ", d:"aus, bei, mit, nach, seit, von, zu", ex:[["کے ساتھ","के साथ","mit"],["سے (جگہ)","से (जगह)","aus"],["کے پاس","के पास","bei / zu"],["سے (وقت)","से (समय)","seit"],["کے بعد","के बाद","nach"]]},
    {h:"Always Akkusativ", d:"durch, für, gegen, ohne, um", ex:[["کے لیے","के लिए","für"],["کے بغیر","के बिना","ohne"],["کے خلاف","के ख़िलाफ़","gegen"],["میں سے ہو کر","में से होकर","durch"],["کے ارد گرد","के आसपास","um"]]}]
    .map(g=>`<div class="conn"><h4>${g.h}</h4><div class="mono" style="font-size:14px">${g.d}</div><div class="tablebox" style="margin-top:10px"><table><tbody>${g.ex.map(([u,h,d])=>`<tr><td class="L-ur"><span class="ur">${u}</span></td><td class="L-hi"><span class="hi">${h}</span></td><td class="de">${d}</td></tr>`).join("")}</tbody></table></div></div>`).join(""),
  connGroups: () => [
    {h:"Verb stays in slot 2", d:"und, aber, oder, denn", w:[["اور","और","und"],["لیکن","लेकिन","aber"],["یا","या","oder"],["کیونکہ","क्योंकि","denn"]], ex:"Ich bin müde, aber ich <b>arbeite</b>."},
    {h:"Verb goes to the end", d:"weil, dass, wenn, ob, obwohl", w:[["کیونکہ","क्योंकि","weil"],["کہ","कि","dass"],["اگر / جب","अगर / जब","wenn"],["حالانکہ","हालाँकि","obwohl"]], ex:"…, weil ich müde <b>bin</b>."},
    {h:"Verb jumps right after", d:"deshalb, dann, trotzdem", w:[["اس لیے","इसलिए","deshalb"],["پھر","फिर","dann"],["پھر بھی","फिर भी","trotzdem"]], ex:"Deshalb <b>bleibe</b> ich zu Hause."}]
    .map(g=>`<div class="conn"><h4>${g.h}</h4><div class="mono" style="font-size:14px">${g.d}</div><div class="ws">${g.w.map(([u,h,d])=>`<span class="w"><span class="ur L-ur" style="font-size:15px">${u}</span> <span class="hi L-hi">${h}</span> → <b>${d}</b></span>`).join("")}</div><div style="font-size:15px">${g.ex}</div></div>`).join(""),
};

/* =====================================================================
   BOOT
   ===================================================================== */
function showUpdateBar(){
  if($(".updatebar")) return;
  const b = document.createElement("div");
  b.className = "updatebar"; b.setAttribute("role","status");
  b.innerHTML = `<span>✨ A new version of Wortzi is ready. Your progress stays as it is.</span><button class="btn primary sm" type="button">Update now</button>`;
  b.querySelector("button").onclick = () => { if(session) finishSession(true); location.reload(); };
  document.body.appendChild(b);
}
async function boot(){
  load(); applyPrefs();
  try{
    const [deckTxt, guideTxt, storyTxt, extraTxt] = await Promise.all([getText("deck-src","data/deck.txt"), getText("guide-src","data/guide.html").catch(()=>""), getText("stories-src","data/stories.json").catch(()=>""), getText("extras-src","data/extras.json").catch(()=>"")]);
    ({units:UNITS, deck:DECK} = parseDeck(deckTxt)); GUIDE = guideTxt;
    try{ const x = JSON.parse(extraTxt||"{}"); EXTRAS = {tricks: Array.isArray(x.tricks)?x.tricks:[], facts: Array.isArray(x.facts)?x.facts:[], jokes: Array.isArray(x.jokes)?x.jokes:[]}; }catch(e){}
    try{ STORIES = (JSON.parse(storyTxt||"{}").stories||[]).filter(x => x && /^[a-z0-9-]{1,40}$/.test(x.id) && Array.isArray(x.panels)); }catch(e){ STORIES = []; }
  }catch(e){
    app.innerHTML = `<div class="empty"><span class="e">⚠️</span><b>Could not load the lessons</b><span>${esc(e.message)}. If you opened index.html straight from your computer, run it from a web server or GitHub Pages instead.</span></div>`;
    return;
  }
  rebuildIndex();
  if(!SANDBOX) loadAudioIndex();
  if(!location.hash) history.replaceState(null,"","#today");
  route();
  if("serviceWorker" in navigator && location.protocol==="https:" && !SANDBOX){
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then(reg => {
      document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") reg.update().catch(()=>{}); });
    }).catch(()=>{});
    navigator.serviceWorker.addEventListener("controllerchange", () => { if(hadController) showUpdateBar(); });
  }
}
boot();
})();
