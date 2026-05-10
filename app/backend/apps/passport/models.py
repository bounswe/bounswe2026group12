from django.conf import settings
from django.db import models


class CulturalPassport(models.Model):
    """Gamified profile companion (#583).

    Shell model: every user has exactly one passport row, auto-created on
    signup via post_save signal. Stamps (#584), Quests (#586), timeline
    events (#588) and real level/points logic (#587) land in follow-up
    issues; this model only stores the persistent shell state.
    """

    LEVEL_CHOICES = [(i, f"Level {i}") for i in range(1, 7)]
    DEFAULT_THEME = 'classic_traveler'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport',
    )
    level = models.IntegerField(choices=LEVEL_CHOICES, default=1)
    total_points = models.IntegerField(default=0)
    active_theme = models.CharField(max_length=64, default=DEFAULT_THEME)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cultural_passports'

    def __str__(self):
        return f'Passport(user={self.user.username}, level={self.level})'
