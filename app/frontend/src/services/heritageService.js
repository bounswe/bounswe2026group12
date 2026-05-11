import { apiClient } from './api';

export async function fetchHeritageGroups() {
  const response = await apiClient.get('/api/heritage-groups/');
  return response.data.results ?? response.data;
}

export async function fetchHeritageGroup(id) {
  const response = await apiClient.get(`/api/heritage-groups/${id}/`);
  return response.data;
}
