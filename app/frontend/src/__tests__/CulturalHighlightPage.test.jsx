import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CulturalHighlightPage from '../pages/CulturalHighlightPage';
import * as culturalContentService from '../services/culturalContentService';

jest.mock('../services/culturalContentService');

function renderAt(id) {
  return render(
    <MemoryRouter initialEntries={[`/highlights/${id}`]}>
      <Routes>
        <Route path="/highlights/:id" element={<CulturalHighlightPage />} />
        <Route path="/explore" element={<div>explore-home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('CulturalHighlightPage', () => {
  it('renders the matching item title, body, region and tags', async () => {
    culturalContentService.fetchDailyCulturalContent.mockResolvedValue([
      { id: 'dc-fact-1', kind: 'fact', title: 'Lentil Soup', body: 'Across Anatolia…', region: 'Anatolian', tags: ['Anatolian', 'Healing'], link: null },
      { id: 'dc-dish-2', kind: 'dish', title: 'Other',        body: '', region: null, tags: [], link: null },
    ]);
    renderAt('dc-fact-1');
    expect(await screen.findByRole('heading', { name: /lentil soup/i })).toBeInTheDocument();
    expect(screen.getByText(/across anatolia/i)).toBeInTheDocument();
    // Region and tag can both spell "Anatolian" — assert via classnames so we
    // catch both surfaces without the multi-match ambiguity.
    expect(document.querySelector('.cultural-highlight-region')).toHaveTextContent('Anatolian');
    expect(screen.getByText('Healing')).toBeInTheDocument();
  });

  it('shows a kind badge that matches the item kind', async () => {
    culturalContentService.fetchDailyCulturalContent.mockResolvedValue([
      { id: 'dc-tradition-9', kind: 'tradition', title: 'Plov Ceremony', body: '', region: null, tags: [], link: null },
    ]);
    renderAt('dc-tradition-9');
    expect(await screen.findByText('Tradition')).toBeInTheDocument();
  });

  it('renders a not-found view when no item matches', async () => {
    culturalContentService.fetchDailyCulturalContent.mockResolvedValue([
      { id: 'dc-fact-1', kind: 'fact', title: 'Other', body: '', region: null, tags: [], link: null },
    ]);
    renderAt('dc-fact-999');
    expect(await screen.findByRole('heading', { name: /highlight not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to explore/i })).toHaveAttribute('href', '/explore');
  });

  it('renders an error state when the fetch fails', async () => {
    culturalContentService.fetchDailyCulturalContent.mockRejectedValue(new Error('boom'));
    renderAt('dc-fact-1');
    expect(await screen.findByText(/could not load this highlight/i)).toBeInTheDocument();
  });
});
