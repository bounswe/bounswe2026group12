import { fetchOwnProfile, updateOwnProfile } from '../../src/services/profileService';
import { apiGetJson, apiPatchJson } from '../../src/services/httpClient';

jest.mock('../../src/services/httpClient', () => ({
  apiGetJson: jest.fn(),
  apiPatchJson: jest.fn(),
}));

const mockedGet = apiGetJson as jest.MockedFunction<typeof apiGetJson>;
const mockedPatch = apiPatchJson as jest.MockedFunction<typeof apiPatchJson>;

describe('profileService', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPatch.mockReset();
  });

  it('fetchOwnProfile GETs /api/users/me/ and returns the profile body', async () => {
    mockedGet.mockResolvedValueOnce({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
      bio: 'Hello',
    });
    const out = await fetchOwnProfile();
    expect(mockedGet).toHaveBeenCalledWith('/api/users/me/');
    expect(out).toEqual({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
      bio: 'Hello',
    });
  });

  it('updateOwnProfile PATCHes /api/users/me/ with the partial body and returns the updated profile', async () => {
    mockedPatch.mockResolvedValueOnce({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
      bio: 'Updated bio',
      region: 'Aegean',
    });
    const out = await updateOwnProfile({ bio: 'Updated bio', region: 'Aegean' });
    expect(mockedPatch).toHaveBeenCalledWith('/api/users/me/', {
      bio: 'Updated bio',
      region: 'Aegean',
    });
    expect(out.bio).toBe('Updated bio');
    expect(out.region).toBe('Aegean');
  });

  it('updateOwnProfile supports an empty patch (no-op)', async () => {
    mockedPatch.mockResolvedValueOnce({
      id: 1,
      username: 'ayse',
      email: 'ayse@example.com',
    });
    await updateOwnProfile({});
    expect(mockedPatch).toHaveBeenCalledWith('/api/users/me/', {});
  });
});
