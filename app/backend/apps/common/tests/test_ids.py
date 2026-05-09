from django.test import SimpleTestCase

from apps.common.ids import ULID_REGEX, generate_ulid


class ULIDGeneratorTests(SimpleTestCase):
    def test_generated_id_has_expected_length(self):
        self.assertEqual(len(generate_ulid()), 26)

    def test_generated_id_matches_ulid_alphabet(self):
        self.assertRegex(generate_ulid(), ULID_REGEX)

    def test_generated_ids_do_not_collide_in_large_batch(self):
        ids = {generate_ulid() for _ in range(10000)}
        self.assertEqual(len(ids), 10000)

    def test_later_timestamp_sorts_after_earlier_timestamp(self):
        earlier = generate_ulid(timestamp_ms=1000)
        later = generate_ulid(timestamp_ms=1001)
        self.assertLess(earlier, later)
