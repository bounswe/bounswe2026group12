import {
  saveStoryToPassport,
  tryRecipe,
} from '../../src/services/passportActionService';
import { apiPostJson } from '../../src/services/httpClient';

jest.mock('../../src/services/httpClient', () => ({
  apiPostJson: jest.fn(),
}));

const mockedPost = apiPostJson as jest.MockedFunction<typeof apiPostJson>;

describe('tryRecipe', () => {
  beforeEach(() => mockedPost.mockReset());

  it('POSTs to the passport try endpoint and returns the parsed flag', async () => {
    mockedPost.mockResolvedValueOnce({ is_tried: true });
    const out = await tryRecipe(1, true);
    expect(mockedPost).toHaveBeenCalledWith('/api/passport/recipes/1/try/', {});
    expect(out).toEqual({ is_tried: true });
  });

  it('falls back to the optimistic value when the backend returns no body', async () => {
    mockedPost.mockResolvedValueOnce(null as unknown as { is_tried: boolean });
    const out = await tryRecipe('1', false);
    expect(out).toEqual({ is_tried: false });
  });
});

describe('saveStoryToPassport', () => {
  beforeEach(() => mockedPost.mockReset());

  it('POSTs to the passport save endpoint and accepts either response field', async () => {
    mockedPost.mockResolvedValueOnce({ saved_to_passport: true });
    const out = await saveStoryToPassport(42, true);
    expect(mockedPost).toHaveBeenCalledWith('/api/passport/stories/42/save/', {});
    expect(out).toEqual({ saved: true });
  });

  it('also accepts a `saved` field on the response', async () => {
    mockedPost.mockResolvedValueOnce({ saved: true });
    const out = await saveStoryToPassport(42, false);
    expect(out).toEqual({ saved: true });
  });

  it('falls back to the optimistic value when the backend returns no body', async () => {
    mockedPost.mockResolvedValueOnce(null as unknown as { saved: boolean });
    const out = await saveStoryToPassport('99', true);
    expect(out).toEqual({ saved: true });
  });
});
