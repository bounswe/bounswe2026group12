"""Pure-Python tests for the domain-aware query parser (#389).

These tests bypass the database by passing a fixed lookup map directly to
``parse_query``. Behavior of ``_build_lookup_map`` (DB-bound) is exercised
indirectly by the endpoint tests in ``tests_domain_aware``.
"""
import unittest

from apps.search.query_parser import parse_query


def _lookup():
    """Mirror what ``_build_lookup_map`` would emit, sans DB."""
    return {
        # Regions (multi-word entries included)
        ('balkan',): ('region', 'Balkan'),
        ('italian',): ('region', 'Italian'),
        ('eastern', 'european'): ('region', 'Eastern European'),
        ('black', 'sea'): ('region', 'Black Sea'),
        # Events
        ('wedding',): ('event', 'Wedding'),
        ('funeral',): ('event', 'Funeral'),
        ('religious', 'holiday'): ('event', 'Religious Holiday'),
        # Diets
        ('vegan',): ('diet', 'Vegan'),
        ('halal',): ('diet', 'Halal'),
        ('gluten', 'free'): ('diet', 'Gluten-Free'),
        # Religions
        ('islam',): ('religion', 'Islam'),
        ('christianity',): ('religion', 'Christianity'),
    }


class ParseQueryTests(unittest.TestCase):

    def test_empty_query_returns_empty_result(self):
        result = parse_query('', lookup=_lookup())
        self.assertEqual(result['cleaned_query'], '')
        self.assertIsNone(result['region'])
        self.assertIsNone(result['event'])
        self.assertEqual(result['diets'], [])
        self.assertEqual(result['religions'], [])

    def test_none_query_returns_empty_result(self):
        result = parse_query(None, lookup=_lookup())
        self.assertEqual(result['cleaned_query'], '')

    def test_whitespace_only_query(self):
        result = parse_query('   ', lookup=_lookup())
        self.assertEqual(result['cleaned_query'], '')
        self.assertIsNone(result['region'])

    def test_single_facet_region(self):
        result = parse_query('balkan', lookup=_lookup())
        self.assertEqual(result['region'], 'Balkan')
        self.assertEqual(result['cleaned_query'], '')

    def test_single_facet_event(self):
        result = parse_query('wedding', lookup=_lookup())
        self.assertEqual(result['event'], 'Wedding')
        self.assertIsNone(result['region'])

    def test_single_facet_diet(self):
        result = parse_query('vegan', lookup=_lookup())
        self.assertEqual(result['diets'], ['Vegan'])

    def test_single_facet_religion(self):
        result = parse_query('islam', lookup=_lookup())
        self.assertEqual(result['religions'], ['Islam'])

    def test_multi_facet_region_event_with_residual(self):
        result = parse_query('Balkan wedding dishes', lookup=_lookup())
        self.assertEqual(result['region'], 'Balkan')
        self.assertEqual(result['event'], 'Wedding')
        self.assertEqual(result['cleaned_query'], 'dishes')

    def test_multi_word_region_longest_match_first(self):
        # "Eastern European" must beat any shorter prefix.
        result = parse_query('eastern european stew', lookup=_lookup())
        self.assertEqual(result['region'], 'Eastern European')
        self.assertEqual(result['cleaned_query'], 'stew')

    def test_multi_word_region_with_event(self):
        result = parse_query('black sea wedding cake', lookup=_lookup())
        self.assertEqual(result['region'], 'Black Sea')
        self.assertEqual(result['event'], 'Wedding')
        self.assertEqual(result['cleaned_query'], 'cake')

    def test_case_insensitive(self):
        result = parse_query('BALKAN Wedding DISHES', lookup=_lookup())
        self.assertEqual(result['region'], 'Balkan')
        self.assertEqual(result['event'], 'Wedding')
        self.assertEqual(result['cleaned_query'], 'dishes')

    def test_no_match_passthrough(self):
        result = parse_query('grandmother special pie', lookup=_lookup())
        self.assertIsNone(result['region'])
        self.assertIsNone(result['event'])
        self.assertEqual(result['diets'], [])
        self.assertEqual(result['religions'], [])
        self.assertEqual(result['cleaned_query'], 'grandmother special pie')

    def test_punctuation_is_stripped(self):
        result = parse_query('Balkan, wedding! dishes.', lookup=_lookup())
        self.assertEqual(result['region'], 'Balkan')
        self.assertEqual(result['event'], 'Wedding')
        self.assertEqual(result['cleaned_query'], 'dishes')

    def test_stopwords_dropped_from_residual(self):
        result = parse_query('vegan and halal', lookup=_lookup())
        self.assertEqual(result['diets'], ['Vegan', 'Halal'])
        self.assertEqual(result['cleaned_query'], '')

    def test_multiple_diets(self):
        result = parse_query('vegan halal recipes', lookup=_lookup())
        self.assertEqual(result['diets'], ['Vegan', 'Halal'])
        self.assertEqual(result['cleaned_query'], 'recipes')

    def test_diet_with_hyphenated_canonical_name(self):
        result = parse_query('gluten free wedding cake', lookup=_lookup())
        self.assertEqual(result['diets'], ['Gluten-Free'])
        self.assertEqual(result['event'], 'Wedding')
        self.assertEqual(result['cleaned_query'], 'cake')

    def test_first_region_wins_over_subsequent_regions(self):
        result = parse_query('balkan italian wedding', lookup=_lookup())
        self.assertEqual(result['region'], 'Balkan')
        self.assertEqual(result['event'], 'Wedding')
        # Both region tokens consumed; residual is empty.
        self.assertEqual(result['cleaned_query'], '')

    def test_religion_and_event_together(self):
        result = parse_query('islam religious holiday food', lookup=_lookup())
        self.assertEqual(result['religions'], ['Islam'])
        self.assertEqual(result['event'], 'Religious Holiday')
        self.assertEqual(result['cleaned_query'], 'food')

    def test_returns_independent_lists(self):
        # Ensure the default-list pattern in result init does not leak state
        # between calls.
        first = parse_query('vegan', lookup=_lookup())
        second = parse_query('halal', lookup=_lookup())
        self.assertEqual(first['diets'], ['Vegan'])
        self.assertEqual(second['diets'], ['Halal'])


if __name__ == '__main__':  # pragma: no cover
    unittest.main()
