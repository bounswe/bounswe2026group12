# Lab 9 - Backend acceptance test traceability

This document maps each TC_API_* test ID from the [Lab 9 Report](https://github.com/bounswe/bounswe2026group12/wiki/Lab-%239-Report)
to the actual test method that backs it. Every test here carries an in-source docstring with the same TC_API_* ID and requirement IDs.

| TC_API_* | Designer | File | Class::Method | Requirements | Status |
|---|---|---|---|---|---|
| TC_API_AUTH_001 | Ahmet Akdag | apps/users/tests.py | LoginTest::test_login_success | 3.0.2, 3.1.1 | Pass (gap-filled) |
| TC_API_REC_002 | Ufuk Altunbulak | apps/recipes/tests_permissions.py | PermissionTests::test_non_author_cannot_edit_recipe | 3.2.5, 4.4.1 | Pass (gap-filled) |
| TC_API_ING_003 | Ahmet Ayberk Durak | apps/recipes/tests_custom_submission_api.py | CustomSubmissionApiTests::test_ingredient_pending_then_approved_flow | 3.7.4, 4.4.2 | Pass (gap-filled) |
| TC_API_STORY_004 | Emirhan Simsek | apps/stories/tests.py | StoryCreateAPITest::test_create_story_with_linked_recipe_legacy | 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.3.9 | Pass (gap-filled) |
| TC_API_QA_005 | Uygar Apan (gh: roboticrustacean) | apps/recipes/tests_comments.py | CommentQuestionAPITests::test_qa_enabled_logic | 3.4.1, 3.2.1 | Pass (gap-filled) |

## Notes on path divergence

Lab 9's report cites file paths under hypothetical apps (`apps/ingredients/...`, `apps/comments/...`, `apps/users/tests/`).
The actual app structure keeps Ingredient and Comment models inside `apps.recipes`, and `apps.users` uses a single
`tests.py`. The test methods named in this matrix carry docstring traceability so the Lab 9 commitment is verifiable
in source even where the path is different.

Lab 9 also cited a hypothetical `linkedStories[]` field on the Recipe API response for TC_API_STORY_004. The Recipe
serializer post-#458 exposes the back-link as `story_count` (counting published linked stories) plus the model-level
reverse manager `Recipe.linked_stories`. The TC_API_STORY_004 test asserts both, so the bidirectional contract is
verifiable.

## How to verify

```bash
cd app/backend && python manage.py test apps.users apps.recipes apps.stories -v 2
grep -rn "TC_API_AUTH_001\|TC_API_REC_002\|TC_API_ING_003\|TC_API_STORY_004\|TC_API_QA_005" apps/
```
