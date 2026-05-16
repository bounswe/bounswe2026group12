# Local development setup

A clone-to-running walkthrough for the genipe.app monorepo. Production
bring-up lives in [`ops/PROD.md`](ops/PROD.md); this file is local dev only.

The repo has three apps:

- `app/backend` — Django + DRF + JWT (Python 3.12).
- `app/frontend` — React (CRA, React 19, react-leaflet).
- `app/mobile` — React Native via Expo SDK 54.

You can run them independently. There is no required boot order, though the
frontends will look empty until the backend is up.

## Prerequisites

- Python 3.12 and `pip`
- Node.js 20 LTS and `npm`
- Git
- Docker Engine 24+ with the Compose v2 plugin (optional, only needed if
  you want a Postgres parity setup or want to bring up the whole stack)
- For mobile: the [Expo Go](https://expo.dev/go) app on a phone, or an
  iOS Simulator / Android Emulator on the host

## Clone and configure

```bash
git clone https://github.com/bounswe/bounswe2026group12.git
cd bounswe2026group12
cp .env.example .env
```

`.env` only needs to be filled in if you plan to use docker compose or
S3-compatible media storage. For pure local dev, the defaults baked into
each app are fine and `.env` can stay as-is.

## Backend (Django)

```bash
cd app/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The dev server listens on http://localhost:8000.

By default the backend uses SQLite (`db.sqlite3` in `app/backend/`)
because `POSTGRES_HOST` is unset. To run against Postgres instead, see
[Database (optional Postgres parity)](#database-optional-postgres-parity)
below.

To create an admin user for the Django admin:

```bash
python manage.py createsuperuser
```

To load a starter dataset:

```bash
python manage.py loaddata fixtures/*.json
```

## Frontend (web)

In a second terminal:

```bash
cd app/frontend
npm ci
npm start
```

Opens http://localhost:3000. The web app expects the backend at
`http://localhost:8000` by default; this is wired through CRA's proxy
config and the `REACT_APP_API_URL` environment variable.

Override the API URL when needed:

```bash
REACT_APP_API_URL=http://localhost:8000 npm start
```

`REACT_APP_API_URL` is baked in at build time, not runtime, so a fresh
`npm start` is required after changing it.

## Mobile (Expo)

In a third terminal:

```bash
cd app/mobile
npm ci
npx expo start
```

Then either:

- Scan the QR code with Expo Go on a phone (same Wi-Fi as the host).
- Press `i` to open the iOS Simulator (macOS, Xcode required).
- Press `a` to open an Android Emulator (Android Studio required).
- Press `w` to open in a browser (limited; mobile-only screens may not
  render correctly).

The mobile client points at the same API URL as web. Copy
`app/mobile/.env.example` to `app/mobile/.env` and adjust the
`EXPO_PUBLIC_API_URL` value to match where your backend is reachable
from the device.

### Mobile network configuration (host IP resolution)

`localhost` inside an Android device or iOS simulator does **not** mean
the laptop running `runserver` — it means the device itself. Pick the
URL that matches your runtime:

| Runtime | Set `EXPO_PUBLIC_API_URL` to | Why |
|---|---|---|
| iOS Simulator (same Mac) | `http://localhost:8000` | Simulator shares the host loopback. |
| Android Emulator (AVD) | `http://10.0.2.2:8000` | The emulator routes `10.0.2.2` to the host. |
| Physical device on the same Wi-Fi | `http://<laptop-LAN-IP>:8000` (e.g. `http://192.168.1.42:8000`) | Device has no view of `localhost`. |
| Docker Compose dev stack on the host | `http://localhost:8000` (simulator) or `http://<host-LAN-IP>:8000` (device) | Compose binds `8000` on the host. |
| Production | `https://genipe.app` | Hits the live deploy. |

To find your laptop's LAN IP:

```bash
# macOS
ipconfig getifaddr en0      # Wi-Fi
ipconfig getifaddr en1      # Ethernet adapters can vary

# Linux
hostname -I | awk '{print $1}'

# Windows (PowerShell)
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi').IPAddress
```

If the Expo dev server reports a different IP than your backend, that's
because Expo's tunnel-mode IP is for the bundler, not the API. Use the
backend's IP from the commands above for `EXPO_PUBLIC_API_URL`.

Common symptom of a wrong API URL: the login screen spins forever or
returns "Network request failed." Open `expo start` with `--clear` after
changing `.env` so the cached bundle is rebuilt.

## Database (optional Postgres parity)

By default backend tests and `runserver` use SQLite. To match production,
bring up the whole stack with compose:

```bash
docker compose up --build
```

This starts `db`, `backend`, and `web` together. The backend container
reaches Postgres at `db:5432` over the compose network and runs migrations
on entry. Web is served at http://localhost.

If you want to point a host-side `runserver` at the compose `db`, the dev
compose file does not publish port 5432 to the host. Add a one-line
override (e.g. `docker-compose.override.yml`) that exposes
`5432:5432` on the `db` service, then set in `.env`:

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bounswe_db
POSTGRES_USER=genipe
POSTGRES_PASSWORD=genipe_mvp_2026
```

and re-run migrations:

```bash
cd app/backend
source venv/bin/activate
python manage.py migrate
```

## Running tests

### Backend

```bash
cd app/backend
source venv/bin/activate
python manage.py test
```

Backend tests run against SQLite regardless of `POSTGRES_HOST` (tests
inject their own settings). Django's test runner discovers
`apps/*/tests*.py`.

Coverage matches what CI runs:

```bash
pip install coverage==7.13.5
coverage run --source=apps manage.py test
coverage report --omit='*/migrations/*,*/tests*'
```

### Frontend

```bash
cd app/frontend
npm test -- --watchAll=false
```

With coverage:

```bash
npm test -- --watchAll=false --coverage
```

### Mobile

The mobile app currently has no automated test suite. Smoke testing is
done by stepping through the app in Expo Go.

## Common issues

- **Port 8000 already in use.** Another `runserver` is alive, or the prod
  backend container is bound. `lsof -i :8000` to find it.
- **Port 3000 already in use.** CRA will offer to use the next port; say
  yes or kill the other process.
- **Migrations out of sync after `git pull`.** Re-run
  `python manage.py migrate` inside the backend venv. If a migration was
  squashed upstream, drop `db.sqlite3` and migrate from scratch.
- **`leaflet` import errors in tests.** Frontend Jest is configured to
  transpile `react-leaflet` and `leaflet`. If a new ESM-only dep breaks
  the test run, extend `jest.transformIgnorePatterns` in
  `app/frontend/package.json` to include it.
- **Expo "incompatible Metro version".** Run `npx expo install --fix`
  inside `app/mobile` to align native dep versions with the SDK.
- **CORS errors hitting backend from web.** Confirm `DEBUG=True` (which
  flips CORS to allow-all) or that your origin is listed in
  `CORS_ALLOWED_ORIGINS` in `.env`.
- **`pip install` fails on `psycopg2-binary` on macOS arm64.** Install
  Postgres headers via Homebrew (`brew install libpq`) and retry, or
  switch to SQLite-only by leaving `POSTGRES_HOST` unset.

## Where to look next

- [`README.md`](README.md) — project overview and links.
- [`ops/PROD.md`](ops/PROD.md) — production bring-up.
- [`RELEASE_NOTES.md`](RELEASE_NOTES.md) — what shipped in MVP and Final.
- [`docs/lab9-acceptance-test-traceability.md`](docs/lab9-acceptance-test-traceability.md)
  and
  [`docs/lab9-edit-enforcement-audit.md`](docs/lab9-edit-enforcement-audit.md)
  — acceptance and edit-enforcement audits.
