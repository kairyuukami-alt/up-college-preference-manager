# VidyaSaarthi Android App

Native Android shell for:
https://vidyasaarthi-the-app.kairyuukami.chatgpt.site/

## Included
- App name: VidyaSaarthi
- Package: `com.vidyasaarthi.app`
- Min SDK: 24 (Android 7.0)
- Target / Compile SDK: 36 (Android 16)
- Native Home and Refresh controls
- Native offline/error screen and retry
- Android back-button navigation through site history
- File-upload support through Android's document picker
- External links open outside the embedded counselling workspace
- HTTPS-only cleartext policy, Safe Browsing, no JavaScript bridge
- Session cookies and DOM storage for the existing login flow

## Build locally
Open the `android-app` folder in Android Studio. Use Gradle 8.13 and Android SDK 36, then build an APK or signed AAB.

## Automated GitHub build
The repository branch includes `.github/workflows/build-vidyasaarthi-android.yml`. Run that workflow from GitHub Actions to compile a debug APK without setting up Android Studio locally.

## Before Google Play release
- Replace the included simple launcher icon with the final production icon if desired.
- Publish a public Privacy Policy because the product handles student/profile/document data.
- Complete Play Console Data safety, app access/test-login, content rating, target audience and privacy disclosures accurately.
- Test student/admin login, document upload, generated PDF/download behavior and external links on multiple Android versions.

## Website updates
The app loads the live site, so most website UI/content/logic changes appear inside the app automatically without a new APK. Native-shell changes still require a new app release.
