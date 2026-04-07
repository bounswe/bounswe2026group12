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
  /** Recipe authoring shell — ingredient/unit selection UI (full form later). */
  RecipeCreate: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
