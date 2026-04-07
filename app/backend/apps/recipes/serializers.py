from rest_framework import serializers
from .models import Recipe, Ingredient, Unit, RecipeIngredient, Region

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'

class IngredientLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ['id', 'name']

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = '__all__'

    def validate(self, data):
        request = self.context.get('request')
        # If is_approved is being set/changed, ensure the user is an admin
        if 'is_approved' in data:
            if not request or not request.user or not request.user.is_staff:
                # For non-admins, we ignore the is_approved field if it's sent
                data.pop('is_approved')
        return data

class UnitLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'name']

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'

    def validate(self, data):
        request = self.context.get('request')
        if 'is_approved' in data:
            if not request or not request.user or not request.user.is_staff:
                data.pop('is_approved')
        return data

class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.ReadOnlyField(source='ingredient.name')
    unit_name = serializers.ReadOnlyField(source='unit.name')

    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient', 'ingredient_name', 'amount', 'unit', 'unit_name']

class RecipeSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    ingredients = RecipeIngredientSerializer(source='recipe_ingredients', many=True, read_only=True)

    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'image', 'video',
            'region', 'author', 'author_username', 'is_published',
            'created_at', 'updated_at', 'ingredients'
        ]
        read_only_fields = ['author', 'is_published', 'created_at', 'updated_at']
