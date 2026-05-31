import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { forgotPassword } from '../../api/api';
import { Colors, Shadow, Radii, Spacing } from '../../theme';
import BackButton from '../../components/BackButton';
import ScreenTransition from '../../components/ScreenTransition';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      // JWT token returned directly — navigate to reset screen with token pre-filled
      navigation.navigate('ResetPassword', {
        token:    res.data.resetToken,
        userName: res.data.userName,
        email:    email.trim(),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenTransition>
    <View style={styles.flex}>
    <BackButton dark />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🔐</Text>
          <Text style={styles.heroTitle}>Forgot Password?</Text>
          <Text style={styles.heroSub}>Enter your email to reset your password</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.cardSubtitle}>
            Enter your registered email address. We'll verify it and take you to the reset screen instantly.
          </Text>

          {error ? (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️  {error}</Text>
            </View>
          ) : null}

          <View style={styles.alertInfo}>
            <Text style={styles.alertInfoText}>
              🔒  Uses JWT authentication — works instantly, no email required
            </Text>
          </View>

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

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            icon="shield-key"
            style={styles.btnPrimary}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            buttonColor={Colors.primary}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>🌿 EcoTrack AI — FYP Carbon Footprint Tracker</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: Colors.primaryDark, alignItems: 'center',
    paddingTop: 56, paddingBottom: 48,
  },
  heroIcon:  { fontSize: 52, marginBottom: 10 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: Colors.white, margin: Spacing.lg,
    borderRadius: Radii.xl, padding: Spacing.lg,
    marginTop: -24, ...Shadow.lg,
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: Colors.dark, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.md },
  alertDanger: {
    backgroundColor: Colors.dangerLight, borderLeftWidth: 4, borderLeftColor: Colors.danger,
    borderRadius: Radii.sm, padding: Spacing.sm + 4, marginBottom: Spacing.sm,
  },
  alertText: { color: '#b71c1c', fontSize: 13, fontWeight: '600' },
  alertInfo: {
    backgroundColor: Colors.successLight, borderLeftWidth: 4, borderLeftColor: Colors.success,
    borderRadius: Radii.sm, padding: Spacing.sm + 4, marginBottom: Spacing.md,
  },
  alertInfoText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '600' },
  label:    { fontSize: 13, fontWeight: '700', color: Colors.dark, marginTop: Spacing.sm, marginBottom: 4 },
  input:    { backgroundColor: Colors.white },
  btnPrimary:  { marginTop: Spacing.md, borderRadius: Radii.md },
  btnContent:  { height: 50 },
  btnLabel:    { fontSize: 16, fontWeight: '700' },
  backRow:     { alignItems: 'center', marginTop: Spacing.md },
  backText:    { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  footer:      { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.xl, marginTop: 4 },
});
