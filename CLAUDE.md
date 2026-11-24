# Primal Strength — notes for Claude Code

Read this file and `BACKLOG.md` at the start of every session.

## What this is

A workout app for **clients, trainers and gym owners**, built by Manas (Bengaluru, India) and tested with friends and a gym.

- **Android app:** sideloaded APK (not on the Play Store yet). App ID `com.strengthlog.app` — never change it, or existing installs can't update.
- **Web version:** GitHub Pages, https://mmuralidharan111.github.io/Primal-Strength/ (also the iPhone option for now).
- **Download page for testers:** https://mmuralidharan111.github.io/Primal-Strength/download.html
- **Direct APK link:** https://github.com/mmuralidharan111/Primal-Strength/releases/latest/download/PrimalStrength.apk
- **Backend:** Firebase project `primal-strength-a9ddf` (Auth email/password + Firestore with offline persistence). Free Spark plan — anything needing Cloud Functions, Storage or email sending needs the paid Blaze plan, so flag it.

## Repo layout

| Path | What it is |
| --- | --- |
| `www/index.html` | **The whole app**: one HTML file, vanilla JS, no framework. Edit this file directly. |
| `www/download.html`, `privacy.html`, `delete-account.html` | Static web pages. Privacy policy v1.0 names Manas as data fiduciary, contact mmuralidharan111@gmail.com. Update it when data handling changes. |
| `firestore.rules` | Source of truth for the database rules. **Manas pastes these into Firebase console → Firestore → Rules → Publish** after every change — always remind him and give him the full file. |
| `test/smoke.js` | jsdom end-to-end test against a fake Firestore/Auth (offline, client, trainer, owner, buddies, challenges, consent, deletion…). Failures print `::error` annotations. |
| `test/rules.test.js` | 57 security-rule checks on the official Firestore emulator. |
| `.github/workflows/build-apk.yml` | On push to `main`: npm install → bundle Firebase compat SDK into `www/vendor/` → smoke test → rules tests → Capacitor 7 Android build (keep-screen-on patch, VIBRATE + COARSE_LOCATION permissions) → signed debug APK → GitHub release `build-N` → Pages deploy. |
| `.github/workflows/rules-check.yml` | Same tests on `test/**` branches without releasing — use it to try risky changes. |
| `BACKLOG.md` | Agreed next build, priority tiers, everything requested, and what's been built. |
| `assets/` | Gorilla icon and splash. |

Signing: the permanent keystore is the repo secret `ANDROID_KEYSTORE_B64` (alias `androiddebugkey`, store/key password `android`). Manas holds a backup copy. Version code = GitHub run number.

## Running things

```bash
npm install
node test/smoke.js                       # end-to-end smoke test
npx firebase-tools@13 emulators:exec --only firestore --project demo-primal "node test/rules.test.js"   # needs Java 21
```
Open `www/index.html` in a browser for a quick look: without `www/vendor/` Firebase is absent, so it runs in offline (on-device) mode. Releasing = commit and push to `main`; CI does the rest (~10 min). Check results with `gh run list` / `gh api .../check-runs/<id>/annotations`.

## How the app code is organised (`www/index.html`)

- Global state `S` (view, sub, sheet, ui, draft, timer, profile, data). `render()` rebuilds `main` from `view*()` functions; sheets (bottom dialogs) from `sheetHTML()`.
- All clicks go through one delegated handler: elements carry `data-act="..."` (+ `data-*` args). Inputs use `data-in` / `data-xin` / `data-bp` (builder). Add new actions there.
- Storage: `Store` (IndexedDB on device) + `Cloud` (Firestore). `saveRec/delRec/persistProfile` write to whichever is active. Collections under `users/{uid}`: sessions, cardio, body, dexa, reports.
- Roles: client, trainer (same app, trainer views), gym owner (gym id = owner uid). `public/{uid}` summaries feed boards, buddies, owner dashboard.
- **Units:** everything is stored metric (kg, km, cm, km/h). Display/input goes through helpers `W() D() L() showW() wIn() fieldShow() fieldStore() colsFor() spText()`; units come from country (`settings.loc`, `settings.units`). Staff views always metric.
- **Privacy:** consent screen (`viewConsent`, `CONSENT_V`) before anything; `healthOK()` gates DEXA, reports, screening, pain tracking. Date of birth optional. Age check and email verification are switched **off** (code for email verification is dormant: `needsVerify`, `viewVerify`).
- Exercise library `LIB`/`LIBMAP` with categories; muscles in `CAT_MUSCLES`/`EX_MUSCLES`; swap suggestions `swapSuggestions()`. Cardio prescriptions `CARDIO_RX` / `cardioRx()`. Weight→reps adjustment `setRef()` (Brzycki).
- Gamification: rings, streaks, ranks, badges, strength score, milestones (`PLACES`, local by city/country), Troop (renamed from Squad in the UI — code identifiers still say `squad`).
- Keep `test/smoke.js` passing; extend it for new flows.

## Working with Manas

- He is not a developer. Write to him in plain English, short, no jargon; explain anything he must do in the Firebase/GitHub consoles step by step.
- **Backlog process (standing instruction):** he batches requests into `BACKLOG.md` and releases a build once 4–5 items are agreed. **Whenever he asks for changes or additions, go through each backlog item and ask whether it should go into the next build.** Don't start building until he says go.
- After a release: give the APK link, say what changed, and say whether the database rules changed (if so, give the full rules to paste).
- He prefers metric units and India context (₹, GST, Indian cities).

## Current state (24 Nov 2026)

- Latest release: build 40.
- **Next build (agreed, not started):** sign-up by sport (whole app adapts to the sport), progress by sport (all 19 sports listed in BACKLOG.md), events as workouts + event results in Body. Waiting for Manas to say go.
- Parallel: iPhone app is his priority — needs his Apple Developer Program account first.
- See `BACKLOG.md` for the priority tiers and full details.
