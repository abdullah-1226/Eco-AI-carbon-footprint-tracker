import React, { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../../context/AuthContext';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle, loginWithGoogleUserInfo } = useAuth();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [gLoading, setGLoading]   = useState(false);
  const [error, setError]         = useState('');

  // Google OAuth — replace with your real client IDs from Google Cloud Console
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:        '622297938560-2ll401sqvvi6snv8q3bco6e93fnogins.apps.googleusercontent.com',
    iosClientId:     '622297938560-ee2k919d8jp4bkgop9i1o4t7khdcge9j.apps.googleusercontent.com',
    androidClientId: '622297938560-i03vmq68ttobum23gq32q9g73cfv76b6.apps.googleusercontent.com',
    webClientId:     '622297938560-2ll401sqvvi6snv8q3bco6e93fnogins.apps.googleusercontent.com',
    scopes:          ['openid', 'profile', 'email'],
  });

  // Handle Google OAuth response
  // On native → idToken is returned (verified by backend)
  // On web    → only accessToken is returned, so we fetch user info from Google
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { idToken, accessToken } = response.authentication ?? {};
      if (idToken) {
        handleGoogleWithIdToken(idToken);
      } else if (accessToken) {
        handleGoogleWithAccessToken(accessToken);
      } else {
        setError('Google sign-in failed: no token received.');
      }
    } else if (response?.type === 'error') {
      setError('Google sign-in was cancelled or failed.');
    }
  }, [response]);

  // Native path — send idToken to backend for verification
  const handleGoogleWithIdToken = async (idToken) => {
    setGLoading(true);
    setError('');
    try {
      await loginWithGoogle(idToken);
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setGLoading(false);
    }
  };

  // Web path — fetch user info using accessToken, then send to backend
  const handleGoogleWithAccessToken = async (accessToken) => {
    setGLoading(true);
    setError('');
    try {
      const userInfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoRes.json();
      if (!userInfo.sub) throw new Error('Could not fetch Google user info.');
      await loginWithGoogleUserInfo(userInfo);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Google sign-in failed.');
    } finally {
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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🌿</Text>
          <Text style={styles.heroTitle}>EcoTrack AI</Text>
          <Text style={styles.heroSub}>Carbon Footprint Tracker</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>FYP Project</Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to track your carbon footprint</Text>

          {error ? (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️  {error}</Text>
            </View>
          ) : null}

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleBtn, gLoading && styles.btnDisabled]}
            onPress={() => promptAsync()}
            disabled={!request || gLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>
              {gLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            mode="outlined"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" color={Colors.primary} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Your password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPass}
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

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In button */}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.btnPrimary}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            buttonColor={Colors.primary}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Register link */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Don't have an account?{'  '}
              <Text style={styles.link}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>🌍 Together we reduce carbon emissions</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flexGrow: 1 },

  hero: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingTop: 56, paddingBottom: 48,
  },
  heroIcon:       { fontSize: 56, marginBottom: 8 },
  heroTitle:      { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  heroSub:        { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroBadge:      { marginTop: 10, backgroundColor: Colors.accent, borderRadius: Radii.pill, paddingHorizontal: 14, paddingVertical: 4 },
  heroBadgeText:  { color: Colors.white, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  card: {
    backgroundColor: Colors.white, margin: Spacing.lg,
    borderRadius: Radii.xl, padding: Spacing.lg,
    marginTop: -24, ...Shadow.lg,
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.md },

  alertDanger: {
    backgroundColor: Colors.dangerLight, borderLeftWidth: 4,
    borderLeftColor: Colors.danger, borderRadius: Radii.sm,
    padding: Spacing.sm + 4, marginBottom: Spacing.md,
  },
  alertText: { color: '#b71c1c', fontSize: 13, fontWeight: '600' },

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: Radii.md, padding: 14,
    borderWidth: 1.5, borderColor: Colors.border, gap: 10,
    ...Shadow.sm,
  },
  btnDisabled:  { opacity: 0.6 },
  googleIcon:   { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleText:   { fontSize: 15, fontWeight: '700', color: Colors.dark },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: Spacing.sm, color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  label: { fontSize: 13, fontWeight: '700', color: Colors.dark, marginTop: Spacing.sm, marginBottom: 4 },
  input: { backgroundColor: Colors.white, marginBottom: 2 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 4 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },

  btnPrimary:  { marginTop: Spacing.sm, borderRadius: Radii.md },
  btnContent:  { height: 50 },
  btnLabel:    { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  linkRow:  { alignItems: 'center', marginTop: Spacing.md },
  linkText: { color: Colors.textMuted, fontSize: 14 },
  link:     { color: Colors.primary, fontWeight: '700' },

  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.xl, marginTop: 4 },
});
