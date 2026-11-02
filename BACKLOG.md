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
- **Squad → Troop**: rename the "Squad" tab and every user-facing "Squad/squads" label to "Troop/troops" (client tab, trainer tab, trainer client groups, challenge text, toasts). Use the Troop mark (three gorilla heads, centre one gold) from the rename-options design canvas as the tab icon and on the Troop screen header. Internal code and database names stay as they are, so nothing breaks.
- **Keep the screen on**: while the app is open and in front, the phone screen doesn't switch off (screen wake lock on Android and the web; released when the app goes to the background). Setting to turn it off for anyone who prefers the normal behaviour.
- **Loud beep when rest ends**: when the rest timer between sets runs out, play a loud beep (plus vibration) so the user knows to start the next set, even with the phone on a bench. Works with the screen on and in the background where Android allows. No "done" button needed on the timer.
- **Open on the program and rewards**: once a user has a program, the app opens on a home screen with their program (today's or next workout) and the rings, streak and rewards. New users without a program keep the current welcome/set-up screen.
- **Easier exercise swaps**: fewer taps to swap; tap the exercise name (not only the small swap icon) to open swaps; show the best 3–5 alternatives first, matched to the same muscles and the user's equipment and injuries; choose "just today" or "always" in the same step.
- **Change the weight, reps adjust automatically**: if a weight isn't available, the user types the weight they have and the app recalculates the target reps for the same effort (from estimated 1-rep max, e.g. Epley), within sensible limits (e.g. 3–20 reps); if the weight is too light or heavy to stay in range it suggests adding or removing a set instead.
- **Detailed cardio prescriptions**: cardio days spell out the settings, e.g. treadmill speed (km/h) and incline (%), time per block, intervals (work/rest), heart-rate zone or effort level; bike resistance and cadence; rower pace per 500 m and stroke rate. Shown in the workout and editable by trainers in the program builder; units follow the location setting.
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

## Built (October 2026)
- Gym big-screen view: up to 6 clients side by side, log sets on the touch screen, saves to each client.
- Health reports: blood work, VO2 max, blood pressure and custom results with trends; share-with-trainer switch, off by default.
- DEXA-based balance work: weaker side (≥5% less lean mass) goes first with an extra set; replaces the fixed right-side bias.
- Master gym and owner dashboard: gym code for trainers, trainer KPIs, client status, retention, gym leaderboard — summaries only.
- Custom coach challenges and squads: 13 metrics plus custom mixes and exercise-specific challenges, squads, period presets, repeating challenges, targets.
