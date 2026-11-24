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
| `www/download.html`, `privacy.html`, `delete-account.html` | Static web pages. Privacy policy v1.1 (`POLICY_V` in the app; raise `CONSENT_V` only when data is used in a new way, which makes everyone agree again) names Manas as data fiduciary, contact mmuralidharan111@gmail.com. Update it when data handling changes. |
| `docs/play-data-safety.md` | Ready-to-paste Play Console Data safety answers; keep in step with the privacy policy. |
| `firestore.rules` | Source of truth for the database rules. **Manas pastes these into Firebase console → Firestore → Rules → Publish** after every change — always remind him and give him the full file. |
| `test/smoke.js` | jsdom end-to-end test against a fake Firestore/Auth (offline, client, trainer, owner, buddies, challenges, consent, deletion…). Failures print `::error` annotations. |
| `test/rules.test.js` | 128 security-rule checks on the official Firestore emulator, including a security-audit section (cross-account reads/writes, trainer and gym-owner scope, gym codes). |
| `.github/workflows/build-apk.yml` | On push to `main` (or a manual run on any branch): `npm ci` → bundle Firebase compat SDK into `www/vendor/` → smoke test → rules tests → Capacitor 7 Android build (keep-screen-on patch, VIBRATE + COARSE_LOCATION permissions, backups and phone-to-phone transfer off) → signed **release** APK, checked not debuggable → then, only on `main`: GitHub release `build-N` (separate `release` job) and Pages deploy. The build job is read-only; only those two jobs can publish. |
| `.github/workflows/rules-check.yml` | Same tests on `test/**` branches without releasing — use it to try risky changes. |
| `BACKLOG.md` | Agreed next build, priority tiers, everything requested, and what's been built. |
| `assets/` | Gorilla icon and splash. |

Signing: the permanent keystore is the repo secret `ANDROID_KEYSTORE_B64` (alias `androiddebugkey`, store/key password `android`). Manas holds a backup copy. Version code = GitHub run number.

## Running things

```bash
npm ci                                   # exact versions from package-lock.json
node test/smoke.js                       # end-to-end smoke test
npx firebase emulators:exec --only firestore --project demo-primal "node test/rules.test.js"   # needs Java 21
```
Supply chain: every package is pinned to an exact version in `package.json` and locked in `package-lock.json` (commit both); CI uses `npm ci`; build tools (`firebase-tools`, `@capacitor/assets`) are devDependencies, never `npx --yes pkg@range`; GitHub Actions are pinned to commit SHAs with the version in a comment. When updating anything, pick a version at least two weeks old.
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
- **Sports:** `SPORTS` (19 entries, `SPORTMAP`) drives everything sport-specific: `cats/allow/no/bwOnly` (exercise filter `sportFits`), `types` (Cardio tab session types, fields in `SESSION_TYPES`/`SFIELDS`), `tests` (`STESTS`, saved as body records with `source:"test"`), `events` (`EVENT_KINDS`, `SPLITS`), `week` (weekly targets, overrides in `settings.sportTargets`), `prog` (panels rendered by `sportPanel`), `tpls`/`tpl` (sport programs in `TEMPLATES`). Sport lives in `settings.intake.sport` / `sport2`; `curSport()` uses the trainer's open client when there is one.
- **Events** are saved as sessions with `day:"🏁"`, `exercises:[]` and an `event` object (kind, finish seconds, place, splits…), so they count as workouts; `sessionCardioMin`/`sessionKm` include them.
- **Coach tools:** workout timers `S.wt` / `wtState()` / `wtHTML()` (overlay rendered on every screen). One workout to many: builder with `S.builder.multi`, sheet `msend`, `personalEx()`; one-offs live in `program.oneoffs` (ids `o-…`, shown as ★ via `dayTag`, found by `dayById`). Approval: `session.approved` (only trainers may set it — rules), attendance docs in `trainers/{tid}/attendance` (`w_<sessionId>` for workouts, `c_<class>_<date>_<client>` for roll calls). Classes in top-level `classes` (like challenges). Sport challenge metrics in `SPORT_METRICS` / `sportMetricValue`.
- **Bounded reads (cost):** never attach an unfiltered listener to a growing collection. `attachData()` listens live only to the last 6 weeks of `sessions`/`cardio`/`body` (`LIVE_DAYS`) and loads older history from the phone's Firestore cache, fetching it from the server once per phone (`fetchHistory`, localStorage markers `ps-hist-from:*`, `ps-seen:*`); default 6 months back (`HISTORY_DAYS`), "Load older history" (`hist-all`) fetches the rest. Saves and deletes of older records go through `S.hist.touch`. Challenge leaderboards are listened to only for challenges ended in the last 30 days. Free Spark plan = 50,000 reads/day.
- Keep `test/smoke.js` passing; extend it for new flows.

## Working with Manas

- He is not a developer. Write to him in plain English, short, no jargon; explain anything he must do in the Firebase/GitHub consoles step by step.
- **Backlog process (standing instruction):** he batches requests into `BACKLOG.md` and releases a build once 4–5 items are agreed. **Whenever he asks for changes or additions, go through each backlog item and ask whether it should go into the next build.** Don't start building until he says go.
- After a release: give the APK link, say what changed, and say whether the database rules changed (if so, give the full rules to paste).
- He prefers metric units and India context (₹, GST, Indian cities).

## Current state (24 Nov 2026)

- Latest release: coach tools build (after build-48). Release = push to `main`.
- Next build: number 2 in `BACKLOG.md` → Build plan (retention: risk score, call list, pause, comeback plan, report card, retention dashboard, plus membership end date, first-60-days watch, anniversary badges). Agreed 24 Nov 2026; not started — wait for Manas's go. Events and community is number 3; ask where race listings should come from.
- Parallel: iPhone app is his priority — needs his Apple Developer Program account first.
- See `BACKLOG.md` for the build plan and full details.
