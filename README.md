# 36 Beautiful Questions

A candlelit, real-time ritual for two, built on the famous "36 questions" from the 1997 closeness study by Arthur Aron and colleagues.

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
- Live turn indicator, a 3D card flip that both screens see together, answer status for both partners
- Three moods that shift the living background shader: *Dusk*, *Twilight*, *Midnight*
- Breathing interludes between sets, a synced four minute timer for "tell your life story" (question 11)
- Reactions (heart, spark, laugh, tear) that float onto your partner's screen
- A shared **hold**: press the heart together and both screens glow and beat as one (with haptics on supported phones)
- Synthesized bell cues and an optional ambient pad, no audio files
- A downloadable keepsake card at the end
- Survives refreshes and short disconnects; the session resumes where you left off

## How the sync works (no server needed)

The app is fully static, so it runs on GitHub Pages. Real-time sync uses WebRTC data channels through [PeerJS](https://peerjs.com/):

- The person who creates the ritual is the **host**. Their browser holds the authoritative game state and saves it locally, so a refresh restores it.
- The **guest** connects directly to the host and sends actions; the host applies them and broadcasts the new state.
- PeerJS's free public broker is used only for the initial handshake (plus its public STUN/TURN servers for difficult networks). Answers are spoken aloud, so nothing personal is ever transmitted or stored.

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
```

## Deploy to GitHub Pages

1. Push this repository to GitHub (default branch `main`).
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` builds and deploys automatically via `.github/workflows/deploy.yml`.

The site is served at `https://<your-username>.github.io/<repository-name>/`. The Vite `base` is relative, so any repository name works without changes.

## Tech

React 19, TypeScript, Vite, Motion (animations), PeerJS (WebRTC), a hand-written WebGL fragment shader for the background, Web Audio for sound, and `qrcode` for invitations. Typography: Cormorant Garamond, Manrope and Pinyon Script from Google Fonts.

## Credits

Questions from Aron, A., Melinat, E., Aron, E. N., Vallone, R. D., & Bator, R. J. (1997). The experimental generation of interpersonal closeness: A procedure and some preliminary findings. *Personality and Social Psychology Bulletin, 23*(4), 363-377. [doi:10.1177/0146167297234003](https://doi.org/10.1177/0146167297234003)

Questions 27 and 36 use the gender-neutral "them" in place of "him or her".
