# On-device APK manual test suite (Genipe mobile)

Pre-release manual test suite for the Genipe Android app. A human runs this on a
real Android device against a freshly installed APK before each release
candidate (RC) is tagged. Tracks issue #396 (TD-05).

The app is an Expo SDK 54 / React Native 0.81 build. Android package
`com.bounswe.group12.mobile`. Source under `app/mobile/`.

---

## 1. Purpose and when to run

- Run this suite **before tagging each release candidate** (e.g. `v1.0-final-rc1`).
  It is the manual gate that complements the automated Jest suite under
  `app/mobile/__tests__/`; the automated suite does not exercise a real device,
  the Play-side install path, maps, or the camera/photo picker.
- **Who runs it:** the mobile or DevOps owner cutting the RC, plus at least one
  other tester on a different device class (see the device matrix below). Each
  physical device row should be signed off by a real person, not an emulator.
- **Where results are recorded:** fill in the **Results log** table at the
  bottom of this file in the same PR/commit that tags the RC, and link that
  commit from the RC's GitHub release notes. If the suite is run for a milestone
  demo, also reference the run from the milestone report (see
  `docs/MVP_BUILD_NOTES.md` for the build/tag convention).
- A run is **only valid against a freshly installed APK** (uninstall any prior
  build first). Upgrade-over-existing is a separate, optional check, not the
  baseline.

---

## 2. Prerequisites

### Get the signed APK

The APK is produced by the `Mobile APK (EAS)` GitHub Actions workflow
(`.github/workflows/mobile-apk.yml`), which runs on every push to `main` and
calls `eas build --platform android --profile preview`. To obtain the build to
test:

1. Open the latest successful run of **Mobile APK (EAS)** in the repo's Actions
   tab.
2. Download the `app-release.apk` artifact attached to that run. If the
   best-effort artifact step did not attach a file, open the run's job summary,
   copy the **APK URL**, and download from the EAS dashboard
   (`https://expo.dev/accounts/.../projects/group12-mobile/builds`).
3. Note: the `preview` profile does not set `EXPO_PUBLIC_API_URL`, so the APK
   talks to the production backend at `https://genipe.app` (see
   `app/mobile/src/config/apiBase.ts`). If you need it pointed at staging,
   produce a separate build with that env var set. Record the backend URL the
   tested APK actually uses in the results log.

### Install on the device

```bash
# device connected over USB with developer options + USB debugging on
adb devices                     # confirm the device shows up
adb uninstall com.bounswe.group12.mobile   # remove any prior build
adb install -r app-release.apk
```

Sideload alternative: transfer the `.apk` to the device, enable "install
unknown apps" for the file manager, tap to install.

### Test account

You need a working backend account on the URL the APK points at. Use a
throwaway account, not a personal one.

| Field | Value |
|---|---|
| Username | `___________` |
| Email | `___________` |
| Password | `___________` |
| A second account (for messaging tests) | `___________` |

Registration during the smoke run can create the first account; the second
account must exist beforehand for the inbox/thread checks.

---

## 3. Device coverage matrix

Target set for a full RC sign-off. The first three rows are physical devices and
must be covered by a human; the emulator row is a convenience smoke only and does
not by itself satisfy the acceptance criteria. `app/mobile/app.json` does not
override `minSdkVersion`, so the build inherits the Expo SDK 54 default
(**Android 7.0, API 24**); confirm the effective `minSdkVersion` on the EAS build
page and update the "min supported" row if it differs.

| Class | Device (example) | Android version | Screen / density | Chipset (ABI) | Role | Status | Tester | Date |
|---|---|---|---|---|---|---|---|---|
| Recent flagship | Google Pixel 8 / 8a | Android 15 | ~6.1-6.2 in, 1080x2400 | arm64-v8a | Newest OS path | ☐ | | |
| Mid-range, large | Samsung Galaxy A54 / A55 | Android 13-14 (One UI) | ~6.4 in, 1080x2340 | arm64-v8a | OEM skin, common in the wild | ☐ | | |
| Older / min support | Samsung Galaxy A10s or similar | Android 11-12 | ~6.2 in, 720x1560 (hdpi) | arm64-v8a | Lowest still-supported OS, low RAM | ☐ | | |
| Min SDK reference | Any device or AVD on **API 24 (Android 7.0)** | Android 7.0 | any | arm64-v8a | Confirms app launches at declared `minSdkVersion` | ☐ | | |
| Emulator (smoke only) | Android Studio AVD, Pixel profile | Android 14/15 | as configured | x86_64 or arm64 | Quick pre-flight, not a sign-off device | ☐ | | |

Add a row per additional device a tester actually used. Mark `Status` as Pass /
Fail / Blocked once the smoke + regression checklists below are complete on that
device.

---

## 4. Smoke checklist

Run in order on each physical device. Each step is `action -> expected result`.
Tick the box only if the expected result is observed.

| # | Area | Action | Expected result | Pass |
|---|---|---|---|---|
| 1 | Launch / splash | Cold-start the freshly installed app | Splash screen shows, then the bottom tab bar (Feed / Share / Profile) with the Feed tab active. No crash, no blank white screen hanging past a few seconds | ☐ |
| 2 | Home feed loads | Stay on the Feed tab | Home shows a search box, a notification bell, a daily-cultural section, a recommendations rail, and recipe + story content. Pull down to refresh: spinner appears, content reloads | ☐ |
| 3 | Browse recipe list -> detail | Scroll the recipe content on Home; open a recipe | Recipe detail opens with title, image, ingredients, steps, star rating control, bookmark button, and a comments / Q&A area. Back returns to Home | ☐ |
| 4 | Browse story | Open a story from Home (or via a recipe's linked stories) | Story detail opens with title, body, and any linked recipe card sized normally (not a stretched/blown-out thumbnail) | ☐ |
| 5 | Search | Tap the search box on Home, enter a term, submit | Search screen shows matching recipes/stories; opening a result works | ☐ |
| 6 | Map / region discovery | From Home navigate to the map discovery screen; tap a region marker | Map renders with sized region markers; tapping focuses the camera and shows that region's recipes/stories. Zoom in/out controls work. Heritage map (if reachable): markers render and the bottom sheet scrolls without the map stealing the touch | ☐ |
| 7 | Register | Profile tab or Share tab -> Register; create a new account | Account is created, the app lands signed-in (Profile tab shows the username) | ☐ |
| 8 | Logout then login | Profile tab -> Log out; then log in with the account from step 7 (or the test account) | Logout returns the app to the signed-out state (Share tab shows "Sign in to share"). Login succeeds and the username reappears on the Profile tab | ☐ |
| 9 | JWT refresh on relaunch | While signed in, fully close the app (swipe from recents) and cold-start it again | App reopens still signed in; no forced re-login, no crash. (If the access token had expired, it is silently refreshed.) | ☐ |
| 10 | Create recipe (if reachable) | Share tab (signed in) -> start a recipe; or Feed -> New recipe | The recipe authoring screen opens (ingredient/unit selection UI). If a publish path is present, a created recipe appears under "My recipes" on the profile | ☐ |
| 11 | Create story (if reachable) | Share tab (signed in) -> start a story | The story create form opens and accepts input; a created story appears under "My stories" | ☐ |
| 12 | Messaging / inbox thread | Profile tab -> Messages (Inbox); or open another user's profile -> Message; open a conversation, send a message | Inbox lists threads; the thread screen opens and shows messages; sending a message adds it to the thread (see regression row R4 for the known #427 risk) | ☐ |
| 13 | Profile screen | Profile tab -> tap the identity header / "My recipes" | The user profile screen opens showing the user's recipes, stories, and saved-recipes tabs; the contactability ("allow messages") toggle is visible on your own profile | ☐ |
| 14 | Notifications | Tap the notification bell on Home (or Profile -> any notifications entry) | Notifications screen opens and renders a list (or an empty state); unread count badge behaves sensibly | ☐ |
| 15 | Bookmark a recipe | On a recipe detail, tap the bookmark/save icon; go to Profile -> Saved recipes | The recipe shows as saved on the detail screen and appears in the Saved recipes tab. Un-bookmark removes it | ☐ |
| 16 | Cultural onboarding / preferences | Profile -> Cultural preferences | The onboarding/preferences screen opens and can be navigated/saved without crashing | ☐ |
| 17 | Background / resume | Send the app to the background (home button), open another app, return | App resumes on the same screen, no crash, no reload-to-login | ☐ |
| 18 | Rotation / layout | Device left in portrait (app is portrait-locked); check a long screen scrolls fully | No content clipped behind the status bar or nav bar; long screens scroll to the end | ☐ |

---

## 5. Regression checklist

Re-verify these known past bugs on at least one physical device per RC. Source
issues/PRs noted for traceability.

| ID | Issue / PR | What to check | Pass / Fail / N/A |
|---|---|---|---|
| R1 | #405 (closed, PR #778): mobile JWT `token_not_valid` 401 handling | With a stale/expired session, relaunch or hit an authed screen: the app refreshes the token silently if possible, or logs out gracefully (lands on signed-out state, no crash, no infinite spinner) | ☐ |
| R2 | #770 (backend, closed) + PR #773: paginated list dedupe | Scroll the recipe list and the story list well past the first page boundary: no recipe/story card appears twice | ☐ |
| R3 | #450 (open): contactability toggle reverts on save (stale closure) | On your own profile, flip the "allow messages" toggle, let it save, then leave and return to the profile: the new value persisted. If it still reverts, the bug is unfixed, record as Fail and reference #450 | ☐ |
| R4 | #427 (open): send message returns 404 in MessageThread | Open a conversation and send a message: it posts successfully and appears in the thread. If you get a 404 / "could not send", the bug is unfixed, record as Fail and reference #427 | ☐ |
| R5 | #667 + follow-ups: heritage map markers and bottom sheet on Android | Open the heritage map: region markers render (not invisible, not square-clipped blobs), polylines fan out, and the bottom sheet scrolls with its own gestures instead of the map eating the touch | ☐ |
| R6 | #474 (open): map discovery UX | On the map discovery screen: marker badges are sized, tapping a region animates the camera to it, the region search pill works | ☐ |
| R7 | PR #768: linked story preview card thumbnail height | On a recipe with linked stories, the linked-story card thumbnail is a small square, not stretched to the image's natural height | ☐ |
| R8 | #708 / #710: bookmarks + Saved tab reachable | "My profile" / Saved-recipes tab is reachable from the Profile tab, and a bookmarked recipe shows up there | ☐ |
| R9 | #735 / #738: star rating UI | The star rating control renders on recipe detail and on recipe cards, and tapping a star registers a rating when signed in | ☐ |

If a new bug is fixed between this RC and the next, add a row here referencing
its issue number so it stays covered.

---

## 6. Exit criteria

The RC may be tagged when:

- Every smoke-checklist step (section 4) passes on **all physical-device rows**
  of the device matrix, including the min-SDK reference. The emulator row is not
  sufficient on its own.
- Every regression row (section 5) is Pass or a documented, accepted N/A. An
  open-known bug (R3 #450, R4 #427) found still broken is a **release decision**:
  it ships only if the team explicitly accepts it in the RC notes; otherwise it
  is a blocker.
- No crash on launch, login, logout, or relaunch on any tested device.
- The Results log table below is filled in for this RC.

How to file a blocker:

- Open a GitHub issue with label `area: frontend` (and `area: devops` if it is a
  build/install problem), title prefixed `[mobile RC blocker]`, body containing:
  the RC tag attempted, the device + Android version, the smoke/regression step
  that failed, exact reproduction steps, and a screen recording or screenshot.
- Link the issue from the RC's results-log "Notes" cell and set the verdict to
  **Blocked**. Do not tag the RC until the blocker is resolved or formally
  waived.

---

## 7. Results log

One row per device per RC run. Copy the block for each new RC.

**RC tag:** `__________`  |  **APK build / EAS URL:** `__________`  |  **Backend URL the APK uses:** `__________`

| Date | Tester | Device / Android version | Smoke pass count (/18) | Regression pass count (/9) | Notes / blocker links | Verdict (Pass / Blocked) |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |

**RC sign-off:** RC `__________` approved for tagging on `__________` by `__________` (all physical-device rows Pass, regressions accepted).
