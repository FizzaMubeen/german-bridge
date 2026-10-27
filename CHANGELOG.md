# Changelog

The version shown in the app (Me → bottom of the page) matches the tags in this repository.
Phones that installed the app update themselves; learners keep all their progress.

## 1.9.0 — 2026-10-28
- **Speak practice fixed and much better:** uses the offline engine with Wortzi's own vocabulary, so it understands learners far better. A green ring moves with your voice so you can see it hears you, it stops by itself when you pause, and **My voice** plays your recording next to the correct one. Without the engine: download it right there, use the phone's service, or "Just record me"
- **154 new cards in 10 new units:** At the supermarket (Pfand!), Asking the way, In the German course, Rubbish & recycling, Sport & fitness, Hairdresser & repairs, Buying clothes, Complaints & refunds, Parents/Kita/school, Neighbours & house rules. Now 1,334 cards in 76 units
- **8 new stories** (20 in total): Pfand zurück, Mein erster Deutschkurs, Ich habe mich verlaufen, Welche Tonne?, Beim Friseur, Neue Schuhe, Der Elternabend, Zwei Stunden Verspätung
- **White theme** next to Light and Dark, and a theme button in the top bar (Auto → Light → White → Dark)
- **Me:** this week in one sentence, My skills (cards, written, said, listening best, stories), My levels A1/A2/B1, reviews coming up in the next 7 days, and a daily reminder you add to your phone's calendar

## 1.8.0 — 2026-10-27
- **Listen works offline and on every phone:** a German speech-recognition engine (Vosk, open source) now runs inside Wortzi. Download it once (about 45 MB) and the Listen tab turns German around you into text without internet, and no audio ever leaves the phone
- Choose the engine on the Listen tab: **Wortzi offline** (recommended, private) or the **phone's speech service** (Google, Microsoft or Apple, needs internet)
- Encouraging messages under your score: "You already catch 20% of the words. That's how understanding starts!"
- Nouns heard in lower case are shown with their capital letter, as on the cards
- **PDFs are always white** with dark, readable text, also when the phone is in dark mode
- Automatic test on GitHub (*Test offline listening*): plays a German recording into a virtual microphone and checks the result

## 1.7.1 — 2026-10-27
- **Fixed: Listen did not play.** The recording now starts in the same moment as the tap, which iPhone and Safari require; before, they blocked the sound and the fallback voice too
- Recordings play offline on iPhone as well (the app answers the audio range requests Safari sends)
- After an update, phones load the newest app straight away instead of one reload later

## 1.7.0 — 2026-10-27
- **Natural recorded voice:** every card, story line and grammar example now plays a real recording (free Piper voice, made automatically on GitHub by *Make audio*). The phone's own voice is only a fallback. Tap 🔊 twice for slow
- Recordings are saved on the device as you play them; *Me → Settings → Save all audio for offline* stores all of them at once
- Better fallback voice: picks the best German voice on the device and fixes Chrome dropping words
- **New notifications:** at the top of the screen, never over the buttons, with an icon and **Undo** for "moved to I learned" and "added to I want to learn"
- **New look:** one set of line icons instead of emoji on buttons, calmer colours, dark primary buttons, softer cards, clearer tab bar
- Unit page: one big Practise button, then All · Write · Speak; practice settings folded away; "Next unit" at the bottom

## 1.6.0 — 2026-10-27
- **✍️ Write:** see the picture and your own language, type the German. Wortzi is forgiving but teaches: missing article, missing ä/ö/ü/ß, wrong capital letter and small typos count as "almost", with a hint. Wrong article is explained with the colour code. Buttons type ä ö ü ß Ä Ö Ü for you
- **🗣️ Speak:** say the German out loud. Where the browser supports speech recognition, Wortzi shows what it heard, colours each word and gives a score (70% and up counts as right). Where it doesn't, Wortzi records you so you can play your voice next to the correct pronunciation. No audio is saved
- Start them from My words → I learned (**Write them**, **Say them**), from any unit, or from Today → Keep going
- New badges: Schreiber (write 20 words) and Sprecher (say 20 words)

## 1.5.0 — 2026-10-27
- **Choose your level:** A1, A2 or B1 at the top of Learn. Tap a level and only its units, stories and grammar show, in three tabs
- **New B1 level:** 12 units, 180 cards for working life: job interviews, meetings, renting, offices and forms, health insurance, bank and contracts, giving opinions, linking ideas, feelings, news and society, phone calls and formal emails, polite wishes
- 2 B1 stories (*Das Vorstellungsgespräch*, *Ärger mit der Heizung*) and 2 B1 grammar lessons (obwohl / trotzdem / deshalb, and würde / hätte / wäre)
- "Practise A1 / A2 / B1" button for a mixed round from the whole level
- Today's new words follow the level you picked; tap the level tag to change it
- New badge: B1 complete
- Practice settings moved into a small panel at the bottom of Learn

## 1.4.0 — 2026-10-27
- **New name: Wortzi** (was German Bridge) with a new mascot icon: a smiling speech bubble
- New address: wortzi.fizzamubeen.com; WordPress shortcode is now `[wortzi]` (`[german_bridge]` still works)
- Greeting follows the real clock: Guten Morgen (5–11), Guten Tag (11–18), Guten Abend (18–22), Gute Nacht (22–5), and changes by itself while the app is open
- Old backups from German Bridge can still be restored
- Shorts videos show the Wortzi mascot

## 1.3.0 — 2026-10-27
- **Listen & understand (phase 2 prototype):** tap the mic and see German speech as text, live
- Every word coloured: green = you know it, yellow = learning, grey = new; % understood per sentence and per session
- Recognises word forms (ging → gehen, hat → haben, den/dem → der)
- Tap a word to learn it or add it as your own word; "Add all new words" to your wish list
- **Check a German text:** paste a letter or message and see how much you understand
- Listening history and two new badges; Listen replaces Guide in the menu (Guide is now in Learn)

## 1.2.0 — 2026-10-27
- **1,000 flashcards** (541 A1, 459 A2) in 54 units, in daily-life order
- New A1 units: small important words, numbers & prices, months & dates, daily routine, body, clothes, fruit & vegetables, kitchen, around the house, jobs, countries & languages, hobbies, phone, animals & nature, opposites
- New A2 units: renting a flat, bank, job search, post office, travel & trains, restaurant, pharmacy, school & childcare, emergencies, work phrases, small talk, polite German, comparing, time words, computer & internet, festivals, idioms
- **Fun & tricks:** 15 learning tricks, 13 facts about Germany, 23 idioms (as flashcards) and 9 German jokes with explanations
- "Did you know?" card on Today

## 1.1.0 — 2026-10-27
- **Stories:** 10 illustrated Berlin daily-life stories (A1/A2) in `data/stories.json`
- Known words underlined green, new words dotted; tap any word to see it, hear it and add it to a list
- "You know X of Y words" for every story; a recommended story on Today and Learn
- Practise a story's words as flashcards; +15 XP and the Storyteller badge

## 1.0.2 — 2026-10-27
- "A new version is ready" bar with an Update button
- Install reminder (with iPhone steps) so progress is kept safe
- Asks the browser to keep learner data permanently

## 1.0.1 — 2026-10-27
- Practice screen fits on one phone screen, no scrolling
- First public version: 22 units, 370 cards, My words lists, PDFs, backups, grammar guide, offline support
