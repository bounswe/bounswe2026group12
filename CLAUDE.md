# Genipe — Claude Code Guide

Genipe is a culturally-aware recipe & story sharing platform with three clients: React web frontend, mobile app, and a REST backend.

**Obsidian vault:** `/Users/daglar/Desktop/obsidian notes/voltran notes/voltran/genipe/`
— authoritative notes on frontend architecture, pages, components, services, patterns, conventions, and open issues. Check it when exploring unfamiliar parts of the frontend.

---

## Repo layout

```
app/
  frontend/   React 19 web app (this is the primary focus)
  backend/    Django REST API
  mobile/     React Native app
docs/
ops/
```

## My role

Web frontend developer (React). Work is scoped to `app/frontend/`.

---

## Frontend

**Stack:** React 19 · Create React App · React Router v6 · Axios · plain CSS

**Root:** `app/frontend/src/`

```
src/
├── App.js                 # routing + layout shell
├── index.js               # ReactDOM root, wraps BrowserRouter + AuthProvider
├── styles/global.css      # design tokens (CSS vars)
├── context/AuthContext.jsx
├── components/            # reusable UI components
├── pages/                 # one .jsx + .css per page
├── services/              # api.js, authService, recipeService, messageService…
├── mocks/                 # fake data used when REACT_APP_USE_MOCK=true
└── __tests__/
```

### Dev commands

```bash
cd app/frontend && npm start             # localhost:3000
CI=true npm test                         # all tests, non-interactive
npm test -- --testPathPattern="PageName" # single test file
```

### Env

```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_USE_MOCK=true    # skip backend entirely
```

### Design tokens (global.css)

| Variable | Value |
|---|---|
| `--color-bg` | `#C4521E` (rust) |
| `--color-surface` | `#FAF7EF` (cream) |
| `--color-surface-dark` | `#3D1500` (dark brown) |
| `--color-primary` | `#C4521E` |
| `--font-display` | Fraunces (headings) |
| `--font-body` | DM Sans (body) |

Button classes: `.btn`, `.btn-primary`, `.btn-outline`, `.btn-danger`, `.btn-sm`

### Route map

| Path | Page | Auth required |
|---|---|---|
| `/` | HomePage | No |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/search` | SearchPage | No |
| `/recipes` | RecipeListPage | No |
| `/recipes/:id` | RecipeDetailPage | No |
| `/recipes/new` | RecipeCreatePage | Yes |
| `/recipes/:id/edit` | RecipeEditPage | Yes |
| `/stories` | StoryListPage | No |
| `/stories/:id` | StoryDetailPage | No |
| `/stories/new` | StoryCreatePage | Yes |
| `/stories/:id/edit` | StoryEditPage | Yes |
| `/inbox` | InboxPage | Yes |
| `/inbox/:threadId` | ThreadPage | Yes |

---

## Git conventions

### Commits
```
type(scope): short description (#issue-number)
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`

Examples:
```
feat(frontend): add inbox list and thread view pages (#340)
fix(frontend): use named import for apiClient in messageService (#340)
```

### Branches
```
type/area/short-description
```
Examples: `feat/frontend/contact-author-messaging`, `fix/frontend/navbar-rendering`

### PRs
- Branch from `main`, squash and merge, delete branch after merge
- At least 1 approval required; cannot self-approve
- No AI attribution in commits or PR descriptions

### PR Description Format (örnek)

```
Summary
<Component/Page>: <What was broken and why> + <What was done to fix it>.
<Component/Page>: <What changed and why>.
...

Test plan
 [ ] <Sayfaya git, şunu gör>
 [ ] <Şu aksiyonu yap, şunu doğrula>
 [ ] <Regresyon kontrolü>
```

Örnek:
```
Summary
Explore page: The page was broken because exploreService called a
non-existent /api/explore/events/ endpoint. Fixed to use the existing
/api/recommendations/?surface=explore endpoint.

Search filters: Replaced three always-visible filter boxes with
collapsible accordion panels. Panels show an active-selection count badge.

Test plan
 [ ] Navigate to /explore — recipes and stories load in two rails
 [ ] Search for a term, open/close accordion panels, verify badge counts
 [ ] Open Map page, click regions, verify recipe/story lists load
```

---

## KURALLAR

- KULLANICIDAN AÇIKÇA ONAY ALMADAN HİÇBİR ZAMAN PR AÇMA
- COMMIT MESAJLARINDA VEYA PR AÇIKLAMALARINDA CLAUDE'UN YAPTIĞINI BELİRTEN HİÇBİR ŞEY YAZMA
- KULLANICI TARAFINDAN AÇILAN PR VEYA ISSUE'LARI DOĞRUDAN KAPATMA — bunun yerine PR/issue'ya açıklayıcı bir yorum bırak ve assignee'den kapatmasını iste

---

## Kod kalitesi — PR standartları

Her feature implementasyonunda şu yaklaşımı uygula:

### Bileşen ayrımı
- Her mantıksal parçayı ayrı component olarak çıkar (tek büyük sayfa dosyasına sığıştırma)
- Örnek: `HeritageJourneySection.jsx`, `CulturalFactCard.jsx` ayrı bileşenler olmalı

### Servis katmanı
- Her domain için ayrı servis dosyası: `heritageService.js`, `culturalFactService.js`, `culturalEventService.js`
- Tek servis dosyasına birden fazla domain sıkıştırma

### Pure utility fonksiyonlar
- Test edilebilir mantığı (hesaplamalar, dönüşümler) component dışına `utils/` altına al
- Örnek: `utils/heritageMidpoint.js` — böylece Leaflet olmadan test edilebilir

### Testler — birlikte yaz
- Kodu yazarken test de yaz, sonraya bırakma
- Her yeni servis için servis testi (`__tests__/fooService.test.js`)
- Her yeni component/page için component testi
- Her yeni util için unit testi
- `REACT_APP_USE_MOCK=false` olduğunda `apiClient` çağrıldığını doğrula

### Test ortamı
- `.env.test` dosyası her zaman `REACT_APP_USE_MOCK=false` içermeli (CI'da servis testleri gerçek apiClient path'ini test eder)
- Yeni `createContext` kullanımlarında `null` yerine safe default value ver (test renderlarında crash önler)

---

## Milestones

| Milestone | Theme | Due |
|---|---|---|
| M5 | Cultural & Discovery Features | 2026-05-07 |
| M6 | Accessibility & Polish | 2026-05-07 |
| QA | Integration, QA & Demo | 2026-05-14 |
| TD | Tech Debt & Fixes | 2026-05-24 |
