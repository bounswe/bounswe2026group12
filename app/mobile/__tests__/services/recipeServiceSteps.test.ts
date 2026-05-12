import { patchRecipeJson } from '../../src/services/recipeService';
import { apiPatchJson } from '../../src/services/httpClient';
import { buildRecipePatchJsonBody } from '../../src/components/recipe/buildRecipeUpdateFormData';

jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
  apiPatchJson: jest.fn(),
  apiPatchFormData: jest.fn(),
  nextPagePath: jest.fn(),
}));

const mockedPatch = apiPatchJson as jest.MockedFunction<typeof apiPatchJson>;

describe('patchRecipeJson — steps payload (#806)', () => {
  beforeEach(() => mockedPatch.mockReset());

  it('forwards a `steps` array on the JSON PATCH body', async () => {
    mockedPatch.mockResolvedValueOnce(undefined);
    const body = buildRecipePatchJsonBody({
      title: 'Soup',
      description: 'Warm.',
      qaEnabled: true,
      rows: [],
      steps: ['Boil water.', 'Add salt.'],
    });
    await patchRecipeJson('42', body);
    expect(mockedPatch).toHaveBeenCalledTimes(1);
    const [path, sent] = mockedPatch.mock.calls[0];
    expect(path).toBe('/api/recipes/42/');
    expect((sent as { steps?: unknown }).steps).toEqual(['Boil water.', 'Add salt.']);
  });

  it('omits `steps` from the body when caller does not pass it (so server value stays)', async () => {
    mockedPatch.mockResolvedValueOnce(undefined);
    const body = buildRecipePatchJsonBody({
      title: 'Soup',
      description: 'Warm.',
      qaEnabled: true,
      rows: [],
    });
    await patchRecipeJson('42', body);
    const [, sent] = mockedPatch.mock.calls[0];
    expect(Object.prototype.hasOwnProperty.call(sent, 'steps')).toBe(false);
  });

  it('sends an empty `steps: []` when caller explicitly clears all rows', async () => {
    mockedPatch.mockResolvedValueOnce(undefined);
    const body = buildRecipePatchJsonBody({
      title: 'Soup',
      description: 'Warm.',
      qaEnabled: true,
      rows: [],
      steps: [],
    });
    await patchRecipeJson('42', body);
    const [, sent] = mockedPatch.mock.calls[0];
    expect((sent as { steps?: unknown }).steps).toEqual([]);
  });
});
