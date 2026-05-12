#!/bin/sh
set -e

echo "[entrypoint] running migrate..."
python manage.py migrate --noinput

echo "[entrypoint] running collectstatic..."
python manage.py collectstatic --noinput

# Seeding is NOT done here — it's a deliberate, occasional operation, not a
# per-deploy one (seed_canonical wipes and rebuilds users/recipes/stories).
# Run the "Seed database" GitHub Action (.github/workflows/seed-db.yml), or the
# equivalent `docker compose exec backend …` from ops/PROD.md, once after first
# bring-up and again only when seed fixtures/commands change.

echo "[entrypoint] starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
