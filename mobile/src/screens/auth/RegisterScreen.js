import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('All fields are required.'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🌱</Text>
          <Text style={styles.heroTitle}>Join EcoTrack AI</Text>
          <Text style={styles.heroSub}>Start tracking your carbon footprint today</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Fill in the details below to get started</Text>

          {error ? (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️  {error}</Text>
            </View>
          ) : null}

          {/* Info */}
          <View style={styles.alertInfo}>
            <Text style={styles.alertInfoText}>
              🌍  By joining, you help us track and reduce global carbon emissions
            </Text>
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            mode="outlined"
            placeholder="Your full name"
            value={name}
            onChangeText={(v) => { setName(v); setError(''); }}
            left={<TextInput.Icon icon="account-outline" color={Colors.primary} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

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

          <Text style={styles.label}>Password</Text>
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

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            mode="outlined"
            placeholder="Re-enter your password"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setError(''); }}
            secureTextEntry={!showPass}
            left={<TextInput.Icon icon="lock-check-outline" color={confirm && confirm === password ? Colors.success : Colors.primary} />}
            style={styles.input}
            outlineColor={confirm && confirm !== password ? Colors.danger : Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            icon="leaf"
            style={styles.btnPrimary}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            buttonColor={Colors.primary}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Login')}
            style={styles.btnOutline}
            contentStyle={styles.btnContent}
            labelStyle={{ color: Colors.primary, fontWeight: '700' }}
          >
            Already have an account? Sign In
          </Button>
        </View>

        <Text style={styles.footer}>🌿 EcoTrack AI — FYP Carbon Footprint Tracker</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: Colors.background },
  scroll:  { flexGrow: 1 },
  hero: {
    backgroundColor: Colors.secondary, alignItems: 'center',
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
  cardTitle:    { fontSize: 22, fontWeight: '800', color: Colors.dark, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.sm },
  alertDanger: {
    backgroundColor: Colors.dangerLight, borderLeftWidth: 4, borderLeftColor: Colors.danger,
    borderRadius: Radii.sm, padding: Spacing.sm + 4, marginBottom: Spacing.sm,
  },
  alertText:     { color: '#b71c1c', fontSize: 13, fontWeight: '600' },
  alertInfo: {
    backgroundColor: Colors.successLight, borderLeftWidth: 4, borderLeftColor: Colors.success,
    borderRadius: Radii.sm, padding: Spacing.sm + 4, marginBottom: Spacing.md,
  },
  alertInfoText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '600' },
  label:    { fontSize: 13, fontWeight: '700', color: Colors.dark, marginTop: Spacing.sm, marginBottom: 4 },
  input:    { backgroundColor: Colors.white, marginBottom: 2 },
  btnPrimary:  { marginTop: Spacing.md, borderRadius: Radii.md },
  btnContent:  { height: 50 },
  btnLabel:    { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: Spacing.sm, color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  btnOutline:  { borderRadius: Radii.md, borderColor: Colors.primary, borderWidth: 1.5 },
  footer:      { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: Spacing.xl, marginTop: 4 },
});
