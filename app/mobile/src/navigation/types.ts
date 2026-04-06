export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  RecipeDetail: { id: string };
  StoryDetail: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
