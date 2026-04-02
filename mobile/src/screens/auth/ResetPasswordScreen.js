import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { resetPassword } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import storage from '../../utils/storage';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

export default function ResetPasswordScreen({ navigation, route }) {
  // Token may come from deep link params or user can paste it manually
  const [token, setToken]         = useState(route?.params?.token || '');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const { login } = useAuth();

  const handleReset = async () => {
    setError('');
    if (!token.trim())    { setError('Please enter your reset code.'); return; }
    if (!password)        { setError('Please enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await resetPassword(token.trim(), password);
      // Backend returns a new JWT — auto login the user
      await storage.setItem('token', res.data.token);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset token. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Password Reset!</Text>
        <Text style={styles.successText}>
          Your password has been successfully updated.{'\n'}You can now sign in with your new password.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={styles.btnPrimary}
          contentStyle={styles.btnContent}
          buttonColor={Colors.primary}
          icon="login"
        >
          Go to Sign In
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🔑</Text>
          <Text style={styles.heroTitle}>Set New Password</Text>
          <Text style={styles.heroSub}>Enter the code from your email</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.cardSubtitle}>
            Enter the reset code from your email and choose a new password.
          </Text>

          {error ? (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️  {error}</Text>
            </View>
          ) : null}

          {/* Reset Token */}
          <Text style={styles.label}>Reset Code <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Paste reset code from email"
            value={token}
            onChangeText={(v) => { setToken(v); setError(''); }}
            autoCapitalize="none"
            left={<TextInput.Icon icon="key-outline" color={Colors.primary} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />
          <HelperText type="info" style={styles.helperText}>
            Copy the code from the reset link in your email
          </HelperText>

          {/* New Password */}
          <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Min. 6 characters"
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

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Re-enter new password"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setError(''); }}
            secureTextEntry={!showPass}
            left={
              <TextInput.Icon
                icon="lock-check-outline"
                color={confirm && confirm === password ? Colors.success : Colors.primary}
              />
            }
            style={styles.input}
            outlineColor={confirm && confirm !== password ? Colors.danger : Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />
          {confirm.length > 0 && confirm === password && (
            <HelperText type="info" style={styles.helperOk}>✅ Passwords match</HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            icon="lock-reset"
            style={styles.btnPrimary}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            buttonColor={Colors.primary}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={[styles.btnOutline, { marginTop: Spacing.sm }]}
            contentStyle={styles.btnContent}
            labelStyle={{ color: Colors.primary }}
          >
            Resend Reset Email
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: 4 }}
            labelStyle={{ color: Colors.textMuted }}
          >
            Back to Sign In
          </Button>
        </View>

        <Text style={styles.footer}>🌿 EcoTrack AI — FYP Carbon Footprint Tracker</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: Colors.secondary, alignItems: 'center',
    paddingTop: 56, paddingBottom: 48,
  },
  heroIcon:  { fontSize: 52, marginBottom: 10 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: Colors.white, margin: Spacing.lg,
    borderRadius: Radii.xl, padding: Spacing.lg,
    marginTop: -24, ...Shadow.lg,
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.md, lineHeight: 20 },
  alertDanger: {
    backgroundColor: Colors.dangerLight, borderLeftWidth: 4, borderLeftColor: Colors.danger,
    borderRadius: Radii.sm, padding: Spacing.sm + 4, marginBottom: Spacing.md,
  },
  alertText:   { color: '#b71c1c', fontSize: 13, fontWeight: '600' },
  label:       { fontSize: 13, fontWeight: '700', color: Colors.dark, marginTop: Spacing.sm, marginBottom: 4 },
  required:    { color: Colors.danger },
  input:       { backgroundColor: Colors.white, marginBottom: 2 },
  helperText:  { color: Colors.textMuted },
  helperOk:    { color: Colors.success },
  btnPrimary:  { marginTop: Spacing.md, borderRadius: Radii.md },
  btnOutline:  { borderRadius: Radii.md, borderColor: Colors.primary, borderWidth: 1.5 },
  btnContent:  { height: 50 },
  btnLabel:    { fontSize: 16, fontWeight: '700' },
  footer:      { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.xl, marginTop: 4 },
  // Success
  successContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  successIcon:  { fontSize: 72, marginBottom: Spacing.md },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.success, marginBottom: Spacing.sm },
  successText:  { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
});
