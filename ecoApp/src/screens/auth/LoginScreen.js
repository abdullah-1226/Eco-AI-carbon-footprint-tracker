import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, Linking, Animated,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { Colors, Shadow, Radii, Spacing } from '../../theme';
import storage from '../../utils/storage';
import Svg, { Path } from 'react-native-svg';

function GoogleIcon({ size = 22 }) {
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

const BACKEND_URL  = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:8081';

export default function LoginScreen({ navigation, route }) {
  const { login, loginWithGoogleToken } = useAuth();
  const [email,    setEmail]    = useState(route?.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error,    setError]    = useState('');

  // ── Animations ────────────────────────────────────────────────────────────
  const heroOpacity   = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(-30)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(40)).current;
  const googleScale   = useRef(new Animated.Value(0.8)).current;
  const logoRotate    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hero slides down + fades in
    Animated.parallel([
      Animated.timing(heroOpacity,   { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroTranslate, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    // Card slides up + fades in (slight delay)
    Animated.parallel([
      Animated.timing(cardOpacity,   { toValue: 1, duration: 700, delay: 300, useNativeDriver: true }),
      Animated.timing(cardTranslate, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }),
    ]).start();

    // Google button pops in
    Animated.spring(googleScale, {
      toValue: 1, delay: 700, friction: 5, tension: 80, useNativeDriver: true,
    }).start();

    // Leaf logo gentle rotation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, { toValue: 1,  duration: 2000, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: -1, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0,  duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const logoSpin = logoRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });

  // ── Google OAuth redirect listener ────────────────────────────────────────
  useEffect(() => {
    const handleURL = async (event) => {
      const url = event.url || event;
      if (typeof url !== 'string') return;
      try {
        const urlObj  = new URL(url);
        const token   = urlObj.searchParams.get('googleToken');
        const userStr = urlObj.searchParams.get('googleUser');
        const err     = urlObj.searchParams.get('googleError');
        const otpRequired = urlObj.searchParams.get('googleOtpRequired');
        const tempToken   = urlObj.searchParams.get('tempToken');
        const otpEmail    = urlObj.searchParams.get('otpEmail');

        if (err) { setError(decodeURIComponent(err)); setGLoading(false); return; }
        if (token && userStr) {
          await loginWithGoogleToken(token, JSON.parse(decodeURIComponent(userStr)));
          setGLoading(false);
        }
        if (otpRequired === 'true' && tempToken) {
          setGLoading(false);
          navigation.navigate('GoogleOtp', { tempToken, otpEmail: decodeURIComponent(otpEmail || '') });
        }
      } catch { /* not a google callback URL */ }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params  = new URLSearchParams(window.location.search);
      const token   = params.get('googleToken');
      const userStr = params.get('googleUser');
      const err     = params.get('googleError');

      if (err) {
        setError(decodeURIComponent(err));
        window.history.replaceState({}, '', FRONTEND_URL);
      } else if (token && userStr) {
        loginWithGoogleToken(token, JSON.parse(decodeURIComponent(userStr))).catch(() => setError('Google sign-in failed.'));
        window.history.replaceState({}, '', FRONTEND_URL);
      } else if (params.get('googleOtpRequired') === 'true') {
        const tempToken = params.get('tempToken');
        const otpEmail  = params.get('otpEmail');
        window.history.replaceState({}, '', FRONTEND_URL);
        navigation.navigate('GoogleOtp', { tempToken, otpEmail: decodeURIComponent(otpEmail || '') });
      }
    }

    const sub = Linking.addEventListener('url', handleURL);
    return () => sub?.remove?.();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGLoading(true);
    setError('');
    const googleURL = `${BACKEND_URL}/api/auth/google/init`;
    try {
      if (Platform.OS === 'web') {
        window.location.href = googleURL;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(googleURL, 'ecotrack://');
        if (result.type === 'success') {
          const params  = new URLSearchParams(result.url.split('?')[1] || '');
          const token   = params.get('googleToken');
          const userStr = params.get('googleUser');
          const err     = params.get('googleError');
          if (err) {
            setError(decodeURIComponent(err));
          } else if (token && userStr) {
            await loginWithGoogleToken(token, JSON.parse(decodeURIComponent(userStr)));
          } else if (params.get('googleOtpRequired') === 'true') {
            navigation.navigate('GoogleOtp', {
              tempToken: params.get('tempToken'),
              otpEmail:  decodeURIComponent(params.get('otpEmail') || ''),
            });
          }
        } else if (result.type !== 'cancel') {
          setError('Google sign-in was cancelled.');
        }
        setGLoading(false);
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
      setGLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Pulse animation on Sign In button press
  const btnScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }]}>
          {/* Dark green top strip */}
          <View style={styles.heroDark} />
          {/* Medium green body */}
          <View style={styles.heroBody}>
            <Animated.Text style={[styles.heroIcon, { transform: [{ rotate: logoSpin }] }]}>🌿</Animated.Text>
            <Text style={styles.heroTitle}>Eco AI</Text>
            <Text style={styles.heroSub}>Carbon Footprint Tracker</Text>
          </View>
          {/* Light green wave-like bottom */}
          <View style={styles.heroLight} />
        </Animated.View>

        {/* ── Card ───────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to track your carbon footprint</Text>

          {!!error && (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️  {error}</Text>
            </View>
          )}

          {/* ── Email ── */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            mode="outlined"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            left={<TextInput.Icon icon="email-outline" color={Colors.primary} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          {/* ── Password ── */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Your password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPass}
            autoComplete="off"
            left={<TextInput.Icon icon="lock-outline" color={Colors.primary} />}
            right={
              <TextInput.Icon
                icon={showPass ? 'eye-off' : 'eye'}
                color={Colors.textMuted}
                onPress={() => setShowPass(!showPass)}
              />
            }
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          {/* ── Forgot Password ── */}
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* ── Sign In button ── */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Button
              mode="contained"
              onPress={handleLogin}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              loading={loading}
              disabled={loading}
              style={styles.btnPrimary}
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
              buttonColor={Colors.primary}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Animated.View>

          {/* ── Register link ── */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Don't have an account?{'  '}
              <Text style={styles.link}>Create Account</Text>
            </Text>
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Google Button (below) ── */}
          <Animated.View style={{ transform: [{ scale: googleScale }] }}>
            <TouchableOpacity
              style={[styles.googleBtn, gLoading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={gLoading}
              activeOpacity={0.82}
            >
              <View style={styles.googleIconWrap}>
                <GoogleIcon size={20} />
              </View>
              <Text style={styles.googleText}>
                {gLoading ? 'Signing in with Google...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* ── Eco tip strip ── */}
        <View style={styles.ecoStrip}>
          <Text style={styles.ecoStripText}>🌍  Every action counts — track yours today</Text>
        </View>

        <Text style={styles.footer}>Eco AI • Reducing Carbon, One Step at a Time</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: '#E8F5E9' },
  scroll: { flexGrow: 1 },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: { overflow: 'hidden' },

  heroDark: {
    backgroundColor: '#1B5E20',   // darkest green
    height: 10,
  },
  heroBody: {
    backgroundColor: '#2E7D32',   // deep green
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 36,
  },
  heroLight: {
    backgroundColor: '#388E3C',   // medium-dark green transition
    height: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  heroIcon:      { fontSize: 60, marginBottom: 10 },
  heroTitle:     { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  heroSub:       { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  heroBadge:     { marginTop: 12, backgroundColor: '#66BB6A', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 5 },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.lg,
    marginTop: -16,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    ...Shadow.lg,
    borderTopWidth: 4,
    borderTopColor: '#66BB6A',   // accent green top border
  },

  cardTitle:    { fontSize: 22, fontWeight: '800', color: '#1B2A1B', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#5D7B5D', marginBottom: Spacing.md },

  alertDanger: {
    backgroundColor: '#FFEBEE', borderLeftWidth: 4,
    borderLeftColor: '#E53935', borderRadius: Radii.sm,
    padding: 12, marginBottom: Spacing.md,
  },
  alertText: { color: '#b71c1c', fontSize: 13, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: '#1B2A1B', marginTop: Spacing.sm, marginBottom: 4 },
  input: { backgroundColor: '#F9FBF9', marginBottom: 2 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 4 },
  forgotText: { fontSize: 13, color: '#2E7D32', fontWeight: '700' },

  btnPrimary: { marginTop: Spacing.sm, borderRadius: Radii.md },
  btnContent: { height: 52 },
  btnLabel:   { fontSize: 16, fontWeight: '800', letterSpacing: 0.4, color: '#FFFFFF' },

  linkRow:  { alignItems: 'center', marginTop: Spacing.md },
  linkText: { color: '#5D7B5D', fontSize: 14 },
  link:     { color: '#2E7D32', fontWeight: '700' },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#C8E6C9' },
  dividerText: { marginHorizontal: Spacing.sm, color: '#5D7B5D', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  // ── Google button ───────────────────────────────────────────────────────────
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F8E9',
    borderRadius: Radii.md,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    gap: 12,
    ...Shadow.sm,
  },
  btnDisabled: { opacity: 0.6 },

  googleIconWrap: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  googleText:     { fontSize: 15, fontWeight: '700', color: '#1B2A1B' },

  // ── Eco strip ───────────────────────────────────────────────────────────────
  ecoStrip: {
    backgroundColor: '#C8E6C9',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radii.md,
    padding: 10,
    alignItems: 'center',
  },
  ecoStripText: { color: '#1B5E20', fontSize: 12, fontWeight: '600' },

  footer: {
    textAlign: 'center', color: '#81C784', fontSize: 11,
    marginBottom: Spacing.xl, marginTop: Spacing.sm, fontWeight: '500',
  },
});
