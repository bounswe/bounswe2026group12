import { fetchDailyCulturalContent } from '../services/culturalContentService';
import { apiClient } from '../services/api';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));

describe('fetchDailyCulturalContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls daily cultural content endpoint', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    await fetchDailyCulturalContent();
    expect(apiClient.get).toHaveBeenCalledWith('/api/cultural-content/daily/');
  });

  it('normalizes API response fields', async () => {
    apiClient.get.mockResolvedValue({
      data: [
        { id: 1, title: 'Card', body: 'Body', image_url: '/img.jpg', cultural_tags: ['Aegean'] },
      ],
    });
    const result = await fetchDailyCulturalContent();
    expect(result).toEqual([
      { id: 1, title: 'Card', body: 'Body', imageUrl: '/img.jpg', tags: ['Aegean'] },
    ]);
  });
});

