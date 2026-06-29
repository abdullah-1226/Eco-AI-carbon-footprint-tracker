import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, Linking, Animated,
  Image, ImageBackground, Dimensions, StatusBar,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../../context/AuthContext';
import { googleMobileLogin } from '../../api/api';
import { Radii, Spacing } from '../../theme';
import Svg, { Path } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ── Dramatic misty jungle road — rays of sunlight through ancient trees ───────
const BG_IMG = 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=1600&q=95&fit=crop&crop=center&auto=format';

function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

WebBrowser.maybeCompleteAuthSession();
const PROD_BACKEND = 'https://eco-ai-carbon-footprint-tracker-backend.onrender.com';
const DEV_LAN_IP   = '192.168.1.5'; // Mac's LAN IP — keep in sync with api.js
const BACKEND_URL  = Platform.OS === 'web'
  ? (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : PROD_BACKEND)
  : (__DEV__ ? `http://${DEV_LAN_IP}:3000` : PROD_BACKEND);

const FRONTEND_URL = Platform.OS === 'web' && typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:8081';

export default function LoginScreen({ navigation, route }) {
  const { login, loginWithGoogleToken } = useAuth();
  const [email,    setEmail]    = useState(route?.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error,    setError]    = useState('');

  // expo-auth-session Google provider (used for Android/iOS native OAuth)
  // redirectUri must use the reversed client ID scheme — the only URI Google accepts for Android/iOS OAuth clients
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: '622297938560-i03vmq68ttobum23gq32q9g73cfv76b6.apps.googleusercontent.com',
    iosClientId:     '622297938560-ee2k919d8jp4bkgop9i1o4t7khdcge9j.apps.googleusercontent.com',
    webClientId:     '622297938560-2ll401sqvvi6snv8q3bco6e93fnogins.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: Platform.select({
      android: 'com.googleusercontent.apps.622297938560-i03vmq68ttobum23gq32q9g73cfv76b6:/oauth2redirect',
      ios:     'com.googleusercontent.apps.622297938560-ee2k919d8jp4bkgop9i1o4t7khdcge9j:/oauth2redirect',
      default: undefined,
    }),
  });

  // Log the exact redirect URI so we know what to register in Google Console
  useEffect(() => {
    if (googleRequest?.redirectUri) {
      console.log('GOOGLE REDIRECT URI:', googleRequest.redirectUri);
    }
  }, [googleRequest?.redirectUri]);

  // ── Entrance animations (no moving logo) ─────────────────────────────────
  const brandFade  = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(-24)).current;
  const cardFade   = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(50)).current;
  const glowPulse  = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Brand slides down + fades in
    Animated.parallel([
      Animated.timing(brandFade,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(brandSlide, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();

    // Card slides up with spring
    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 800, delay: 350, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 50, friction: 10, delay: 350, useNativeDriver: true }),
    ]).start();

    // Subtle glow pulse behind logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1,   duration: 2500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.5, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleURL = async (event) => {
      const url = event.url || event;
      if (typeof url !== 'string') return;
      try {
        const p     = new URL(url).searchParams;
        const token = p.get('googleToken');
        const uStr  = p.get('googleUser');
        const err   = p.get('googleError');
        if (err)           { setError(decodeURIComponent(err)); setGLoading(false); return; }
        if (token && uStr) { await loginWithGoogleToken(token, JSON.parse(decodeURIComponent(uStr))); setGLoading(false); }
      } catch { /* ignore */ }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const p   = new URLSearchParams(window.location.search);
      const tok = p.get('googleToken');
      const usr = p.get('googleUser');
      const err = p.get('googleError');
      if (err) { setError(decodeURIComponent(err)); window.history.replaceState({}, '', FRONTEND_URL); }
      else if (tok && usr) {
        let parsedUser; try { parsedUser = JSON.parse(decodeURIComponent(usr)); } catch { setError('Google sign-in failed.'); return; }
        loginWithGoogleToken(tok, parsedUser).catch(() => setError('Google sign-in failed.'));
        window.history.replaceState({}, '', FRONTEND_URL);
      }
    }
    const sub = Linking.addEventListener('url', handleURL);
    return () => sub?.remove?.();
  }, []);

  // Handle expo-auth-session Google response (mobile only)
  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success') {
      const { authentication } = googleResponse;
      setGLoading(true);
      googleMobileLogin({
        accessToken: authentication?.accessToken,
        idToken:     authentication?.idToken,
      })
        .then(res => {
          const { token, user } = res.data;
          loginWithGoogleToken(token, user);
        })
        .catch(() => { setError('Google sign-in failed. Please try again.'); setGLoading(false); });
    } else if (googleResponse.type === 'error') {
      setError('Google sign-in failed. Please try again.');
      setGLoading(false);
    } else if (googleResponse.type === 'dismiss' || googleResponse.type === 'cancel') {
      setGLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleSignIn = async () => {
    setGLoading(true); setError('');
    try {
      if (Platform.OS === 'web') {
        window.location.href = `${BACKEND_URL}/api/auth/google/init`;
      } else {
        // Use expo-auth-session — complies with Google OAuth 2.0 policy for mobile
        await googlePromptAsync();
        // response is handled in the useEffect above
      }
    } catch { setError('Google sign-in failed.'); setGLoading(false); }
  };

  const [loadingMsg, setLoadingMsg] = useState('Signing in...');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setLoadingMsg('Signing in...');
    const wakeTimer = setTimeout(() => setLoadingMsg('Waking up server... please wait (~30s)'), 6000);
    try { await login(email.trim(), password); }
    catch (err) { setError(err.response?.data?.error || err.message === 'Network Error' ? 'Cannot reach server. Check your internet.' : 'Invalid email or password.'); }
    finally { clearTimeout(wakeTimer); setLoading(false); setLoadingMsg('Signing in...'); }
  };

  const btnScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen background ────────────────────────────────────── */}
      <ImageBackground source={{ uri: BG_IMG }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* ── Layered gradients for atmosphere ─────────────────────────── */}
      <LinearGradient
        colors={['rgba(3,10,3,0.15)', 'rgba(5,14,5,0.30)', 'rgba(3,8,3,0.92)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Top vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: H * 0.35 }]}
      />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── App name header ── */}
          <Animated.View style={[s.appHeader, { opacity: brandFade, transform: [{ translateY: brandSlide }] }]}>
            <Text style={s.appName}>ECO AI</Text>
            <Text style={s.appTagline}>CARBON FOOTPRINT TRACKER</Text>
          </Animated.View>

          {/* ════════════════════════════════════════════════════════════
              SIGN-IN CARD — frosted glass
          ════════════════════════════════════════════════════════════ */}
          <Animated.View style={[s.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>

            {/* Blur layer */}
            {Platform.OS !== 'web' ? (
              <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,20,10,0.82)' }]} />
            )}

            {/* Olive top accent line */}
            <LinearGradient
              colors={['#B2D054', '#8FA832']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.accentBar}
            />

            <View style={s.cardBody}>
              {/* Heading */}
              <Text style={s.cardTitle}>Welcome Back 👋</Text>
              <Text style={s.cardSub}>Sign in to continue your eco journey</Text>

              {/* Error */}
              {!!error && (
                <View style={s.errBox}>
                  <Text style={s.errTxt}>⚠️  {error}</Text>
                </View>
              )}

              {/* Email */}
              <Text style={s.lbl}>Email Address</Text>
              <TextInput
                mode="outlined"
                placeholder="you@example.com"
                placeholderTextColor="rgba(239,244,238,0.35)"
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="off"
                left={<TextInput.Icon icon="email-outline" color="#B2D054" />}
                style={s.input}
                outlineColor="rgba(178,208,84,0.28)"
                activeOutlineColor="#B2D054"
                textColor="#EFF4EE"
                theme={{ roundness: 12, colors: { background: 'rgba(255,255,255,0.06)' } }}
              />

              {/* Password */}
              <Text style={s.lbl}>Password</Text>
              <TextInput
                mode="outlined"
                placeholder="Your password"
                placeholderTextColor="rgba(239,244,238,0.35)"
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPass}
                autoComplete="off"
                left={<TextInput.Icon icon="lock-outline" color="#B2D054" />}
                right={
                  <TextInput.Icon
                    icon={showPass ? 'eye-off' : 'eye'}
                    color="rgba(239,244,238,0.45)"
                    onPress={() => setShowPass(p => !p)}
                  />
                }
                style={s.input}
                outlineColor="rgba(178,208,84,0.28)"
                activeOutlineColor="#B2D054"
                textColor="#EFF4EE"
                theme={{ roundness: 12, colors: { background: 'rgba(255,255,255,0.06)' } }}
              />

              {/* Forgot */}
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={s.forgotRow}>
                <Text style={s.forgotTxt}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Sign In */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={handleLogin}
                  onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={s.signInBtn}
                >
                  <LinearGradient colors={['#B2D054', '#8FA832']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.signInGrad}>
                    <Text style={s.signInTxt}>{loading ? loadingMsg : 'Sign In'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Register */}
              <TouchableOpacity onPress={() => navigation.navigate('Register')} style={s.registerRow}>
                <Text style={s.registerTxt}>Don't have an account? </Text>
                <Text style={s.registerLink}>Create Account</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divTxt}>OR CONTINUE WITH</Text>
                <View style={s.divLine} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={[s.googleBtn, gLoading && { opacity: 0.55 }]}
                onPress={handleGoogleSignIn}
                disabled={gLoading}
                activeOpacity={0.8}
              >
                <View style={s.googleIconCircle}><GoogleIcon size={19} /></View>
                <Text style={s.googleTxt}>{gLoading ? 'Connecting...' : 'Continue with Google'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Bottom tagline ── */}
          <View style={s.footer}>
            <Text style={s.footerTxt}>Reducing Carbon · One Step at a Time</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#050E05' },
  flex:  { flex: 1 },
  scroll:{ flexGrow: 1, paddingBottom: 40, justifyContent: 'center' },

  // ── Brand / hero ────────────────────────────────────────────────────────────
  brand: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 28,
  },
  logoGlow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 32,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#B2D054',
    opacity: 0.18,
  },
  logoImg: {
    width: 96, height: 96,
    borderRadius: 24,
    shadowColor: '#B2D054', shadowOpacity: 0.55, shadowRadius: 18, elevation: 12,
  },
  brandTitle: {
    fontSize: 36, fontWeight: '900', color: '#FFFFFF',
    marginTop: 14, letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  brandSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.65)',
    marginTop: 5, fontWeight: '500', letterSpacing: 0.5,
  },
  ipccBadge: {
    marginTop: 14,
    backgroundColor: 'rgba(178,208,84,0.16)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.35)',
  },
  ipccTxt: { color: '#B2D054', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // ── Glass card ──────────────────────────────────────────────────────────────
  appHeader: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : Platform.OS === 'web' ? 64 : 52,
    paddingBottom: 20,
  },
  appName: {
    fontSize: 42, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  appTagline: {
    fontSize: 12, fontWeight: '800', color: '#B2D054',
    letterSpacing: 3.5, marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 0,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(178,208,84,0.20)',
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, elevation: 20,
  },
  accentBar: { height: 3 },
  cardBody:  { padding: 22 },
  cardTitle: { fontSize: 23, fontWeight: '900', color: '#EFF4EE', marginBottom: 3 },
  cardSub:   { fontSize: 13, color: 'rgba(239,244,238,0.50)', marginBottom: 16 },

  errBox: {
    backgroundColor: 'rgba(239,68,68,0.14)', borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: '#F87171',
    padding: 12, marginBottom: 12,
  },
  errTxt: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },

  lbl:   { fontSize: 11, fontWeight: '700', color: 'rgba(239,244,238,0.55)', marginTop: 12, marginBottom: 5, letterSpacing: 0.6, textTransform: 'uppercase' },
  input: { marginBottom: 2 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 9, marginBottom: 5 },
  forgotTxt: { fontSize: 13, color: '#B2D054', fontWeight: '700' },

  // Sign in button — gradient
  signInBtn:  { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  signInGrad: { paddingVertical: 15, alignItems: 'center' },
  signInTxt:  { fontSize: 16, fontWeight: '900', color: '#1A2318', letterSpacing: 0.4 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  registerTxt: { color: 'rgba(239,244,238,0.50)', fontSize: 14 },
  registerLink:{ color: '#B2D054', fontWeight: '800', fontSize: 14 },

  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  divLine:{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  divTxt: { marginHorizontal: 10, color: 'rgba(239,244,238,0.30)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', gap: 12,
  },
  googleIconCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  googleTxt: { fontSize: 15, fontWeight: '700', color: 'rgba(239,244,238,0.88)' },

  // Footer
  footer:    { alignItems: 'center', marginTop: 24 },
  footerTxt: { color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: '500' },
});
