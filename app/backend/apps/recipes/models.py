from django.db import models
from django.conf import settings

class Region(models.Model):
    """Region model for tagging recipes and user origin."""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Ingredient(models.Model):
    """Ingredient model for reuse across recipes."""
    name = models.CharField(max_length=200, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class Unit(models.Model):
    """Unit of measurement (e.g., grams, liters, cups)."""
    name = models.CharField(max_length=50, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class DietaryTag(models.Model):
    """Dietary tag (e.g., Vegan, Gluten-free, Halal). User-submittable, moderated."""
    name = models.CharField(max_length=100, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class EventTag(models.Model):
    """Event tag (e.g., Wedding, Ramadan, Birthday). User-submittable, moderated."""
    name = models.CharField(max_length=100, unique=True)
    is_approved = models.BooleanField(default=False, help_text='Moderation flag.')

    def __str__(self):
        return self.name

class Recipe(models.Model):
    """Core Recipe model."""
    title = models.CharField(max_length=255)
    description = models.TextField()
    image = models.ImageField(upload_to='recipes/images/', null=True, blank=True)
    video = models.FileField(upload_to='recipes/videos/', null=True, blank=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, related_name='recipes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipes')
    qa_enabled = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    dietary_tags = models.ManyToManyField(DietaryTag, blank=True, related_name='recipes')
    event_tags = models.ManyToManyField(EventTag, blank=True, related_name='recipes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class RecipeIngredient(models.Model):
    """Through model linking recipes and ingredients with amounts and units."""
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.amount} {self.unit} of {self.ingredient} in {self.recipe}"

class Comment(models.Model):
    """Comment or Question on a Recipe."""
    COMMENT_TYPES = (
        ('COMMENT', 'Comment'),
        ('QUESTION', 'Question'),
    )

    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipe_comments')
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    body = models.TextField()
    type = models.CharField(max_length=10, choices=COMMENT_TYPES, default='COMMENT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_type_display()} by {self.author.username} on {self.recipe.title}"
