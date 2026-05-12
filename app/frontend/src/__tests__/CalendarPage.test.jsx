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

  it('places fixed events under the correct month and resolves lunar events into their month panel', async () => {
    renderPage();
    await screen.findByText('Nevruz');
    const march = screen.getByTestId('calendar-month-3');
    expect(within(march).getByText('Nevruz')).toBeInTheDocument();
    const ramadanResolved = require('../services/calendarService').LUNAR_YEARLY[new Date().getFullYear()]?.ramadan;
    if (ramadanResolved) {
      const ramadanPanel = screen.getByTestId(`calendar-month-${ramadanResolved.month}`);
      expect(within(ramadanPanel).getByText('Iftar')).toBeInTheDocument();
    }
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

describe('CalendarPage — lunar resolution + subline (#669)', () => {
  const ramadanCurrentYear = require('../services/calendarService').LUNAR_YEARLY[new Date().getFullYear()]?.ramadan;

  beforeEach(() => {
    searchService.fetchRegions.mockResolvedValue([{ id: 1, name: 'All Regions' }]);
  });

  it('drops a current-year lunar event into its resolved month panel', async () => {
    if (!ramadanCurrentYear) {
      return;
    }
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 1, name: 'Ramadan', date_rule: 'lunar:ramadan', region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
    ]);
    renderPage();
    await screen.findAllByText(/ramadan/i);
    const monthPanel = screen.getByTestId(`calendar-month-${ramadanCurrentYear.month}`);
    const within = require('@testing-library/react').within;
    expect(within(monthPanel).getAllByText(/ramadan/i).length).toBeGreaterThan(0);
  });

  it('shows a lunar subline on every lunar event card', async () => {
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 2, name: 'Eid al-Adha', date_rule: 'lunar:eid-adha', region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
    ]);
    renderPage();
    expect(await screen.findByText(/on the lunar calendar/i)).toBeInTheDocument();
  });

  it('keeps unresolved lunar events in a "Lunar / movable feasts" section with (movable)', async () => {
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 3, name: 'Made-up Lunar', date_rule: 'lunar:unknown-name', region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
    ]);
    renderPage();
    expect(await screen.findByText(/lunar.+movable feasts/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\(movable\)/i).length).toBeGreaterThan(0);
  });

  it('renders a dark badge on lunar cards and the regular badge on fixed cards', async () => {
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 4, name: 'Hıdırellez',  date_rule: 'fixed:05-06',    region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
      { id: 5, name: 'Eid al-Adha', date_rule: 'lunar:eid-adha', region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
    ]);
    const { container } = renderPage();
    await screen.findByText(/hıdırellez/i);
    expect(container.querySelectorAll('.calendar-event-badge.is-lunar').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.calendar-event-badge:not(.is-lunar)').length).toBeGreaterThan(0);
  });

  it('resolves backend snake_case slugs (eid_al_adha) the same as kebab-case', async () => {
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 6, name: 'Eid al-Adha', date_rule: 'lunar:eid_al_adha', region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
    ]);
    renderPage();
    expect(await screen.findByText(/on the lunar calendar/i)).toBeInTheDocument();
    // (movable) only appears when unresolved; with the table entry it must NOT appear.
    expect(screen.queryByText(/\(movable\)/i)).not.toBeInTheDocument();
  });

  it('resolves Diwali (newly added to the lookup) instead of marking it movable', async () => {
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 7, name: 'Diwali', date_rule: 'lunar:diwali', region: { id: 1, name: 'Indian' }, description: '', recipes: [] },
    ]);
    renderPage();
    expect(await screen.findByText(/on the lunar calendar/i)).toBeInTheDocument();
    expect(screen.queryByText(/\(movable\)/i)).not.toBeInTheDocument();
  });

  it('shows the pretty event name in the subline rather than the raw slug', async () => {
    culturalEventService.fetchCulturalEvents.mockResolvedValue([
      { id: 8, name: 'Eid al-Adha', date_rule: 'lunar:eid_al_adha', region: { id: 1, name: 'All Regions' }, description: '', recipes: [] },
    ]);
    renderPage();
    expect(await screen.findByText(/On the lunar calendar: Eid al-Adha this year/i)).toBeInTheDocument();
  });
});
