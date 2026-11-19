# 36 Beautiful Questions

A candlelit, real-time ritual for two, built on the famous "36 questions" from the 1997 closeness study by Arthur Aron and colleagues.

**Play it here: [ofurkancoban.github.io/36BeautifulQuestions](https://ofurkancoban.github.io/36BeautifulQuestions/)**

[![Unique visitors](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fabacus.jasoncameron.dev%2Fget%2F36beautifulquestions%2Fusers&query=%24.value&label=unique%20visitors&color=b5835a&cacheSeconds=600)](https://ofurkancoban.github.io/36BeautifulQuestions/)

The number of people on the site right now is shown live at the bottom of the home page.

Two people open the app on their own phones, pair with a six-letter invitation, and take turns holding a card. Every screen stays in sync: whose turn it is, when the card turns over, who has answered, the set clock, and the little gestures you send each other.

## The idea

In *The Experimental Generation of Interpersonal Closeness* (Aron, Melinat, Aron, Vallone & Bator, 1997), pairs of strangers spent about 45 minutes trading answers to 36 questions split into three sets of twelve. Each set is more personal than the last. The finding: closeness grows through sustained, escalating, reciprocal self-disclosure.

The app follows the original procedure:

- **Three sets, about 15 minutes each.** *Classic* pacing shows a gentle set clock and invites you to move on when 15 minutes pass, as in the study. *Unhurried* pacing has no clock.
- **Take turns.** Whoever holds the card turns it over, reads it aloud and answers first. Then the other answers. The card passes with every question.
- **Both answer every question.** The app waits for both of you before moving on.
- **Optional closing ritual.** Four minutes of silent eye contact, made famous by Mandy Len Catron's 2015 *Modern Love* essay (not part of the 1997 study itself).

## Features

- Pair with a code, a link or a QR code, then play together in the same room or over a video call
- **Eight languages**: English, Türkçe, Deutsch, Nederlands, Français, Italiano, Español and Русский. Change it any time, even in the middle of the ritual; each partner can play in their own language because the screens sync by question, not by text
- **One-phone mode**: pass a single phone back and forth, no connection needed (works offline once installed); sitting across a table, the whole screen turns to face whoever holds the card
- Live turn indicator, a 3D card flip that both screens see together, answer status for both partners
- A three second **undo** after "I've answered", for accidental taps
- Three moods that shift the living background shader: *Dusk*, *Twilight*, *Midnight*
- Breathing interludes between sets, a synced four minute timer for "tell your life story" (question 11)
- Reactions (heart, spark, laugh, tear) that float onto your partner's screen
- A shared **hold**: press the heart together and both screens glow and beat as one (with haptics on Android, and on iPhone with iOS 18 or later)
- **Private notes** on any question, kept only on your device and downloadable as text at the end
- **The question that stays with you**: each partner picks one at the end; over the network your partner's pick is revealed only after you choose
- A downloadable keepsake card with your names, the date and your chosen questions
- The screen stays awake during the ritual (Wake Lock API), so a phone lying on the table does not lock
- Installable as an app (PWA) with an offline-capable service worker
- An anonymous visitor counter: how many people are here right now and how many have ever visited (counts only, through the free [Abacus](https://jasoncameron.dev/abacus/) counter API; skipped in development and automated tests)
- Synthesized bell cues and an optional ambient pad, no audio files
- Survives refreshes and short disconnects; if the host loses their saved game, the guest's copy restores it

## How the sync works (no server needed)

The app is fully static, so it runs on GitHub Pages. Real-time sync uses WebRTC data channels through [PeerJS](https://peerjs.com/):

- The person who creates the ritual is the **host**. Their browser holds the authoritative game state and saves it locally, so a refresh restores it.
- The **guest** connects directly to the host and sends actions; the host applies them and broadcasts the new state.
- The guest keeps a copy of the latest state and offers it when reconnecting, so the ritual survives even if the host's browser storage is lost.
- Every message from the other device is validated before it is used (`src/net/validate.ts`).
- PeerJS's free public broker is used only for the initial handshake (plus its public STUN/TURN servers for difficult networks). Answers are spoken aloud, so nothing personal is ever transmitted or stored. Private notes never leave the device.

## Languages

All text, including the 36 questions, lives in `src/i18n/<lang>.ts`. English (`en.ts`) defines the shape; every other language is type-checked against it, and `tests/i18n.test.ts` checks that each one has all 36 questions, the same hints and no missing strings. To add a language, copy `en.ts`, translate it and register it in `src/i18n/index.ts`. The first visit picks the browser's language when it is supported, then remembers the choice.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL in two browser windows (or on two devices on the same network using the `Network` URL) to play against yourself.

```bash
npm run build     # production build into dist/
npm run preview   # serve the build locally
npm run typecheck # TypeScript checks
npm test          # unit tests (game rules and message validation)
npm run test:e2e  # two real browsers pair over WebRTC and play (needs internet)
npm run assets    # re-render the link preview image and app icons with headless Chrome/Edge
```

For the end-to-end tests, Playwright uses its bundled Chromium (`npx playwright install chromium`), or an installed browser via `PW_CHANNEL=chrome` or `PW_CHANNEL=msedge`.

## Deploy to GitHub Pages

1. Push this repository to GitHub (default branch `main`).
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` type-checks, runs the unit tests, builds and deploys via `.github/workflows/deploy.yml`. The end-to-end tests run in a separate workflow (`e2e.yml`) so a hiccup on the public broker never blocks a release.

The site is served at `https://<your-username>.github.io/<repository-name>/`. The Vite `base` is relative, so any repository name works without changes.

## Tech

React 19, TypeScript, Vite, Motion (animations), PeerJS (WebRTC, loaded on demand), a hand-written WebGL fragment shader that lowers its own resolution on slow devices, Web Audio for sound, and `qrcode` for invitations (also loaded on demand). Vitest and Playwright for tests. Typography: Cormorant Garamond, Manrope and Pinyon Script, self-hosted through Fontsource, so the site makes no requests to Google.

## Credits

Questions from Aron, A., Melinat, E., Aron, E. N., Vallone, R. D., & Bator, R. J. (1997). The experimental generation of interpersonal closeness: A procedure and some preliminary findings. *Personality and Social Psychology Bulletin, 23*(4), 363-377. [doi:10.1177/0146167297234003](https://doi.org/10.1177/0146167297234003)

Questions 27 and 36 use the gender-neutral "them" in place of "him or her".
