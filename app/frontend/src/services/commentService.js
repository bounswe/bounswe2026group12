import { apiClient } from './api';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

function extractResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalize(comment) {
  return {
    id: comment.id,
    recipe: comment.recipe,
    author: comment.author,
    authorUsername: comment.author_username,
    parentComment: comment.parent_comment,
    body: comment.body,
    type: comment.type,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    helpfulCount: Number(comment.helpful_count || 0),
    hasVoted: Boolean(comment.has_voted),
  };
}

export async function fetchCommentsForRecipe(recipeId) {
  if (USE_MOCK) return [];
  const collected = [];
  let path = `/api/recipes/${recipeId}/comments/`;
  while (path) {
    const response = await apiClient.get(path);
    const data = response.data;
    const pageItems = extractResults(data).map(normalize);
    collected.push(...pageItems);
    if (!data?.next || Array.isArray(data)) break;
    const nextUrl = new URL(data.next);
    path = `${nextUrl.pathname}${nextUrl.search}`;
  }
  return collected;
}

export async function postComment(recipeId, { body, type, parentComment }) {
  if (USE_MOCK) {
    return normalize({
      id: Date.now(),
      recipe: Number(recipeId),
      author: 1,
      author_username: 'demo',
      parent_comment: parentComment || null,
      body,
      type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      helpful_count: 0,
      has_voted: false,
    });
  }
  const payload = { body, type };
  if (parentComment != null) payload.parent_comment = parentComment;
  const response = await apiClient.post(`/api/recipes/${recipeId}/comments/`, payload);
  return normalize(response.data);
}

export async function deleteComment(commentId) {
  if (USE_MOCK) return;
  await apiClient.delete(`/api/comments/${commentId}/`);
}

export async function toggleCommentVote(commentId) {
  if (USE_MOCK) return { status: 'voted' };
  const response = await apiClient.post(`/api/comments/${commentId}/vote/`);
  return response.data;
}

