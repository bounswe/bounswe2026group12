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
        fields = ['id', 'name']

class NamedSubmissionSerializer(serializers.ModelSerializer):
    duplicate_message = 'This name already exists.'

    def validate_name(self, value):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise serializers.ValidationError('This field may not be blank.')

        duplicate_queryset = self.Meta.model.objects.filter(name__iexact=cleaned_value)
        if self.instance is not None:
            duplicate_queryset = duplicate_queryset.exclude(pk=self.instance.pk)

        if duplicate_queryset.exists():
            raise serializers.ValidationError(self.duplicate_message)

        return cleaned_value

    def validate(self, data):
        request = self.context.get('request')
        if 'is_approved' in data:
            if not request or not request.user or not request.user.is_staff:
                data.pop('is_approved')
        return data

class IngredientSerializer(NamedSubmissionSerializer):
    duplicate_message = 'An ingredient with this name already exists.'

class UnitLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'name']

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = '__all__'

class UnitLookupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'name']

class UnitSerializer(NamedSubmissionSerializer):
    duplicate_message = 'A unit with this name already exists.'

    class Meta:
        model = Unit
        fields = '__all__'

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
