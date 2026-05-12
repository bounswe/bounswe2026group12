export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Search: { query?: string; region?: string } | undefined;
  RecipeDetail: { id: string };
  /** Pre-filled edit form — same API as web `RecipeEditPage`. */
  RecipeEdit: { id: string };
  StoryCreate: undefined;
  StoryDetail: { id: string };
  StoryEdit: { id: string };
  /** Recipe authoring shell — ingredient/unit selection UI (full form later). */
  RecipeCreate: undefined;
  UserProfile: { userId: number | string; username?: string };
  Passport: { username: string; isOwn?: boolean };
  Inbox: undefined;
  MessageThread: {
    threadId?: number | string;
    otherUserId?: number | string;
    otherUsername?: string;
  };
  Onboarding: undefined;
  MapDiscovery: undefined;
  Explore: undefined;
  EventDetail: { eventId: number; eventName: string };
  Heritage: { heritageGroupId: number };
  HeritageMap: { heritageGroupId: number };
  CulturalCalendar: undefined;
  RegionMapDetail: { regionId: number; regionName: string };
  IngredientMigrationMap: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
