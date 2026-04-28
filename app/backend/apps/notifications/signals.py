import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.recipes.models import Comment

logger = logging.getLogger(__name__)


def _send_expo_push(tokens, title, body):
    """
    Attempt to send an Expo push notification to a list of device tokens.

    Requires the `exponent-server-sdk` package (expo-server-sdk on PyPI).
    If the package is not installed the function silently no-ops so that the
    rest of the notification flow (in-app) still works.
    """
    try:
        from exponent_server_sdk import (
            DeviceNotRegisteredError,
            PushClient,
            PushMessage,
            PushServerError,
        )
    except ImportError:
        logger.debug(
            "exponent-server-sdk not installed — skipping push notification delivery."
        )
        return

    client = PushClient()
    messages = [
        PushMessage(to=token, title=title, body=body)
        for token in tokens
        if PushClient.is_exponent_push_token(token)
    ]
    if not messages:
        return

    try:
        responses = client.publish_multiple(messages)
        for response in responses:
            try:
                response.validate_response()
            except DeviceNotRegisteredError:
                # Token is stale — remove it from the DB so we stop retrying
                from .models import DeviceToken
                DeviceToken.objects.filter(token=response.push_message.to).delete()
            except Exception as exc:
                logger.warning("Push notification error: %s", exc)
    except PushServerError as exc:
        logger.error("Expo push server error: %s", exc)


@receiver(post_save, sender=Comment)
def notify_recipe_author_on_question(sender, instance, created, **kwargs):
    """
    When a new QUESTION comment is created, notify the recipe author with:
      1. A persisted in-app Notification record.
      2. An Expo push notification to all of the author's registered devices.

    The notification is skipped when the questioner IS the author to avoid
    self-notification noise.
    """
    if not created:
        return
    if instance.type != 'QUESTION':
        return

    recipe = instance.recipe
    author = recipe.author
    actor = instance.author

    # Don't notify authors of their own questions
    if author == actor:
        return

    from .models import Notification, DeviceToken

    message = (
        f"{actor.username} asked a question on your recipe \"{recipe.title}\"."
    )

    # 1. Persist in-app notification
    Notification.objects.create(
        recipient=author,
        actor=actor,
        recipe=recipe,
        message=message,
    )

    # 2. Push notification (best-effort)
    device_tokens = list(
        DeviceToken.objects.filter(user=author).values_list('token', flat=True)
    )
    if device_tokens:
        _send_expo_push(
            tokens=device_tokens,
            title="New question on your recipe",
            body=message,
        )
