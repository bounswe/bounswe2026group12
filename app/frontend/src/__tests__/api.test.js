jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  const mockAxios = {
    create: jest.fn(() => instance),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  // axios has both default and named exports; self-reference mirrors that shape
  mockAxios.default = mockAxios;
  return mockAxios;
});

describe('apiClient', () => {
  let axios;
  let apiClient;

  beforeEach(() => {
    jest.resetModules();
    axios = require('axios');
    ({ apiClient } = require('../services/api'));
  });

  it('creates an axios instance with the correct base URL', () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: expect.stringContaining('localhost'),
      })
    );
  });

  it('registers a request interceptor', () => {
    const instance = axios.create.mock.results[0].value;
    expect(instance.interceptors.request.use).toHaveBeenCalled();
  });

  it('attaches Bearer token when token exists in localStorage', () => {
    localStorage.setItem('token', 'test-jwt-123');
    const instance = axios.create.mock.results[0].value;
    const interceptorFn = instance.interceptors.request.use.mock.calls[0][0];
    const config = { headers: {} };
    const result = interceptorFn(config);
    expect(result.headers.Authorization).toBe('Bearer test-jwt-123');
    localStorage.clear();
  });

  it('does not attach Authorization header when no token in localStorage', () => {
    localStorage.clear();
    const instance = axios.create.mock.results[0].value;
    const interceptorFn = instance.interceptors.request.use.mock.calls[0][0];
    const config = { headers: {} };
    const result = interceptorFn(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('apiClient 401 response interceptor', () => {
  let axios;
  let apiClient;
  let responseInterceptor;
  let originalLocation;

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    axios = require('axios');
    ({ apiClient } = require('../services/api'));
    const instance = axios.create.mock.results[0].value;
    // Interceptor registers [success, error] callbacks
    responseInterceptor = instance.interceptors.response.use.mock.calls[0];
    originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, assign: jest.fn(), href: '' };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('registers a response interceptor', () => {
    expect(responseInterceptor).toBeDefined();
    expect(typeof responseInterceptor[1]).toBe('function');
  });

  it('attempts refresh and retries the original request on 401', async () => {
    const onRejected = responseInterceptor[1];
    localStorage.setItem('refresh_token', 'r1');
    const instance = axios.create.mock.results[0].value;

    // Mock the refresh call (POST /api/auth/refresh/)
    instance.post.mockResolvedValueOnce({ data: { access: 'new-access', refresh: 'new-refresh' } });
    // Mock the retry of the original failing request
    instance.request = jest.fn().mockResolvedValueOnce({ data: { ok: true } });

    const error = {
      config: { url: '/api/users/me/', method: 'get', headers: {}, _retry: false },
      response: { status: 401 },
    };

    const result = await onRejected(error);
    expect(localStorage.getItem('token')).toBe('new-access');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
    expect(instance.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/users/me/', _retry: true })
    );
    expect(result).toEqual({ data: { ok: true } });
  });

  it('logs out and rejects when refresh fails', async () => {
    const onRejected = responseInterceptor[1];
    localStorage.setItem('token', 'old');
    localStorage.setItem('refresh_token', 'bad');
    const instance = axios.create.mock.results[0].value;
    instance.post.mockRejectedValueOnce({ response: { status: 401 } });

    const error = {
      config: { url: '/x', method: 'get', headers: {}, _retry: false },
      response: { status: 401 },
    };

    await expect(onRejected(error)).rejects.toBeDefined();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('passes through non-401 errors untouched', async () => {
    const onRejected = responseInterceptor[1];
    const error = { response: { status: 500 }, config: { url: '/x' } };
    await expect(onRejected(error)).rejects.toBe(error);
  });

  it('does not retry on 401 if request already has _retry=true', async () => {
    const onRejected = responseInterceptor[1];
    const error = {
      config: { url: '/x', _retry: true, headers: {} },
      response: { status: 401 },
    };
    await expect(onRejected(error)).rejects.toBe(error);
  });
});
