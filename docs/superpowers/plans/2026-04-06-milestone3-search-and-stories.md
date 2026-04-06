# Milestone 3: Search & Stories Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Search UI with region/language filters and results display (#152, #160, #164) and Stories feature with creation form, recipe linking, and detail view (#170, #171, #172) — all on the `feat/frontend/recipe-core` branch.

**Architecture:** Extend the existing React SPA by replacing stub pages (SearchPage, StoryCreatePage, StoryDetailPage) and adding service functions and one reusable component. HomePage gets a search bar that navigates to /search with query params; SearchPage reads those params, calls the API, and renders result cards or an empty state. StoryCreatePage mirrors the established recipe-form pattern with an inline recipe-linking mini-search. StoryDetailPage follows the same data-fetch pattern as RecipeDetailPage.

**Tech Stack:** React 18, react-router-dom v6, axios (via `apiClient`), @testing-library/react, Jest

**Branch:** `feat/frontend/recipe-core` (already checked out — do NOT create a new branch)

**Run tests with:**
```bash
cd app/frontend && npm test -- --watchAll=false
```

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/frontend/src/services/searchService.js` | **Create** | `search(q, region, language)` and `fetchRegions()` API calls |
| `app/frontend/src/services/storyService.js` | **Create** | `fetchStory(id)` and `createStory(data)` API calls |
| `app/frontend/src/services/recipeService.js` | **Modify** | Add `fetchRecipes()` list call |
| `app/frontend/src/components/SearchResultCard.jsx` | **Create** | Renders one search result (recipe or story): title, type badge, region tag, link |
| `app/frontend/src/pages/HomePage.jsx` | **Modify** (replace stub) | Search bar + region + language filters → navigate to /search |
| `app/frontend/src/pages/SearchPage.jsx` | **Modify** (replace stub) | Read URL params, call search API, render cards or empty state |
| `app/frontend/src/pages/StoryCreatePage.jsx` | **Modify** (replace stub) | Story creation form (title, body, language) + recipe-linking mini-search |
| `app/frontend/src/pages/StoryDetailPage.jsx` | **Modify** (replace stub) | Fetch story by ID, render body + linked recipe card |
| `app/frontend/src/__tests__/searchService.test.js` | **Create** | Unit tests for searchService |
| `app/frontend/src/__tests__/storyService.test.js` | **Create** | Unit tests for storyService |
| `app/frontend/src/__tests__/SearchResultCard.test.jsx` | **Create** | Unit tests for SearchResultCard |
| `app/frontend/src/__tests__/SearchPage.test.jsx` | **Create** | Integration tests for SearchPage |
| `app/frontend/src/__tests__/StoryCreatePage.test.jsx` | **Create** | Integration tests for StoryCreatePage |
| `app/frontend/src/__tests__/StoryDetailPage.test.jsx` | **Create** | Integration tests for StoryDetailPage |
| `app/frontend/src/__tests__/Routing.test.jsx` | **Modify** | Update `/stories/1` assertion for new loading-state implementation |

---

## API Shapes Assumed

**Search results** (`GET /api/search/?q=...&region=...&language=...`):
```json
[
  { "type": "recipe", "id": 1, "title": "Baklava", "region": "Aegean", "thumbnail": null },
  { "type": "story",  "id": 2, "title": "Grandma's Kitchen", "region": "Aegean", "thumbnail": null }
]
```

**Regions** (`GET /api/regions/`):
```json
[{ "regionId": 1, "name": "Aegean" }, { "regionId": 2, "name": "Mediterranean" }]
```

**Story** (`GET /api/stories/:id/`):
```json
{
  "id": 1, "title": "My Story", "body": "Long text...",
  "author": { "id": 3, "username": "eren" },
  "linked_recipe": { "id": 5, "title": "Baklava", "region": "Aegean" },
  "language": "en", "is_published": true
}
```
`linked_recipe` is `null` when no recipe is attached.

**Recipes list** (`GET /api/recipes/`):
```json
[{ "id": 1, "title": "Baklava", "region": "Aegean" }, ...]
```

---

## Task 1: searchService.js

**Files:**
- Create: `app/frontend/src/services/searchService.js`
- Create: `app/frontend/src/__tests__/searchService.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/frontend/src/__tests__/searchService.test.js`:

```js
import { search, fetchRegions } from '../services/searchService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('search', () => {
  it('calls GET /api/search/ with all params', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await search('baklava', 'Aegean', 'en');
    expect(apiClient.get).toHaveBeenCalledWith('/api/search/', {
      params: { q: 'baklava', region: 'Aegean', language: 'en' },
    });
  });

  it('returns the data array from the response', async () => {
    const results = [{ type: 'recipe', id: 1, title: 'Baklava' }];
    apiClient.get.mockResolvedValue({ data: results });
    const result = await search('baklava', '', '');
    expect(result).toEqual(results);
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Network Error'));
    await expect(search('x', '', '')).rejects.toThrow('Network Error');
  });
});

describe('fetchRegions', () => {
  it('calls GET /api/regions/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ regionId: 1, name: 'Aegean' }] });
    const result = await fetchRegions();
    expect(apiClient.get).toHaveBeenCalledWith('/api/regions/');
    expect(result).toEqual([{ regionId: 1, name: 'Aegean' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="searchService"
```
Expected: FAIL with "Cannot find module '../services/searchService'"

- [ ] **Step 3: Implement searchService.js**

Create `app/frontend/src/services/searchService.js`:

```js
import { apiClient } from './api';

export async function search(q, region, language) {
  const response = await apiClient.get('/api/search/', {
    params: { q, region, language },
  });
  return response.data;
}

export async function fetchRegions() {
  const response = await apiClient.get('/api/regions/');
  return response.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="searchService"
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/services/searchService.js app/frontend/src/__tests__/searchService.test.js
git commit -m "feat(frontend): add searchService for search and regions API calls (#152)"
```

---

## Task 2: storyService.js and fetchRecipes

**Files:**
- Create: `app/frontend/src/services/storyService.js`
- Create: `app/frontend/src/__tests__/storyService.test.js`
- Modify: `app/frontend/src/services/recipeService.js`
- Modify: `app/frontend/src/__tests__/recipeService.test.js`

- [ ] **Step 1: Write the failing test for storyService**

Create `app/frontend/src/__tests__/storyService.test.js`:

```js
import { fetchStory, createStory } from '../services/storyService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('fetchStory', () => {
  it('calls GET /api/stories/:id/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1, title: 'My Story' } });
    const result = await fetchStory(1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/stories/1/');
    expect(result).toEqual({ id: 1, title: 'My Story' });
  });

  it('propagates API errors', async () => {
    apiClient.get.mockRejectedValue(new Error('Not found'));
    await expect(fetchStory(99)).rejects.toThrow('Not found');
  });
});

describe('createStory', () => {
  it('calls POST /api/stories/ with story data', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 2, title: 'New Story' } });
    const payload = { title: 'New Story', body: 'text', language: 'en', linked_recipe: null };
    const result = await createStory(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/', payload);
    expect(result).toEqual({ id: 2, title: 'New Story' });
  });

  it('includes linked_recipe id when provided', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 3 } });
    await createStory({ title: 'T', body: 'B', language: 'en', linked_recipe: 5 });
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/', {
      title: 'T', body: 'B', language: 'en', linked_recipe: 5,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="storyService"
```
Expected: FAIL with "Cannot find module '../services/storyService'"

- [ ] **Step 3: Implement storyService.js**

Create `app/frontend/src/services/storyService.js`:

```js
import { apiClient } from './api';

export async function fetchStory(id) {
  const response = await apiClient.get(`/api/stories/${id}/`);
  return response.data;
}

export async function createStory(data) {
  const response = await apiClient.post('/api/stories/', data);
  return response.data;
}
```

- [ ] **Step 4: Run storyService tests to verify they pass**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="storyService"
```
Expected: PASS (4 tests)

- [ ] **Step 5: Write failing test for fetchRecipes**

Append this describe block to `app/frontend/src/__tests__/recipeService.test.js` (after the last describe block, before the final closing):

```js
describe('fetchRecipes', () => {
  it('calls GET /api/recipes/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 1, title: 'Baklava' }] });
    const result = await fetchRecipes();
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/');
    expect(result).toEqual([{ id: 1, title: 'Baklava' }]);
  });
});
```

Also add `fetchRecipes` to the import at the top of that file:
```js
import {
  fetchRecipe,
  fetchRecipes,
  createRecipe,
  updateRecipe,
  fetchIngredients,
  fetchUnits,
  submitIngredient,
  submitUnit,
} from '../services/recipeService';
```

- [ ] **Step 6: Run recipeService tests to verify new test fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="recipeService"
```
Expected: FAIL with "fetchRecipes is not a function"

- [ ] **Step 7: Add fetchRecipes to recipeService.js**

Append to `app/frontend/src/services/recipeService.js`:

```js
export async function fetchRecipes() {
  const response = await apiClient.get('/api/recipes/');
  return response.data;
}
```

- [ ] **Step 8: Run recipeService tests to verify all pass**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="recipeService"
```
Expected: PASS (all existing tests + new fetchRecipes test)

- [ ] **Step 9: Commit**

```bash
git add app/frontend/src/services/storyService.js \
        app/frontend/src/__tests__/storyService.test.js \
        app/frontend/src/services/recipeService.js \
        app/frontend/src/__tests__/recipeService.test.js
git commit -m "feat(frontend): add storyService and fetchRecipes for story and recipe listing (#170)"
```

---

## Task 3: SearchResultCard component

**Files:**
- Create: `app/frontend/src/components/SearchResultCard.jsx`
- Create: `app/frontend/src/__tests__/SearchResultCard.test.jsx`

The card receives one search result `{ type, id, title, region, thumbnail }` and renders a link to either `/recipes/:id` or `/stories/:id`.

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/src/__tests__/SearchResultCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchResultCard from '../components/SearchResultCard';

const recipeResult = { type: 'recipe', id: 1, title: 'Baklava', region: 'Aegean', thumbnail: null };
const storyResult  = { type: 'story',  id: 2, title: 'Grandma\'s Kitchen', region: 'Mediterranean', thumbnail: null };

function renderCard(result) {
  return render(
    <MemoryRouter>
      <SearchResultCard result={result} />
    </MemoryRouter>
  );
}

describe('SearchResultCard', () => {
  it('renders the result title', () => {
    renderCard(recipeResult);
    expect(screen.getByText('Baklava')).toBeInTheDocument();
  });

  it('renders the region tag', () => {
    renderCard(recipeResult);
    expect(screen.getByText('Aegean')).toBeInTheDocument();
  });

  it('renders a type badge for recipe', () => {
    renderCard(recipeResult);
    expect(screen.getByText(/recipe/i)).toBeInTheDocument();
  });

  it('renders a type badge for story', () => {
    renderCard(storyResult);
    expect(screen.getByText(/story/i)).toBeInTheDocument();
  });

  it('links to /recipes/:id for recipe results', () => {
    renderCard(recipeResult);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/recipes/1');
  });

  it('links to /stories/:id for story results', () => {
    renderCard(storyResult);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/stories/2');
  });

  it('renders without thumbnail when thumbnail is null', () => {
    renderCard(recipeResult);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="SearchResultCard"
```
Expected: FAIL with "Cannot find module '../components/SearchResultCard'"

- [ ] **Step 3: Implement SearchResultCard.jsx**

Create `app/frontend/src/components/SearchResultCard.jsx`:

```jsx
import { Link } from 'react-router-dom';

export default function SearchResultCard({ result }) {
  const { type, id, title, region } = result;
  const href = type === 'recipe' ? `/recipes/${id}` : `/stories/${id}`;

  return (
    <article>
      <Link to={href}>
        <span>{type}</span>
        <h3>{title}</h3>
        {region && <span>{region}</span>}
      </Link>
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="SearchResultCard"
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/components/SearchResultCard.jsx \
        app/frontend/src/__tests__/SearchResultCard.test.jsx
git commit -m "feat(frontend): add SearchResultCard component for search results display (#160)"
```

---

## Task 4: HomePage with Search Bar

**Files:**
- Modify: `app/frontend/src/pages/HomePage.jsx`
- Create: `app/frontend/src/__tests__/HomePage.test.jsx`

The home page renders a search bar, region dropdown (populated from `/api/regions/`), and language selector. On submit it navigates to `/search?q=...&region=...&language=...`.

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/src/__tests__/HomePage.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import * as searchService from '../services/searchService';

jest.mock('../services/searchService');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
const mockNavigate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  searchService.fetchRegions.mockResolvedValue([
    { regionId: 1, name: 'Aegean' },
    { regionId: 2, name: 'Mediterranean' },
  ]);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('renders a search input', async () => {
    renderPage();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('populates region dropdown from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Aegean' })).toBeInTheDocument();
    });
  });

  it('navigates to /search with query params on submit', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('option', { name: 'Aegean' }));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'baklava' } });
    fireEvent.change(screen.getByLabelText(/region/i), { target: { value: 'Aegean' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/search?q=baklava&region=Aegean&language='
    );
  });

  it('navigates with empty params when no input is given', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=&region=&language=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="HomePage"
```
Expected: FAIL (stub HomePage has no search input)

- [ ] **Step 3: Implement HomePage.jsx**

Replace `app/frontend/src/pages/HomePage.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRegions } from '../services/searchService';

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('');
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(region)}&language=${encodeURIComponent(language)}`);
  }

  return (
    <main>
      <h1>Home</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="search-input">Search</label>
        <input
          id="search-input"
          role="searchbox"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recipes and stories…"
        />

        <label htmlFor="region-select">Region</label>
        <select
          id="region-select"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r.regionId} value={r.name}>{r.name}</option>
          ))}
        </select>

        <label htmlFor="language-select">Language</label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="tr">Turkish</option>
        </select>

        <button type="submit">Search</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run HomePage tests to verify they pass**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="HomePage"
```
Expected: PASS (5 tests)

- [ ] **Step 5: Verify Routing.test.jsx still passes for `/`**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="Routing"
```
Expected: PASS — the `/` test checks for `heading { name: /home/i }` which `<h1>Home</h1>` satisfies.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/pages/HomePage.jsx \
        app/frontend/src/__tests__/HomePage.test.jsx
git commit -m "feat(frontend): implement homepage search bar with region and language filters (#152)"
```

---

## Task 5: SearchPage with Results and Empty State

**Files:**
- Modify: `app/frontend/src/pages/SearchPage.jsx`
- Create: `app/frontend/src/__tests__/SearchPage.test.jsx`

SearchPage reads `q`, `region`, `language` from the URL query string, calls the search API, and renders `SearchResultCard` components or an empty state message.

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/src/__tests__/SearchPage.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SearchPage from '../pages/SearchPage';
import * as searchService from '../services/searchService';

jest.mock('../services/searchService');

const mockResults = [
  { type: 'recipe', id: 1, title: 'Baklava', region: 'Aegean', thumbnail: null },
  { type: 'story',  id: 2, title: "Grandma's Kitchen", region: 'Mediterranean', thumbnail: null },
];

function renderPage(search = '?q=baklava&region=&language=') {
  return render(
    <MemoryRouter initialEntries={[`/search${search}`]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('SearchPage', () => {
  it('shows loading state initially', () => {
    searchService.search.mockResolvedValue(mockResults);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders result cards after API resolves', async () => {
    searchService.search.mockResolvedValue(mockResults);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Baklava')).toBeInTheDocument();
      expect(screen.getByText("Grandma's Kitchen")).toBeInTheDocument();
    });
  });

  it('passes correct params to search service from URL', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=soup&region=Aegean&language=en');
    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith('soup', 'Aegean', 'en');
    });
  });

  it('shows empty state message when no results returned', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=xyz&region=&language=');
    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it('search controls remain in the page after no-result search', async () => {
    searchService.search.mockResolvedValue([]);
    renderPage('?q=xyz&region=&language=');
    await waitFor(() => screen.getByText(/no results found/i));
    expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    searchService.search.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="SearchPage"
```
Expected: FAIL (stub renders nothing useful)

- [ ] **Step 3: Implement SearchPage.jsx**

Replace `app/frontend/src/pages/SearchPage.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '../services/searchService';
import SearchResultCard from '../components/SearchResultCard';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const region = searchParams.get('region') || '';
  const language = searchParams.get('language') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    search(q, region, language)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setError('Could not load results.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, region, language]);

  return (
    <main>
      <h1>Search</h1>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p>No results found. Try a different keyword or region.</p>
      )}
      {!loading && !error && results.length > 0 && (
        <section>
          {results.map((result) => (
            <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
          ))}
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run SearchPage tests to verify they pass**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="SearchPage"
```
Expected: PASS (6 tests)

- [ ] **Step 5: Verify Routing.test.jsx `/search` test still passes**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="Routing"
```
The `/search` test checks for `heading { name: /search/i }` — the `<h1>Search</h1>` satisfies this. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/pages/SearchPage.jsx \
        app/frontend/src/__tests__/SearchPage.test.jsx
git commit -m "feat(frontend): implement SearchPage with results grid and empty state (#152, #160, #164)"
```

---

## Task 6: StoryCreatePage with Recipe Linking

**Files:**
- Modify: `app/frontend/src/pages/StoryCreatePage.jsx`
- Create: `app/frontend/src/__tests__/StoryCreatePage.test.jsx`

The page renders a form with title, body, language (select), and an optional recipe-linking section. The recipe-linking section shows a text input that filters the recipes list client-side; selecting a recipe stores its ID. On submit, POSTs to `/api/stories/`.

- [ ] **Step 1: Write the failing tests**

Create `app/frontend/src/__tests__/StoryCreatePage.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import StoryCreatePage from '../pages/StoryCreatePage';
import * as storyService from '../services/storyService';
import * as recipeService from '../services/recipeService';

jest.mock('../services/storyService');
jest.mock('../services/recipeService');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
const mockNavigate = jest.fn();

const mockRecipes = [
  { id: 1, title: 'Baklava', region: 'Aegean' },
  { id: 2, title: 'Menemen', region: 'Aegean' },
];

function renderPage() {
  return render(
    <AuthContext.Provider value={{ user: { id: 1 }, token: 'tok', login: jest.fn(), logout: jest.fn() }}>
      <MemoryRouter>
        <StoryCreatePage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  recipeService.fetchRecipes.mockResolvedValue(mockRecipes);
  storyService.createStory.mockResolvedValue({ id: 10, title: 'My Story' });
});

describe('StoryCreatePage', () => {
  it('renders the Create Story heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument();
  });

  it('renders title, body, and language fields', () => {
    renderPage();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it('shows validation error when title is empty on submit', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows validation error when body is empty on submit', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'A Story' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/body is required/i)).toBeInTheDocument();
  });

  it('submits with title, body, language and no linked recipe', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Story' } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: 'Some text here.' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(storyService.createStory).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Story', body: 'Some text here.' })
      );
    });
  });

  it('navigates to story detail page after successful submission', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Story' } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: 'Some text.' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/stories/10');
    });
  });

  it('renders the recipe linking section with a search input', async () => {
    renderPage();
    expect(await screen.findByPlaceholderText(/search recipes/i)).toBeInTheDocument();
  });

  it('filters recipe list by search term', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText(/search recipes/i));
    fireEvent.change(screen.getByPlaceholderText(/search recipes/i), { target: { value: 'bak' } });
    expect(screen.getByText('Baklava')).toBeInTheDocument();
    expect(screen.queryByText('Menemen')).not.toBeInTheDocument();
  });

  it('allows selecting a recipe and reflects it as linked', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText(/search recipes/i));
    fireEvent.change(screen.getByPlaceholderText(/search recipes/i), { target: { value: 'Baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(await screen.findByText(/linked: baklava/i)).toBeInTheDocument();
  });

  it('includes linked_recipe id in submission payload', async () => {
    renderPage();
    await waitFor(() => screen.getByPlaceholderText(/search recipes/i));
    fireEvent.change(screen.getByPlaceholderText(/search recipes/i), { target: { value: 'Baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Story' } });
    fireEvent.change(screen.getByLabelText(/body/i), { target: { value: 'Some text.' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(storyService.createStory).toHaveBeenCalledWith(
        expect.objectContaining({ linked_recipe: 1 })
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="StoryCreatePage"
```
Expected: FAIL (stub page renders nothing useful)

- [ ] **Step 3: Implement StoryCreatePage.jsx**

Replace `app/frontend/src/pages/StoryCreatePage.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStory } from '../services/storyService';
import { fetchRecipes } from '../services/recipeService';
import Toast from '../components/Toast';

export default function StoryCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState('en');
  const [linkedRecipe, setLinkedRecipe] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [allRecipes, setAllRecipes] = useState([]);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchRecipes().then(setAllRecipes).catch(() => {});
  }, []);

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  function validate() {
    const e = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!body.trim()) e.body = 'Body is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title,
      body,
      language,
      is_published: true,
      linked_recipe: linkedRecipe ? linkedRecipe.id : null,
    };

    try {
      const created = await createStory(payload);
      showToast('Story published!', 'success');
      setTimeout(() => navigate(`/stories/${created.id}`), 1500);
    } catch {
      showToast('Failed to publish story. Please try again.', 'error');
    }
  }

  const filteredRecipes = recipeSearch.trim()
    ? allRecipes.filter((r) =>
        r.title.toLowerCase().includes(recipeSearch.toLowerCase())
      )
    : allRecipes;

  return (
    <main>
      <h1>Create Story</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="story-title">Title</label>
          <input
            id="story-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="story-body">Body</label>
          <textarea
            id="story-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {errors.body && <p className="field-error">{errors.body}</p>}
        </div>

        <div>
          <label htmlFor="story-language">Language</label>
          <select
            id="story-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="tr">Turkish</option>
          </select>
        </div>

        <section>
          <h2>Link a Recipe (optional)</h2>
          {linkedRecipe && (
            <p>Linked: {linkedRecipe.title}</p>
          )}
          <input
            type="text"
            placeholder="Search recipes…"
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
          />
          <ul>
            {filteredRecipes.map((r) => (
              <li key={r.id}>
                {r.title}
                <button
                  type="button"
                  onClick={() => {
                    setLinkedRecipe(r);
                    setRecipeSearch('');
                  }}
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
        </section>

        <button type="submit">Publish</button>
      </form>

      <Toast message={toast.message} type={toast.type} />
    </main>
  );
}
```

- [ ] **Step 4: Run StoryCreatePage tests to verify they pass**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="StoryCreatePage"
```
Expected: PASS (10 tests)

- [ ] **Step 5: Verify Routing.test.jsx `/stories/new` test still passes**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="Routing"
```
The test checks for `heading { name: /create story/i }` — satisfied by `<h1>Create Story</h1>`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/pages/StoryCreatePage.jsx \
        app/frontend/src/__tests__/StoryCreatePage.test.jsx
git commit -m "feat(frontend): implement StoryCreatePage with recipe linking component (#170, #171)"
```

---

## Task 7: StoryDetailPage

**Files:**
- Modify: `app/frontend/src/pages/StoryDetailPage.jsx`
- Create: `app/frontend/src/__tests__/StoryDetailPage.test.jsx`
- Modify: `app/frontend/src/__tests__/Routing.test.jsx`

The page fetches the story by ID from the URL, renders title, body, author, and conditionally a linked recipe preview card that links to `/recipes/:id`.

- [ ] **Step 1: Update the Routing.test.jsx for StoryDetailPage**

The current test at line 43-44 expects a heading matching `/story detail/i`. The new implementation will show loading text while the story fetches — update it to match RecipeDetailPage's routing test pattern.

In `app/frontend/src/__tests__/Routing.test.jsx`, change:
```js
test('/stories/1 renders StoryDetail page', () => {
    renderApp('/stories/1');
    expect(screen.getByRole('heading', { name: /story detail/i })).toBeInTheDocument();
  });
```
to:
```js
test('/stories/1 renders StoryDetail page', () => {
    renderApp('/stories/1');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run Routing tests to confirm the updated test now fails on the stub**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="Routing"
```
Expected: FAIL on the `/stories/1` test (stub has no loading text)

- [ ] **Step 3: Write the failing StoryDetailPage tests**

Create `app/frontend/src/__tests__/StoryDetailPage.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StoryDetailPage from '../pages/StoryDetailPage';
import * as storyService from '../services/storyService';

jest.mock('../services/storyService');

const mockStory = {
  id: 1,
  title: 'Grandma\'s Sunday Kitchen',
  body: 'Every Sunday morning the smell of fresh bread...',
  author: { id: 3, username: 'eren' },
  linked_recipe: { id: 5, title: 'Baklava', region: 'Aegean' },
  language: 'en',
  is_published: true,
};

const mockStoryNoRecipe = { ...mockStory, linked_recipe: null };

function renderPage(storyId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/stories/${storyId}`]}>
      <Routes>
        <Route path="/stories/:id" element={<StoryDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  storyService.fetchStory.mockResolvedValue(mockStory);
});

describe('StoryDetailPage', () => {
  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays story title after load', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Grandma's Sunday Kitchen")).toBeInTheDocument()
    );
  });

  it('displays story body after load', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/every sunday morning/i)).toBeInTheDocument()
    );
  });

  it('displays author username', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/eren/i)).toBeInTheDocument()
    );
  });

  it('shows linked recipe card with title when recipe is attached', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Baklava')).toBeInTheDocument()
    );
  });

  it('linked recipe card links to /recipes/:id', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Baklava'));
    expect(screen.getByRole('link', { name: /baklava/i })).toHaveAttribute('href', '/recipes/5');
  });

  it('does NOT show linked recipe section when no recipe is attached', async () => {
    storyService.fetchStory.mockResolvedValue(mockStoryNoRecipe);
    renderPage();
    await waitFor(() => screen.getByText("Grandma's Sunday Kitchen"));
    expect(screen.queryByText('Baklava')).not.toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    storyService.fetchStory.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 4: Run StoryDetailPage tests to verify they fail**

```bash
cd app/frontend && npm test -- --watchAll=false --testPathPattern="StoryDetailPage"
```
Expected: FAIL (stub page renders nothing useful)

- [ ] **Step 5: Implement StoryDetailPage.jsx**

Replace `app/frontend/src/pages/StoryDetailPage.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchStory } from '../services/storyService';

export default function StoryDetailPage() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStory(id)
      .then((data) => { if (!cancelled) setStory(data); })
      .catch(() => { if (!cancelled) setError('Could not load story.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!story) return null;

  return (
    <main>
      <h1>{story.title}</h1>
      {story.author && <p>By {story.author.username}</p>}
      <p>{story.body}</p>

      {story.linked_recipe && (
        <section>
          <h2>Linked Recipe</h2>
          <Link to={`/recipes/${story.linked_recipe.id}`}>
            {story.linked_recipe.title}
          </Link>
          {story.linked_recipe.region && (
            <span> — {story.linked_recipe.region}</span>
          )}
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Run all tests to verify everything passes**

```bash
cd app/frontend && npm test -- --watchAll=false
```
Expected: ALL PASS — including updated Routing test and new StoryDetailPage tests.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/src/pages/StoryDetailPage.jsx \
        app/frontend/src/__tests__/StoryDetailPage.test.jsx \
        app/frontend/src/__tests__/Routing.test.jsx
git commit -m "feat(frontend): implement StoryDetailPage with linked recipe preview (#172)"
```

---

## Task 8: Final Verification and Push

- [ ] **Step 1: Run the full test suite one final time**

```bash
cd app/frontend && npm test -- --watchAll=false
```
Expected: ALL PASS with 0 failures.

- [ ] **Step 2: Push the branch**

```bash
git push origin feat/frontend/recipe-core
```

- [ ] **Step 3: Open a Pull Request**

```bash
gh pr create \
  --title "feat(frontend): implement Milestone 3 – Search UI and Stories" \
  --body "$(cat <<'EOF'
## Summary
- Implements search bar + region/language filters on HomePage (#152)
- Implements SearchPage with result cards and empty state (#160, #164)
- Implements StoryCreatePage with recipe-linking mini-search (#170, #171)
- Implements StoryDetailPage with linked recipe preview card (#172)
- Adds searchService, storyService; extends recipeService with fetchRecipes

## Issues closed
Closes #152, #160, #164, #170, #171, #172

## Test plan
- [ ] Run `npm test -- --watchAll=false` in `app/frontend/` — all tests pass
- [ ] `GET /` shows search bar; entering a query and clicking Search navigates to `/search?q=...`
- [ ] `/search?q=baklava` calls `/api/search/` and shows result cards; each card links to correct detail page
- [ ] Empty search returns "No results found" message; heading and filters remain visible
- [ ] `/stories/new` (authenticated) renders Story Creation form with recipe-linking section
- [ ] Selecting a recipe in story form shows "Linked: <title>"; submitting includes `linked_recipe` in payload
- [ ] `/stories/:id` shows story title, body, author, and linked recipe card (or no card if unlinked)
EOF
)"
```

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|---|---|
| Search bar accessible from home page (3.3.1) | Task 4 — HomePage |
| Region filter available alongside search bar (3.3.2, 3.3.3) | Task 4 — HomePage |
| Search returns recipes and stories matching region (3.3.4) | Task 5 — SearchPage calls searchService with region |
| Results display title, thumbnail, region tag (3.3.5) | Task 3 — SearchResultCard |
| Clicking result navigates to detail page (3.3.7) | Task 3 — SearchResultCard links |
| "No results" message shown when empty (3.3.6, 3.3.8) | Task 5 — SearchPage empty state |
| Stories linked recipe searchable in creation (3.3.9) | Task 6 — StoryCreatePage recipe linking |
| Stories include title and body (3.5.1) | Task 6 — StoryCreatePage form |
| Stories may include linked recipe (3.5.2) | Task 6 — StoryCreatePage recipe linking |
| Required fields validated before publishing (3.5.3) | Task 6 — validate() function |
| Published stories publicly visible (3.5.4) | Task 6 — `is_published: true` in payload |
| Story detail shows linked recipe preview with navigable link (3.5.5, 3.5.6) | Task 7 — StoryDetailPage |

All requirements covered.

### Placeholder scan

No TBD, TODO, or "implement later" phrases. All code steps contain actual implementation.

### Type consistency

- `fetchRecipes()` defined in Task 2, imported in Task 6 (StoryCreatePage) — consistent
- `createStory(data)` defined in Task 2, called in Task 6 — consistent: `{ title, body, language, is_published, linked_recipe }`
- `fetchStory(id)` defined in Task 2, used in Task 7 — consistent
- `search(q, region, language)` defined in Task 1, called in Task 5 — consistent
- `SearchResultCard` props: `result` with `{ type, id, title, region, thumbnail }` — defined in Task 3, consumed in Task 5 — consistent
- `linked_recipe` key used in Tasks 6 and 7 — consistent with assumed API shape
