import { apiDelete, apiGetJson, apiPostJson } from './httpClient';

export type CommentType = 'COMMENT' | 'QUESTION';

export type Comment = {
  id: number;
  recipe: number;
  author: number;
  author_username: string;
  parent_comment: number | null;
  body: string;
  type: CommentType;
  created_at: string;
  updated_at: string;
  helpful_count: number;
  has_voted: boolean;
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

/** Fetch all comments for a recipe (auto-paginates). */
export async function fetchCommentsForRecipe(recipeId: string | number): Promise<Comment[]> {
  const collected: Comment[] = [];
  let path: string | null = `/api/recipes/${recipeId}/comments/`;
  while (path) {
    const data: Paginated<Comment> | Comment[] = await apiGetJson<Paginated<Comment> | Comment[]>(path);
    if (Array.isArray(data)) {
      collected.push(...data);
      break;
    }
    collected.push(...data.results);
    if (!data.next) break;
    const url: URL = new URL(data.next);
    path = `${url.pathname}${url.search}`;
  }
  return collected;
}

export async function postComment(
  recipeId: string | number,
  body: string,
  type: CommentType,
  parentCommentId?: number | null,
): Promise<Comment> {
  const payload: Record<string, unknown> = { body, type };
  if (parentCommentId != null) payload.parent_comment = parentCommentId;
  return apiPostJson<Comment>(`/api/recipes/${recipeId}/comments/`, payload);
}

export async function deleteComment(commentId: number): Promise<void> {
  await apiDelete(`/api/comments/${commentId}/`);
}

export async function toggleCommentVote(commentId: number): Promise<{ status: string }> {
  return apiPostJson<{ status: string }>(`/api/comments/${commentId}/vote/`, {});
}
