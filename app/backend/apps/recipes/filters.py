from functools import reduce
import operator
from django.db.models import Q

def _csv_param(params, name):
    raw = params.get(name, '')
    return [v.strip() for v in raw.split(',') if v.strip()]


def _iexact_or(field, values):
    if not values:
        return None
    return reduce(operator.or_, (Q(**{f'{field}__iexact': v}) for v in values))


def apply_recipe_filters(qs, params):
    """Apply rich filters (M4-15 / #346) across culture, event, diet, ingredient axes.

    Per axis: positive (`<axis>=`) and negative (`<axis>_exclude=`) accept
    comma-separated values. Within an axis: OR. Between axes: AND.
    """
    filter_map = [
        ('region', 'region__name'),
        ('diet', 'dietary_tags__name'),
        ('event', 'event_tags__name'),
        ('ingredient', 'recipe_ingredients__ingredient__name'),
    ]
    for param_name, field in filter_map:
        pos = _iexact_or(field, _csv_param(params, param_name))
        if pos is not None:
            qs = qs.filter(pos)
        neg = _iexact_or(field, _csv_param(params, f'{param_name}_exclude'))
        if neg is not None:
            qs = qs.exclude(neg)
    return qs.distinct()
