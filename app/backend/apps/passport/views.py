from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.ids import is_ulid
from apps.recipes.models import Recipe
from apps.stories.models import Story

from . import services
from .models import CulturalPassport
from .serializers import (
    CulturalPassportSerializer,
    QuestProgressSerializer,
    StampSerializer,
    UserQuestSerializer,
)


def _passport_payload(passport):
    """Full passport sections, reused by the action endpoints so the client
    can refresh everything from a single response."""
    return CulturalPassportSerializer(passport).data


class UserPassportView(APIView):
    """GET /api/users/<username>/passport/ (#583).

    Public read endpoint: anonymous visitors and authenticated users get the
    same payload. 404 when the username does not exist. Auto-creates a passport
    row on demand so older users still resolve before the backfill migration.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(get_user_model(), username=username)
        passport, _ = CulturalPassport.objects.get_or_create(user=user)
        return Response(_passport_payload(passport))


def _resolve(model, identifier):
    lookup = {'public_id': identifier} if is_ulid(identifier) else {'pk': identifier}
    return get_object_or_404(model, **lookup)


def _action_response(user, result):
    passport, _ = CulturalPassport.objects.get_or_create(user=user)
    payload = _passport_payload(passport)
    level = result['level']
    payload.update({
        'leveled_up': level['leveled_up'],
        'new_level': level['level'],
        'previous_level': level['previous_level'],
        'affected_stamps': StampSerializer(result['affected_stamps'], many=True).data,
        'newly_completed_quests': UserQuestSerializer(result['newly_completed_quests'], many=True).data,
    })
    return Response(payload, status=status.HTTP_200_OK)


class TryRecipeView(APIView):
    """POST /api/passport/recipes/<id>/try/ (#584).

    Marks the recipe tried for the authenticated user, recomputes the culture
    stamp(s), advances matching quests, recomputes points/level, writes the
    timeline events, and returns the updated passport summary. Idempotent.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, recipe_id):
        recipe = _resolve(Recipe, recipe_id)
        result = services.record_recipe_try(request.user, recipe)
        return _action_response(request.user, result)


class SaveStoryView(APIView):
    """POST /api/passport/stories/<id>/save/ (#584).

    Same as TryRecipeView but for saving a story to the passport. Idempotent.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, story_id):
        story = _resolve(Story, story_id)
        result = services.record_story_save(request.user, story)
        return _action_response(request.user, result)


class PassportQuestsView(APIView):
    """GET /api/passport/quests/ (#586).

    The authenticated user's currently active quests (including in-window event
    quests) with their progress.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = services.quests_with_progress(request.user)
        return Response(QuestProgressSerializer(data, many=True).data)
