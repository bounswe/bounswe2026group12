import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import InboxScreen from '../screens/InboxScreen';
import LoginScreen from '../screens/LoginScreen';
import MessageThreadScreen from '../screens/MessageThreadScreen';
import RecipeCreateScreen from '../screens/RecipeCreateScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import RecipeEditScreen from '../screens/RecipeEditScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SearchScreen from '../screens/SearchScreen';
import StoryCreateScreen from '../screens/StoryCreateScreen';
import StoryDetailScreen from '../screens/StoryDetailScreen';
import StoryEditScreen from '../screens/StoryEditScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Public routes — mirrors web `App.js` routes outside `ProtectedRoute`, including `/login` and `/register`.
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
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Stack.Screen
        name="RecipeCreate"
        component={RecipeCreateScreen}
        options={{ title: 'New recipe' }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: 'Recipe' }}
      />
      <Stack.Screen
        name="RecipeEdit"
        component={RecipeEditScreen}
        options={{ title: 'Edit recipe' }}
      />
      <Stack.Screen
        name="StoryDetail"
        component={StoryDetailScreen}
        options={{ title: 'Story' }}
      />
      <Stack.Screen
        name="StoryCreate"
        component={StoryCreateScreen}
        options={{ title: 'Create story' }}
      />
      <Stack.Screen
        name="StoryEdit"
        component={StoryEditScreen}
        options={{ title: 'Edit story' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="MessageThread"
        component={MessageThreadScreen}
        options={{ title: 'Conversation' }}
      />
    </Stack.Navigator>
  );
}
