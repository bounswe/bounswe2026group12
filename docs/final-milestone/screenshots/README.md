# Final Milestone — Screenshots

This folder holds the screenshots referenced from the wiki page
[`Progress Based on Teamwork`](https://github.com/bounswe/bounswe2026group12/wiki/Progress-Based-on-Teamwork)
section 4.4. Each PNG corresponds to one row in the screenshots table.

## Capture instructions

All screenshots are captured against the production deploy at
[https://genipe.app](https://genipe.app) (web) and the signed APK attached to
the [`final-milestone`](https://github.com/bounswe/bounswe2026group12/releases/tag/final-milestone)
release (mobile). Use the seeded `demo@genipe.app / demo-password` account
for both surfaces (see project [`README.md`](../../../README.md#default-credentials)).

| # | File | Surface | Capture target |
|---|---|---|---|
| 1 | `home-redesign.png` | Web | `/` — region map + weekly rails + feedback bar + closing banner |
| 2 | `calendar-single-month.png` | Web | `/calendar` with a single month filter active |
| 3 | `calendar-lunar-bucket.png` | Web | `/calendar` showing the "Lunar / movable feasts" panel |
| 4 | `search-toggle-pills.png` | Web | `/search` with two diet pills toggled on |
| 5 | `recipe-detail-actions.png` | Web | `/recipes/<id>` showing star rating + bookmark + "I Tried This" |
| 6 | `passport-web-stamps.png` | Web | `/users/<me>/passport` — Stamps tab |
| 7 | `passport-mobile.png` | Mobile | PassportScreen — stamps grid + cultures + world map |
| 8 | `heritage-map.png` | Web | `/heritage/<group>/map` — 🏛 centre with radiating arrows |
| 9 | `region-detail-sheet.png` | Mobile | Map Discovery → region tap → bottom sheet |
| 10 | `floating-chat-tray.png` | Web | any page with the chat tray expanded |
| 11 | `cultural-highlight-detail.png` | Web | `/highlights/<slug>` — Read more landing |
| 12 | `did-you-know-mobile.png` | Mobile | RecipeDetail → Did You Know cards + ingredient migration overlay |

## Why this folder is mostly empty in the repo

GitHub renders inline images that are embedded via wiki page editor uploads
or attached to GitHub Issues. Final-submission images are uploaded directly
on the wiki page (`Progress Based on Teamwork` § 4.4) using GitHub's
image-attachment editor. This folder remains as the canonical filename
contract so the wiki references can be made authoritative if a reviewer
prefers the in-repo path. To add a file: capture per the table, save with
the exact filename, commit, then update the wiki link.
