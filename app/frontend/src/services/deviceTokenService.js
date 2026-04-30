import { registerDeviceToken } from './notificationService';

const DEVICE_TOKEN_KEY = 'web_device_token';

function buildWebToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${crypto.randomUUID()}`;
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateWebDeviceToken() {
  const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (existing) return existing;
  const token = buildWebToken();
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
}

export async function registerWebDeviceToken() {
  const token = getOrCreateWebDeviceToken();
  return registerDeviceToken(token, 'web');
}

