#!/bin/sh
set -e

echo "[entrypoint] running migrate..."
python manage.py migrate --noinput

echo "[entrypoint] running collectstatic..."
python manage.py collectstatic --noinput

# Seed reference + demo content. All seed_* commands are idempotent and
# dependency-ordered (see each command's docstring), so this is safe to run on
# every start. Gated by RUN_SEEDERS so the bare image stays generic — the
# compose backend service sets RUN_SEEDERS=1 (override via .env). seed_test_db
# is intentionally excluded: it's a mock-data seeder for throwaway test DBs.
if [ "${RUN_SEEDERS:-0}" = "1" ] || [ "${RUN_SEEDERS:-0}" = "true" ]; then
    echo "[entrypoint] running seeders (RUN_SEEDERS=${RUN_SEEDERS})..."
    for cmd in \
        seed_canonical \
        seed_region_geodata \
        seed_region_geo \
        seed_story_coordinates \
        seed_cultural_facts \
        seed_cultural_content \
        seed_ingredient_densities \
        seed_ingredient_routes
    do
        echo "[entrypoint]   -> manage.py $cmd"
        # Best-effort: a failing seeder logs a warning but must not block the
        # API from coming up (unlike migrate, which is fatal by design).
        python manage.py "$cmd" || echo "[entrypoint] WARN: $cmd failed — continuing"
    done
else
    echo "[entrypoint] skipping seeders (RUN_SEEDERS unset)"
fi

echo "[entrypoint] starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
