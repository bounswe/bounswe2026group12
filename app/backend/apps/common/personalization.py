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

# Weight rationale: regional matches dominate as the strongest direct relevance
# signal; dietary/religious follow because they constrain what users can eat;
# event interests capture occasion-based fit; textual cultural matches are the
# noisiest signal and weighted lowest.
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
    so the caller can keep DB-level pagination and lazy evaluation.
    """
    if not personalize or not has_profile_terms(user):
        return items

    if scorer_kwargs is None:
        scorer_kwargs = {}

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

    region_name = getattr(getattr(recipe, 'region', None), 'name', None)
    dietary_candidates = [
        *_names_from_related(getattr(recipe, 'dietary_tags', None)),
        *_names_from_related(getattr(recipe, 'religions', None)),
    ]
    event_candidates = _names_from_related(getattr(recipe, 'event_tags', None))

    contributions = {
        'regional': _weighted_intersection(
            terms['regional_ties'],
            [region_name],
            weights['regional'],
        ),
        'dietary': _weighted_intersection(
            terms['religious_preferences'],
            dietary_candidates,
            weights['dietary'],
        ),
        'event': _weighted_intersection(
            terms['event_interests'],
            event_candidates,
            weights['event'],
        ),
        'cultural': _weighted_text_matches(
            terms['cultural_interests'],
            [
                getattr(recipe, 'title', ''),
                getattr(recipe, 'description', ''),
                region_name or '',
                *dietary_candidates,
                *event_candidates,
            ],
            weights['cultural'],
        ),
    }
    return _score_and_reason(contributions, weights)


def score_story(story, user, weights=None):
    if weights is None:
        weights = WEIGHTS
    terms = profile_terms(user)

    # Story carries its own region (#381) and taxonomy (#386 / #388) since the
    # story-centric refactor (#379). Linked recipes are now M2M via
    # StoryRecipeLink and contribute as fallback / additional signal.
    direct_region = getattr(story, 'region', None)
    story_dietary = _names_from_related(getattr(story, 'dietary_tags', None))
    story_events = _names_from_related(getattr(story, 'event_tags', None))
    story_religions = _names_from_related(getattr(story, 'religions', None))

    linked_recipes = _linked_recipes(story)

    region_candidates = []
    if direct_region is not None:
        region_candidates.append(getattr(direct_region, 'name', None))
    for recipe in linked_recipes:
        rgn = getattr(recipe, 'region', None)
        if rgn is not None:
            region_candidates.append(getattr(rgn, 'name', None))

    dietary_candidates = list(story_dietary)
    event_candidates = list(story_events)
    religion_candidates = list(story_religions)
    for recipe in linked_recipes:
        dietary_candidates += _names_from_related(getattr(recipe, 'dietary_tags', None))
        event_candidates += _names_from_related(getattr(recipe, 'event_tags', None))
        religion_candidates += _names_from_related(getattr(recipe, 'religions', None))

    contributions = {
        'regional': _weighted_intersection(
            terms['regional_ties'],
            region_candidates,
            weights['regional'],
        ),
        'dietary': _weighted_intersection(
            terms['religious_preferences'],
            [*dietary_candidates, *religion_candidates],
            weights['dietary'],
        ),
        'event': _weighted_intersection(
            terms['event_interests'],
            event_candidates,
            weights['event'],
        ),
        'cultural': _weighted_text_matches(
            terms['cultural_interests'],
            [
                getattr(story, 'title', ''),
                getattr(story, 'body', ''),
                *[getattr(recipe, 'title', '') for recipe in linked_recipes],
                *[getattr(recipe, 'description', '') for recipe in linked_recipes],
                *region_candidates,
                *dietary_candidates,
                *event_candidates,
                *religion_candidates,
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

    # CulturalContent now carries a Region FK (#381) plus a legacy region_text
    # string. Use whichever resolves to a name.
    region_obj = getattr(content, 'region', None)
    region_name = getattr(region_obj, 'name', None) if region_obj is not None else None
    region_text = getattr(content, 'region_text', None) or region_name

    contributions = {
        'regional': _weighted_intersection(
            terms['regional_ties'],
            [region_name, region_text, *tags],
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
                region_name or '',
                region_text or '',
                *tags,
            ],
            weights['cultural'],
        ),
    }
    return _score_and_reason(contributions, weights)


def _linked_recipes(story):
    """Materialize linked recipes from Story.recipe_links (M2M via StoryRecipeLink)."""
    recipe_links = getattr(story, 'recipe_links', None)
    if recipe_links is None:
        return []
    if hasattr(recipe_links, 'all'):
        recipe_links = recipe_links.all()
    return [getattr(link, 'recipe', None) for link in recipe_links if getattr(link, 'recipe', None) is not None]


def _weighted_intersection(preferences, candidates, weight):
    matches = preferences & normalize_terms(candidates)
    return len(matches) * weight


def _weighted_text_matches(preferences, text_values, weight):
    if not preferences:
        return 0
    haystack = ' '.join(str(value).lower() for value in text_values if value)
    matches = 0
    for term in preferences:
        if term in haystack:
            matches += 1
            continue
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
