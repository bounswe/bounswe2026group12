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
| Recipe detail | `/recipes/:id`   | Fetches `GET /api/recipes/:id/` then falls back to `mocks/recipes`; video (`expo-av`), description, ingredients; **Edit** only after auth is ready and `isRecipeAuthor(user, recipe)` (`src/utils/recipeAuthor.ts`) |
| Edit recipe   | `/recipes/:id/edit` | Pre-filled form reusing create pickers/sections; `PATCH /api/recipes/:id/` + `FormData`, mock fallback; success toast then back to detail |
| Story detail  | `/stories/:id`   | Mock data; linked recipe → recipe screen |
| New recipe    | (authoring)      | Full create form: description + dynamic ingredient list + video picker UI + client-side validation; ingredient/unit pickers try `/api/ingredients/` & `/api/units/` then fall back to mocks |

Mock data lives under `src/mocks/`. Catalog lists use `src/services/ingredientUnitService.ts` (same paths as web `recipeService.js`); if the server is down, in-memory mock catalogs are used.

Set **`EXPO_PUBLIC_API_URL`** (e.g. in `.env`) so a device or simulator can reach your API — same idea as web `REACT_APP_API_URL`. Default base URL is `http://localhost:8000`.

## Success toasts (aligned with web `Toast.jsx`)

`ToastProvider` + `useToast()` live in `src/context/ToastContext.tsx` (bottom-right banner, success/error colors, 3s auto-dismiss). Recipe **create** shows `Recipe published!` after mock submit; recipe **edit** shows `Recipe updated!` then navigates back to detail (same pattern as web).

## Auth UI (login / register)

Aligned with `app/frontend/src/pages/LoginPage.jsx` and `RegisterPage.jsx`:

- **Login:** email + password; client validation (required + email format). Submit uses `src/services/mockAuthService.ts` (no real API). Success stores user + token via `AuthContext` and `AsyncStorage` (like web `localStorage`).
- **Register:** username + email + password; same required fields as web plus password minimum length (8) and email format. Mock register; use username `taken` to simulate failure.
- **Mock failures:** login with password `wrong` or email containing `fail@` → error message like web API errors.

Swap `mockLoginRequest` / `mockRegisterRequest` for HTTP calls matching `app/frontend/src/services/authService.js` when the backend is available.
