import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventDetailPage from '../pages/EventDetailPage';
import * as exploreService from '../services/exploreService';

jest.mock('../services/exploreService');

function renderPage(id = 'bogus') {
  return render(
    <MemoryRouter initialEntries={[`/explore/${id}`]}>
      <Routes>
        <Route path="/explore/:eventId" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventDetailPage', () => {
  it('shows a not-found panel when the event is missing', async () => {
    exploreService.fetchEventDetail.mockRejectedValue(new Error('not found'));
    renderPage('99999');
    await waitFor(() => {
      expect(screen.getByText(/event not found/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole('link', { name: /back to explore/i }),
    ).toHaveAttribute('href', '/explore');
  });
});
