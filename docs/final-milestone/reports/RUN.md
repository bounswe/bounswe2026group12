# How to reproduce the final-milestone test reports

This page documents the exact commands used to produce the JUnit XML and
HTML reports that live alongside this file. The XML files are the
canonical machine-readable submission required by the rubric; the HTML
companions are the human-readable view.

All commands are run from the repository root and assume the steps in
[`SETUP.md`](../../../SETUP.md) have been completed (deps installed,
seed loaded).

## Backend (Django + DRF)

```bash
cd app/backend
coverage run --source='.' manage.py test --verbosity 2
coverage xml -o ../../docs/final-milestone/reports/backend-coverage.xml
coverage html -d ../../docs/final-milestone/reports/backend-html
```

Outputs:

- `backend-coverage.xml` — Cobertura-format coverage (Codecov-compatible)
- `backend-html/index.html` — drill-down coverage browser

The same `coverage run` command is executed inside CI on every PR; the
`backend-coverage.xml` artifact is attached to the Actions summary
(see [`.github/workflows/tests.yml`](../../../.github/workflows/tests.yml)).

## Web (React + Jest)

```bash
cd app/frontend
CI=true npm test -- \
  --watchAll=false \
  --reporters=default \
  --reporters=jest-junit \
  --testResultsProcessor=jest-html-reporter
```

`package.json` is configured so:

- `jest-junit` writes `docs/final-milestone/reports/web-junit.xml`
- `jest-html-reporter` writes `docs/final-milestone/reports/web-test-report.html`

Outputs:

- `web-junit.xml` — JUnit XML (standard format)
- `web-test-report.html` — readable test browser

## Mobile (Expo + Jest + React Native Testing Library)

```bash
cd app/mobile
CI=true npm test -- \
  --watchAll=false \
  --reporters=default \
  --reporters=jest-junit \
  --testResultsProcessor=jest-html-reporter
```

Outputs (same shape as web):

- `mobile-junit.xml`
- `mobile-test-report.html`

## One-command bundle

To regenerate everything from a clean checkout:

```bash
# from repo root
bash docs/final-milestone/reports/run-all.sh
```

The script runs the three blocks above in sequence and fails fast on the
first non-zero exit code. The current set of report files in this folder
were produced on **2026-05-16** against commit
`a0bda46` (the [`final-milestone`](https://github.com/bounswe/bounswe2026group12/releases/tag/final-milestone)
tag). See the individual report files for the exact run timestamps and
totals.

## Latest run summary (2026-05-16, `final-milestone` tag)

| Layer | Suites | Tests | Status |
|---|---|---|---|
| Backend (Django + DRF) | all apps | **890** | ✅ all passing |
| Web (React + Jest) | **92** | **794** | ✅ all passing |
| Mobile (Expo + Jest + RTL) | **31** | **202** | ✅ all passing |
| **Total** | — | **1,886** | ✅ |

> A handful of mobile suites are intentionally `it.skip(...)`'d because
> they depend on a native Maps SDK preview (see PR #756 commentary).
> These are not counted as failures and are flagged in the HTML report.
