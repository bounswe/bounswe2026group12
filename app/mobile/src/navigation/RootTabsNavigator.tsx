import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
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
        tabBarActiveTintColor: tokens.colors.accentGreen,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarStyle: {
          borderTopColor: tokens.colors.border,
          borderTopWidth: 1,
          backgroundColor: tokens.colors.surface,
        },
        tabBarLabelStyle: { fontWeight: '900' },
        tabBarActiveBackgroundColor: tokens.colors.bg,
        tabBarIcon: ({ color, size, focused }) => {
          const baseName =
            route.name === 'Feed'
              ? 'home'
              : route.name === 'Share'
                ? 'add-circle'
                : 'person';
          const name = (focused ? baseName : `${baseName}-outline`) as React.ComponentProps<
            typeof Ionicons
          >['name'];
          return (
            <View
              style={{
                transform: focused ? [{ rotate: '-8deg' }, { translateY: -3 }] : [],
              }}
            >
              <Ionicons name={name} size={focused ? size + 6 : size} color={color} />
            </View>
          );
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

