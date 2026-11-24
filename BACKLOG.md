# Backlog

Requested features, not yet built.

> Process: when Manas next asks for changes or additions, go through every item below and ask whether it should go into the next build. Release a new build once 4–5 items are agreed.

## Priority order (agreed 18 Nov 2026)

**Tier 1, next build:** 1. Sign-up by sport (whole app adapts) · 2. Progress by sport (all 19 sports) · 3. Events as workouts + event results.
**Tier 1b, the build after:** Workout timers (AMRAP/EMOM/Tabata/For Time, landscape) · One workout to many clients, personalised loads.
**Parallel track:** iPhone app (starts once the Apple Developer account exists).
**Tier 2:** Classes (recurring schedule per troop) · Trainer approval = attendance · Event calendar + same-event community + event leaderboard (with nearby race suggestions) · Buddies by email · Wearables via Health Connect, then wearable data on the big screen.
**Tier 3:** Play Store readiness + App Check · Push notifications · Email verification back on (after SMTP setup) · AI insights / AI coaching.
**Tier 3b:** Video calls client ↔ trainer (start with scheduled call links, then in-app video) and form-check videos.
**Tier 4:** Paid plans for clients (app only / weekly check-in with or without video / video every workout) and billing for independent trainers, together with gym management desktop app + backend (views, memberships, billing, payments, GST invoices) with privacy documents (gym terms, breach plan, retention) · Age verification · Health report files on all devices.

## Next build
Not agreed yet. Tier 1b is next in the priority order: workout timers (AMRAP/EMOM/Tabata/For Time, landscape) and one workout to many clients with personalised loads.

## Still open from the sport build (November 2026)
- Progress photos for bodybuilding/physique (needs file storage; on-device only unless the Blaze plan is switched on).
- Challenge metrics by sport (e.g. swim metres, rounds, HYROX time) for coach challenges.
- Event calendar, same-event community and event leaderboard (Tier 2).

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
