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
});
