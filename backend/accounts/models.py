from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    allow_contact = models.BooleanField(default=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.username
