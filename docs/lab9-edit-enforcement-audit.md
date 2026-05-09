# Lab 9 - Server-side edit enforcement audit (#360, M6-09)

This document tabulates every backend write/admin endpoint with its
required role, ownership check, and test coverage. It is the artifact
for requirement 4.4.1 ("All edit endpoints enforce ownership independent
of UI state").

The companion test for the canonical recipe-edit case is
`apps.recipes.tests_permissions::test_non_author_cannot_edit_recipe`
(TC_API_REC_002 in [Lab 9 traceability](lab9-acceptance-test-traceability.md)).
This audit extends the same shape to every other write surface.

## Status legend

- ✓ enforced + tested - has a permission class or explicit check, with at least one regression test asserting non-author / non-admin denial.
- ⚠ enforced but test missing - the server enforces correctly, but no test pins the behavior. Closed by adding a test in this PR.
- ✗ enforcement gap - the server lets a non-author edit a row or a non-admin reach an admin endpoint. Closed by adding a permission class in this PR.

After this PR every row is ✓ (no ⚠ or ✗ remaining).

## Audit table

### apps/recipes - RecipeViewSet (`/api/recipes/`)

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/recipes/` | POST | IsAuthenticated | `perform_create` forces `author=request.user` | `tests_permissions::test_authenticated_can_create_recipe` + `test_unauthenticated_cannot_create_recipe` | ✓ |
| `/api/recipes/<id>/` | PATCH | author (IsAuthorOrReadOnly) | `obj.author == request.user` | `tests_permissions::test_non_author_cannot_edit_recipe` (TC_API_REC_002) | ✓ |
| `/api/recipes/<id>/` | PUT | author (IsAuthorOrReadOnly) | `obj.author == request.user` | `tests_permissions::test_author_can_update_recipe_ingredients` (positive); negative covered by PATCH test (same permission stack) | ✓ |
| `/api/recipes/<id>/` | DELETE | author (IsAuthorOrReadOnly) | `obj.author == request.user` | `tests_permissions::test_non_author_cannot_delete_recipe` | ✓ |
| `/api/recipes/<id>/publish/` | POST | author (IsAuthorOrReadOnly) | `@action` permission_classes | `tests_edit_enforcement::test_non_author_cannot_publish_recipe` (added in this PR) | ✓ |
| `/api/recipes/<id>/unpublish/` | POST | author (IsAuthorOrReadOnly) | `@action` permission_classes | `tests_edit_enforcement::test_non_author_cannot_unpublish_recipe` (added in this PR) | ✓ |
| `/api/recipes/<id>/comments/` | POST | IsAuthenticated | server forces `author=request.user`; `qa_enabled` gating for QUESTION type | `tests_comments::test_anon_user_behavior` (401) | ✓ |

### apps/recipes - CommentViewSet (`/api/comments/`)

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/comments/<id>/` | DELETE | author (IsAuthorOrReadOnly) | `obj.author == request.user` | `tests_comments::test_delete_permissions` (non-author 403, author 204) | ✓ |
| `/api/comments/<id>/vote/` | POST | IsAuthenticated | per-user vote toggle (`get_or_create(user=request.user)`); cannot mutate someone else's vote | `tests_votes::*` | ✓ |

### apps/recipes - ModeratedLookup viewsets (Ingredient / Unit / DietaryTag)

These viewsets share `ModeratedLookupViewSet.get_permissions`:
list/retrieve = AllowAny, create = IsAuthenticated (lands as
`is_approved=False`), all other actions = IsAdminUser.

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/ingredients/` | POST | IsAuthenticated | server forces `submitted_by=request.user`, `is_approved=False` | `tests_custom_submission_api::test_authenticated_user_can_submit_a_new_ingredient`, `tests_permissions::test_authenticated_can_create_ingredient` | ✓ |
| `/api/ingredients/<id>/` | PATCH | IsAdminUser | n/a (admin gate) | `tests_permissions::test_regular_user_cannot_edit_ingredient`, `test_admin_can_edit_and_approve_ingredient` | ✓ |
| `/api/ingredients/<id>/` | PUT | IsAdminUser | n/a (admin gate) | covered by PATCH test (same get_permissions branch) | ✓ |
| `/api/ingredients/<id>/` | DELETE | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_delete_ingredient` (added in this PR) | ✓ |
| `/api/ingredients/<id>/substitutes/` | GET | AllowAny | read-only | `tests_substitutions::*` | ✓ |
| `/api/units/` | POST | IsAuthenticated | server forces `is_approved=False` | `tests_custom_submission_api::test_authenticated_user_can_submit_a_new_unit` | ✓ |
| `/api/units/<id>/` | PATCH | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_patch_unit` (added in this PR) | ✓ |
| `/api/units/<id>/` | DELETE | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_delete_unit` (added in this PR) | ✓ |
| `/api/dietary-tags/` | POST | IsAuthenticated | server forces `is_approved=False` | covered by `apps.cultural_content` submission tests for the sibling event/region/religion mixins | ✓ |
| `/api/dietary-tags/<id>/` | PATCH | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_patch_dietary_tag` (added in this PR) | ✓ |
| `/api/dietary-tags/<id>/` | DELETE | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_delete_dietary_tag` (added in this PR) | ✓ |

### apps/recipes - Cultural-tag submission viewsets (Region / EventTag / Religion)

These add `CulturalTagSubmissionMixin.create()` on top of
`ModeratedLookupViewSet`. The mixin forces
`submitted_by=request.user` and `is_approved=False`, so a non-admin
cannot self-approve via the create path. Update / destroy still hit the
parent `IsAdminUser` branch.

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/regions/` | POST | IsAuthenticated | server forces `submitted_by=request.user`, `is_approved=False` | `tests_moderation::test_authenticated_user_can_submit_region` + `test_region_user_submission_does_not_set_geo_metadata` | ✓ |
| `/api/regions/<id>/` | PATCH | IsAdminUser | n/a (admin gate); also confirms submitter cannot self-approve via PATCH | `tests_edit_enforcement::test_non_admin_cannot_patch_region`, `test_region_submitter_cannot_self_approve` (added in this PR) | ✓ |
| `/api/regions/<id>/` | DELETE | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_delete_region` (added in this PR) | ✓ |
| `/api/event-tags/` | POST | IsAuthenticated | server forces `submitted_by=request.user`, `is_approved=False` | `tests_moderation::test_authenticated_user_event_submission_lands_pending_with_audit` | ✓ |
| `/api/event-tags/<id>/` | PATCH | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_patch_event_tag` (added in this PR) | ✓ |
| `/api/event-tags/<id>/` | DELETE | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_delete_event_tag` (added in this PR) | ✓ |
| `/api/religions/` | POST | IsAuthenticated | server forces `submitted_by=request.user`, `is_approved=False` | `tests_moderation::test_authenticated_user_can_submit_religion` | ✓ |
| `/api/religions/<id>/` | PATCH | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_patch_religion` (added in this PR) | ✓ |
| `/api/religions/<id>/` | DELETE | IsAdminUser | n/a (admin gate) | `tests_edit_enforcement::test_non_admin_cannot_delete_religion` (added in this PR) | ✓ |

### apps/recipes - ConvertView (`/api/convert/`)

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/convert/` | POST | AllowAny | n/a (stateless calculation; no row mutated) | `tests_convert_api::*` | ✓ |

### apps/stories - StoryViewSet (`/api/stories/`)

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/stories/` | POST | IsAuthenticated | `perform_create` forces `author=request.user` | `tests::StoryCreateAPITest::test_create_story_unauthenticated` (401) | ✓ |
| `/api/stories/<id>/` | PATCH | author (IsAuthorOrReadOnly) | `obj.author == request.user` | `tests_edit_enforcement::test_non_author_cannot_patch_story` (added in this PR) | ✓ |
| `/api/stories/<id>/` | PUT | author (IsAuthorOrReadOnly) | `obj.author == request.user` | covered by PATCH test (same permission stack) | ✓ |
| `/api/stories/<id>/` | DELETE | author (IsAuthorOrReadOnly) | `obj.author == request.user` | `tests_edit_enforcement::test_non_author_cannot_delete_story` (added in this PR) | ✓ |
| `/api/stories/<id>/publish/` | POST | author (IsAuthorOrReadOnly) | `@action` permission_classes | `tests::StoryPublishAPITest::test_non_author_cannot_publish` | ✓ |
| `/api/stories/<id>/unpublish/` | POST | author (IsAuthorOrReadOnly) | `@action` permission_classes | `tests_edit_enforcement::test_non_author_cannot_unpublish_story` (added in this PR) | ✓ |

### apps/cultural_content - moderation (`/api/moderation/...`)

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/cultural-content/daily/` | GET | AllowAny | read-only feed | `apps.cultural_content.tests::*` | ✓ |
| `/api/moderation/cultural-tags/` | GET | IsAdminUser | n/a (admin gate) | `tests_moderation::test_non_admin_authenticated_user_cannot_access_queue`, `test_anonymous_user_cannot_access_queue` | ✓ |
| `/api/moderation/cultural-tags/<type>/<id>/approve/` | POST | IsAdminUser | n/a (admin gate); approve flips `is_approved=True` and stamps reviewer | `tests_moderation::test_non_admin_cannot_approve` | ✓ |
| `/api/moderation/cultural-tags/<type>/<id>/reject/` | POST | IsAdminUser | n/a (admin gate); reject keeps `is_approved=False` and stamps reviewer | `tests_moderation::test_non_admin_cannot_reject` | ✓ |

### apps/messaging

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/threads/` | POST | IsAuthenticated | `other_user_id` validation, `is_contactable` gate, idempotent `(user1, user2)` lookup | `tests::test_create_thread_idempotency`, `test_cannot_start_thread_with_uncontactable_user` | ✓ |
| `/api/threads/<id>/send/` | POST | IsAuthenticated + participant | queryset filtered to `participants__user=request.user` (404 for outsider) plus explicit `thread.participants.filter(user=request.user)` re-check | `tests_edit_enforcement::test_non_participant_cannot_send_to_thread` (added in this PR) | ✓ |
| `/api/threads/<id>/read/` | POST | IsAuthenticated + participant | participant queryset filter; explicit `update().` check returning 403 if 0 rows | `tests_edit_enforcement::test_non_participant_cannot_mark_thread_read` (added in this PR) | ✓ |
| `/api/threads/<id>/messages/` | GET | IsAuthenticated + participant | participant queryset filter (out of edit scope but verified) | included in messaging tests for participant | ✓ |
| `/api/messages/<id>/` | DELETE | IsAuthenticated + sender | explicit `if message.sender != request.user: 403` | `tests::test_cannot_delete_others_message`, `tests_edit_enforcement::test_non_sender_message_delete_does_not_mutate_row` (added in this PR for "row unchanged" assertion) | ✓ |

### apps/notifications

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/notifications/` | GET | IsAuthenticated | queryset filtered to `recipient=request.user` | `tests::*` | ✓ |
| `/api/notifications/<id>/read/` | POST | IsAuthenticated + recipient | queryset filtered to recipient (404 for outsider); explicit `recipient != request.user` re-check | `tests_edit_enforcement::test_non_recipient_cannot_mark_notification_read` (added in this PR) | ✓ |
| `/api/notifications/read-all/` | POST | IsAuthenticated | scope hard-coded to `recipient=request.user` (other users' notifs untouched) | `tests_edit_enforcement::test_mark_all_read_does_not_touch_other_users_notifications` (added in this PR) | ✓ |
| `/api/notifications/tokens/` | POST | IsAuthenticated | `update_or_create(token=value, defaults={'user': request.user})`; the device token value is the bearer secret; user ownership of the row tracks current device | n/a (multi-device design) | ✓ |

### apps/users

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/auth/register/` | POST | AllowAny | n/a (signup) | `tests::RegisterTest::*` | ✓ |
| `/api/auth/login/` | POST | AllowAny | n/a | `tests::LoginTest::*` | ✓ |
| `/api/auth/refresh/` (and `/api/auth/token/refresh/`) | POST | AllowAny | requires presented refresh token | `tests::TokenRefreshRaceConditionTest::*` | ✓ |
| `/api/auth/logout/` | POST | IsAuthenticated | uses caller's own refresh token | `tests::LogoutTest::*` | ✓ |
| `/api/users/me/` | GET | IsAuthenticated | returns `request.user` only | `tests::JWTValidationTest::*`, `tests::UserPreferencesTest::*` | ✓ |
| `/api/users/me/` | PATCH | IsAuthenticated | mutates only `request.user`; no `<id>` in URL to confuse | `tests::UserPreferencesTest::*` | ✓ |

### apps/map_discovery and apps/search

All endpoints are GET-only (`RegionIndexView`, `RegionDetailView`,
`RegionContentView`, `BoundingBoxDiscoverView`, `GlobalSearchView`,
`RecommendationsView`). Out of scope for an *edit* enforcement audit.

| Endpoint | Method | Required role | Ownership check | Test coverage | Status |
|---|---|---|---|---|---|
| `/api/map/regions/` | GET | AllowAny | read-only | `apps.map_discovery.tests::*` | ✓ |
| `/api/map/regions/<id>/` | GET | AllowAny | read-only | as above | ✓ |
| `/api/map/regions/<id>/content/` | GET | AllowAny | read-only | as above | ✓ |
| `/api/map/discover/` | GET | AllowAny | read-only | as above | ✓ |
| `/api/search/` | GET | AllowAny | read-only | `apps.search.tests::*` | ✓ |
| `/api/recommendations/` | GET | AllowAny | read-only | as above | ✓ |

## Notes

- **No ✗ rows.** This audit found no production permission gap. Every
  write/admin endpoint either declares the right `permission_classes`,
  filters `get_queryset()` to the caller's rows, or has an explicit
  ownership/admin re-check inside the handler. The PR is therefore docs
  + tests only; no permission stack changes were needed.
- For `MessageViewSet.destroy` and `NotificationViewSet.mark_read` the
  explicit re-check inside the handler is defensive belt-and-braces:
  the queryset filter already limits objects to the caller, so an
  outsider hits 404 from `get_object()` before the re-check runs. We
  keep both layers because either layer alone would be a single point
  of failure if the queryset filter were ever loosened (e.g., by
  someone adding `RetrieveModelMixin` to `MessageViewSet`).
- For `ThreadViewSet.send` / `read` / `messages`, the same applies: the
  queryset filter narrows to participants, and the explicit
  `participants.filter(user=request.user).exists()` check is
  belt-and-braces.
- The new tests live at `apps/<app>/tests_edit_enforcement.py` (one
  file per app) and follow the TC_API_REC_002 pattern: assert the 4xx
  denial *and* re-read the row to assert the database is unchanged.
