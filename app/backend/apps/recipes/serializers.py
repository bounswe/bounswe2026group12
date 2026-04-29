from rest_framework import serializers
from .models import Recipe, Ingredient, Unit, RecipeIngredient, Region, Comment

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'

class IngredientLookupSerializer(serializers.ModelSerializer):
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
    region_name = serializers.ReadOnlyField(source='region.name')
    ingredients = RecipeIngredientSerializer(source='recipe_ingredients', many=True, read_only=True)
    ingredients_write = RecipeIngredientWriteSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'image', 'video',
            'region', 'region_name', 'author', 'author_username', 'qa_enabled',
            'is_published', 'created_at', 'updated_at',
            'ingredients', 'ingredients_write'
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

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    helpful_count = serializers.IntegerField(read_only=True, default=0)
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'recipe', 'author', 'author_username', 'parent_comment',
            'body', 'type', 'created_at', 'updated_at', 'helpful_count', 'has_voted'
        ]
        read_only_fields = ['recipe', 'author', 'created_at', 'updated_at']

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if hasattr(obj, 'user_has_voted'):
                return obj.user_has_voted
            # Fallback if not annotated
            return obj.votes.filter(user=request.user).exists()
        return False

    def validate(self, attrs):
        parent = attrs.get('parent_comment')
        recipe = self.context.get('recipe')
        if parent and recipe and parent.recipe_id != recipe.id:
            raise serializers.ValidationError({'parent_comment': 'Must belong to the same recipe.'})
        return attrs
