"""Idempotent seeder for region-tied "Did You Know?" cultural facts (#664).

The CulturalFact model already ships with a handful of facts nested under
the four heritage groups (seeded via seed_canonical). What was missing is
facts tied to a Region, which the mobile "Did You Know?" cards and the web
parity work query per recipe region. Without them the section silently
hides on demo recipes and the recipes look bare.

This command reads fixtures/cultural_facts.json (an array of
{region, text, source_url?} objects) and creates one CulturalFact per
entry with the region resolved by name and heritage_group left null,
since the four group-tied facts already exist and region coverage is the
gap.

Idempotent: a fact is keyed by (region, text), so rerunning does not
duplicate; a changed source_url on an existing fact is written back.
Unknown region names are warned about and skipped rather than crashing,
so the command stays safe if a region has not been seeded yet.

Facts are short, plain-English food and culture trivia (origins,
etymology, rituals, ingredients). They are curated, not exhaustive.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.heritage.models import CulturalFact
from apps.recipes.models import Region


DEFAULT_FIXTURE = Path(__file__).resolve().parents[4] / 'fixtures' / 'cultural_facts.json'


class Command(BaseCommand):
    help = 'Seed region-tied "Did You Know?" cultural facts from fixtures/cultural_facts.json (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fixture',
            dest='fixture',
            default=None,
            help='Path to fixture JSON (default: fixtures/cultural_facts.json).',
        )

    def handle(self, *args, **options):
        fixture_path = Path(options['fixture']) if options['fixture'] else DEFAULT_FIXTURE
        with open(fixture_path, encoding='utf-8') as fh:
            entries = json.load(fh)

        region_by_name = {region.name: region for region in Region.objects.all()}

        created = 0
        updated = 0
        unchanged = 0
        skipped = 0
        missing_regions = set()

        for entry in entries:
            region_name = entry['region']
            text = entry['text'].strip()
            source_url = (entry.get('source_url') or '').strip()

            region = region_by_name.get(region_name)
            if region is None:
                missing_regions.add(region_name)
                skipped += 1
                continue

            fact = CulturalFact.objects.filter(region=region, text=text).first()
            if fact is None:
                CulturalFact.objects.create(
                    region=region,
                    heritage_group=None,
                    text=text,
                    source_url=source_url,
                )
                created += 1
            elif fact.source_url != source_url:
                fact.source_url = source_url
                fact.save(update_fields=['source_url', 'updated_at'])
                updated += 1
            else:
                unchanged += 1

        for name in sorted(missing_regions):
            self.stdout.write(self.style.WARNING(f'Region not found, skipped its facts: {name}'))

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created} region cultural facts '
            f'({updated} updated, {unchanged} unchanged, {skipped} skipped).'
        ))
