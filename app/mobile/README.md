# group12-mobile (Expo)

## Run locally

```bash
cd app/mobile
npm install
npm run start
```

## Public routing (no auth)

These screens are reachable without signing in, aligned with public routes in `app/frontend/src/App.js`:

| Screen        | Web equivalent   | Notes                          |
|---------------|------------------|--------------------------------|
| Home          | `/`              | Entry + shortcuts to other screens |
| Search        | `/search`        | Mock list + filter (no API)    |
| Recipe detail | `/recipes/:id`   | Mock data + short loading state |
| Story detail  | `/stories/:id`   | Mock data; linked recipe → recipe screen |

Mock data lives under `src/mocks/`. Replace with `services/*` calls when the backend is wired.
