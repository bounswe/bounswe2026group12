"""Lookup-driven natural-language query parser for domain-aware search (#389).

Tokens from the raw query are matched against approved taxonomy names for
Region, EventTag, DietaryTag, and Religion (longest-match-first). Matched
tokens are consumed; the remainder becomes ``cleaned_query`` for the
existing title/description ``icontains`` lookups.

The parser is deliberately not LLM-driven: the lookup tables are small (tens
of rows) so we can rebuild the map per request and keep behavior predictable.
"""
import re


_STOPWORDS = frozenset({'a', 'an', 'the', 'and', 'or', 'with', 'for', 'of', 'in'})

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _normalize_tokens(text):
    return _TOKEN_RE.findall(text.lower()) if text else []


def _build_lookup_map():
    """Return ``{tuple_of_tokens: (facet_type, canonical_name)}``.

    Order: Region first so multi-word region names take precedence over any
    accidental overlap with shorter tag names. Approved tags only.
    """
    from apps.recipes.models import Region, EventTag, DietaryTag, Religion

    lookup = {}

    def add(facet_type, name):
        key = tuple(_normalize_tokens(name))
        if key and key not in lookup:
            lookup[key] = (facet_type, name)

    for region in Region.objects.all():
        add('region', region.name)
    for event in EventTag.objects.filter(is_approved=True):
        add('event', event.name)
    for diet in DietaryTag.objects.filter(is_approved=True):
        add('diet', diet.name)
    for religion in Religion.objects.filter(is_approved=True):
        add('religion', religion.name)

    return lookup


def parse_query(raw_query, lookup=None):
    """Decompose a free-text search query into structured facets.

    Returns a dict with keys ``cleaned_query`` (str), ``region`` (str|None),
    ``event`` (str|None), ``diets`` (list[str]), ``religions`` (list[str]).

    ``lookup`` is the matching map (see :func:`_build_lookup_map`). When
    omitted the map is built from the database. Tests pass a fixed map to
    keep the parser pure and DB-free.
    """
    result = {
        'cleaned_query': '',
        'region': None,
        'event': None,
        'diets': [],
        'religions': [],
    }

    if not raw_query or not raw_query.strip():
        return result

    tokens = _normalize_tokens(raw_query)
    if not tokens:
        return result

    if lookup is None:
        lookup = _build_lookup_map()
    if not lookup:
        result['cleaned_query'] = ' '.join(t for t in tokens if t not in _STOPWORDS)
        return result

    max_phrase_len = max(len(k) for k in lookup)
    consumed = [False] * len(tokens)

    i = 0
    while i < len(tokens):
        matched_length = 0
        for length in range(min(max_phrase_len, len(tokens) - i), 0, -1):
            phrase = tuple(tokens[i:i + length])
            entry = lookup.get(phrase)
            if entry is None:
                continue

            facet_type, canonical = entry
            if facet_type == 'region':
                if result['region'] is None:
                    result['region'] = canonical
            elif facet_type == 'event':
                if result['event'] is None:
                    result['event'] = canonical
            elif facet_type == 'diet':
                if canonical not in result['diets']:
                    result['diets'].append(canonical)
            elif facet_type == 'religion':
                if canonical not in result['religions']:
                    result['religions'].append(canonical)

            matched_length = length
            break

        if matched_length:
            for k in range(i, i + matched_length):
                consumed[k] = True
            i += matched_length
        else:
            i += 1

    leftover = [
        token for idx, token in enumerate(tokens)
        if not consumed[idx] and token not in _STOPWORDS
    ]
    result['cleaned_query'] = ' '.join(leftover)
    return result
