# Signed APK build

The Genipe mobile app is a managed Expo project (no `android/` directory in the
repo). Android builds are produced by [EAS Build](https://docs.expo.dev/build/introduction/),
which also owns the signing keystore. Every APK that comes out of EAS is signed.

## Where the signing keystore lives

The upload/release keystore is stored as **managed credentials** in the EAS
project (`projectId` in `app/mobile/app.json`). EAS generated it on the first
Android build and reuses it for every subsequent build, so APKs are reproducibly
signed with the same certificate. Nothing keystore-related is committed to the
repo and there are no keystore secrets in GitHub Actions; the only secret the CI
needs is `EXPO_TOKEN` (an Expo access token).

To inspect or rotate the credentials: `cd app/mobile && eas credentials`.

## CI pipeline

`.github/workflows/mobile-apk.yml` (`Mobile APK (EAS)`):

1. Runs on push to `main` and on manual `workflow_dispatch`.
2. `npm ci` in `app/mobile`, then `eas build --platform android --profile preview --non-interactive --wait`.
   The `preview` profile in `app/mobile/eas.json` uses `distribution: internal`
   and `android.buildType: apk`, so the output is a directly installable `.apk`
   (not an `.aab`).
3. Best-effort: downloads the finished build artifact (`eas build:list ... --json`
   → `buildUrl`) as `app-release.apk` and uploads it as a GitHub Actions artifact
   named `app-release.apk`.
4. Writes the EAS build URL to the job summary.
5. If dispatched manually with the `attach_to_release` input checked, also runs
   `gh release upload <latest-tag> app-release.apk --clobber` to attach the APK
   to the latest GitHub release.

## How to trigger a build

- **Automatically:** any push to `main` triggers it.
- **Manually (release candidate):** GitHub → Actions → `Mobile APK (EAS)` → *Run
  workflow*. Tick `attach_to_release` if you also want the APK attached to the
  latest release.

## Where reviewers download the APK

- **GitHub Actions artifact:** open the latest `Mobile APK (EAS)` run → Artifacts
  → `app-release.apk`.
- **EAS dashboard:** the build URL printed in the job summary links to the build
  page on `expo.dev`, which has a download button and a QR code.
- **GitHub release:** if the build was dispatched with `attach_to_release`, the
  APK is attached to the latest release on the Releases page.

## Verifying the signature

```bash
# unzip the artifact first if needed
apksigner verify --print-certs app-release.apk
```

This prints the signing certificate (subject, SHA-256 digest, etc.). All APKs
from the same EAS keystore share one certificate, so the digest should be stable
across builds. `apksigner` ships with the Android SDK build-tools; alternatively
`keytool -printcert -jarfile app-release.apk` works without the SDK.
