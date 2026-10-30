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
- **Edit profile**: Settings → Edit profile for name, date of birth (replaces age), sex, height, weight, goal, experience, days per week, equipment, injury areas and health notes. Saves without changing the program; a new weight is also logged as a body check-in; available to clients with a trainer too. The trainer sees the updated answers and gets an alert if goal or injuries change; self-coached users are offered a rebuilt starter plan. Units follow the location setting (cm or ft/in, kg or lb).
- **Database rules tests**: run the security rules against Google's official Firebase emulator in CI, covering each role (client, trainer, buddy, gym owner, stranger).

## Later
- Firebase App Check: switch on together with Play Store readiness (Android check only works for apps installed from the Play Store).
- Play Store readiness: signed release bundle (.aab) with an upload key and Play App Signing, target Android 16 (API 36), decide the final app ID, store listing assets, Data safety and health declarations, 12-tester / 14-day closed test.
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.
- iPhone TestFlight build (needs Apple Developer Program).

## Ideas (not yet requested)
- Health report files on all devices: files uploaded to Firebase Storage so they appear on every signed-in device; trainer sees a file only when the report is shared. Needs Firebase's Blaze plan.
- Push notifications for trainer alerts and buddy high-fives (needs Firebase Cloud Messaging).
- Email verification at sign-up.

## Built (October 2026)
- Gym big-screen view: up to 6 clients side by side, log sets on the touch screen, saves to each client.
- Health reports: blood work, VO2 max, blood pressure and custom results with trends; share-with-trainer switch, off by default.
- DEXA-based balance work: weaker side (≥5% less lean mass) goes first with an extra set; replaces the fixed right-side bias.
- Master gym and owner dashboard: gym code for trainers, trainer KPIs, client status, retention, gym leaderboard — summaries only.
- Custom coach challenges and squads: 13 metrics plus custom mixes and exercise-specific challenges, squads, period presets, repeating challenges, targets.
