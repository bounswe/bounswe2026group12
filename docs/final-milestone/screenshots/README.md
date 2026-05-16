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
| 9 | `profile-mobile.png` | Mobile | ✅ | Profile screen — Cultural Passport cover (Mustafa Ocak, Classic Traveler, Level 1) + stats bar + Stamps tab with Black Sea bronze story stamp |
| 10 | `passport-mobile.png` | Mobile | ✅ | Cultural Passport — Cultures tab showing Black Sea (bronze, 0 recipes) |
| 11 | `did-you-know-mobile.png` | Mobile | ✅ | Recipe detail — Did You Know cultural fact cards (Portuguese bacalhau, Jamon iberico, Spain tapas) |

## Reproducing captures

```bash
# from repo root, requires Playwright (npx playwright install if missing)
python -m playwright install chromium       # one-off
# Web screenshots are taken with the Playwright MCP server during the wiki
# refresh. See the chat-history accompanying this PR for the exact tool
# invocations.
```

## Mobile captures

The three mobile entries were captured on a physical Android device running the
signed APK from the [`final-milestone`](https://github.com/bounswe/bounswe2026group12/releases/tag/final-milestone)
release. Original WhatsApp-shared JPEGs were converted to PNG (1080×2280, ~330–550 KB).
