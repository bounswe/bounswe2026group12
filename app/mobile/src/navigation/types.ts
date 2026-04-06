export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Search: undefined;
  /** Web: `/recipes/new` (protected). */
  RecipeCreate: undefined;
  /** Web: `/stories/new` (protected). */
  StoryCreate: undefined;
  RecipeDetail: { id: string };
  StoryDetail: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
