# Backlog

Requested features, not yet built.

## 1. Location-aware milestones and comparisons
- Ask for the user's city at sign-up / in Settings, with an option to fill it from the phone's location (city level only; never store precise coordinates).
- Use it to localise milestone comparisons, e.g. a London user sees "London to Brighton" instead of "Bangalore to Mysore"; fall back to universal comparisons (marathons, mountains climbed, Great Wall lengths) when no local set exists.
- Localise event suggestions and templates where relevant (nearby races, local Hyrox events) and units (km/miles, kg/lb) by country.
- Optional: gym owners set the gym's city so a whole gym shares local landmarks and city-wide leaderboards.

## Later
- AI coaching (Cloud Functions + Claude API): post-workout feedback, weekly review, trainer suggestions. Needs Anthropic API key and Firebase Blaze plan.
- iPhone TestFlight build (needs Apple Developer Program).

## Ideas from the last build (not yet requested)
- Report files synced across devices and viewable by trainers (needs Firebase Storage on the Blaze plan).
- Push notifications for trainer alerts and buddy high-fives (needs Firebase Cloud Messaging).

## Built (October 2026)
- Gym big-screen view: up to 6 clients side by side, log sets on the touch screen, saves to each client.
- Health reports: blood work, VO2 max, blood pressure and custom results with trends; share-with-trainer switch, off by default.
- DEXA-based balance work: weaker side (≥5% less lean mass) goes first with an extra set; replaces the fixed right-side bias.
- Master gym and owner dashboard: gym code for trainers, trainer KPIs, client status, retention, gym leaderboard — summaries only.
- Custom coach challenges and squads: 13 metrics plus custom mixes and exercise-specific challenges, squads, period presets, repeating challenges, targets.
