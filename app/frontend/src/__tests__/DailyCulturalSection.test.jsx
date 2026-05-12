import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DailyCulturalSection from '../components/DailyCulturalSection';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const ITEMS = [
  { id: '1', kind: 'tradition', title: 'Coffee Reading', body: 'Grounds are read.', region: 'Marmara' },
  { id: '2', kind: 'dish',      title: 'Mansaf',         body: 'Slow-cooked lamb.', region: 'Levantine' },
  { id: '3', kind: 'fact',      title: 'Six Tastes',     body: 'Ayurvedic.',        region: 'Indian' },
  { id: '4', kind: 'holiday',   title: 'Asure Day',      body: 'Shared bowl.',      region: 'Anatolian' },
  { id: '5', kind: 'unknown',   title: 'Mystery',        body: 'No kind match.',    region: null },
];

test('renders tradition card with candle emoji and amber class', () => {
  wrap(<DailyCulturalSection items={[ITEMS[0]]} />);
  expect(screen.getByText('🕯️')).toBeInTheDocument();
  expect(document.querySelector('.card-tradition')).toBeInTheDocument();
});

test('renders dish card with fork emoji and terracotta class', () => {
  wrap(<DailyCulturalSection items={[ITEMS[1]]} />);
  expect(screen.getByText('🍽️')).toBeInTheDocument();
  expect(document.querySelector('.card-dish')).toBeInTheDocument();
});

test('renders fact card with leaf emoji and blue class', () => {
  wrap(<DailyCulturalSection items={[ITEMS[2]]} />);
  expect(screen.getByText('🌿')).toBeInTheDocument();
  expect(document.querySelector('.card-fact')).toBeInTheDocument();
});

test('renders holiday card with party emoji and green class', () => {
  wrap(<DailyCulturalSection items={[ITEMS[3]]} />);
  expect(screen.getByText('🎉')).toBeInTheDocument();
  expect(document.querySelector('.card-holiday')).toBeInTheDocument();
});

test('unknown kind falls back to globe emoji and default class', () => {
  wrap(<DailyCulturalSection items={[ITEMS[4]]} />);
  expect(screen.getByText('🌍')).toBeInTheDocument();
  expect(document.querySelector('.card-default')).toBeInTheDocument();
});

test('Read more always routes to /highlights/:id (link target may be stale)', () => {
  wrap(<DailyCulturalSection items={[{ ...ITEMS[0], link: { kind: 'recipe', id: 42 } }]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/highlights/1');
});

test('Read more routes to /highlights/:id when there is no link at all', () => {
  wrap(<DailyCulturalSection items={[ITEMS[0]]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/highlights/1');
});

test('Read more URL-encodes the highlight id', () => {
  wrap(<DailyCulturalSection items={[{ ...ITEMS[0], id: 'dc-fact-7' }]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/highlights/dc-fact-7');
});

test('renders nothing when items is empty', () => {
  const { container } = wrap(<DailyCulturalSection items={[]} />);
  expect(container.firstChild).toBeNull();
});
