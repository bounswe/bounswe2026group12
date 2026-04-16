#!/bin/sh
set -e

echo "[entrypoint] running migrate..."
python manage.py migrate --noinput

echo "[entrypoint] running collectstatic..."
python manage.py collectstatic --noinput

echo "[entrypoint] starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
