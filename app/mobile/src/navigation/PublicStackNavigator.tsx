import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import StoryDetailScreen from '../screens/StoryDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Public routes only — mirrors web `App.js` routes that are not wrapped in `ProtectedRoute`.
 * Auth-gated screens are added in a later milestone.
 */
export function PublicStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ animation: 'default' }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: 'Recipe' }}
      />
      <Stack.Screen
        name="StoryDetail"
        component={StoryDetailScreen}
        options={{ title: 'Story' }}
      />
    </Stack.Navigator>
  );
}
