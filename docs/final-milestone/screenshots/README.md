# Final Milestone — Screenshots

This folder holds the screenshots referenced from the wiki page
[`Progress Based on Teamwork`](https://github.com/bounswe/bounswe2026group12/wiki/Progress-Based-on-Teamwork)
section 4.4. Each PNG corresponds to one row in the screenshots table.

## Capture instructions

Web screenshots are captured with Playwright against the production deploy
at [https://genipe.app](https://genipe.app) using the seeded `Cred User2`
account (see project [`README.md`](../../../README.md#default-credentials)).
Viewport is 1440×900 and full-page mode is on.

| # | File | Surface | Captured | Capture target |
|---|---|---|---|---|
| 1 | `home-redesign.png` | Web | ✅ | `/` — region map + weekly rails + feedback bar + closing banner |
| 2 | `calendar-full-year.png` | Web | ✅ | `/calendar` — twelve-month grid with legend |
| 3 | `calendar-single-month.png` | Web | ✅ | `/calendar` with single-month filter (March) |
| 4 | `search-toggle-pills.png` | Web | ✅ | `/search?q=baklava` with Vegan + Vegetarian dietary pills toggled on (`aria-pressed`) |
| 5 | `recipe-detail-actions.png` | Web | ✅ | `/recipes/195` — star rating + bookmark + "I Tried This" |
| 6 | `passport-web-stamps.png` | Web | ✅ | `/users/sarah` — passport with stamps |
| 7 | `heritage-map.png` | Web | ✅ | `/heritage/6/map` — Dumplings of the Silk Road heritage map |
| 8 | `floating-chat-tray.png` | Web | ✅ | Home with the floating Messages chat tray expanded |
| 9 | `passport-mobile.png` | Mobile | ⏳ | PassportScreen — stamps grid + cultures + world map. Must be captured from the signed APK. |
| 10 | `region-detail-sheet.png` | Mobile | ⏳ | Map Discovery → region tap → bottom sheet. APK capture. |
| 11 | `did-you-know-mobile.png` | Mobile | ⏳ | RecipeDetail → Did You Know cards + ingredient migration overlay. APK capture. |

## Reproducing captures

```bash
# from repo root, requires Playwright (npx playwright install if missing)
python -m playwright install chromium       # one-off
# Web screenshots are taken with the Playwright MCP server during the wiki
# refresh. See the chat-history accompanying this PR for the exact tool
# invocations.
```

## Mobile pending

The three mobile entries are not yet committed because they require either
an Android emulator or a physical device running the signed APK. To add:

1. Install the APK from the [`final-milestone`](https://github.com/bounswe/bounswe2026group12/releases/tag/final-milestone) release.
2. Log in with `Cred User2`.
3. Capture the three screens listed above.
4. Save with the exact filenames in this folder.
5. Commit and update the wiki `Progress Based on Teamwork` § 4.4 table.
