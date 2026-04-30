from django.core.management.base import BaseCommand

from apps.cultural_content.models import CulturalContent


SEED_ITEMS = [
    {
        'slug': 'sunday-borek-mornings',
        'kind': CulturalContent.Kind.TRADITION,
        'title': 'Sunday Börek Mornings',
        'body': (
            'In Aegean homes, Sunday breakfast often starts with the smell of phyllo baking before sunrise. '
            'Grandmothers roll dough by hand, layer by layer, while the rest of the family wakes to the scent.'
        ),
        'region': 'Aegean',
        'link_kind': CulturalContent.LinkKind.STORY,
        'link_id': 2,
        'cultural_tags': ['Aegean', 'Turkish', 'Breakfast'],
    },
    {
        'slug': 'dish-of-the-day-mansaf',
        'kind': CulturalContent.Kind.DISH,
        'title': 'Dish of the Day: Mansaf',
        'body': (
            'A Levantine festive dish — lamb slow-cooked in fermented yogurt sauce, served over saffron rice. '
            'Eaten standing, with the right hand, around a single shared platter.'
        ),
        'region': 'Levantine',
        'link_kind': CulturalContent.LinkKind.RECIPE,
        'link_id': 12,
        'cultural_tags': ['Levantine', 'Halal', 'Wedding'],
    },
    {
        'slug': 'why-lentil-soup-is-healing',
        'kind': CulturalContent.Kind.FACT,
        'title': 'Why Lentil Soup is Healing',
        'body': (
            'Across Anatolia and the Middle East, lentil soup is the first food offered to a guest with a cold or to a '
            'recovering relative. The tradition predates modern medicine by centuries.'
        ),
        'region': 'Anatolian',
        'link_kind': CulturalContent.LinkKind.RECIPE,
        'link_id': 2,
        'cultural_tags': ['Anatolian', 'Turkish', 'Vegetarian'],
    },
    {
        'slug': 'the-coffee-reading',
        'kind': CulturalContent.Kind.TRADITION,
        'title': 'The Coffee Reading',
        'body': (
            'After Turkish coffee, the cup is flipped onto its saucer and the grounds are read. '
            'It is half ritual, half conversation starter — and almost never taken too seriously.'
        ),
        'region': 'Marmara',
        'cultural_tags': ['Marmara', 'Turkish'],
    },
    {
        'slug': 'asure-day',
        'kind': CulturalContent.Kind.HOLIDAY,
        'title': 'Aşure Day',
        'body': (
            'A pudding made of forty ingredients — wheat, beans, dried fruits, nuts — shared with neighbors on the '
            '10th of Muharram. Tradition says one bowl should never be eaten alone.'
        ),
        'region': 'Anatolian',
        'cultural_tags': ['Anatolian', 'Turkish', 'Muharram', 'Religious'],
    },
]


class Command(BaseCommand):
    help = 'Seed initial cultural content cards (idempotent via slug).'

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for item in SEED_ITEMS:
            obj, was_created = CulturalContent.objects.update_or_create(
                slug=item['slug'], defaults=item,
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f'Cultural content seeded: {created} created, {updated} updated.'
        ))
