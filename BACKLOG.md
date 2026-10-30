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

## Later
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.
- Gamification — ideas under discussion.
- iPhone TestFlight build (needs Apple Developer Program).
