#!/usr/bin/env bash
# Regenerate the final-milestone test reports for all three layers.
# Run from the repository root.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPORTS_DIR="$REPO_ROOT/docs/final-milestone/reports"
cd "$REPO_ROOT"

echo "==> Backend (Django + coverage)"
(
  cd app/backend
  coverage run --source='.' manage.py test --verbosity 2
  coverage xml -o "$REPORTS_DIR/backend-coverage.xml"
  coverage html -d "$REPORTS_DIR/backend-html"
)

echo "==> Web (Jest)"
(
  cd app/frontend
  CI=true npm test -- \
    --watchAll=false \
    --reporters=default \
    --reporters=jest-junit \
    --testResultsProcessor=jest-html-reporter
)

echo "==> Mobile (Jest)"
(
  cd app/mobile
  CI=true npm test -- \
    --watchAll=false \
    --reporters=default \
    --reporters=jest-junit \
    --testResultsProcessor=jest-html-reporter
)

echo "==> Done. Reports in $REPORTS_DIR"
