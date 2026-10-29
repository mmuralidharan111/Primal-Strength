# Primal Strength — Android app

The 12-week strength and cardio logger, packaged as an Android app you can sideload.

## Get the APK (no Android Studio needed)

1. Sign in at github.com and create a new **private** repository called `strength-log`.
2. On the empty repository page, click **uploading an existing file**.
3. Drag in everything from this folder, including the hidden `.github` folder. On a Mac, press Cmd+Shift+. in Finder to show it.
4. Click **Commit changes**.
5. Open the **Actions** tab. The "Build APK" job starts on its own and takes about 5 minutes.
6. When it shows a green tick, open **Releases** on the repository's main page and download `PrimalStrength-N.apk`.

Every time you change a file and commit, a new APK is built with a higher build number.

## Install on an Android phone

1. Send the APK to the phone (WhatsApp to yourself, Google Drive, email, or a USB cable).
2. Tap the file. Android asks you to allow installs from that app (Files, Chrome, WhatsApp). Allow it.
3. Play Protect may warn that the app is from an unknown developer. Tap **More details → Install anyway**.

Friends install the same way. iPhones can't sideload APKs; iPhone friends can use the web version link instead.

## Updating

Install a newer APK over the old one. The log is kept, because each build uses the same app ID (`com.strengthlog.app`) and the same debug signature from GitHub's build machine. If Android refuses the update with a signature error, uninstall the old app, then install the new one. Before you uninstall, use **Settings → Save full backup**, then restore it afterwards. Uninstalling deletes the log.

## Data

- Everything is stored on the phone, inside the app. Nothing is sent anywhere.
- **Settings → Save full backup** opens Android's share sheet. Save the file to Drive or send it to yourself.
- **Progress → Export for Claude review** produces a .json file you can upload into a Claude chat for a progress review.
- The app and the web version keep separate logs. To move a log between them, back up from one and restore into the other.

## Files

| Path | What it is |
| --- | --- |
| `www/index.html` | The whole app |
| `capacitor.config.json` | App name and ID |
| `assets/` | Icon and splash screen |
| `.github/workflows/build-apk.yml` | GitHub's build recipe |
