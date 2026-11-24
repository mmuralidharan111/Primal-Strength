# Backlog

Requested features, not yet built.

> Process: when Manas next asks for changes or additions, go through every item below and ask whether it should go into the next build. Release a new build once 4–5 items are agreed.

## Build plan (agreed 24 Nov 2026)

Builds in order. Each groups items that share setup; later builds depend on earlier ones. Build numbers on GitHub follow the run count, so they're named here, not numbered.

**1. Coach tools on the gym floor — BUILT 24 Nov 2026 (see Built, coach tools build)**
- Workout timers: AMRAP, EMOM, Tabata, For Time, with a full-screen landscape mode.
- One workout to many clients, with each client's weights and reps set from their own history.
- Trainer approves a logged workout; an approved workout counts as attendance (for trainer and gym billing).
- Classes: recurring sessions for a troop (e.g. Mon/Wed/Fri 7 am); clients see their class schedule.
- Coach challenges by sport (swim metres, rounds, HYROX time and more).

**2. Events and community**
- Event calendar of races, filtered city → state → region → country → part of a continent → continent → world.
- Same-event community: find people targeting the same event (HYROX, CrossFit…), compare prep, option to share event-prep progress.
- Event leaderboard not limited by location.
- Nearby race suggestions, and gym city for city-wide leaderboards.
- Buddies by email (with permission).
- Decision needed: where race listings come from (added by trainers/users, or a paid race-data source).

**3. Play Store and phone features**
- Play Store readiness: signed release bundle (.aab), target Android 16 (API 36), final app ID decision, store listing, Data safety and health declarations, 12-tester / 14-day closed test.
- Firebase App Check.
- Wearables via Health Connect (steps, heart rate, sleep, workouts, VO2 max; covers Fitbit, Samsung, Oura, Whoop, Strava, Ultrahuman and others).
- Wearable data on the gym big screen (coach chooses what to show).
- Email verification back on, after Firebase emails are sent through your own Gmail (SMTP).

**4. Blaze plan: storage, notifications, AI** (switch on Firebase's paid Blaze plan once)
- Health report files on all devices (shared with the trainer only when the report is shared).
- Progress photos for bodybuilding/physique.
- Push notifications for trainer alerts and buddy high-fives.
- AI insights for trainers and AI coaching (Claude API key).
- Age verification and parental consent for under-18s (DPDP Act).

**5. Video coaching**
- Scheduled call links per session (Google Meet / Jitsi), logged against the client.
- Form-check videos: client records a set, trainer replies later (needs storage from build 4).
- In-app video calls through a provider (100ms, Agora, Daily).

**6. Payments and gym management**
- Paid client plans: app only / weekly check-in without or with video / video every workout.
- Billing and payouts for independent trainers (Razorpay Route, trainer KYC).
- Gym management desktop app + backend: views (clients needing a new program, new clients without a program, defaulters, memberships ending), monthly/quarterly/6-monthly/yearly memberships.
- Payments with GST invoices.
- Privacy documents: gym terms, 72-hour breach plan, retention rule for inactive accounts.

**Alongside: iPhone app** — starts once the Apple Developer account exists (TestFlight, then App Store, then Apple Health).

## Retention features (requested 24 Nov 2026)

Goal: spot members slipping earlier, get trainers and owners to act, give members reasons to stay, and show owners what works. Most of this runs on the free Firebase plan; exceptions are marked.

### Proposed for the next build (Manas to confirm)
1. **Personal risk score.** Compare each member with their own usual pattern (average workouts per week over the last 4–8 weeks), not a fixed 14 days. Flag when this week falls clearly below their norm (e.g. 3/week → 1/week). Show the reason on the owner and trainer views.
2. **Trainer weekly call list.** Each trainer sees "members to contact this week" from the risk score. A one-tap WhatsApp button opens a wa.me link with a ready-made message (free, no WhatsApp API). Trainer records the outcome: Called / Back training / Lost. Owner sees the outcomes.
3. **Pause / holiday mode.** Member (or trainer) pauses for travel or illness with a start and end date. Streaks, rings and the risk status freeze during the pause.
4. **Comeback plan.** After a gap of 10 days or more, the first week back is automatically lighter (fewer sets, lower targets), then returns to the normal program.
5. **Monthly report card.** On the 1st of each month: workouts, personal bests, total kg lifted, km run, body changes, streak. Shareable as an image (WhatsApp/Instagram). Trainers and owners see summaries only, following the existing privacy rules.
6. **Retention dashboard (owner and trainer).** For members who joined in a given month, the share still training at 30, 90 and 180 days. Split by trainer, class/troop and program. Also: active members trend and at-risk count trend.

### Later retention items (backlog)
7. **More warning signs** in the risk score: missed planned workouts, missed class roll calls, shorter sessions, pain flags, program finished with no new one assigned, membership ending within 30 days while not training.
8. **Membership end date** entered by hand on the member profile (until full memberships arrive in the payments/gym-management build).
9. **First-60-days watch.** New members get a stricter risk threshold and a highlighted "new member" tag for trainers.
10. **First-30-days journey.** Goal set on day 1; check-ins in week 1 and week 2; celebration of the first personal best; prompt for a trainer intro.
11. **Owner win-back list.** Inactive members with their trainer named, plus an owner-defined comeback offer text to send via WhatsApp link.
12. **Re-test days.** Benchmark workout every 4–6 weeks matched to the member's sport (e.g. 5 km time, estimated 1-rep max, HYROX stations), with the result compared with last time.
13. **Troop accountability.** Optional: a buddy or troop is told when a member misses a planned session. Team challenges where a missed session costs the team points.
14. **Gym rewards.** Gym defines rewards for points (free PT session, merchandise, shake), handed over at the desk; the app tracks points and redemptions.
15. **Anniversary badges.** 3, 6 and 12 months as a member.
16. **Exit reason.** One question when a member goes inactive or deletes their account: cost, time, injury, moved, lost interest, other. Owner sees totals.
17. **Trainer retention ranking.** Owner view ranking trainers by how long their clients keep training.
18. **Member reminders by push**, e.g. "You planned Mon/Wed/Fri, missed Wednesday", plus a streak-saver reminder. Needs push notifications (Blaze plan, build 4).
19. **WhatsApp automated reminders** through the WhatsApp Business API. Charged per message; later.
20. **Revenue at risk.** At-risk members × membership fee. Needs membership fees (payments build) or a fee entered by hand.

### Notes for building
- Keep privacy rules: owners see statuses, counts and summaries only, never weights, health data or trainer notes.
- Extend test/smoke.js for the risk score, pause mode, call-list outcomes and the dashboard; add rules tests for any new collections (call-list outcomes, exit reasons, pauses).
- Database rules will likely change; give Manas the full firestore.rules to paste after release.

## From Manas's notes (18 Nov 2026)

**Priority**
- **iPhone app ASAP.** Native iPhone app (TestFlight first, then App Store). Needs the Apple Developer Program (US$99/year). Replaces the "iPhone TestFlight" item under Later.

**Sign-up by sport**
- Sign-up asks for the user's sport (one main sport, optional second). The whole app environment changes with it, not just the plan:
  - exercise library, swap suggestions and templates show only what fits the sport (a triathlete never sees back squats unless they ask; a strength athlete isn't shown swim drills);
  - log screen fields fit the sport (pace, distance, splits, heart rate, rounds, time, weight);
  - Today screen, rings and weekly targets (e.g. swim/bike/run minutes for triathlon instead of lifts);
  - progress, trophies, milestones, challenge metrics and the trainer's view.
  - Sport can be changed later in Edit profile; a "general fitness" option keeps today's mixed layout.

**Events and community**
- Track events (races, competitions) as workouts.
- Event calendar of races people can browse, filtered from city → state → region → country → part of a continent → continent → world.
- Connect with others targeting the same event (HYROX, CrossFit etc.) and compare event prep; option to share event-prep progress; event leaderboard that isn't limited by location.
- Buddies: with permission, find and add buddies by email address.

**Progress by sport**
- Progress screens differ by sport instead of one fixed layout, showing what an athlete or trainer in that sport cares about. Cover every sport offered at sign-up:
  - General fitness / weight loss: workouts per week, body weight, waist, body fat, steps, cardio minutes.
  - Strength / powerlifting: squat, bench, deadlift estimated maxes, Wilks/DOTS-style total, volume, rep PBs.
  - Bodybuilding / physique: volume per muscle group, measurements, body composition, progress photos.
  - Olympic weightlifting: snatch, clean and jerk, front squat; technique-lift PBs.
  - HYROX: 1 km run splits and pace, each station time (ski, sled push, sled pull, burpee broad jumps, row, farmers carry, lunges, wall balls), Roxzone time, finish time.
  - CrossFit / functional fitness: benchmark workouts (Fran, Grace, Murph…), Open scores, gymnastics skills, lifts, engine (row/bike calories).
  - Running (5 km to marathon): pace, weekly distance, long run, race times, heart-rate zones, VO2 max.
  - Triathlon: swim pace per 100 m, bike power/speed and distance, run pace, weekly volume per sport, brick sessions, race splits and transitions.
  - Cycling: distance, speed, power (FTP), climbing, cadence.
  - Swimming: pace per 100 m, distance, stroke, intervals.
  - Obstacle racing (Spartan, Devil's Circuit, Yoddha): run pace, grip and carry tests, obstacle skills, race times.
  - Team sports (football, cricket, hockey, basketball, rugby): sprint, agility (5-10-5), jump, Yo-Yo or beep test, strength.
  - Racquet sports (tennis, badminton, squash, padel, pickleball): agility, sprint, jump, shoulder and core strength, endurance.
  - Combat sports (boxing, MMA, Brazilian jiu-jitsu, wrestling): rounds and conditioning, strength-to-weight, weight-class tracking.
  - Calisthenics: pull-ups, dips, push-ups, skills (muscle-up, handstand, front lever).
  - Rowing: 500 m split, 2 km time, stroke rate, distance.
  - Climbing / bouldering: grades sent, finger strength, pull-ups.
  - Yoga / mobility: sessions, mobility scores, consistency.
  - Older adults / rehab: balance, sit-to-stand, walking speed, grip strength, pain trend.

- Body tab: add HYROX, CrossFit and other event result reports.
- AI insights for trainers: correlate progress, event results, VO2 max, DEXA and other reports, and give the trainer insights. Build the AI logic and confirm it works (links to AI coaching under Later).

**Trainer tools**
- Build a workout once and send it to several clients; each client's weights and reps are set from their own history.
- Trainer approves a logged workout; an approved workout counts as attendance, so trainer and gym can track attendance for billing.
- AMRAP and other smart timers (EMOM, Tabata, For Time), with a landscape full-screen mode so the timer is as big as possible.
- Gym big screen: also show live heart rate, SpO2 and other wearable data; the coach chooses what to display (needs the wearables item).
- Classes: trainer schedules regular recurring classes (e.g. Mon/Wed/Fri 7 am) for the same group or sub-group of clients (troops), separate from one-off events; clients see their class schedule.

**Video coaching and paid plans (added 18 Nov 2026)**
- Video calls between client and trainer, in the app, to watch form live and give feedback. Options: a video provider's SDK (e.g. 100ms, Agora, Daily) for in-app calls, or a simpler first step that creates a scheduled Google Meet / Jitsi link per session. Calls logged against the client (date, length, notes).
- Suggested extra: clients record a short form-check video of a set and send it to the trainer for feedback later (no live call needed).
- Independent trainers (not linked to a gym) can sign clients up and bill them through the app.
- Client plans:
  1. Basic: app only (self-coached).
  2. Weekly check-in with an in-house trainer: one rate without video, a higher rate with a video call.
  3. Premium: a trainer on a video call for every workout.
- Needs: subscriptions and payments (e.g. Razorpay subscriptions with GST invoices), payouts to independent trainers with the platform's commission (e.g. Razorpay Route, needs trainer KYC), trainer availability and booking, and a server (Firebase Blaze). Shares the billing foundation with the gym management item.

**Gym management (desktop app and backend)**
- Desktop web app for gyms and trainers, with a proper backend, covering client and trainer data: missed sessions, progress alerts, member tenure, billing.
- Views: (a) existing clients who need a new program; (b) new clients and whether they've been given a program; (c) defaulters (overdue payments); (d) clients nearing the end of their membership.
- Memberships: monthly, quarterly, 6-monthly and yearly.
- Payments in the app with invoices for clients and gyms; tax (GST) calculated for accounting.

## Later
- **Progress over years (history older than 6 months).** Since the security audit (Nov 2026) the app loads the last 6 months by default to keep database reads low; older history loads with "Load older history" on Progress and then stays on that phone. Make long-term progress work without that tap: multi-year charts, all-time PBs, and points/ranks/badges that keep counting workouts older than 6 months (today they're worked out from the records loaded, so an account older than 6 months would see its totals drop until older history is loaded). Likely approach: keep running lifetime totals and monthly summaries in the database, updated as records are saved.
- Email verification for new accounts: built, then switched off (Nov 2026) because Firebase's confirmation emails weren't arriving. Before switching it back on, send Firebase's emails through your own Gmail (Authentication → Templates → SMTP settings) or a custom domain, and show Firebase's error code if sending fails.
- **Wearable and health-app data (Google Health / Fitbit, Health Connect, Apple Health, Garmin, Strava, Oura, Whoop and others)**: bring in steps, heart rate and resting heart rate, sleep, workouts and cardio sessions (counting toward the cardio ring), body weight and VO2 max.
  - Android, recommended first route: Health Connect, read on the phone. One connection covers apps that write to it (Fitbit/Pixel via the Google Health app, Samsung Health, Oura, Whoop, Strava and others). Needs a Health Connect plugin in the Android app, a permissions screen and Play's Health Connect declaration, so it fits with Play Store readiness.
  - iPhone: Apple Health (HealthKit) needs the native iPhone app, so it follows the TestFlight item.
  - Cloud route: the Google Health API replaced the Fitbit Web API (switched off 2 Nov 2026); every scope is "Restricted" and needs Google's privacy and security review, and Google paused onboarding of new projects in October. Garmin, Oura, Whoop and Strava have their own APIs (Garmin needs business approval). Cloud routes need a server (Firebase Cloud Functions on the Blaze plan).
  - Ultrahuman Ring: writes sleep, heart rate, HRV, resting heart rate, SpO2, skin temperature, steps and workouts to Health Connect and Apple Health, so the Health Connect route covers it. A direct link is also possible through Ultrahuman's Partnership API (OAuth; base https://partner.ultrahuman.com/api/partners/v1, daily metrics endpoint; no workouts) but needs Partnership API access from Ultrahuman and a small server to hold the client secret and poll hourly.
  - Only with the user's health-data consent; privacy policy updated to name each connected service.
- Age verification: 18+ check at sign-up, and verifiable parental consent for under-18s under India's DPDP Act (needs email sending: Firebase Blaze plan + Cloud Function). Removed from the app for now; date of birth is asked but optional.
- Location-aware event suggestions (nearby races) and gym city for city-wide leaderboards.
- Firebase App Check: switch on together with Play Store readiness (Android check only works for apps installed from the Play Store).
- Play Store readiness: signed release bundle (.aab) with an upload key and Play App Signing, target Android 16 (API 36), decide the final app ID, store listing assets, Data safety and health declarations, 12-tester / 14-day closed test.
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.

## Ideas (not yet requested)
- Privacy documents: terms for gyms using the app, a data-breach response plan (72-hour reporting), a data-retention rule for inactive accounts.
- Health report files on all devices: files uploaded to Firebase Storage so they appear on every signed-in device; trainer sees a file only when the report is shared. Needs Firebase's Blaze plan.
- Push notifications for trainer alerts and buddy high-fives (needs Firebase Cloud Messaging).

## Built (November 2026, coach tools build)
- Workout timers: AMRAP (tap +1 round), EMOM, Tabata and For Time (Done button, optional time cap), with a 10-second countdown, beeps at every change and 3-2-1, pause, full screen and landscape (numbers fill the screen sideways). Open from Workouts → Timer, the rest-timer button in a workout, a "Timer" button on metcon/race-simulation groups, and the gym big screen. Result can be added to the workout notes.
- One workout to many clients: Clients → "Send one workout to several clients". Build it once, pick clients (or a whole troop), preview each client's weights and reps from their last 4 months (estimated max → working weight; bodyweight and holds at 75–80% of their best), then send as a one-off for a date or as a new day in their weekly program. Clients see one-offs on Today under "From your trainer".
- Approval = attendance: trainer approves a logged workout from the alert list or the workout itself; gym-screen workouts are approved automatically. Clients see "✓ Approved" but can't approve or un-approve themselves (database rule).
- Classes: new Classes tab for trainers. Recurring classes (days, time, length, place, start/end, all clients or selected troops); this week's schedule; roll call ("Take attendance"). Clients see "Your classes" on Today.
- Attendance report per month (workouts + classes per client), exported as .csv, for the trainer (Classes tab) and the gym owner (trainer detail) for billing.
- Coach challenges by sport: swim metres, cycling km, rowing metres, swim/bike/run minutes, combat rounds, races, climbing sessions, yoga/mobility sessions, best race time (e.g. HYROX, with an h:mm:ss target) and best fitness-test result.
- Database rules changed (classes, attendance, approval protection); 78 rule checks pass on the Firestore emulator. Privacy policy updated (gym owner sees attendance).

## Built (November 2026, sport build)
- Sign-up by sport: 19 sports (main sport plus optional second sport), asked in the coach questionnaire and editable in Edit profile; trainer is alerted when it changes and sees it in intake answers and the client list.
- The app adapts to the sport: exercise list and swap suggestions show exercises for the sport (search or "Show all sports" shows everything; trainers always see all); ready-made programs for the sport are listed first; 13 new sport programs (triathlon, cycling, swimming, weightlifting, obstacle racing, team sports, racquet sports, combat, calisthenics, rowing, climbing, yoga/mobility, older adults/rehab) and ~40 new exercises; the coach questionnaire builds a starter plan from the sport's program.
- Sport log: the Cardio tab ("Training log") offers the sport's session types with matching fields (distance, pace, metres and stroke, power, cadence, climb, stroke rate, splits, rounds, grades, effort); average heart rate on cardio exercises inside workouts; pace shown for runs, swims and rows.
- Weekly targets by sport on Today (e.g. swim/bike/run minutes, running km and long run, metres swum, rounds, sessions), editable in Settings; the ring is labelled for the sport.
- Progress by sport for all 19 sports (estimated maxes, powerlifting total with DOTS, weightlifting total, rep PBs, sets per muscle, measurements, pace trends, distance per week, HYROX run/station splits, benchmarks, test trends, heart-rate zones, rounds, strength-to-weight, weight class, grades, consistency…), shown to the trainer too; general stats stay below.
- Events as workouts: log races and competitions (HYROX with all run and station splits, running races, triathlon/duathlon splits, cycling, swimming, rowing, obstacle races, CrossFit Open, powerlifting/weightlifting meets, fights, matches, climbing comps). Each counts as a workout (streaks, rings, points, cardio minutes, running km) and alerts the trainer; results with PBs in Body → Event results; "Log your result" prompt after the event date.
- Sport fitness tests in Body (e.g. CSS, FTP, 2 km row, 5-10-5, Yo-Yo, max pull-ups, sit-to-stand), with trends in Progress. VO2 max, resting heart rate and pain tests need health consent.
- Privacy policy text updated for sport, race results and tests (no database rule change).

## Built (November 2026, privacy release)
- Privacy and consent screen before anything else: privacy policy agreement, date of birth (optional), country and city; separate optional health-data consent.
- Health data switch in Settings → Privacy; switching off deletes DEXA scans, reports, screening answers and pain scores and hides those features.
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
