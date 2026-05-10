import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FloatingCulturalPrompt from '../components/FloatingCulturalPrompt';
import * as mapService from '../services/mapService';

jest.mock('../services/mapService');

const REGIONS = [
  { id: 1, name: 'Aegean' },
  { id: 3, name: 'Black Sea' },
];

beforeEach(() => {
  sessionStorage.clear();
  mapService.fetchMapRegionContent.mockResolvedValue([
    { id: 10, content_type: 'story', title: 'Tea Ritual', body: 'Long long body text here', author_username: 'ali' },
  ]);
});

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

test('prompt is not visible before scroll', () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  expect(document.querySelector('.floating-prompt')).not.toBeInTheDocument();
});

test('prompt appears after scrollY > 300', () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  expect(document.querySelector('.floating-prompt')).toBeInTheDocument();
});

test('dismiss button hides prompt and sets sessionStorage', () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  fireEvent.click(screen.getByLabelText('Dismiss'));
  expect(document.querySelector('.floating-prompt')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('cultural_prompt_shown')).toBe('1');
});

test('region chips are rendered in the balloon', () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  expect(screen.getByText('Aegean')).toBeInTheDocument();
  expect(screen.getByText('Black Sea')).toBeInTheDocument();
});

test('does not render when regions list is empty', () => {
  wrap(<FloatingCulturalPrompt regions={[]} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  expect(document.querySelector('.floating-prompt')).not.toBeInTheDocument();
});

test('clicking a region chip opens the modal', async () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  fireEvent.click(screen.getByText('Aegean'));
  expect(document.querySelector('.story-modal')).toBeInTheDocument();
});

test('modal shows region name as header', async () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  fireEvent.click(screen.getByText('Aegean'));
  expect(screen.getByRole('heading', { level: 2, name: 'Aegean' })).toBeInTheDocument();
});

test('modal shows story card with Read story link', async () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  fireEvent.click(screen.getByText('Aegean'));
  await waitFor(() => expect(screen.getByText('Tea Ritual')).toBeInTheDocument());
  expect(screen.getByText('Read story →')).toBeInTheDocument();
});

test('clicking backdrop closes modal', async () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  fireEvent.click(screen.getByText('Aegean'));
  expect(document.querySelector('.story-modal')).toBeInTheDocument();
  fireEvent.click(document.querySelector('.story-modal-backdrop'));
  expect(document.querySelector('.story-modal')).not.toBeInTheDocument();
});

test('modal close button closes modal', async () => {
  wrap(<FloatingCulturalPrompt regions={REGIONS} />);
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 350, configurable: true });
    fireEvent.scroll(window);
  });
  fireEvent.click(screen.getByText('Aegean'));
  expect(document.querySelector('.story-modal')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Close'));
  expect(document.querySelector('.story-modal')).not.toBeInTheDocument();
});
