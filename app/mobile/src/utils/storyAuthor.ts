import type { AuthUser } from '../services/mockAuthService';
import type { StoryDetail } from '../types/story';
import { parseAuthorId } from './parseAuthorId';

export function isStoryAuthor(
  user: AuthUser | null | undefined,
  story: StoryDetail | null | undefined,
): boolean {
  if (!user || !story) return false;
  const authorId = parseAuthorId(story.author);
  if (authorId == null) return false;
  return Number(user.id) === authorId;
}
