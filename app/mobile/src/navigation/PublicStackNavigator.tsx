import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RecipeCreateScreen from '../screens/RecipeCreateScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SearchScreen from '../screens/SearchScreen';
import StoryCreateScreen from '../screens/StoryCreateScreen';
import StoryDetailScreen from '../screens/StoryDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Mirrors web `App.js`: public routes + create flows that use in-screen guards (`ProtectedRoute`).
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
        name="Login"
        component={LoginScreen}
        options={{ title: 'Log In' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Register' }}
      />
      <Stack.Screen
        name="RecipeCreate"
        component={RecipeCreateScreen}
        options={{ title: 'Create recipe' }}
      />
      <Stack.Screen
        name="StoryCreate"
        component={StoryCreateScreen}
        options={{ title: 'Create story' }}
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
