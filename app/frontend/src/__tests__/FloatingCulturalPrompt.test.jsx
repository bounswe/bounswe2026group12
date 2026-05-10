import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FloatingCulturalPrompt from '../components/FloatingCulturalPrompt';

const REGIONS = [
  { id: 1, name: 'Aegean' },
  { id: 3, name: 'Black Sea' },
];

beforeEach(() => sessionStorage.clear());

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
