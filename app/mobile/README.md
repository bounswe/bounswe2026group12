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

## Auth UI (login / register)

Aligned with `app/frontend/src/pages/LoginPage.jsx` and `RegisterPage.jsx`:

- **Login:** email + password; client validation (required + email format). Submit uses `src/services/mockAuthService.ts` (no real API). Success stores user + token via `AuthContext` and `AsyncStorage` (like web `localStorage`).
- **Register:** username + email + password; same required fields as web plus password minimum length (8) and email format. Mock register; use username `taken` to simulate failure.
- **Mock failures:** login with password `wrong` or email containing `fail@` → error message like web API errors.

Swap `mockLoginRequest` / `mockRegisterRequest` for HTTP calls matching `app/frontend/src/services/authService.js` when the backend is available.
