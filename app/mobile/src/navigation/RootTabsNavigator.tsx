import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { PublicStackNavigator } from './PublicStackNavigator';
import ShareTabScreen from '../screens/tabs/ShareTabScreen';
import ProfileTabScreen from '../screens/tabs/ProfileTabScreen';
import { tokens } from '../theme';

type TabParamList = {
  Feed: undefined;
  Share: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function RootTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarStyle: {
          borderTopColor: tokens.colors.border,
          backgroundColor: tokens.colors.surface,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Feed'
              ? 'home-outline'
              : route.name === 'Share'
                ? 'add-circle-outline'
                : 'person-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      {/* Feed tab keeps existing stack (no logic changes yet). */}
      <Tab.Screen name="Feed" component={PublicStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="Share" component={ShareTabScreen} options={{ title: 'Share' }} />
      <Tab.Screen name="Profile" component={ProfileTabScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

