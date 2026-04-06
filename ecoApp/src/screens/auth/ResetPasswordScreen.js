import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { resetPassword } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import storage from '../../utils/storage';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

const getPasswordStrength = (pwd) => {
  const checks = {
    length:    pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label = score <= 1 ? 'Very Weak' : score === 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color = score <= 1 ? '#E53935' : score === 2 ? '#FB8C00' : score === 3 ? '#FDD835' : score === 4 ? '#66BB6A' : '#2E7D32';
  return { score, label, color, checks };
};

export default function ResetPasswordScreen({ navigation, route }) {
  const token                      = route?.params?.token || '';
  const userName                   = route?.params?.userName || '';
  const email                      = route?.params?.email || '';
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const [successEmail, setSuccessEmail] = useState('');

  const strength = password ? getPasswordStrength(password) : null;

  useAuth();

  // Clear fields on mount to prevent autofill from injecting old password
  useEffect(() => {
    setPassword('');
    setConfirm('');
    setError('');
  }, []);

  const handleReset = async () => {
    setError('');
    if (!token)              { setError('Invalid session. Please go back and try again.'); return; }
    if (!password)           { setError('Please enter a new password.'); return; }
    if (strength && strength.score < 5) { setError('Please use a strong password meeting all requirements below.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      // Backend returns a new JWT — auto login the user
      await storage.setItem('token', res.data.token);
      setSuccess(true);
      setSuccessEmail(email);
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
          onPress={() => navigation.navigate('Login', { prefillEmail: successEmail })}
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
          <Text style={styles.heroSub}>{userName ? `Hi ${userName}, choose a new password` : 'Choose a strong new password'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.cardSubtitle}>
            Your identity has been verified. Enter and confirm your new password below.
          </Text>

          {error ? (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️  {error}</Text>
            </View>
          ) : null}

          <View style={styles.alertInfo}>
            <Text style={styles.alertInfoText}>🔒  Secure JWT session — expires in 10 minutes</Text>
          </View>

          {/* New Password */}
          <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Min. 8 chars, uppercase, number, special"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPass}
            autoComplete="new-password"
            textContentType="newPassword"
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

          {/* Password strength meter */}
          {password.length > 0 && strength && (
            <View style={styles.strengthBox}>
              <View style={styles.strengthBarRow}>
                {[1,2,3,4,5].map(i => (
                  <View key={i} style={[styles.strengthSegment, { backgroundColor: i <= strength.score ? strength.color : Colors.border }]} />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
              <View style={styles.checkList}>
                {[
                  { key: 'length',    text: 'At least 8 characters' },
                  { key: 'uppercase', text: 'One uppercase letter (A-Z)' },
                  { key: 'lowercase', text: 'One lowercase letter (a-z)' },
                  { key: 'number',    text: 'One number (0-9)' },
                  { key: 'special',   text: 'One special character (!@#$%)' },
                ].map(({ key, text }) => (
                  <View key={key} style={styles.checkRow}>
                    <Text style={[styles.checkIcon, { color: strength.checks[key] ? Colors.success : Colors.danger }]}>
                      {strength.checks[key] ? '✓' : '✗'}
                    </Text>
                    <Text style={[styles.checkText, { color: strength.checks[key] ? Colors.success : Colors.textMuted }]}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Re-enter new password"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setError(''); }}
            secureTextEntry={!showPass}
            autoComplete="new-password"
            textContentType="newPassword"
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
            Request New Code
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
  helperOk:    { color: Colors.success },
  alertInfo: {
    backgroundColor: Colors.successLight, borderLeftWidth: 4, borderLeftColor: Colors.success,
    borderRadius: Radii.sm, padding: Spacing.sm + 4, marginBottom: Spacing.md,
  },
  alertInfoText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '600' },
  btnPrimary:  { marginTop: Spacing.md, borderRadius: Radii.md },
  btnOutline:  { borderRadius: Radii.md, borderColor: Colors.primary, borderWidth: 1.5 },
  btnContent:  { height: 50 },
  btnLabel:    { fontSize: 16, fontWeight: '700' },
  footer:      { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.xl, marginTop: 4 },

  strengthBox:     { backgroundColor: '#f9fafb', borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  strengthBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  strengthSegment: { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel:   { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  checkList:       { gap: 4 },
  checkRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkIcon:       { fontSize: 12, fontWeight: '800', width: 14 },
  checkText:       { fontSize: 12 },
  // Success
  successContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  successIcon:  { fontSize: 72, marginBottom: Spacing.md },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.success, marginBottom: Spacing.sm },
  successText:  { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
});
