import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  TouchableOpacity, Platform, Image, ScrollView,
} from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { Colors, Shadow } from '../theme';
import BackButton from '../components/BackButton';
import { useLayout, SIDEBAR_W } from '../utils/responsive';
import { useAppTheme } from '../context/ThemeContext';

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

// Feature screens
import AlertsScreen         from '../screens/alerts/AlertsScreen';
import ShareScreen          from '../screens/share/ShareScreen';
import EcoSpotsScreen       from '../screens/ecospots/EcoSpotsScreen';
import DirectionsScreen     from '../screens/ecospots/DirectionsScreen';
import OffsetScreen         from '../screens/offset/OffsetScreen';
import RejuvenateScreen     from '../screens/offset/RejuvenateScreen';
import IslandScreen         from '../screens/island/IslandScreen';
import ChallengeScreen      from '../screens/challenge/ChallengeScreen';
import SettingsScreen       from '../screens/settings/SettingsScreen';
import OnboardingScreen     from '../screens/onboarding/OnboardingScreen';

const Stack  = createNativeStackNavigator();
const Tab    = createBottomTabNavigator();
export const navRef = createNavigationContainerRef();

// ── Single source of truth — drives BOTH the bottom bar and the web sidebar ───
// To add a new screen to both: add one entry here (and register it as a Tab.Screen below)
const NAV_ITEMS = [
  { name: 'Dashboard',    emoji: '🏠', label: 'Home'          },
  { name: 'LogActivity',  emoji: '➕', label: 'Log Activity'  },
  { name: 'Reports',      emoji: '📊', label: 'Reports'       },
  { name: 'Chatbot',      emoji: '🤖', label: 'Eco Coach'     },
  { name: 'EcoSpots',     emoji: '📍', label: 'Eco Spots'     },
  { name: 'CarbonOffset', emoji: '🌍', label: 'Carbon Offset' },
  { name: 'EcoIsland',    emoji: '🏝️', label: 'Eco Island'    },
  { name: 'Challenge',    emoji: '⚔️', label: 'Challenge'     },
  { name: 'Leaderboard',  emoji: '🏆', label: 'Leaderboard'   },
  { name: 'Profile',      emoji: '👤', label: 'Profile'       },
];

const NAV_NAMES = new Set(NAV_ITEMS.map(t => t.name));

// All NAV_ITEMS are Tab.Screens inside MainTabs — always navigate via MainTabs
const sidebarNavigate = (name) => {
  if (!navRef.isReady()) return;
  navRef.navigate('MainTabs', { screen: name });
};

// ── Animated tab icon (mobile bottom bar) ────────────────────────────────────
function AnimatedTabIcon({ emoji, label, focused }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const dotFade  = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.22, tension: 280, friction: 5, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1.0,  tension: 200, friction: 7, useNativeDriver: true }),
        ]),
        Animated.spring(dotFade,  { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.spring(dotScale, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dotFade,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View style={[ts.wrap, { transform: [{ scale }] }]}>
      <Text style={ts.emoji}>{emoji}</Text>
      <Text style={[ts.label, focused && ts.labelActive]}>{label}</Text>
      <Animated.View style={[ts.dot, { opacity: dotFade, transform: [{ scale: dotScale }] }]} />
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  wrap:        { alignItems: 'center', paddingTop: 5 },
  emoji:       { fontSize: 20 },
  label:       { fontSize: 10, marginTop: 2, color: 'rgba(178,208,84,0.45)', fontWeight: '500' },
  labelActive: { color: '#B2D054', fontWeight: '800' },
  dot:         { width: 5, height: 5, borderRadius: 3, backgroundColor: '#B2D054', marginTop: 3 },
});

// ── Web sidebar — rendered OUTSIDE the Tab.Navigator in a flex row ────────────
function WebSidebar({ activeTab }) {
  const { theme } = useAppTheme();
  return (
    <LinearGradient
      colors={theme.bgGrad}
      style={ws.sidebar}
    >
      {/* Logo — click to go to Dashboard */}
      <TouchableOpacity style={ws.logoRow} onPress={() => sidebarNavigate('Dashboard')} activeOpacity={0.8}>
        <Image
          source={require('../../assets/carbon-icon.png')}
          style={ws.logoImg}
          resizeMode="contain"
        />
        <Text style={ws.logoTxt}>EcoTrack AI</Text>
      </TouchableOpacity>

      {/* Nav items — scrollable so adding more items never overflows */}
      <ScrollView
        style={ws.navItems}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {NAV_ITEMS.map(meta => {
          const focused = activeTab === meta.name;
          return (
            <TouchableOpacity
              key={meta.name}
              style={[ws.navItem, focused && ws.navItemActive]}
              onPress={() => sidebarNavigate(meta.name)}
              activeOpacity={0.75}
            >
              <Text style={ws.navEmoji}>{meta.emoji}</Text>
              <Text style={[ws.navLabel, focused && ws.navLabelActive]}>
                {meta.label}
              </Text>
              {focused && <View style={ws.pip} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer — settings shortcut */}
      <View style={ws.footer}>
        <TouchableOpacity
          style={ws.settingsBtn}
          onPress={() => sidebarNavigate('Settings')}
          activeOpacity={0.75}
        >
          <Text style={ws.settingsBtnTxt}>⚙️  Settings</Text>
        </TouchableOpacity>
        <Text style={ws.footerTxt}>EcoTrack AI · v1.0</Text>
      </View>
    </LinearGradient>
  );
}

// ── Bottom tab bar (mobile only, hidden when sidebar shown or on Settings) ────
// Scrollable horizontally — adding items to NAV_ITEMS auto-adds them here too
function CustomTabBar({ state, navigation, showSidebar }) {
  const currentRoute = state.routes[state.index]?.name;
  if (showSidebar || currentRoute === 'Settings') return null;

  const visibleRoutes = state.routes.filter(r => NAV_NAMES.has(r.name));

  return (
    <LinearGradient
      colors={['#0A1A0F', '#0F2818']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={ws.bottomBar}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={ws.bottomBarContent}
      >
        {visibleRoutes.map(route => {
          const meta    = NAV_ITEMS.find(t => t.name === route.name);
          const focused = state.routes[state.index]?.name === route.name;
          return (
            <TouchableOpacity
              key={route.key}
              style={ws.bottomTab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <AnimatedTabIcon emoji={meta.emoji} label={meta.label} focused={focused} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

// ── Stack animation helpers ───────────────────────────────────────────────────
const slideInterp = ({ current, layouts }) => ({
  cardStyle: {
    opacity: current.progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 1] }),
    transform: [{
      translateX: current.progress.interpolate({
        inputRange: [0, 1], outputRange: [layouts.screen.width * 0.18, 0],
      }),
    }],
  },
  overlayStyle: { opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }) },
});

const fadeScaleInterp = ({ current }) => ({
  cardStyle: {
    opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{ scale: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
  },
});

const sheetInterp = ({ current, layouts }) => ({
  cardStyle: {
    opacity: current.progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 1] }),
    transform: [{
      translateY: current.progress.interpolate({
        inputRange: [0, 1], outputRange: [layouts.screen.height * 0.22, 0],
      }),
    }],
  },
});

const headerOpts = {
  headerStyle:        { backgroundColor: Colors.primary },
  headerTintColor:    Colors.white,
  headerTitleStyle:   { fontWeight: '800', fontSize: 17 },
  headerShadowVisible: false,
};

// ── Main tabs (bottom bar on mobile, hidden on web — sidebar handles it) ──────
function MainTabs({ showSidebar }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} showSidebar={showSidebar} />}
      screenOptions={{ ...headerOpts }}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ title: '🌿 EcoTrack AI' }} />
      <Tab.Screen name="LogActivity"  component={LogActivityScreen}  options={{ title: '➕ Log Activity', headerLeft: () => <BackButton dark inline /> }} />
      <Tab.Screen name="Reports"      component={ReportsScreen}      options={{ title: '📊 Reports',      headerLeft: () => <BackButton dark inline /> }} />
      <Tab.Screen name="Chatbot"      component={ChatbotScreen}      options={{ title: '🤖 Eco Coach',    headerLeft: () => <BackButton dark inline /> }} />
      <Tab.Screen name="EcoSpots"     component={EcoSpotsScreen}     options={{ headerShown: false }} />
      <Tab.Screen name="CarbonOffset" component={RejuvenateScreen}   options={{ headerShown: false }} />
      <Tab.Screen name="EcoIsland"    component={IslandScreen}       options={{ headerShown: false }} />
      <Tab.Screen name="Challenge"    component={ChallengeScreen}    options={{ headerShown: false }} />
      <Tab.Screen name="Leaderboard"  component={LeaderboardScreen}  options={{ title: '🏆 Leaderboard', headerLeft: () => <BackButton dark inline /> }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}      options={{ title: '👤 My Profile',  headerLeft: () => <BackButton dark inline /> }} />
      {/* Settings: hidden from tab bar, accessible via sidebar/button */}
      <Tab.Screen name="Settings"     component={SettingsScreen}     options={{ headerShown: false, tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

// ── Auth stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, gestureEnabled: true, gestureDirection: 'horizontal',
        cardStyleInterpolator: slideInterp,
        transitionSpec: {
          open:  { animation: 'spring', config: { stiffness: 280, damping: 30, mass: 0.8 } },
          close: { animation: 'spring', config: { stiffness: 280, damping: 30, mass: 0.8 } },
        },
      }}
    >
      <Stack.Screen name="Login"          component={LoginScreen}         options={{ title: 'Sign In' }} />
      <Stack.Screen name="Register"       component={RegisterScreen}      options={{ title: 'Create Account' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
      <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen}  options={{ title: 'New Password' }} />
    </Stack.Navigator>
  );
}

// ── App stack — passes showSidebar down so MainTabs can hide the tab bar ──────
function AppStack({ showSidebar }) {
  const MainTabsScreen = useCallback(
    () => <MainTabs showSidebar={showSidebar} />,
    [showSidebar],
  );

  return (
    <Stack.Navigator
      screenOptions={{
        ...headerOpts, gestureEnabled: true, gestureDirection: 'horizontal',
        cardStyleInterpolator: slideInterp,
        transitionSpec: {
          open:  { animation: 'spring', config: { stiffness: 300, damping: 32, mass: 0.85 } },
          close: { animation: 'spring', config: { stiffness: 300, damping: 32, mass: 0.85 } },
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabsScreen} options={{ headerShown: false }} />

      <Stack.Screen name="Alerts" component={AlertsScreen}
        options={{ headerShown: false, cardStyleInterpolator: fadeScaleInterp,
          transitionSpec: {
            open:  { animation: 'timing', config: { duration: 280, easing: Easing.out(Easing.cubic) } },
            close: { animation: 'timing', config: { duration: 220, easing: Easing.in(Easing.cubic) } },
          } }} />

      {[
        { name: 'Share',  comp: ShareScreen  },
        { name: 'Offset', comp: OffsetScreen },
      ].map(({ name, comp }) => (
        <Stack.Screen key={name} name={name} component={comp}
          options={{ headerShown: false, cardStyleInterpolator: sheetInterp,
            transitionSpec: {
              open:  { animation: 'spring', config: { stiffness: 260, damping: 28, mass: 0.9 } },
              close: { animation: 'timing', config: { duration: 240, easing: Easing.in(Easing.cubic) } },
            } }} />
      ))}

      <Stack.Screen name="Directions" component={DirectionsScreen}
        options={{ headerShown: false, cardStyleInterpolator: slideInterp,
          transitionSpec: {
            open:  { animation: 'spring', config: { stiffness: 300, damping: 32, mass: 0.85 } },
            close: { animation: 'spring', config: { stiffness: 300, damping: 32, mass: 0.85 } },
          } }} />

      <Stack.Screen name="CreatePost"
        component={require('../screens/posts/CreatePostScreen').default}
        options={{ title: '✍️ Post', headerLeft: () => <BackButton dark inline />,
          cardStyleInterpolator: sheetInterp,
          transitionSpec: {
            open:  { animation: 'spring', config: { stiffness: 260, damping: 28, mass: 0.9 } },
            close: { animation: 'timing', config: { duration: 220, easing: Easing.in(Easing.cubic) } },
          } }} />

      <Stack.Screen name="PostDetail"
        component={require('../screens/posts/PostDetailScreen').default}
        options={{ title: '📄 Post', headerLeft: () => <BackButton dark inline />,
          cardStyleInterpolator: slideInterp }} />

    </Stack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading }    = useAuth();
  const { showSidebar }      = useLayout();
  const [activeTab, setActiveTab] = useState('Dashboard');

  const handleStateChange = useCallback(() => {
    if (!navRef.isReady()) return;
    const route = navRef.getCurrentRoute();
    if (route && NAV_NAMES.has(route.name)) setActiveTab(route.name);
  }, []);

  if (loading) return <Loading message="Loading EcoTrack AI..." />;

  return (
    <NavigationContainer
      ref={navRef}
      onStateChange={handleStateChange}
      documentTitle={{ formatter: (options) => options?.title ? `${options.title} | EcoTrack AI` : 'EcoTrack AI' }}
    >
      {/*
        Layout:
          • Mobile  → column (content on top, tab bar at bottom)
          • Web ≥768 → row (sidebar on left, content fills right)
      */}
      <View style={[st.root, user && showSidebar && st.rowLayout]}>

        {/* Sidebar — only when logged in + wide web */}
        {user && showSidebar && (
          <WebSidebar activeTab={activeTab} />
        )}

        {/* Content — fills remaining space */}
        <View style={st.content}>
          {!user
            ? <AuthStack />
            : !user.onboardingComplete
              ? <OnboardingScreen />
              : <AppStack showSidebar={showSidebar} />}
        </View>

      </View>
    </NavigationContainer>
  );
}

// ── Root layout styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:      { flex: 1 },
  rowLayout: { flexDirection: 'row' },
  content:   { flex: 1 },
});

// ── Sidebar styles ────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_W,
    paddingTop:    Platform.OS === 'web' ? 0 : 44,
    paddingBottom: 24,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 22, paddingHorizontal: 10,
    marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoImg:  { width: 34, height: 34, borderRadius: 8 },
  logoTxt:  { fontSize: 15, fontWeight: '900', color: '#EFF4EE', letterSpacing: 0.4 },

  navItems: { flex: 1, paddingTop: 8 },
  navItem:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 14, marginBottom: 4,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: 'rgba(178,208,84,0.12)',
    borderLeftColor: '#B2D054',
  },
  navEmoji:       { fontSize: 19 },
  navLabel:       { fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '500', flex: 1 },
  navLabelActive: { color: '#B2D054', fontWeight: '700' },
  pip:            {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#B2D054',
    position: 'absolute', right: 12,
  },

  footer:       { paddingHorizontal: 14, paddingTop: 12,
                  borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  settingsBtn:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                  paddingHorizontal: 4, borderRadius: 10, marginBottom: 8 },
  settingsBtnTxt:{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  footerTxt:    { fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: '500', paddingLeft: 4 },

  // ── Mobile bottom tab bar — scrollable horizontal strip ──────────────────
  bottomBar: {
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(178,208,84,0.22)',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : Platform.OS === 'web' ? 10 : 8,
    shadowColor: '#B2D054',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 18,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
  },
  bottomTab: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingHorizontal: 4,
  },
});
