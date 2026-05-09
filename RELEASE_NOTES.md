# Release Notes

genipe.app — Cross-Generational Recipe & Food Heritage Platform.

Two named builds so far: the MVP cut on 2026-04-07 (tag
[`v1.0-mvp`](https://github.com/bounswe/bounswe2026group12/releases/tag/v1.0-mvp))
and the Final demo build on 2026-05-14. Issue numbers reference
[bounswe/bounswe2026group12](https://github.com/bounswe/bounswe2026group12)
and link to the closed issue or merging PR.

## Final — 2026-05-14

**Theme:** Domain-aware search, ingredient conversion + substitution engine,
story-centric feed, social interaction (comments, upvotes, contact-author),
moderation queue, and production deploy hardening.

### Highlights

- Domain-aware recipe search with rich filters (#346, #347, #389).
- Ingredient hierarchy with substitution suggestions and a generic
  `/convert` API backed by a per-ingredient density table (#362, #363,
  #366, #374, #375, #376).
- Story-centric data model and feed (#379, #380), event + cultural-context
  Explore surface (#386, #387, #388), and map discovery backend (#381).
- Comments and Q&A on recipes, helpful/upvote, and contact-author messaging
  (#332, #334, #335, #336, #337, #338, #339, #340, #341, #342).
- Cultural onboarding, preference-driven personalization, and a daily
  cultural content surface (#343, #344, #345, #348, #350).
- Moderation queue covering ingredient, unit, and dietary-tag user
  submissions (#361).
- Server-side edit-enforcement audit closing the gap that previously let
  non-authors edit content via direct API calls (#360).
- Notification infrastructure (FCM/APNs + in-app delivery) wired across
  web, mobile, and backend (#349).

### Backend (M4–M6)

- Comments / Q&A schema and API (#332).
- Creator notification on new question, reply notification to asker
  (#335, #336).
- Helpful / upvote backend (#337).
- Messaging data model and API (#339).
- Contactability toggle plumbing (#342).
- Cultural onboarding schema (#343).
- Preference-driven personalization signals (#345).
- Rich filter API (#346).
- Daily cultural content backend (#348).
- Notification infrastructure (#349).
- Ingredient hierarchy model and substitution seed/API (#362, #363, #366).
- Conversion engine, density table, and `/convert` endpoint (#374, #375,
  #376).
- Dynamic shopping list (#373).
- Story-centric data model (#379).
- Map discovery backend (#381).
- Event-based Explore backend (#386), event + cultural context combination
  (#388), domain-aware search (#389).
- Realistic mock data seed (#390).
- Cultural tag moderation (#391).
- Search latency budget (≤ 2 s) enforced via tests in
  `app/backend/apps/search/tests_perf.py` (#355).
- Dropdown latency budget (≤ 1 s) enforced via tests in
  `app/backend/apps/recipes/tests_dropdown_perf.py` (#356).
- Save/update latency budget (≤ 2 s) enforced via tests in
  `app/backend/apps/recipes/tests_save_perf.py` (#357).
- Unique IDs across recipes and stories (#358).
- Recipe ↔ story referential integrity (#359).
- Server-side edit enforcement audit and gap fixes (#360, PR #486).
- Moderation queue for user submissions (ingredient, unit, dietary tag)
  with submit / approve / reject endpoints (#361, PR #487).

### Frontend (web, M4–M6)

- Comment UI on recipes (frontend half of #332).
- Helpful / upvote UI (#338).
- Contact-author button and messaging screen (#340).
- Contactability toggle UI (frontend half of #342).
- Cultural onboarding UI (#344).
- Preference-driven personalization surfaces (#345).
- Rich filter UI (#347).
- Daily cultural content UI (#350).
- Profile navigation from recipe and story cards (#351).
- Story-centric feed and detail view (#380).
- Event-based Explore UI (#387).
- Domain-aware search wiring (#389).
- Cultural tag moderation UI (#391).

### Mobile (M4–M6)

- Comment UI on recipes (#334).
- Notification handling for new questions and replies (#335, #336).
- Helpful / upvote UI (#338).
- Contact-author button and messaging screen (#341).
- Contactability toggle UI (frontend half of #342).
- Cultural onboarding UI (#344).
- Rich filter UI (#347).
- Daily cultural content UI (#350).
- Profile navigation from cards (#351).
- Story-centric feed and detail (#380).
- Event-based Explore UI (#387).
- Unit toggle UI (#378).
- Palette swap and accessibility fixes on Profile and Messages (#418, #456).

### Performance budgets

All three are enforced as test cases that fail the build if they regress.

| Surface | Budget | Test file | Issue |
|---|---|---|---|
| Search | ≤ 2 s | `app/backend/apps/search/tests_perf.py` | #355 |
| Dropdown lookups | ≤ 1 s | `app/backend/apps/recipes/tests_dropdown_perf.py` | #356 |
| Recipe save/update | ≤ 2 s | `app/backend/apps/recipes/tests_save_perf.py` | #357 |

### Infrastructure and DevOps

- CI test pipeline gating backend + frontend tests on every PR (#469,
  PR #477).
- CI coverage reporting in the GitHub Actions Summary (PR #479).
- `docker-compose.prod.yml` overlay with HTTPS via nginx + Let's Encrypt
  and container-level healthchecks for `db`, `backend`, `web` (#368,
  PR #485).
- Production bring-up runbook and CORS / `--force-recreate` fix that
  unblocked the cutover (PR #476).
- Mobile signed APK build workflow (`.github/workflows/mobile-apk.yml`).
- Web auto-deploy on push to `main`
  (`.github/workflows/deploy-web.yml`).

### Cross-cutting fixes carried into Final

- TD-03 — Authentication race conditions on web + mobile (#394).
- TD-06 — CI test pipeline (#469).
- Recipes seed migrations no longer collide on UNIQUE in test DB (#419).

### Known gaps at Final cut

Tracked in Milestone 6 and Milestone 5 as still-open at the time of
writing; targeted for the post-final iteration:

- M6-01 typography + contrast audit, M6-02 keyboard navigation, M6-03
  elderly-friendly recipe edit flow (#352, #353, #354).
- M6-11 auto-save draft & restore (#364), M6-12 signed APK release
  (#365), M6-13 production web deploy umbrella (#367).
- Web map discovery UI (#382), mobile map discovery UI (#383), region
  surfacing and theming (#384, #385).
- Web substitution UI (#370), web unit toggle UI (#377),
  available-ingredient check-off (#372).

## MVP — 2026-04-07

Tag: [`v1.0-mvp`](https://github.com/bounswe/bounswe2026group12/releases/tag/v1.0-mvp).

**Theme:** Foundation. Guests can browse the platform, registered users
can author recipes and stories, basic keyword + region search works
end-to-end across web and mobile.

### Highlights

- Auth (register, login, JWT refresh, protected routes) on web and mobile.
- Recipe CRUD with ingredient + unit dropdowns and a custom-submission
  fallback.
- Story CRUD with a linked-recipe preview card.
- Keyword + region search that returns recipes and stories with a friendly
  empty state.
- Vultr deploy of the backend and web frontend at
  [genipe.app](https://genipe.app).

### Milestone 1 — Foundation & Authentication

Requirements 3.0.1, 3.0.2, 3.1.1–3.1.4. 27 issues closed, including:

- Auth database schema (#149), auth API endpoints (#151), endpoint
  protection (#157).
- Public endpoints (#147), public routing on web (#145).
- Auth UI flows, state management, and protected routes on web (#153,
  #154, #155).
- Initial mobile app setup (#192) and initial web setup (#194).
- Test database seed script (#178).
- Vultr + Nginx + SSL deploy of `genipe.app` (#195).
- JWT middleware exception logging fix (#251).

### Milestone 2 — Core Recipe Features

Requirements 3.2.1–3.2.11, 3.6.1–3.6.8, 3.7.1–3.7.6. 38 issues closed,
including:

- Recipe creation API (#156), edit API + author-only authorization (#161).
- Lookup APIs for ingredients and units (#143), custom-submission API
  for items not in the dropdown (#144).
- Media storage setup (#150).
- Web + mobile selection UI (#146, #226, #227), creation UI (#158, #224,
  #225), recipe detail view (#159, #222, #223), edit UI (#162, #220,
  #221), author-only visibility (#163, #218, #219), success notifications
  (#165, #216, #217), Q&A toggle (#166, #214, #215).
- Backend test coverage for recipes and authentication (#174, #175).

### Milestone 3 — Search & Stories

Requirements 3.3.1–3.3.9, 3.5.1–3.5.6. 30 issues closed, including:

- Search & filter API (#148).
- Story database schema (#168) and story API (#169).
- Web + mobile search UI (#152, #212, #213), results display (#160, #210,
  #211), empty state (#164, #208, #209).
- Story creation UI (#170, #206, #207), recipe linking inside story
  creation (#171, #204, #205), story detail view (#172, #202, #203).
- Backend test coverage for search and story endpoints (#177).

### Infrastructure at MVP

- Single `docker-compose.yml` running `db` + `backend` + `web` on the
  Vultr box.
- Nginx + Let's Encrypt SSL terminating at `genipe.app`.
- Manual deploy via SSH at MVP cut; auto-deploy workflow followed in M5.
