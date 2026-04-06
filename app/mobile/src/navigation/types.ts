export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Search: undefined;
  RecipeDetail: { id: string };
  /** Pre-filled edit form — same API as web `RecipeEditPage`. */
  RecipeEdit: { id: string };
  StoryDetail: { id: string };
  /** Recipe authoring shell — ingredient/unit selection UI (full form later). */
  RecipeCreate: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
