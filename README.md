# Wortzi

**Live:** https://wortzi.fizzamubeen.com · **Version:** 1.7.0 · [Changelog](CHANGELOG.md)

**Learn everyday German from Urdu, Hindi or English.** Picture flashcards, your own word lists, daily practice that adapts to you, and printable PDFs of everything you learn. Private by design: no account, no tracking, all data stays on the learner's phone.

Built for people who just moved to Germany and need German for real life: the bakery, the U-Bahn, the Bürgeramt, the doctor and work.

---

## What makes it different

| | |
|---|---|
| **Your mother tongue is the bridge** | Every card and lesson is in Urdu (Nastaliq), Hindi (Devanagari), Roman script and English. The grammar guide shows where Urdu and Hindi already work like German: verbs at the end after *weil* and *dass*, *mujhe* = *mir*. |
| **Two personal lists** | **☆ I want to learn** and **✓ I learned**. Tap ☆ or ✓ on any word, add your own words and sentences, and watch words move from one list to the other as you master them. |
| **Your own words become flashcards** | A sentence for your job interview or your street name is practised exactly like the built-in cards. |
| **Learning on paper** | One tap makes a PDF: a progress report for your teacher, a personal word book, **cut-out flashcards with pictures** (fold or double-sided), or a full A1/A2 course book with your status next to every word. |
| **Private and safe** | Nothing leaves the device. No sign-up, cookies, analytics or outside fonts. Backups can be encrypted with a password (AES-256). |
| **Daily-life method** | Spaced repetition (1, 2, 4, 7, 15, 30 days), a 10-minute daily plan, active recall, listen-and-repeat, and sentences before grammar. See *Guide → How to learn German for daily life*. |

## Features

- **Today**: a 10-minute plan (due reviews → wish-list words → new words), word of the day, streak and daily goal
- **Learn**: 66 units in daily-life order (27 × A1, 27 × A2, 12 × B1), 1,180 cards with pictures and gender colors (der blue, die red, das green, plural purple)
- **Practice**: flip cards, a 4-option quiz, ✍️ **Write** (type the German, with typo, umlaut and article hints) or 🗣️ **Speak** (say it; the browser checks your pronunciation, or records you to compare); "✓ I already know this" and "☆ Want to learn" on every card; German audio from the device's voice
- **My words**: search, sort, practise each list, add/edit/delete your own entries, see how often you listened to each word
- **Me**: level and XP, 14-day chart, 16 badges, reports, settings, backup/restore, delete everything
- **Works offline** and installs to the home screen (PWA)
- Mobile-first, light and dark theme, keyboard shortcuts on desktop

---

## Run it — pick one

### 1. GitHub Pages (free, recommended)

1. Create a new repository on GitHub, e.g. `wortzi`, and upload all files from this folder (keep the folder structure, including `.github/`).
2. In the repository go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). The workflow downloads the fonts and publishes the site.
4. Your app is live at `https://FizzaMubeen.github.io/wortzi/`.

Every push to `main` updates the site automatically.

### 2. Your WordPress site (as a plugin)

1. Get the plugin zip, the version **with fonts** is best:
   - after the GitHub workflow has run: **Actions → latest run → Artifacts → wortzi-wp**, or
   - on your computer: `bash scripts/build-wp-plugin.sh` → `dist/wortzi-wp.zip`, or
   - the zip that came with this project (works, but uses the phone's own fonts for Urdu and Hindi).
2. WordPress → **Plugins → Add New → Upload Plugin** → choose the zip → **Activate**.
3. Add the shortcode to any page: `[wortzi]`
   Options: `[wortzi height="900" link="no"]`. Works in the block editor and in Elementor's *Shortcode* widget.

The app runs inside an iframe, so your theme's CSS cannot break it and it cannot affect your theme. It stores nothing on your server.

### 3. Any web host

Upload the folder to any HTTPS web space (e.g. `yoursite.com/german/`). Run `bash scripts/get-fonts.sh` once first so the fonts are included.

### 4. One single file

`python3 scripts/build-standalone.py` → `dist/wortzi-standalone.html`. Open it with a double-click or send it to someone. (No offline install or encrypted backup from a local file; everything else works.)

> Opening `index.html` directly from your computer does **not** work, because browsers block loading `data/deck.txt` from disk. Use one of the options above, or for testing run `python3 -m http.server` in this folder and open `http://localhost:8000`.

---

## Update the content (no coding needed)

### Flashcards — `data/deck.txt`

```
## food|A1|🍽️|Food & drink
🍞|روٹی|roti|रोटी|the bread|das Brot
```

- `## id|level|emoji|title` starts a unit. Units appear in the order of the file.
- Each card is one line: `picture|Urdu|Roman|Hindi|English|German`
- Nouns written with `der/die/das` get their gender color automatically.
- **Do not change a unit `id` or the German text of an existing card**: progress is linked to them. Fixing Urdu, Hindi or English is always safe.
- New level? Just use `B1` as the level; it gets its own section.

### Grammar lessons — `data/guide.html`

Each lesson is a `<section data-id="…" data-title="…" data-level="A1" data-sum="…">`. Copy an existing one and change the text.

### After changing files

Raise `VERSION` at the top of `sw.js` (e.g. `wortzi-1.4.1`) so phones that installed the app download the new files. On GitHub Pages, just commit and push.

---

## Privacy

- All progress, lists and own words are stored in the browser's `localStorage` on the learner's device.
- The page has a strict Content Security Policy: it can only load its own files.
- No cookies, analytics, ads, external fonts or CDNs.
- German audio is pre-recorded with the free Piper voice (files in `audio/`, made by the *Make audio* workflow). The device's own voice is a fallback. Nothing is sent to any speech service when listening.
- Backups are files the learner downloads and keeps. With a password they are encrypted with AES-GCM 256 (PBKDF2-SHA256, 250,000 iterations).
- *Me → Delete all my data* wipes everything from the device.

Because nothing is collected, no cookie banner is needed for the app itself. (If you embed it on WordPress, your site's own cookies and analytics still apply to the surrounding page.)

---

## Project structure

```
index.html              app shell
assets/css/app.css      all styles (mobile-first, print styles for PDFs)
assets/css/fonts.css    self-hosted fonts (SIL Open Font License)
assets/js/app.js        the app (plain JavaScript, no build step)
assets/fonts/           filled by scripts/get-fonts.sh
assets/icons/           app icons
data/deck.txt           all flashcards
data/guide.html         grammar lessons
audio/                  recorded German audio (made automatically, do not edit)
sw.js                   offline support
manifest.webmanifest    install as app
wordpress-plugin/       WordPress shortcode plugin
scripts/                fonts, WordPress zip, single-file build
.github/workflows/      automatic deploy to GitHub Pages
```

## Ideas for later

- Optional sign-in to sync between phone and laptop (would need a small server and a privacy policy)
- Recorded audio from native speakers instead of the device voice
- B1 units, and Arabic, Bengali or Punjabi as bridge languages
- Shared class lists for German teachers

## License

Code: MIT. Fonts: SIL Open Font License 1.1 (Noto Nastaliq Urdu, Noto Sans Devanagari, Atkinson Hyperlegible, Young Serif, JetBrains Mono).
