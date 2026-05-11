import { apiClient } from './api';
import { MOCK_MODERATION_QUEUE } from '../mocks/moderationQueue';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

let mockQueue = [...MOCK_MODERATION_QUEUE];

function normalizeQueueItem(raw) {
  const isApproved = Boolean(raw.is_approved);
  const reviewed = raw.reviewed_at || raw.reviewedAt;
  let status;
  if (reviewed) status = isApproved ? 'approved' : 'rejected';
  else status = 'pending';
  return {
    id: raw.id,
    tag: raw.name,
    tag_type: raw.type,
    status,
    submitted_by:
      typeof raw.submitted_by === 'object'
        ? raw.submitted_by?.username
        : raw.submitted_by,
    submitted_at: raw.submitted_at,
    reviewed_at: reviewed || null,
    reason: raw.reason || '',
  };
}

export async function fetchModerationQueue() {
  if (USE_MOCK) return [...mockQueue];
  const response = await apiClient.get('/api/moderation/cultural-tags/');
  const payload = response.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : [];
  return items.map(normalizeQueueItem);
}

export async function approveTag(typeKey, id) {
  if (USE_MOCK) {
    mockQueue = mockQueue.map((t) => (t.id === id ? { ...t, status: 'approved' } : t));
    return;
  }
  await apiClient.post(`/api/moderation/cultural-tags/${typeKey}/${id}/approve/`);
}

export async function rejectTag(typeKey, id, reason = '') {
  if (USE_MOCK) {
    mockQueue = mockQueue.map((t) => (t.id === id ? { ...t, status: 'rejected' } : t));
    return;
  }
  await apiClient.post(
    `/api/moderation/cultural-tags/${typeKey}/${id}/reject/`,
    { reason },
  );
}
