export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Search: undefined;
  RecipeDetail: { id: string };
  StoryDetail: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
