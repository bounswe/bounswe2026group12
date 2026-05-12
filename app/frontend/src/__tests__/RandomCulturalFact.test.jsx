import { render, screen, waitFor } from '@testing-library/react';
import RandomCulturalFact from '../components/RandomCulturalFact';
import * as culturalFactService from '../services/culturalFactService';

jest.mock('../services/culturalFactService');

beforeEach(() => jest.clearAllMocks());

describe('RandomCulturalFact', () => {
  it('renders the fact text when the service returns a fact', async () => {
    culturalFactService.fetchRandomCulturalFact.mockResolvedValue({
      id: 1, text: 'Tarhana is fermented.', source_url: '', heritage_group: null, region: null,
    });
    render(<RandomCulturalFact />);
    expect(await screen.findByText(/tarhana is fermented/i)).toBeInTheDocument();
  });

  it('renders nothing when the service returns null (no facts)', async () => {
    culturalFactService.fetchRandomCulturalFact.mockResolvedValue(null);
    const { container } = render(<RandomCulturalFact />);
    await waitFor(() => expect(culturalFactService.fetchRandomCulturalFact).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the service throws', async () => {
    culturalFactService.fetchRandomCulturalFact.mockRejectedValue(new Error('boom'));
    const { container } = render(<RandomCulturalFact />);
    await waitFor(() => expect(culturalFactService.fetchRandomCulturalFact).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
