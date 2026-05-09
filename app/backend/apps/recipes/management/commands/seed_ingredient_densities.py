"""Idempotent seeder for Ingredient.density_g_per_ml.

Citations live in apps/recipes/conversions/references.md, not in code. To add
a new entry: cite the source there, then add the row here. Names must match
existing Ingredient rows seeded by migration 0005 so we update the same row
rather than creating duplicates.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.recipes.models import Ingredient


SEED_DENSITIES = {
    'Water': Decimal('1.0000'),
    'Olive Oil': Decimal('0.9150'),
    'Honey': Decimal('1.4200'),
    'Sugar': Decimal('0.8500'),
    'Flour': Decimal('0.5300'),
    'Rice': Decimal('0.7900'),
    'Lentils': Decimal('0.8000'),
    'Salt': Decimal('1.2000'),
    'Butter': Decimal('0.9590'),
    'Yogurt': Decimal('1.0300'),
    'Tomato Paste': Decimal('1.0750'),
    'Cream': Decimal('1.0050'),
}


class Command(BaseCommand):
    help = 'Seed Ingredient.density_g_per_ml for curated ingredients (idempotent).'

    def handle(self, *args, **options):
        updated = 0
        created = 0
        skipped_unchanged = 0

        for name, density in SEED_DENSITIES.items():
            ingredient, was_created = Ingredient.objects.get_or_create(
                name=name,
                defaults={'is_approved': True, 'density_g_per_ml': density},
            )
            if was_created:
                created += 1
                continue

            if ingredient.density_g_per_ml == density:
                skipped_unchanged += 1
                continue

            ingredient.density_g_per_ml = density
            ingredient.save(update_fields=['density_g_per_ml'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Densities seeded: {created} created, {updated} updated, {skipped_unchanged} unchanged.'
        ))
