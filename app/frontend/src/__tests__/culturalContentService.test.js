import { fetchDailyCulturalContent, fetchRegionStories } from '../services/culturalContentService';
import { apiClient } from '../services/api';
import * as mapService from '../services/mapService';

jest.mock('../services/api', () => ({
  apiClient: { get: jest.fn() },
}));
jest.mock('../services/mapService');

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
      { id: 1, kind: null, title: 'Card', body: 'Body', region: null, imageUrl: '/img.jpg', tags: ['Aegean'], link: null },
    ]);
  });

  it('passes through backend link { kind, id } so Read more can route directly', async () => {
    apiClient.get.mockResolvedValue({
      data: [
        { id: 2, title: 'Pilav', body: '', kind: 'dish', link: { kind: 'recipe', id: 42 } },
      ],
    });
    const result = await fetchDailyCulturalContent();
    expect(result[0].link).toEqual({ kind: 'recipe', id: 42 });
  });

  it('drops malformed link objects (missing kind or id) so the UI hides Read more', async () => {
    apiClient.get.mockResolvedValue({
      data: [
        { id: 3, title: 'A', link: { kind: 'recipe' } },
        { id: 4, title: 'B', link: { id: 9 } },
      ],
    });
    const result = await fetchDailyCulturalContent();
    expect(result[0].link).toBeNull();
    expect(result[1].link).toBeNull();
  });
});

describe('fetchRegionStories', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only items whose content_type is "story"', async () => {
    mapService.fetchMapRegionContent.mockResolvedValue([
      { id: 1, content_type: 'story', title: 'Tea Ritual' },
      { id: 2, content_type: 'recipe', title: 'Lahmacun' },
      { id: 3, content_type: 'story', title: 'Olive Harvest' },
      { id: 4, content_type: 'tradition', title: 'Wedding Pilaf' },
    ]);
    const result = await fetchRegionStories(5);
    expect(mapService.fetchMapRegionContent).toHaveBeenCalledWith(5);
    expect(result).toEqual([
      { id: 1, content_type: 'story', title: 'Tea Ritual' },
      { id: 3, content_type: 'story', title: 'Olive Harvest' },
    ]);
  });

  it('returns an empty array when there are no stories', async () => {
    mapService.fetchMapRegionContent.mockResolvedValue([
      { id: 2, content_type: 'recipe', title: 'Lahmacun' },
    ]);
    const result = await fetchRegionStories(1);
    expect(result).toEqual([]);
  });
});

