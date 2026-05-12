import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CalendarPage from '../pages/CalendarPage';
import * as culturalEventService from '../services/culturalEventService';
import * as searchService from '../services/searchService';

jest.mock('../services/culturalEventService');
jest.mock('../services/searchService');

const EVENTS_ALL_YEAR = [
  {
    id: 1, name: 'Nevruz', date_rule: 'fixed:03-21',
    region: { id: 1, name: 'Anatolia' }, description: 'Spring equinox.',
    recipes: [{ id: 10, title: 'Sumalak' }],
  },
  {
    id: 2, name: 'Iftar', date_rule: 'lunar:ramadan',
    region: { id: 1, name: 'Anatolia' }, description: 'Ramadan break-fast.',
    recipes: [],
  },
  {
    id: 3, name: 'Dia de los Muertos', date_rule: 'fixed:11-02',
    region: null, description: 'Day of the dead.',
    recipes: [{ id: 20, title: 'Pan de Muerto' }],
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  searchService.fetchRegions.mockResolvedValue([{ id: 1, name: 'Anatolia' }]);
  culturalEventService.fetchCulturalEvents.mockResolvedValue(EVENTS_ALL_YEAR);
});

describe('CalendarPage', () => {
  it('renders all 12 month panels', async () => {
    const { container } = renderPage();
    expect(await screen.findByRole('heading', { name: /cultural food calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'January' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'December' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid^="calendar-month-"]').length).toBe(12);
  });

  it('places fixed events under the correct month and lunar events under a dedicated panel', async () => {
    renderPage();
    const march = await screen.findByTestId('calendar-month-3');
    expect(within(march).getByText('Nevruz')).toBeInTheDocument();
    const lunar = screen.getByTestId('calendar-lunar');
    expect(within(lunar).getByText('Iftar')).toBeInTheDocument();
    const november = screen.getByTestId('calendar-month-11');
    expect(within(november).getByText('Dia de los Muertos')).toBeInTheDocument();
  });

  it('filters events when the month filter is changed', async () => {
    renderPage();
    await screen.findByText('Nevruz');
    await userEvent.selectOptions(screen.getByLabelText(/month/i), '03');
    await waitFor(() => {
      expect(culturalEventService.fetchCulturalEvents).toHaveBeenLastCalledWith({ month: '03', region: '' });
    });
  });

  it('filters events when the region filter is changed', async () => {
    renderPage();
    await screen.findByText('Nevruz');
    await userEvent.selectOptions(screen.getByLabelText(/region/i), '1');
    await waitFor(() => {
      expect(culturalEventService.fetchCulturalEvents).toHaveBeenLastCalledWith({ month: '', region: '1' });
    });
  });

  it('reveals an event detail panel with linked recipes when an event card is clicked', async () => {
    renderPage();
    const card = await screen.findByRole('button', { name: /open nevruz details/i });
    await userEvent.click(card);
    const panel = await screen.findByTestId('event-detail');
    expect(within(panel).getByRole('heading', { name: /nevruz/i })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /sumalak/i })).toHaveAttribute('href', '/recipes/10');
  });
});
