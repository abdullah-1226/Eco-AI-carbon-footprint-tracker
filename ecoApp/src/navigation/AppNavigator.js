import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { Colors, Shadow } from '../theme';

// Auth screens
import LoginScreen          from '../screens/auth/LoginScreen';
import RegisterScreen       from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen  from '../screens/auth/ResetPasswordScreen';

// App screens
import DashboardScreen      from '../screens/dashboard/DashboardScreen';
import LogActivityScreen    from '../screens/activity/LogActivityScreen';
import ReportsScreen        from '../screens/reports/ReportsScreen';
import ChatbotScreen        from '../screens/chatbot/ChatbotScreen';
import LeaderboardScreen    from '../screens/leaderboard/LeaderboardScreen';
import ProfileScreen        from '../screens/profile/ProfileScreen';

// New feature screens
import AlertsScreen         from '../screens/alerts/AlertsScreen';
import ShareScreen          from '../screens/share/ShareScreen';
import EcoSpotsScreen       from '../screens/ecospots/EcoSpotsScreen';
import OffsetScreen         from '../screens/offset/OffsetScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabBarIcon({ emoji, label, focused }) {
  return (
    <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
      <Text style={tabStyles.emoji}>{emoji}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap:        { alignItems: 'center', paddingTop: 6 },
  wrapActive:  {},
  emoji:       { fontSize: 20 },
  label:       { fontSize: 10, marginTop: 2, color: Colors.textMuted, fontWeight: '500' },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});

const headerOptions = {
  headerStyle:       { backgroundColor: Colors.primary },
  headerTintColor:   Colors.white,
  headerTitleStyle:  { fontWeight: '800', fontSize: 17 },
  headerShadowVisible: false,
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 65,
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          ...Shadow.md,
        },
        ...headerOptions,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: '🌿 EcoTrack AI',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LogActivity"
        component={LogActivityScreen}
        options={{
          title: '➕ Log Activity',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="➕" label="Log" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: '📊 Reports',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="📊" label="Reports" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{
          title: '🤖 Eco Coach',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🤖" label="Coach" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: '🏆 Leaderboard',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🏆" label="Ranks" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '👤 My Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs"  component={MainTabs}       options={{ headerShown: false }} />
      <Stack.Screen name="Alerts"    component={AlertsScreen}   options={{ title: '🔔 Alerts', headerShown: false }} />
      <Stack.Screen name="Share"     component={ShareScreen}    options={{ title: '📤 Share Score', headerShown: false }} />
      <Stack.Screen name="EcoSpots"  component={EcoSpotsScreen} options={{ title: '🗺️ Eco Spots', headerShown: false }} />
      <Stack.Screen name="Offset"    component={OffsetScreen}   options={{ title: '🌍 Carbon Offset', headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <Loading message="Loading EcoTrack AI..." />;
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
