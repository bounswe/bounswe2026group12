import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  );
}

describe('NotFoundPage', () => {
  it('displays a 404 heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /404/i })).toBeInTheDocument();
  });

  it('displays an explanatory message', () => {
    renderPage();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('provides a link back to home', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });
});
