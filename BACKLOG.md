# Backlog

Requested features, not yet built.

> Process: when Manas next asks for changes or additions, go through every item below and ask whether it should go into the next build. Release a new build once 4–5 items are agreed.

## Next build (agreed)
- (nothing yet)

## Later
- Parental consent for under-18s (verifiable, needs email sending: Firebase Blaze plan + Cloud Function). Until then the app is 18+ only.
- Location-aware event suggestions (nearby races) and gym city for city-wide leaderboards.
- Firebase App Check: switch on together with Play Store readiness (Android check only works for apps installed from the Play Store).
- Play Store readiness: signed release bundle (.aab) with an upload key and Play App Signing, target Android 16 (API 36), decide the final app ID, store listing assets, Data safety and health declarations, 12-tester / 14-day closed test.
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.
- iPhone TestFlight build (needs Apple Developer Program).

## Ideas (not yet requested)
- Privacy documents: terms for gyms using the app, a data-breach response plan (72-hour reporting), a data-retention rule for inactive accounts.
- Health report files on all devices: files uploaded to Firebase Storage so they appear on every signed-in device; trainer sees a file only when the report is shared. Needs Firebase's Blaze plan.
- Push notifications for trainer alerts and buddy high-fives (needs Firebase Cloud Messaging).

## Built (November 2026, privacy release)
- Privacy and consent screen before anything else: privacy policy agreement, date of birth (18+ only), country and city; separate optional health-data consent.
- Health data switch in Settings → Privacy; switching off deletes DEXA scans, reports, screening answers and pain scores and hides those features.
- Email verification for new accounts (accounts from 7 Nov 2026); older accounts see a reminder in Settings.
- Delete my account (password confirm) removes login, all records, public summary, buddy links, challenge entries; trainer is told and their notes are removed. Web page: delete-account.html.
- Privacy policy page (privacy.html), linked from the app and download page; not-medical-advice note on consent, questionnaire, plan and reports.
- Units by country (kg/lb, km/mi, cm/in, km/h/mph) with manual override; local running milestones by city/country; "Use my location" looks up the city once and stores only city and country.
- Database rules tested on the official Firestore emulator in CI (57 checks across clients, trainers, gym owners, strangers).

## Built (November 2026, build 26)
- Whole program viewable week by week (Workouts tab week picker; Today offers next week's workouts once this week is done).
- Today opens on your program (next workout, this week's list) and the rings, streak, rank and trophies.
- All cardio counts toward the weekly target, including cardio inside workouts; speed and incline logged for walks and runs; cardio settings (speed, incline, weekly incline increase, effort) in programs and the trainer builder.
- Screen stays on while the app is open; loud beep when rest ends, timer clears itself (no Done button).
- Swap suggestions by muscles worked and equipment, with equipment filter and one-tap swap for today or from now on.
- Change the weight and the target reps recalculate for the same effort.
- Edit profile in Settings; trainer alerted when goal, schedule, equipment or injuries change.
- Squad renamed Troop with the three-gorilla mark.

## Built (October 2026)
- Gym big-screen view: up to 6 clients side by side, log sets on the touch screen, saves to each client.
- Health reports: blood work, VO2 max, blood pressure and custom results with trends; share-with-trainer switch, off by default.
- DEXA-based balance work: weaker side (≥5% less lean mass) goes first with an extra set; replaces the fixed right-side bias.
- Master gym and owner dashboard: gym code for trainers, trainer KPIs, client status, retention, gym leaderboard — summaries only.
- Custom coach challenges and squads: 13 metrics plus custom mixes and exercise-specific challenges, squads, period presets, repeating challenges, targets.
