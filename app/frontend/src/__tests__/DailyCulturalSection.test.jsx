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

test('Read more link points to /recipes/:id when link.kind=recipe', () => {
  wrap(<DailyCulturalSection items={[{ ...ITEMS[0], link: { kind: 'recipe', id: 42 } }]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/recipes/42');
});

test('Read more link points to /stories/:id when link.kind=story', () => {
  wrap(<DailyCulturalSection items={[{ ...ITEMS[1], link: { kind: 'story', id: 7 } }]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/stories/7');
});

test('Read more link points to /calendar when link.kind=event', () => {
  wrap(<DailyCulturalSection items={[{ ...ITEMS[3], link: { kind: 'event', id: 3 } }]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/calendar');
});

test('Read more falls back to /highlights/:id when no link is present', () => {
  wrap(<DailyCulturalSection items={[ITEMS[0]]} />);
  expect(screen.getByText('Read more →')).toHaveAttribute('href', '/highlights/1');
});

test('renders nothing when items is empty', () => {
  const { container } = wrap(<DailyCulturalSection items={[]} />);
  expect(container.firstChild).toBeNull();
});
