"""Regression tests for #770 — list pagination must not repeat rows.

`seed_canonical` creates every story inside one transaction, so many rows share
an identical `created_at` to the microsecond. Without a deterministic tiebreaker
on `Story.Meta.ordering`, the database is free to return rows in a different
order between paginated queries, so a row near a page boundary can show up on
two consecutive pages. These tests pin the ordering contract and walk the list
endpoint page by page to assert every id appears exactly once.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.stories.models import Story

User = get_user_model()


class StoryOrderingContractTests(APITestCase):
    def test_meta_ordering_ends_with_pk_tiebreaker(self):
        """Story.Meta.ordering must end with a primary-key tiebreaker."""
        ordering = list(Story._meta.ordering or [])
        self.assertTrue(ordering, "Story.Meta.ordering must be set")
        self.assertIn(ordering[-1], ('id', '-id', 'pk', '-pk'))
        self.assertIn('-created_at', ordering)


class StoryListPaginationTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            email="walker@example.com", username="walker", password="Pass123!"
        )
        # 25 published stories => 3 pages at page_size=10. Created in a tight
        # loop so created_at values collide, mirroring seed_canonical.
        self.stories = [
            Story.objects.create(
                title=f"Story {i}", body=f"Body {i}",
                author=self.author, is_published=True,
            )
            for i in range(25)
        ]

    def _walk_all_pages(self, url):
        seen = []
        page = 1
        while True:
            response = self.client.get(url, {"page": page, "personalize": "0"})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            seen.extend(item["id"] for item in response.data["results"])
            if not response.data.get("next"):
                break
            page += 1
        return seen

    def test_pagination_yields_each_story_once(self):
        seen = self._walk_all_pages(reverse("story-list"))
        self.assertEqual(len(seen), len(self.stories))
        self.assertEqual(len(seen), len(set(seen)), "a story id appeared on two pages")
        self.assertEqual(set(seen), {s.id for s in self.stories})

    def test_pagination_order_is_deterministic(self):
        expected = list(
            Story.objects.order_by("-created_at", "-id").values_list("id", flat=True)
        )
        self.assertEqual(self._walk_all_pages(reverse("story-list")), expected)
