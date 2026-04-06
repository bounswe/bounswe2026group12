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

## Protected routes (create recipe / story)

Aligned with web `ProtectedRoute` wrapping `/recipes/new` and `/stories/new` in `app/frontend/src/App.js`:

- **`RecipeCreate`** and **`StoryCreate`** are registered on the stack; each screen wraps its content in `src/components/ProtectedRoute.tsx`.
- If there is **no token** after `AuthContext` finishes hydrating from `AsyncStorage`, navigation **`replace`s to `Login`** (same effect as web `Navigate to="/login" replace`).
- Screens are **placeholders** (mock “Save”) until real `recipeService` / `storyService` calls exist.

From **Home**, use **Create recipe** / **Create story** to try the guard when logged out vs logged in.
