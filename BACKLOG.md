# Backlog

Requested features, not yet built.

## 1. Gym big-screen view (trainers)
- A trainer page to select several clients and show their current workouts side by side.
- Designed for a large touch screen in the gym, so clients can follow along without their phones.
- Clients or trainers can tick off sets and enter reps/weights on the big screen.
- Open questions: how a client confirms it's them on a shared screen (e.g. tap their name, optional PIN); auto sign-out / privacy when idle; landscape layout for 2–6 clients.

## 2. More health reports
- Upload and track multiple report types, not just DEXA: blood work, VO2 max tests, and others.
- Each report: type, date, key numbers entered by the user, and the attached PDF or photo.
- Trends over time per metric (e.g. HbA1c, LDL, VO2 max).
- Note: syncing report files between devices needs Firebase Storage (Blaze plan).

## 3. Program based on DEXA only (not fixed right-side bias)
- Remove the hard-coded "extra right-side set" from the back-friendly program.
- Instead, derive any left/right emphasis from the latest DEXA scan's trunk and limb lean-mass differences, and switch it off when the gap closes.

## 4. Master gym and owner dashboard
- A "gym" account that trainers link to (e.g. with a gym invite code), so one gym can have many trainers and their clients.
- Gym owner / manager role with a dashboard: per-trainer client counts, active vs inactive clients, workouts logged per week, average client streaks and adherence, PBs set, challenge participation, and client retention.
- Drill down from a trainer to their clients' programs and progress.
- Ties into the gym big-screen view (gym-wide leaderboards and challenges).
- Open questions: what owners may see of client data (summary only vs full); trainers moving between gyms; billing per gym.

## 5. Custom coach challenges and squads
- **Custom challenges:** besides the five built-in rankings (workouts, cardio minutes, running km, points, strength score gain), let a trainer build a challenge from any available metric, e.g. sets completed, tonnes lifted, check-ins, PBs set, full weeks closed, a specific exercise (heaviest squat, most push-ups, fastest 1 km), or a weighted mix of several metrics.
- **Squads / client groups:** trainers create named groups of clients (e.g. "6 am crew", "Hyrox team") and run a challenge for one group, several, or all clients.
- **Custom periods:** quick presets (this week, this month, 4 weeks, block length) plus any start and end date, and optional recurring challenges (e.g. a new monthly challenge that auto-starts each month). Note: any start and end date can already be picked today; presets and recurrence are the new parts.
- Optional targets ("everyone who hits 12 workouts gets a badge") alongside rankings.

## Later
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.
- iPhone TestFlight build (needs Apple Developer Program).
