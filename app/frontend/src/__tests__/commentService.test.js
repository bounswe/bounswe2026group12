import { apiClient } from '../services/api';
import {
  fetchCommentsForRecipe,
  postComment,
  deleteComment,
  toggleCommentVote,
} from '../services/commentService';

jest.mock('../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

const rawComment = {
  id: 10,
  recipe: 4,
  author: 2,
  author_username: 'alice',
  parent_comment: null,
  body: 'tasty',
  type: 'review',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T01:00:00Z',
  helpful_count: 3,
  has_voted: true,
};

describe('fetchCommentsForRecipe', () => {
  it('GETs /api/recipes/:id/comments/ and returns normalized comments', async () => {
    apiClient.get.mockResolvedValue({ data: [rawComment] });
    const result = await fetchCommentsForRecipe(4);
    expect(apiClient.get).toHaveBeenCalledWith('/api/recipes/4/comments/');
    expect(result).toEqual([
      expect.objectContaining({
        id: 10,
        authorUsername: 'alice',
        parentComment: null,
        body: 'tasty',
        helpfulCount: 3,
        hasVoted: true,
      }),
    ]);
  });

  it('follows the paginated next URL until exhausted', async () => {
    apiClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ ...rawComment, id: 1 }],
          next: 'http://api.test/api/recipes/4/comments/?page=2',
        },
      })
      .mockResolvedValueOnce({
        data: { results: [{ ...rawComment, id: 2 }], next: null },
      });
    const result = await fetchCommentsForRecipe(4);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/recipes/4/comments/');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/recipes/4/comments/?page=2');
    expect(result.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe('postComment', () => {
  it('POSTs body+type to /api/recipes/:id/comments/ and returns normalized data', async () => {
    apiClient.post.mockResolvedValue({ data: rawComment });
    const result = await postComment(4, { body: 'tasty', type: 'review' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/recipes/4/comments/', {
      body: 'tasty',
      type: 'review',
    });
    expect(result.helpfulCount).toBe(3);
  });

  it('includes parent_comment when provided', async () => {
    apiClient.post.mockResolvedValue({ data: rawComment });
    await postComment(4, { body: 'reply', type: 'review', parentComment: 99 });
    expect(apiClient.post).toHaveBeenCalledWith('/api/recipes/4/comments/', {
      body: 'reply',
      type: 'review',
      parent_comment: 99,
    });
  });
});

describe('deleteComment', () => {
  it('DELETEs /api/comments/:id/', async () => {
    apiClient.delete.mockResolvedValue({ status: 204 });
    await deleteComment(7);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/comments/7/');
  });
});

describe('toggleCommentVote', () => {
  it('POSTs to /api/comments/:id/vote/ and returns response data', async () => {
    apiClient.post.mockResolvedValue({ data: { status: 'voted' } });
    const result = await toggleCommentVote(7);
    expect(apiClient.post).toHaveBeenCalledWith('/api/comments/7/vote/');
    expect(result).toEqual({ status: 'voted' });
  });

  it('propagates API errors to the caller', async () => {
    apiClient.post.mockRejectedValue(new Error('boom'));
    await expect(toggleCommentVote(7)).rejects.toThrow('boom');
  });
});
