import axios from 'axios';
import { apiClient } from '../services/api';
import {
  loginRequest,
  registerRequest,
  fetchMe,
  updateMe,
  refreshAccessToken,
  getContactabilityValue,
} from '../services/authService';

jest.mock('axios');
jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('loginRequest', () => {
  it('POSTs email/password to /api/auth/login/ and returns data', async () => {
    axios.post.mockResolvedValue({ data: { access: 'tok', user: { id: 1 } } });
    const result = await loginRequest('a@b.com', 'pw');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/login\/$/),
      { email: 'a@b.com', password: 'pw' },
    );
    expect(result).toEqual({ access: 'tok', user: { id: 1 } });
  });
});

describe('registerRequest', () => {
  it('POSTs username/email/password to /api/auth/register/ and returns data', async () => {
    axios.post.mockResolvedValue({ data: { access: 'tok2', user: { id: 2 } } });
    const result = await registerRequest('alice', 'a@b.com', 'pw');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/register\/$/),
      { username: 'alice', email: 'a@b.com', password: 'pw' },
    );
    expect(result.user.id).toBe(2);
  });
});

describe('fetchMe', () => {
  it('GETs /api/users/me/ and returns data', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 1, username: 'me' } });
    const result = await fetchMe();
    expect(apiClient.get).toHaveBeenCalledWith('/api/users/me/');
    expect(result).toEqual({ id: 1, username: 'me' });
  });
});

describe('updateMe', () => {
  it('PATCHes /api/users/me/ with payload and returns data', async () => {
    apiClient.patch.mockResolvedValue({ data: { id: 1, bio: 'hi' } });
    const result = await updateMe({ bio: 'hi' });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/users/me/', { bio: 'hi' });
    expect(result.bio).toBe('hi');
  });

  it('propagates API errors to the caller', async () => {
    apiClient.patch.mockRejectedValue(new Error('Server Error'));
    await expect(updateMe({})).rejects.toThrow('Server Error');
  });
});

describe('refreshAccessToken', () => {
  it('POSTs refresh token to /api/auth/refresh/ via raw axios', async () => {
    axios.post.mockResolvedValue({ data: { access: 'new', refresh: 'r' } });
    const result = await refreshAccessToken('old-refresh');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/refresh\/$/),
      { refresh: 'old-refresh' },
    );
    expect(result).toEqual({ access: 'new', refresh: 'r' });
  });
});

describe('getContactabilityValue', () => {
  it('returns true when user is null/undefined', () => {
    expect(getContactabilityValue(null)).toBe(true);
    expect(getContactabilityValue(undefined)).toBe(true);
  });

  it('prefers is_contactable when it is a boolean', () => {
    expect(getContactabilityValue({ is_contactable: false, contactable: true })).toBe(false);
    expect(getContactabilityValue({ is_contactable: true })).toBe(true);
  });

  it('falls back to contactable when is_contactable is missing', () => {
    expect(getContactabilityValue({ contactable: false })).toBe(false);
    expect(getContactabilityValue({ contactable: true })).toBe(true);
  });

  it('falls back to allow_new_threads when the others are missing', () => {
    expect(getContactabilityValue({ allow_new_threads: false })).toBe(false);
    expect(getContactabilityValue({ allow_new_threads: true })).toBe(true);
  });

  it('defaults to true when no relevant fields are present', () => {
    expect(getContactabilityValue({ unrelated: 1 })).toBe(true);
  });
});
