# Coverage Reporting

The `Tests` workflow (`.github/workflows/tests.yml`) runs the test suite for all
three layers on every pull request to `main` and on pushes to `main`. Each job
prints a coverage summary to the run's job summary (visible in the PR checks UI)
and uploads the raw coverage output as a downloadable artifact.

## Where the CI output lands

| Layer | Job summary section | Artifact | Contents |
|---|---|---|---|
| Backend | `## Backend coverage` (text table) | `backend-coverage-html` | `app/backend/htmlcov/` — browsable HTML report |
| Frontend | `## Frontend coverage` (metric table) | (table only, no upload) | `coverage/coverage-summary.json` consumed inline |
| Mobile | `## Mobile coverage` (metric table) | `mobile-coverage` | `app/mobile/coverage/` — `lcov`, `coverage-summary.json`, HTML |

Open the workflow run from the PR's "Checks" tab; artifacts are listed at the
bottom of the run page. Download `backend-coverage-html`, unzip it, and open
`index.html` for the line-by-line backend report.

## Running coverage locally

### Backend (Django + coverage.py)

```bash
cd app/backend
coverage run --source=apps manage.py test --noinput --parallel auto
coverage combine
coverage report --omit='*/migrations/*,*/tests*' --skip-empty
coverage html --omit='*/migrations/*,*/tests*' --skip-empty   # writes htmlcov/
```

Coverage settings live in `app/backend/.coveragerc` (`omit` rules plus the
`concurrency = multiprocessing` options needed for `--parallel`).

### Frontend (Create React App + Jest)

```bash
cd app/frontend
CI=true npm test -- --watchAll=false --coverage
```

`collectCoverageFrom` in `app/frontend/package.json` scopes coverage to app code
under `src/`, excluding `src/index.js`, `src/setupTests.js`, `src/mocks/**`, and
test files (`src/__tests__/**`, `src/**/*.test.{js,jsx}`).

### Mobile (Expo + Jest)

```bash
cd app/mobile
npx jest --coverage
```

`collectCoverageFrom` in `app/mobile/package.json` scopes coverage to
`src/**/*.{ts,tsx}`, excluding `src/mocks/**`.

## Current coverage

Fill these in from the latest `Tests` run on `main` (job summaries / artifacts).

| Layer | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Backend | TBD | TBD | TBD | TBD |
| Frontend | TBD | TBD | TBD | TBD |
| Mobile | TBD | TBD | TBD | TBD |

## Wiki

The project wiki should carry a copy of this page (the wiki cannot be edited
from CI). Create or update the "Coverage Reporting" wiki page from the contents
of this file and keep the table above in sync after notable test changes.
