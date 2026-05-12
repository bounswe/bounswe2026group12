# TD-01: Login flow reliability (backend root-cause note)

Issue: #392. Mobile counterpart: #405. Broader auth/session refactor: #393 (#TD-02, merged in PR #744).

## Why this note exists

Multiple MVP demo attendees hit login errors, which blocks onboarding and M4
work. The issue asks for a root-cause write-up, a fix, and regression tests
covering expired tokens, empty responses, and network-retry-shaped failures.
This note is the backend half. The frontend reliability work (UI retry, error
toasts) and the mobile 401 handling are tracked separately (#405 and the
frontend issues).

## The login path, end to end

| Step | Route | View | Behaviour |
| --- | --- | --- | --- |
| Obtain tokens | `POST /api/auth/login/` | `apps/users/views.py:LoginView` | `LoginSerializer` validates `email` + `password`, calls `authenticate(username=email, password=...)`. On success returns `200 {user, access, refresh}`. On failure returns the serializer error dict with `400`. |
| Register | `POST /api/auth/register/` | `RegisterView` | Creates the user, returns `201 {user, access, refresh}`. |
| Refresh | `POST /api/auth/token/refresh/` (alias `POST /api/auth/refresh/`) | `TokenRefreshView` | Validates the supplied `refresh` token, blacklists it, mints and returns a new `{access, refresh}` pair (`ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` are on). |
| Logout | `POST /api/auth/logout/` | `LogoutView` | Blacklists the supplied `refresh` token, returns `205`. |
| Protected read | `GET /api/users/me/` (and every authenticated endpoint) | `MeView` etc. | `JWTAuthentication` is the default; an invalid/expired access token is rejected before the view with `401 {"detail": ..., "code": "token_not_valid"}`. |

Token lifetimes live in `app/backend/config/settings.py` (`SIMPLE_JWT`):
access 60 minutes, refresh 90 days.

## Which backend conditions yield which status code

Login (`POST /api/auth/login/`):

| Input | Status | Body |
| --- | --- | --- |
| Valid credentials | `200` | `{user, access, refresh}` |
| Wrong password / unknown email | `400` | `{"non_field_errors": ["Invalid credentials"]}` |
| Missing `password` (or `email`) | `400` | `{"password": ["This field is required."]}` (resp. `email`) |
| Empty request body | `400` | `{"email": [...], "password": [...]}` |
| Malformed JSON body | `400` | DRF parse-error detail |
| Non-object JSON (e.g. a list) | `400` | DRF "expected a dictionary" detail |
| `GET` (or any non-POST) | `405` | `{"detail": "Method \"GET\" not allowed."}` |

Refresh (`POST /api/auth/token/refresh/`):

| Input | Status | Body |
| --- | --- | --- |
| Valid refresh token | `200` | `{access, refresh}` (rotated) |
| Missing `refresh` | `400` | `{"detail": "Refresh token required."}` |
| Malformed / wrong-signature token | `401` | `{"detail": ..., "code": "token_not_valid"}` |
| Expired token | `401` | `{"detail": ..., "code": "token_not_valid"}` |
| Blacklisted token (after rotation or logout) | `401` | `{"detail": ..., "code": "token_not_valid"}` |

Protected endpoints with a bad `Authorization: Bearer <access>` header:

| Input | Status | Body |
| --- | --- | --- |
| Valid access token | `200` | endpoint payload |
| No header | `401` | `{"detail": "Authentication credentials were not provided."}` |
| Expired access token | `401` | `{"detail": ..., "code": "token_not_valid"}` |
| Malformed / garbage Bearer token | `401` | `{"detail": ..., "code": "token_not_valid"}` |

## Backend vs client responsibility

Backend-owned, and verified by the regression suite below:

- The login endpoint never returns `500` for a malformed request (empty body,
  garbage JSON, non-object JSON, wrong HTTP method); it always returns a
  well-shaped `4xx` JSON body and never a rendered traceback.
- `token/refresh/` returns `401 {"code": "token_not_valid"}` for an expired,
  malformed, or blacklisted refresh token, and a `400` for a missing one.
- Protected endpoints return `401 {"code": "token_not_valid"}` (not `403`, not
  `500`) for an expired or garbage access token, so clients can branch on the
  `code` field.

Client-owned (out of scope here):

- The mobile `httpClient` attaches the stored Bearer token but does not act on
  `401 {"code": "token_not_valid"}`: it does not attempt a refresh, does not
  clear stale tokens, and does not redirect to Login. A token issued by one
  backend and replayed against another (different `SECRET_KEY`), or a token
  that has simply aged past the 60-minute access lifetime, therefore surfaces
  as a silent failure on every authenticated screen. That is #405.
- Web-side retry/error-toast behaviour belongs to the frontend issues.

## Conclusion

No backend bug was found. The login, refresh, logout, and protected-endpoint
paths already return correct, stable, well-shaped responses for the failure
modes the demo exposed. The remaining demo-login flakiness is the mobile client
not handling `401 {"code": "token_not_valid"}` (tracked in #405), not a
backend defect. The deliverable here is the regression suite that pins the
contract clients retry against:
`app/backend/apps/users/tests_login_reliability.py` (16 tests; the
session-rotation/logout lifecycle is covered in `tests_session.py`, #393).

## Follow-ups (not done here)

- Login is currently unthrottled. Brute-force / rate-limiting protection on
  `POST /api/auth/login/` would be a reasonable hardening step but is out of
  scope for #TD-01; file it as a separate tech-debt item if the team wants it.
