import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LeadsScreen from './src/screens/LeadsScreen';
import LeadDetailScreen from './src/screens/LeadDetailScreen';
import LeadCreateScreen from './src/screens/LeadCreateScreen';
import PipelineScreen from './src/screens/PipelineScreen';
import TasksScreen from './src/screens/TasksScreen';
import TaskCreateScreen from './src/screens/TaskCreateScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import TeamScreen from './src/screens/TeamScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, color, size }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function MainTabs() {
  const { assignedStats } = useAuth();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <TabIcon name="grid-outline" color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{
          tabBarLabel: 'Leads',
          tabBarIcon: ({ color, size }) => <TabIcon name="people-outline" color={color} size={size - 2} />,
          tabBarBadge: assignedStats?.newAssignedCount > 0 ? assignedStats.newAssignedCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.error, fontSize: 9, minWidth: 16, height: 16 },
        }}
      />
      <Tab.Screen
        name="Pipeline"
        component={PipelineScreen}
        options={{
          tabBarLabel: 'Pipeline',
          tabBarIcon: ({ color, size }) => <TabIcon name="git-branch-outline" color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => <TabIcon name="checkmark-circle-outline" color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => <TabIcon name="business-outline" color={color} size={size - 2} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="LeadDetail"
            component={LeadDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="LeadCreate"
            component={LeadCreateScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="TaskCreate"
            component={TaskCreateScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Team"
            component={TeamScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
