from datetime import datetime


PROFILE_FIELDS = (
    'cultural_interests',
    'regional_ties',
    'religious_preferences',
    'event_interests',
)

RANK_REASONS = {
    'regional': 'regional_match',
    'dietary': 'dietary_match',
    'event': 'event_match',
    'cultural': 'cultural_match',
}

# Magic Weights Rationale:
# Regional matches (40) are prioritized as the strongest signal of direct relevance.
# Dietary preferences (30) follow, ensuring content aligns with essential lifestyle choices.
# Event interests (25) capture specific occasion-based relevance.
# Cultural text matches (15) provide a broader but noisier signal for discovery.
WEIGHTS = {
    'regional': 40,
    'dietary': 30,
    'event': 25,
    'cultural': 15,
}


def normalize_terms(values):
    if not values:
        return set()
    return {
        value.strip().lower()
        for value in values
        if isinstance(value, str) and value.strip()
    }


def profile_terms(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return {field: set() for field in PROFILE_FIELDS}
    return {
        field: normalize_terms(getattr(user, field, []) or [])
        for field in PROFILE_FIELDS
    }


def has_profile_terms(user):
    terms = profile_terms(user)
    return any(terms[field] for field in PROFILE_FIELDS)


def attach_rank(obj, score, reason):
    obj.rank_score = score
    obj.rank_reason = reason
    return obj


def rank_items(items, user, scorer, *, recency_attr='created_at', personalize=True, scorer_kwargs=None):
    """Rank items based on user profile.
    
    If personalize=False, or user has no profile terms, returns items as-is
    to allow database-level pagination/lazy evaluation.
    """
    if not personalize or not has_profile_terms(user):
        return items

    if scorer_kwargs is None:
        scorer_kwargs = {}

    # Materialize items for ranking (usually with a soft cap from the view)
    items = list(items)
    ranked = []
    for index, item in enumerate(items):
        score, reason = scorer(item, user, **scorer_kwargs)
        attach_rank(item, score, reason)
        ranked.append((item, index))

    ranked.sort(
        key=lambda pair: (
            -pair[0].rank_score,
            -_timestamp(getattr(pair[0], recency_attr, None)),
            -int(getattr(pair[0], 'id', 0) or 0),
            pair[1],
        )
    )
    return [item for item, _ in ranked]


def rank_payloads(payloads, *, recency_key='created_at'):
    payloads = list(payloads)
    payloads.sort(
        key=lambda item: (
            -int(item.get('rank_score') or 0),
            -_timestamp(item.get(recency_key)),
            -int(item.get('id') or 0),
        )
    )
    return payloads


def score_recipe(recipe, user, weights=None):
    if weights is None:
        weights = WEIGHTS
    terms = profile_terms(user)
    contributions = {
        'regional': _weighted_intersection(
            terms['regional_ties'],
            [getattr(getattr(recipe, 'region', None), 'name', None)],
            weights['regional'],
        ),
        'dietary': _weighted_intersection(
            terms['religious_preferences'],
            _names_from_related(getattr(recipe, 'dietary_tags', None)),
            weights['dietary'],
        ),
        'event': _weighted_intersection(
            terms['event_interests'],
            _names_from_related(getattr(recipe, 'event_tags', None)),
            weights['event'],
        ),
        'cultural': _weighted_text_matches(
            terms['cultural_interests'],
            [
                getattr(recipe, 'title', ''),
                getattr(recipe, 'description', ''),
                getattr(getattr(recipe, 'region', None), 'name', ''),
                *_names_from_related(getattr(recipe, 'dietary_tags', None)),
                *_names_from_related(getattr(recipe, 'event_tags', None)),
            ],
            weights['cultural'],
        ),
    }
    return _score_and_reason(contributions, weights)


def score_story(story, user, weights=None):
    if weights is None:
        weights = WEIGHTS
    linked_recipe = getattr(story, 'linked_recipe', None)
    terms = profile_terms(user)
    contributions = {
        'regional': _weighted_intersection(
            terms['regional_ties'],
            [getattr(getattr(linked_recipe, 'region', None), 'name', None)],
            weights['regional'],
        ),
        'dietary': _weighted_intersection(
            terms['religious_preferences'],
            _names_from_related(getattr(linked_recipe, 'dietary_tags', None)),
            weights['dietary'],
        ),
        'event': _weighted_intersection(
            terms['event_interests'],
            _names_from_related(getattr(linked_recipe, 'event_tags', None)),
            weights['event'],
        ),
        'cultural': _weighted_text_matches(
            terms['cultural_interests'],
            [
                getattr(story, 'title', ''),
                getattr(story, 'body', ''),
                getattr(linked_recipe, 'title', ''),
                getattr(linked_recipe, 'description', ''),
                getattr(getattr(linked_recipe, 'region', None), 'name', ''),
                *_names_from_related(getattr(linked_recipe, 'dietary_tags', None)),
                *_names_from_related(getattr(linked_recipe, 'event_tags', None)),
            ],
            weights['cultural'],
        ),
    }
    return _score_and_reason(contributions, weights)


def score_cultural_content(content, user, weights=None):
    if weights is None:
        weights = WEIGHTS
    terms = profile_terms(user)
    tags = getattr(content, 'cultural_tags', []) or []
    contributions = {
        'regional': _weighted_intersection(
            terms['regional_ties'],
            [getattr(content, 'region', None), *tags],
            weights['regional'],
        ),
        'dietary': _weighted_intersection(
            terms['religious_preferences'],
            tags,
            weights['dietary'],
        ),
        'event': _weighted_intersection(
            terms['event_interests'],
            tags,
            weights['event'],
        ),
        'cultural': _weighted_text_matches(
            terms['cultural_interests'],
            [
                getattr(content, 'title', ''),
                getattr(content, 'body', ''),
                getattr(content, 'region', ''),
                *tags,
            ],
            weights['cultural'],
        ),
    }
    return _score_and_reason(contributions, weights)


def _weighted_intersection(preferences, candidates, weight):
    matches = preferences & normalize_terms(candidates)
    return len(matches) * weight


def _weighted_text_matches(preferences, text_values, weight):
    if not preferences:
        return 0
    haystack = ' '.join(str(value).lower() for value in text_values if value)
    matches = 0
    for term in preferences:
        # Priority 1: Full phrase match (e.g. "street food" in haystack)
        if term in haystack:
            matches += 1
            continue
        
        # Priority 2: Match significant tokens individually (e.g. "street" in haystack)
        # We only do this if the full phrase doesn't match, and we strip stop-words
        # from the search term but NOT the haystack.
        tokens = _significant_tokens(term)
        if tokens and any(token in haystack for token in tokens):
            matches += 1
    return matches * weight


def _significant_tokens(term):
    stop_words = {'cuisine', 'food', 'dish', 'dishes', 'tradition', 'traditions'}
    return [
        token
        for token in term.replace('-', ' ').split()
        if len(token) > 2 and token not in stop_words
    ]


def _names_from_related(related):
    if related is None:
        return []
    if hasattr(related, 'all'):
        related = related.all()
    return [getattr(item, 'name', None) for item in related]


def _score_and_reason(contributions, weights):
    score = sum(contributions.values())
    if score <= 0:
        return 0, None
    reason_key = max(
        ('regional', 'dietary', 'event', 'cultural'),
        key=lambda key: (contributions[key], weights[key]),
    )
    return score, RANK_REASONS[reason_key]


def _timestamp(value):
    if not value:
        return 0
    if isinstance(value, datetime):
        return value.timestamp()
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp()
    except ValueError:
        return 0
