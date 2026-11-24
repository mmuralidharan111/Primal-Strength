# Play Console: Data safety answers

Ready to paste into Play Console → App content → Data safety when the app goes on the Play Store. Matches privacy policy v1.2 (`www/privacy.html`). Re-check this file whenever the app starts collecting something new, and before switching on App Check with reCAPTCHA (see the end).

## Data collection and security

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (Firebase and BigDataCloud are HTTPS only) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: in the app (Settings → Privacy → Delete my account) and on the web: https://mmuralidharan111.github.io/Primal-Strength/delete-account.html |
| Is your app's data shared with third parties? | **No.** Firebase (Google) and BigDataCloud only process data for the app (service providers, which Play doesn't count as sharing). Trainers and gym owners see data only after the user connects to them with a code (user-initiated). |

## Data types

For every type below: **Collected = Yes, Shared = No, Processed ephemerally = No** (unless stated), **Purpose = App functionality** (plus Account management where noted). Nothing is used for analytics, advertising, marketing or fraud prevention.

| Category | Data type | Required or optional | Purposes | What it is in the app |
| --- | --- | --- | --- | --- |
| Personal info | Name | Required | App functionality, Account management | Account name shown to the user's trainer, buddies and boards |
| Personal info | Email address | Required | Account management | Sign-in |
| Personal info | User IDs | Required | App functionality, Account management | Firebase account ID |
| Personal info | Phone number | Optional | App functionality | WhatsApp number the member may add so their trainer can message them; seen only by their trainer |
| Personal info | Other info | Optional | App functionality | Date of birth, sex, height, sport, goal, experience, membership end date |
| Health and fitness | Fitness info | Required | App functionality | Workouts, sets and weights, cardio, races and results, fitness tests, body weight and waist, attendance, training pauses, follow-ups a trainer records (Called / Back training / Lost) |
| Health and fitness | Health info | Optional (separate health consent) | App functionality | DEXA results, health reports, pre-exercise screening answers, pain scores, resting heart rate and VO2 max tests |
| Location | Approximate location | Optional | App functionality | City and country (typed, or looked up once with "Use my location"); coordinates are rounded to about 100 m, sent to BigDataCloud once and not stored |
| App activity | Other user-generated content | Optional | App functionality | Workout notes and event notes |

Not collected: precise location, financial info, messages, photos and videos, audio, files and docs (report files stay on the phone), calendar, contacts, web browsing, app info and performance (no crash or diagnostics SDK), device or other IDs.

## Other declarations to expect

- **Health apps declaration** (App content → Health apps): fitness and health tracking; no medical device claims (the app says it isn't medical advice).
- **Target audience**: 18+ (the app is not designed for children).
- **Ads**: the app contains no ads.

## Before switching on App Check (reCAPTCHA)

reCAPTCHA sends device and usage signals to Google to tell people from bots. When `APP_CHECK_SITE_KEY` is set, add **Device or other IDs: Collected, Required, purpose Fraud prevention, security and compliance** here, and add a line about reCAPTCHA to the privacy policy.
