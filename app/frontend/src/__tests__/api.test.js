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
