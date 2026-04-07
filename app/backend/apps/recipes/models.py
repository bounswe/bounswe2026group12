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

class Recipe(models.Model):
    """Core Recipe model."""
    title = models.CharField(max_length=255)
    description = models.TextField()
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, related_name='recipes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipes')
    is_published = models.BooleanField(default=False)
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
