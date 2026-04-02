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
import HomeScreen           from '../screens/posts/HomeScreen';
import PostDetailScreen     from '../screens/posts/PostDetailScreen';
import CreatePostScreen     from '../screens/posts/CreatePostScreen';
import DashboardScreen      from '../screens/dashboard/DashboardScreen';
import ProfileScreen        from '../screens/profile/ProfileScreen';

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

function HomeTabs() {
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
        name="Home"
        component={HomeScreen}
        options={{
          title: '🌿 EcoTrack — Feed',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🏠" label="Feed" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: '📊 Dashboard',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="📊" label="Stats" focused={focused} />,
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

// Auth stack — shown when user is NOT logged in
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

// App stack — shown when user IS logged in
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs"   component={HomeTabs}         options={{ headerShown: false }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post Detail' }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'New Post' }} />
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
