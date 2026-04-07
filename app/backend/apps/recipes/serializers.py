from rest_framework import serializers
from .models import Recipe, Ingredient, Unit, RecipeIngredient, Region

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = '__all__'

    def validate(self, data):
        request = self.context.get('request')
        if 'is_approved' in data:
            if not request or not request.user or not request.user.is_staff:
                data.pop('is_approved')
        return data

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

class RecipeIngredientWriteSerializer(serializers.Serializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all(), required=False, allow_null=True)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive number.")
        return value

class RecipeSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    ingredients = RecipeIngredientSerializer(source='recipe_ingredients', many=True, read_only=True)
    ingredients_write = RecipeIngredientWriteSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'image', 'video',
            'region', 'author', 'author_username', 'is_published',
            'created_at', 'updated_at', 'ingredients', 'ingredients_write'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']

    def validate(self, data):
        if self.context['request'].method == 'POST':
            if not data.get('ingredients_write'):
                raise serializers.ValidationError({"ingredients_write": "At least one ingredient is required."})
        return data

    def create(self, validated_data):
        ingredients_data = validated_data.pop('ingredients_write', [])
        recipe = Recipe.objects.create(**validated_data)
        for item in ingredients_data:
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=item['ingredient'],
                amount=item['amount'],
                unit=item.get('unit'),
            )
        return recipe

    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('ingredients_write', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if ingredients_data is not None:
            instance.recipe_ingredients.all().delete()
            for item in ingredients_data:
                RecipeIngredient.objects.create(
                    recipe=instance,
                    ingredient=item['ingredient'],
                    amount=item['amount'],
                    unit=item.get('unit'),
                )
        return instance
