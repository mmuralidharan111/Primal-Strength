# Backlog

Requested features, not yet built.

> Process: when Manas next asks for changes or additions, go through every item below and ask whether it should go into the next build. Release a new build once 4–5 items are agreed.

## Next build (agreed)
- **Account deletion**: "Delete my account" in Settings removes the login and all data (workouts, check-ins, DEXA, reports, public summary, buddy links, codes, challenge entries), with a confirmation step. Also a web page explaining how to request deletion. Keep the existing "Start over" option, which wipes data but keeps the login.
- **Privacy policy**: a page on the website (and linked from sign-up and Settings) covering what is collected, including health data, who can see it (trainer, buddies, gym owner summaries), storage in Firebase, sharing being off by default, deletion, and contact details. Written with India's DPDP Act in mind.
- **Location-aware units and milestones**:
  - Ask for the user's city at sign-up / in Settings, with an option to fill it from the phone's location (city level only; never store precise coordinates).
  - Localise milestone comparisons (e.g. London to Brighton instead of Bangalore to Mysore); fall back to universal comparisons when no local set exists.
  - Localise event suggestions/templates and units (km/miles, kg/lb) by country.
  - Optional: gym owners set the gym's city for shared local landmarks and city-wide leaderboards.
- **Database rules tests**: run the security rules against Google's official Firebase emulator in CI, covering each role (client, trainer, buddy, gym owner, stranger).
- **Health-data consent**: clear consent at sign-up linked to the privacy notice, plus a separate opt-in before health data is recorded (health reports, DEXA, health-screening answers, pain tracking). Consent can be withdrawn in Settings; consent date and version stored.
- **Age check**: date of birth at sign-up; under-18s need a parent's or guardian's consent (parent email confirmation) before the account is active, per India's DPDP Act.
- **Not-medical-advice note**: short disclaimer on health reports, trends and health-screening flags, and in the privacy policy/terms; the screening flags already advise seeing a doctor.
- **Email verification**: new users confirm their email address (Firebase verification email) before full access; resend link; existing users prompted once.

## Later
- Firebase App Check: switch on together with Play Store readiness (Android check only works for apps installed from the Play Store).
- Play Store readiness: signed release bundle (.aab) with an upload key and Play App Signing, target Android 16 (API 36), decide the final app ID, store listing assets, Data safety and health declarations, 12-tester / 14-day closed test.
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.
- iPhone TestFlight build (needs Apple Developer Program).

## Ideas (not yet requested)
- Privacy documents: terms for gyms using the app, a data-breach response plan (72-hour reporting), a data-retention rule for inactive accounts.
- Health report files on all devices: files uploaded to Firebase Storage so they appear on every signed-in device; trainer sees a file only when the report is shared. Needs Firebase's Blaze plan.
- Push notifications for trainer alerts and buddy high-fives (needs Firebase Cloud Messaging).

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
