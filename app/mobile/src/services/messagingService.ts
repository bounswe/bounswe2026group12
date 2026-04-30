import { apiGetJson, apiPostJson } from './httpClient';

export type ThreadSummary = {
  id: number;
  other_user_id: number | null;
  other_username: string | null;
  last_message_at: string | null;
  last_message_preview: string;
  unread_count: number;
  created_at: string;
};

export type Message = {
  id: number;
  thread: number;
  sender: number;
  sender_username: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
};

export async function fetchInbox(): Promise<ThreadSummary[]> {
  const data = await apiGetJson<ThreadSummary[] | { results: ThreadSummary[] }>(
    '/api/threads/',
  );
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

export async function openThreadWith(otherUserId: number | string): Promise<ThreadSummary> {
  return apiPostJson<ThreadSummary>('/api/threads/', {
    other_user_id: Number(otherUserId),
  });
}

export async function fetchThreadMessages(threadId: number | string): Promise<Message[]> {
  const data = await apiGetJson<Message[] | { results: Message[] }>(
    `/api/threads/${threadId}/messages/`,
  );
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

export async function sendMessage(
  threadId: number | string,
  body: string,
): Promise<Message> {
  return apiPostJson<Message>(`/api/threads/${threadId}/send/`, { body });
}

export async function markThreadRead(threadId: number | string): Promise<void> {
  await apiPostJson(`/api/threads/${threadId}/read/`, {});
}
