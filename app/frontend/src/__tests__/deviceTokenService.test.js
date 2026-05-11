import { registerDeviceToken } from '../services/notificationService';
import {
  getOrCreateWebDeviceToken,
  registerWebDeviceToken,
} from '../services/deviceTokenService';

jest.mock('../services/notificationService', () => ({
  registerDeviceToken: jest.fn(),
}));

const DEVICE_TOKEN_KEY = 'web_device_token';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('getOrCreateWebDeviceToken', () => {
  it('returns the existing token from localStorage when present', () => {
    localStorage.setItem(DEVICE_TOKEN_KEY, 'web-existing');
    const token = getOrCreateWebDeviceToken();
    expect(token).toBe('web-existing');
  });

  it('creates and persists a new token when none is stored', () => {
    expect(localStorage.getItem(DEVICE_TOKEN_KEY)).toBeNull();
    const token = getOrCreateWebDeviceToken();
    expect(token).toMatch(/^web-/);
    expect(localStorage.getItem(DEVICE_TOKEN_KEY)).toBe(token);
  });

  it('returns the same token on a subsequent call (persistence)', () => {
    const first = getOrCreateWebDeviceToken();
    const second = getOrCreateWebDeviceToken();
    expect(second).toBe(first);
  });
});

describe('registerWebDeviceToken', () => {
  it('registers the device token with platform "web"', async () => {
    registerDeviceToken.mockResolvedValue({ ok: true });
    await registerWebDeviceToken();
    expect(registerDeviceToken).toHaveBeenCalledTimes(1);
    const [token, platform] = registerDeviceToken.mock.calls[0];
    expect(token).toMatch(/^web-/);
    expect(platform).toBe('web');
  });

  it('propagates errors from registerDeviceToken', async () => {
    registerDeviceToken.mockRejectedValue(new Error('Network Error'));
    await expect(registerWebDeviceToken()).rejects.toThrow('Network Error');
  });
});
