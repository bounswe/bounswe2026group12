from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager for email-based authentication."""

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field is required.')
        if not username:
            raise ValueError('The Username field is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for the Cross-Generational Recipe & Food Heritage Platform.

    Fields are derived from:
    - Tech Stack Design (2026-04-02): id, email, password_hash, username, bio, region, role, created_at
    - Class Diagram (Wiki): id, username, email, passwordHash, role, bio, region, preferredLanguage, createdAt
    """

    class Role(models.TextChoices):
        USER = 'user', 'User'
        MODERATOR = 'moderator', 'Moderator'
        ADMIN = 'admin', 'Admin'

    # Authentication fields
    email = models.EmailField(unique=True, help_text='Used as the login identifier.')
    username = models.CharField(max_length=50, unique=True)

    # Profile fields
    bio = models.TextField(blank=True, default='')
    region = models.CharField(max_length=100, blank=True, default='')
    preferred_language = models.CharField(max_length=10, blank=True, default='en')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)

    # Django required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    # Use email as the login field instead of username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username} <{self.email}>'
