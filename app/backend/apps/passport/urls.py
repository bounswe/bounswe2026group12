from django.urls import path

from .views import (
    PassportQuestsView,
    SaveStoryView,
    TryRecipeView,
    UserPassportView,
)

urlpatterns = [
    path(
        'users/<str:username>/passport/',
        UserPassportView.as_view(),
        name='user-passport',
    ),
    path(
        'passport/recipes/<str:recipe_id>/try/',
        TryRecipeView.as_view(),
        name='passport-recipe-try',
    ),
    path(
        'passport/stories/<str:story_id>/save/',
        SaveStoryView.as_view(),
        name='passport-story-save',
    ),
    path(
        'passport/quests/',
        PassportQuestsView.as_view(),
        name='passport-quests',
    ),
]
