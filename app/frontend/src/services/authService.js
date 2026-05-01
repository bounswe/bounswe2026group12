import axios from 'axios';
import { apiClient } from './api';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export async function loginRequest(email, password) {
  if (USE_MOCK) {
    if (password === 'wrong' || email.includes('fail@')) throw new Error('Login failed');
    const username = email.split('@')[0] || 'user';
    return { access: `mock-jwt-${Date.now()}`, user: { id: 1, username, email } };
  }
  const response = await axios.post(`${API}/api/auth/login/`, { email, password });
  // Expected response shape: { access: "jwt_token", user: { username, email, ... } }
  return response.data;
}

export async function registerRequest(username, email, password) {
  if (USE_MOCK) {
    if (username.toLowerCase() === 'taken') throw new Error('Username already taken');
    return { access: `mock-jwt-${Date.now()}`, user: { id: 2, username, email } };
  }
  const response = await axios.post(`${API}/api/auth/register/`, { username, email, password });
  return response.data;
}

export async function fetchMe() {
  if (USE_MOCK) return { id: 1, username: 'demo_chef', email: 'demo@example.com', is_contactable: true };
  const response = await apiClient.get('/api/users/me/');
  return response.data;
}

export async function updateMe(payload) {
  if (USE_MOCK) return { id: 1, username: 'demo_chef', email: 'demo@example.com', ...payload };
  const response = await apiClient.patch('/api/users/me/', payload);
  return response.data;
}

export function getContactabilityValue(user) {
  if (!user) return true;
  if (typeof user.is_contactable === 'boolean') return user.is_contactable;
  if (typeof user.contactable === 'boolean') return user.contactable;
  if (typeof user.allow_new_threads === 'boolean') return user.allow_new_threads;
  return true;
}
