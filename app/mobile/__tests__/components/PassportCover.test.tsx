import React from 'react';
import { render } from '@testing-library/react-native';
import { PassportCover } from '../../src/components/passport/PassportCover';
import { PASSPORT_THEMES, resolveTheme } from '../../src/utils/passportTheme';

describe('PassportCover', () => {
  it('renders the username, level pill, and theme copy', () => {
    const theme = PASSPORT_THEMES['Mediterranean Journal'];
    const { getByText } = render(
      <PassportCover
        theme={theme}
        level={7}
        totalPoints={1234}
        username="ayse"
      />,
    );
    expect(getByText('ayse')).toBeTruthy();
    expect(getByText('MEDITERRANEAN JOURNAL')).toBeTruthy();
    expect(getByText('LEVEL 7 · 1234 PTS')).toBeTruthy();
  });

  it('renders the theme glyph', () => {
    const theme = PASSPORT_THEMES['Ramazan'];
    const { getByText } = render(
      <PassportCover theme={theme} level={4} totalPoints={400} username="bob" />,
    );
    expect(getByText(theme.glyph)).toBeTruthy();
  });

  it('exposes a descriptive accessibility label', () => {
    const theme = resolveTheme('classic_traveler', 1);
    const { getByLabelText } = render(
      <PassportCover theme={theme} level={1} totalPoints={50} username="ayse" />,
    );
    expect(
      getByLabelText('Passport cover, theme Classic Traveler, level 1, 50 points'),
    ).toBeTruthy();
  });

  it('works with a calendar-based theme resolved by name', () => {
    const theme = resolveTheme({ name: 'Lunar New Year' }, 2);
    const { getByText } = render(
      <PassportCover theme={theme} level={2} totalPoints={120} username="ling" />,
    );
    expect(getByText('LUNAR NEW YEAR')).toBeTruthy();
    expect(getByText('ling')).toBeTruthy();
  });
});
