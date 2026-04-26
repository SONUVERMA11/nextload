/**
 * NexLoad — App Root
 * Bottom tab navigator with 4 tabs: Downloads / Search / Files / Settings
 * Wrapped in ThemeProvider for dark/light mode support
 */

import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { FilesScreen } from './src/screens/FilesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Downloads: { active: 'cloud-download', inactive: 'cloud-download-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Files: { active: 'folder', inactive: 'folder-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

const AppNavigator: React.FC = () => {
  const { colors, isDark, spacing } = useTheme();

  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.bg,
          card: colors.tabBar,
          text: colors.text,
          border: colors.tabBarBorder,
          primary: colors.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.bg,
          card: colors.tabBar,
          text: colors.text,
          border: colors.tabBarBorder,
          primary: colors.accent,
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.card,
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
            color: colors.text,
          },
          tabBarIcon: ({ focused, color, size }: TabIconProps) => {
            const iconName = focused
              ? TAB_ICONS[route.name]?.active
              : TAB_ICONS[route.name]?.inactive;
            return <Icon name={(iconName || 'help') as any} size={22} color={color} />;
          },
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 0.5,
            height: Platform.OS === 'ios' ? 88 : 60,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen
          name="Downloads"
          component={DownloadsScreen}
          options={{
            headerTitle: 'NexLoad',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 20,
              color: colors.accent,
            },
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            headerTitle: 'Search',
          }}
        />
        <Tab.Screen
          name="Files"
          component={FilesScreen}
          options={{
            headerTitle: 'Files',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            headerTitle: 'Settings',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider initialMode="system">
      <AppNavigator />
    </ThemeProvider>
  );
};

export default App;
