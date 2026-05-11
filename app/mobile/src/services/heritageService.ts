import { apiGetJson } from './httpClient';

/** Member of a heritage group resolved into the shape the mobile UI renders. */
export type HeritageMember = {
  content_type: 'recipe' | 'story' | string;
  id: number;
  title: string;
  author: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type HeritageJourneyStep = {
  id: number;
  heritage_group: number;
  order: number;
  location: string;
  story: string;
  era?: string | null;
};

export type HeritageGroupDetail = {
  id: number;
  name: string;
  description: string;
  members: HeritageMember[];
  journey_steps: HeritageJourneyStep[];
};

export async function fetchHeritageGroup(id: number | string): Promise<HeritageGroupDetail> {
  return apiGetJson<HeritageGroupDetail>(`/api/heritage-groups/${id}/`);
}
