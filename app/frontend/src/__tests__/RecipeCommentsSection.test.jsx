import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecipeCommentsSection from '../components/RecipeCommentsSection';
import * as commentService from '../services/commentService';

jest.mock('../services/commentService');

const baseComments = [
  {
    id: 1,
    recipe: 9,
    author: 10,
    authorUsername: 'alice',
    parentComment: null,
    body: 'How long should it rest?',
    type: 'QUESTION',
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    helpfulCount: 2,
    hasVoted: false,
  },
  {
    id: 2,
    recipe: 9,
    author: 11,
    authorUsername: 'chef',
    parentComment: 1,
    body: 'About 20 minutes.',
    type: 'COMMENT',
    createdAt: '2026-05-01T11:00:00Z',
    updatedAt: '2026-05-01T11:00:00Z',
    helpfulCount: 0,
    hasVoted: false,
  },
];

function renderSection(user = { id: 11, username: 'chef' }, qaEnabled = true) {
  return render(
    <MemoryRouter>
      <RecipeCommentsSection recipeId={9} qaEnabled={qaEnabled} currentUser={user} />
    </MemoryRouter>
  );
}

describe('RecipeCommentsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    commentService.fetchCommentsForRecipe.mockResolvedValue(baseComments);
    commentService.postComment.mockResolvedValue({
      id: 3,
      recipe: 9,
      author: 11,
      authorUsername: 'chef',
      parentComment: null,
      body: 'New comment',
      type: 'COMMENT',
      createdAt: '2026-05-01T12:00:00Z',
      updatedAt: '2026-05-01T12:00:00Z',
      helpfulCount: 0,
      hasVoted: false,
    });
    commentService.toggleCommentVote.mockResolvedValue({ status: 'voted' });
    commentService.deleteComment.mockResolvedValue({});
  });

  it('loads and renders threaded comments', async () => {
    renderSection();
    await waitFor(() => expect(commentService.fetchCommentsForRecipe).toHaveBeenCalledWith(9));
    expect(await screen.findByText('How long should it rest?')).toBeInTheDocument();
    expect(screen.getByText('About 20 minutes.')).toBeInTheDocument();
  });

  it('submits a new question', async () => {
    renderSection();
    await waitFor(() => screen.getByText('How long should it rest?'));

    fireEvent.click(screen.getByRole('tab', { name: /question/i }));
    fireEvent.change(screen.getByPlaceholderText(/share your comment or ask a question/i), {
      target: { value: 'Can I bake this today?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^post$/i }));

    await waitFor(() => {
      expect(commentService.postComment).toHaveBeenCalledWith(9, {
        body: 'Can I bake this today?',
        type: 'QUESTION',
        parentComment: null,
      });
    });
  });

  it('shows login hint when user is not authenticated', async () => {
    renderSection(null);
    await waitFor(() => screen.getByText('How long should it rest?'));
    expect(screen.getByText(/please/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  it('opens action menu and toggles helpful vote', async () => {
    renderSection();
    await waitFor(() => screen.getByText('How long should it rest?'));
    fireEvent.click(screen.getAllByRole('button', { name: /mark helpful/i })[0]);
    await waitFor(() => expect(commentService.toggleCommentVote).toHaveBeenCalledWith(1));
  });

  it('applies optimistic helpful count and disables button while request is in flight', async () => {
    let resolveVote;
    commentService.toggleCommentVote.mockReturnValueOnce(
      new Promise((resolve) => { resolveVote = resolve; })
    );
    renderSection();
    await waitFor(() => screen.getByText('How long should it rest?'));

    const voteButton = screen.getAllByRole('button', { name: /mark helpful/i })[0];
    fireEvent.click(voteButton);

    expect(await screen.findByRole('button', { name: /updating/i })).toBeDisabled();
    expect(screen.getByText('Helpful: 3')).toBeInTheDocument();

    resolveVote({ status: 'voted' });
    await waitFor(() => expect(screen.getByRole('button', { name: /^helpful$/i })).toBeInTheDocument());
  });

  it('rolls back optimistic helpful state on API error', async () => {
    commentService.toggleCommentVote.mockRejectedValueOnce(new Error('fail'));
    renderSection();
    await waitFor(() => screen.getByText('How long should it rest?'));

    fireEvent.click(screen.getAllByRole('button', { name: /mark helpful/i })[0]);

    await waitFor(() => expect(commentService.toggleCommentVote).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect(screen.getByText('Helpful: 2')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /mark helpful/i })[0]).toBeInTheDocument();
    });
  });

  it('surfaces an inline error to the user when deleteComment fails (#699)', async () => {
    commentService.deleteComment.mockRejectedValueOnce(new Error('boom'));
    renderSection({ id: 11, username: 'chef' });
    await waitFor(() => screen.getByText('About 20 minutes.'));

    // Open the action menu for the reply authored by chef (id=11).
    const menuButtons = screen.getAllByRole('button', { name: /comment actions/i });
    fireEvent.click(menuButtons[menuButtons.length - 1]);
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

    await waitFor(() => expect(commentService.deleteComment).toHaveBeenCalledWith(2));
    expect(await screen.findByText(/could not delete comment/i)).toBeInTheDocument();
    // Comment is still on screen because the delete failed.
    expect(screen.getByText('About 20 minutes.')).toBeInTheDocument();
  });
});
