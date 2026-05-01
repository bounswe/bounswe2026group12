import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import App from '../App';

function renderApp(initialPath, token = null) {
  render(
    <AuthContext.Provider value={{ token, user: token ? { id: 1, username: 'u1' } : null, login: jest.fn(), logout: jest.fn(), updateUser: jest.fn() }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('Public routes (unauthenticated)', () => {
  test('/ renders Home page', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: /discover/i })).toBeInTheDocument();
  });

  test('/login renders Login page', () => {
    renderApp('/login');
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  test('/register renders Register page', () => {
    renderApp('/register');
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
  });

  test('/search renders Search page', () => {
    renderApp('/search');
    expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument();
  });

  test('/recipes/1 renders RecipeDetail page', () => {
    renderApp('/recipes/1');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('/stories/1 renders StoryDetail page', () => {
    renderApp('/stories/1');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

describe('Protected routes (unauthenticated)', () => {
  test('/recipes/new redirects to /login', () => {
    renderApp('/recipes/new', null);
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  test('/stories/new redirects to /login', () => {
    renderApp('/stories/new', null);
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  test('/onboarding redirects to /login', () => {
    renderApp('/onboarding', null);
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });
});

describe('Protected routes (authenticated)', () => {
  test('/recipes/new renders RecipeCreate page when authenticated', () => {
    renderApp('/recipes/new', 'valid-token');
    expect(screen.getByRole('heading', { name: /create recipe/i })).toBeInTheDocument();
  });

  test('/stories/new renders StoryCreate page when authenticated', () => {
    renderApp('/stories/new', 'valid-token');
    expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument();
  });

  test('/onboarding renders Cultural Onboarding page when authenticated', () => {
    renderApp('/onboarding', 'valid-token');
    expect(screen.getByRole('heading', { name: /cultural onboarding/i })).toBeInTheDocument();
  });
});
