import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function loginRequest(email, password) {
  const response = await axios.post(`${API}/api/auth/login/`, { email, password });
  // Expected response shape: { access: "jwt_token", user: { username, email, ... } }
  return response.data;
}

export async function registerRequest(username, email, password) {
  const response = await axios.post(`${API}/api/auth/register/`, { username, email, password });
  return response.data;
}
