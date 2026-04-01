from django.db import models
from django.contrib.auth.models import User


class Ingredient(models.Model):
    name = models.CharField(max_length=200, unique=True)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Unit(models.Model):
    name = models.CharField(max_length=50, unique=True)
    is_approved = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Recipe(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    video = models.FileField(upload_to='recipes/videos/', blank=True, null=True)
    region = models.CharField(max_length=100, blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipes')
    is_public = models.BooleanField(default=True)
    qa_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT)

    class Meta:
        unique_together = ('recipe', 'ingredient')


class Story(models.Model):
    title = models.CharField(max_length=255)
    body = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stories')
    linked_recipe = models.ForeignKey(
        Recipe, on_delete=models.SET_NULL, null=True, blank=True, related_name='stories'
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Question(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='questions')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Q on '{self.recipe}' by {self.author}"


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    is_helpful = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"A to Q#{self.question_id} by {self.author}"
