from functools import reduce
import operator
from decimal import ROUND_HALF_UP, Decimal

from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from apps.common.ids import is_ulid
from apps.common.permissions import IsAuthorOrReadOnly
from apps.common.pagination import StandardResultsSetPagination
from apps.common.personalization import rank_items, score_recipe, has_profile_terms
from .conversions import ConversionError, convert as convert_units
from .models import (
    Recipe, Ingredient, Unit, Region, Comment, DietaryTag, EventTag, Religion, Vote,
    IngredientSubstitution, IngredientCheckOff, RecipeIngredient,
)
from .serializers import (
    ConvertRequestSerializer,
    IngredientLookupSerializer,
    IngredientSerializer,
    IngredientSubstituteSerializer,
    RecipeSerializer,
    RegionSerializer,
    RegionSubmissionSerializer,
    UnitLookupSerializer,
    UnitSerializer,
    CommentSerializer,
    DietaryTagLookupSerializer,
    DietaryTagSerializer,
    EventTagLookupSerializer,
    EventTagSerializer,
    ReligionLookupSerializer,
    ReligionSerializer,
)


def _csv_param(params, name):
    raw = params.get(name, '')
    return [v.strip() for v in raw.split(',') if v.strip()]


def _iexact_or(field_or_fields, values):
    if not values:
        return None
    fields = field_or_fields if isinstance(field_or_fields, list) else [field_or_fields]
    queries = []
    for v in values:
        for f in fields:
            queries.append(Q(**{f'{f}__iexact': v}))
    return reduce(operator.or_, queries)


def apply_content_filters(qs, params):
    """Apply rich filters (M4-15 / #346 / M5-20 / #386) across culture, event, diet, ingredient axes.

    Per axis: positive (`<axis>=`) and negative (`<axis>_exclude=`) accept
    comma-separated values. Within an axis: OR. Between axes: AND.
    """
    filter_map = [
        ('diet', 'dietary_tags__name'),
        ('event', 'event_tags__name'),
        ('religion', 'religions__name'),
    ]
    
    # Region and Ingredient filters are model-specific
    if hasattr(qs.model, 'recipe_ingredients'):
        filter_map.append(('region', 'region__name'))
        filter_map.append(('ingredient', 'recipe_ingredients__ingredient__name'))
    else:
        # For stories, allow matching region via linked recipes
        filter_map.append(('region', ['region__name', 'recipe_links__recipe__region__name']))

    for param_name, field in filter_map:
        pos = _iexact_or(field, _csv_param(params, param_name))
        if pos is not None:
            qs = qs.filter(pos)
        neg = _iexact_or(field, _csv_param(params, f'{param_name}_exclude'))
        if neg is not None:
            qs = qs.exclude(neg)

    author_id = params.get('author')
    if author_id:
        qs = qs.filter(author_id=author_id)

    # Endangered Heritage Tags (#524): filter by heritage_status when the model
    # carries the field (Recipe does; Story does not).
    heritage_status = params.get('heritage_status')
    if heritage_status and hasattr(qs.model, 'heritage_status'):
        qs = qs.filter(heritage_status=heritage_status)

    return qs.distinct()

# Backward compat alias
def apply_recipe_filters(qs, params):
    return apply_content_filters(qs, params)

class RecipeViewSet(viewsets.ModelViewSet):
    """ViewSet for list/detail and management of Recipes."""
    queryset = Recipe.objects.select_related('region', 'author').prefetch_related(
        'recipe_ingredients__ingredient', 'recipe_ingredients__unit',
        'dietary_tags', 'event_tags', 'religions',
        'heritage_memberships__heritage_group',
        'endangered_notes',
    ).annotate(
        story_count=models.Count('story_links', filter=models.Q(story_links__story__is_published=True))
    ).all()
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardResultsSetPagination

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        lookup = {'public_id': lookup_value} if is_ulid(lookup_value) else {'pk': lookup_value}
        obj = get_object_or_404(queryset, **lookup)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            qs = apply_recipe_filters(qs, self.request.query_params)
        return qs

    def list(self, request, *args, **kwargs):
        personalize = request.query_params.get('personalize') != '0'
        if not personalize or not has_profile_terms(request.user):
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        items = rank_items(queryset[:500], request.user, score_recipe)

        page = self.paginate_queryset(items)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAuthorOrReadOnly])
    def publish(self, request, pk=None):
        recipe = self.get_object()
        recipe.is_published = True
        recipe.save(update_fields=['is_published'])
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAuthorOrReadOnly])
    def unpublish(self, request, pk=None):
        recipe = self.get_object()
        recipe.is_published = False
        recipe.save(update_fields=['is_published'])
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        recipe = self.get_object()
        
        if request.method == 'GET':
            comments = recipe.comments.all().annotate(helpful_count=models.Count('votes')).order_by('created_at')
            if request.user.is_authenticated:
                comments = comments.annotate(
                    user_has_voted=models.Exists(
                        Vote.objects.filter(comment=models.OuterRef('pk'), user=request.user)
                    )
                )
            page = self.paginate_queryset(comments)
            if page is not None:
                serializer = CommentSerializer(page, many=True, context=self.get_serializer_context())
                return self.get_paginated_response(serializer.data)
            serializer = CommentSerializer(comments, many=True, context=self.get_serializer_context())
            return Response(serializer.data)
            
        elif request.method == 'POST':
            if request.data.get('type') == 'QUESTION' and not recipe.qa_enabled:
                return Response({'detail': 'Q&A disabled for this recipe.'}, status=status.HTTP_403_FORBIDDEN)
            
            context = self.get_serializer_context()
            context['recipe'] = recipe
            serializer = CommentSerializer(data=request.data, context=context)
            if serializer.is_valid():
                serializer.save(author=request.user, recipe=recipe)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModeratedLookupViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ['list', 'retrieve']:
            return queryset.filter(is_approved=True)
        return queryset

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return self.lookup_serializer_class
        return super().get_serializer_class()

    def perform_create(self, serializer):
        # Stamp submitted_by server-side (#361) so submission attribution
        # cannot be spoofed via the request body. Subclasses that override
        # create() entirely (e.g. CulturalTagSubmissionMixin) handle their
        # own attribution.
        save_kwargs = {}
        Model = self.queryset.model
        if hasattr(Model, 'submitted_by'):
            save_kwargs['submitted_by'] = self.request.user
        serializer.save(**save_kwargs)


class CulturalTagSubmissionMixin:
    """Adds cultural-tag-aware create() (#391).

    On POST: short-circuits when a case-insensitive duplicate exists.
        - approved duplicate → 409 + the existing record
        - pending duplicate  → 200 + queued payload referencing the existing record
        - otherwise          → 201; submitted_by + submitted_at populated, lands as is_approved=False

    Subclasses must define `lookup_serializer_class` and `queryset` (already
    required by ModeratedLookupViewSet).
    """

    queue_message = 'A submission with this name is already queued for review.'

    def _cleaned_name(self, request):
        raw_name = request.data.get('name')
        return raw_name.strip() if isinstance(raw_name, str) else ''

    def create(self, request, *args, **kwargs):
        name = self._cleaned_name(request)
        if not name:
            return Response(
                {'name': ['This field may not be blank.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Model = self.queryset.model
        existing = Model.objects.filter(name__iexact=name).first()
        if existing is not None:
            data = self.lookup_serializer_class(existing).data
            if existing.is_approved:
                return Response(data, status=status.HTTP_409_CONFLICT)
            return Response(
                {'detail': self.queue_message, 'queued': True, **data},
                status=status.HTTP_200_OK,
            )

        # request.data may be a QueryDict (form-encoded) or a plain dict
        # (JSON). Normalize to a plain dict via the QueryDict.dict() helper
        # so we don't accidentally pass list-wrapped values to the serializer.
        if hasattr(request.data, 'dict'):
            write_data = request.data.dict()
        else:
            write_data = dict(request.data)
        write_data['name'] = name
        serializer = self.get_serializer(data=write_data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(submitted_by=request.user, is_approved=False)
        return Response(
            self.get_serializer(instance).data,
            status=status.HTTP_201_CREATED,
        )

class IngredientViewSet(ModeratedLookupViewSet):
    """ViewSet for list and management of Ingredients."""
    queryset = Ingredient.objects.all().order_by(Lower('name'), 'id')
    serializer_class = IngredientSerializer
    lookup_serializer_class = IngredientLookupSerializer

    def get_permissions(self):
        # The parent's get_permissions hardcodes IsAdminUser for any action
        # outside list/retrieve/create. Honor the @action's permission_classes
        # for the public `substitutes` action.
        if self.action == 'substitutes':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        # Endangered Heritage Tags (#524): ?heritage_status=endangered on the
        # ingredients list. Layers on top of the moderation filtering in the
        # parent's get_queryset.
        queryset = super().get_queryset()
        heritage_status = self.request.query_params.get('heritage_status')
        if heritage_status:
            queryset = queryset.filter(heritage_status=heritage_status)
        return queryset

    @action(detail=True, methods=['get'], url_path='substitutes')
    def substitutes(self, request, pk=None):
        """Return categorized, ranked substitution suggestions for an approved ingredient."""
        # Cannot use self.get_object(): the parent's get_queryset() only filters
        # is_approved=True for the list/retrieve actions, so a custom action
        # would silently return unapproved ingredients.
        source = get_object_or_404(Ingredient, pk=pk, is_approved=True)

        rows = (
            IngredientSubstitution.objects
            .filter(from_ingredient_id=source.id, to_ingredient__is_approved=True)
            .select_related('to_ingredient')
            .order_by('-closeness', Lower('to_ingredient__name'))
        )

        grouped = {choice: [] for choice in IngredientSubstitution.MatchType.values}
        for row in rows:
            grouped[row.match_type].append(IngredientSubstituteSerializer(row).data)

        return Response({
            'ingredient': {'id': source.id, 'name': source.name},
            **grouped,
        })

class UnitViewSet(ModeratedLookupViewSet):
    """ViewSet for list and management of Units."""
    queryset = Unit.objects.all().order_by(Lower('name'), 'id')
    serializer_class = UnitSerializer
    lookup_serializer_class = UnitLookupSerializer

class RegionViewSet(CulturalTagSubmissionMixin, ModeratedLookupViewSet):
    """ViewSet for Regions (#391).

    Public list/retrieve returns approved regions only. Authenticated users
    can submit new regions, which land as is_approved=False and enter the
    cultural moderation queue.
    """
    queryset = Region.objects.all().order_by(Lower('name'), 'id')
    serializer_class = RegionSubmissionSerializer
    lookup_serializer_class = RegionSerializer

    def get_permissions(self):
        # The parent's get_permissions hardcodes IsAdminUser for any action
        # outside list/retrieve/create, which would lock down the read-only
        # `recipes` action. Treat it like list/retrieve.
        if self.action == 'recipes':
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=True, methods=['get'], url_path='recipes')
    def recipes(self, request, pk=None):
        """Split a region's recipes into located (has lat+lng) and unlocated.

        Backs the zoom-to-region map view (#464 / #662): the located list
        becomes per-recipe pins, the unlocated list becomes the "without a
        location" bar. Both lists are ordered newest first.
        """
        region = get_object_or_404(Region, pk=pk, is_approved=True)
        recipes = region.recipes.select_related('author').order_by('-created_at')

        located, unlocated = [], []
        for recipe in recipes:
            base = {
                'id': recipe.id,
                'title': recipe.title,
                'author_username': recipe.author.username,
            }
            if recipe.latitude is not None and recipe.longitude is not None:
                located.append({
                    **base,
                    'latitude': recipe.latitude,
                    'longitude': recipe.longitude,
                })
            else:
                unlocated.append(base)

        return Response({'located': located, 'unlocated': unlocated})

class DietaryTagViewSet(ModeratedLookupViewSet):
    """ViewSet for list/submission of dietary tags (M4-15)."""
    queryset = DietaryTag.objects.all().order_by(Lower('name'), 'id')
    serializer_class = DietaryTagSerializer
    lookup_serializer_class = DietaryTagLookupSerializer

class EventTagViewSet(CulturalTagSubmissionMixin, ModeratedLookupViewSet):
    """ViewSet for list/submission of event tags (M4-15, #391)."""
    queryset = EventTag.objects.all().order_by(Lower('name'), 'id')
    serializer_class = EventTagSerializer
    lookup_serializer_class = EventTagLookupSerializer

class ReligionViewSet(CulturalTagSubmissionMixin, ModeratedLookupViewSet):
    """ViewSet for list/submission of religions (M5-20, #391)."""
    queryset = Religion.objects.all().order_by(Lower('name'), 'id')
    serializer_class = ReligionSerializer
    lookup_serializer_class = ReligionLookupSerializer

class CommentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """ViewSet for deleting and interacting with comments."""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.annotate(helpful_count=models.Count('votes'))
        user = self.request.user
        if user.is_authenticated:
            qs = qs.annotate(
                user_has_voted=models.Exists(
                    Vote.objects.filter(comment=models.OuterRef('pk'), user=user)
                )
            )
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None):
        comment = self.get_object()
        vote, created = Vote.objects.get_or_create(user=request.user, comment=comment)
        if not created:
            vote.delete()
            return Response({'status': 'unvoted'}, status=status.HTTP_200_OK)
        return Response({'status': 'voted'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def helpful_count(self, request, pk=None):
        comment = self.get_object()
        # Ensure we count the votes directly in case the queryset is not annotated
        # or we can rely on the annotation if get_object() applies it.
        count = getattr(comment, 'helpful_count', comment.votes.count())
        return Response({'helpful_count': count})


class ConvertView(APIView):
    """POST /api/convert/ public unit conversion endpoint (#376, #503).

    Anonymous and authenticated users both hit the same code path. The view is
    explicitly auth-free: an empty authentication_classes list tells DRF not to
    even attempt JWT/session resolution, and AllowAny documents the intent at
    the permission layer. The custom JWTAuthenticationMiddleware also exempts
    this path from its blanket unsafe-method block (see apps.common.middleware).
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ConvertRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        density = None
        ingredient_id = data.get('ingredient_id')
        if ingredient_id is not None:
            try:
                ingredient = Ingredient.objects.get(pk=ingredient_id)
            except Ingredient.DoesNotExist:
                return Response(
                    {'detail': f'Ingredient {ingredient_id} not found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            density = ingredient.density_g_per_ml

        try:
            result = convert_units(
                data['amount'],
                data['from_unit'],
                data['to_unit'],
                density_g_per_ml=density,
            )
        except ConversionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        result_q = result.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        # Strip trailing zeros without resorting to scientific notation.
        amount_str = format(result_q.normalize(), 'f')
        if '.' not in amount_str:
            amount_str = f'{amount_str}.0'

        return Response({
            'amount': amount_str,
            'from_unit': data['from_unit'],
            'to_unit': data['to_unit'],
            'ingredient_id': ingredient_id,
        })


class CheckedIngredientsView(APIView):
    """GET/POST /api/recipes/<recipe_id>/checked-ingredients/ (#529).

    Server-persisted cooking-mode check-off state. GET returns the list of
    ingredient ids the calling user has checked for this recipe. POST is an
    idempotent toggle keyed on (user, recipe, ingredient) and returns the
    canonical list after applying the change so the client can reconcile
    without a second round-trip.

    recipe_id accepts either the numeric pk or the ULID public_id, mirroring
    RecipeViewSet.get_object().
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_recipe(self, recipe_id):
        lookup = {'public_id': recipe_id} if is_ulid(recipe_id) else {'pk': recipe_id}
        return get_object_or_404(Recipe, **lookup)

    def _checked_ids(self, user, recipe):
        return list(
            IngredientCheckOff.objects
            .filter(user=user, recipe=recipe)
            .order_by('ingredient_id')
            .values_list('ingredient_id', flat=True)
        )

    def get(self, request, recipe_id):
        recipe = self._get_recipe(recipe_id)
        return Response(self._checked_ids(request.user, recipe))

    def post(self, request, recipe_id):
        recipe = self._get_recipe(recipe_id)

        ingredient_id = request.data.get('ingredient_id')
        checked = request.data.get('checked')

        if not isinstance(ingredient_id, int) or isinstance(ingredient_id, bool):
            return Response(
                {'detail': 'ingredient_id must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(checked, bool):
            return Response(
                {'detail': 'checked must be a boolean.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        in_recipe = RecipeIngredient.objects.filter(
            recipe=recipe, ingredient_id=ingredient_id,
        ).exists()
        if not in_recipe:
            return Response(
                {'detail': 'Ingredient is not part of this recipe.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if checked:
            IngredientCheckOff.objects.get_or_create(
                user=request.user, recipe=recipe, ingredient_id=ingredient_id,
            )
        else:
            IngredientCheckOff.objects.filter(
                user=request.user, recipe=recipe, ingredient_id=ingredient_id,
            ).delete()

        return Response(self._checked_ids(request.user, recipe))
