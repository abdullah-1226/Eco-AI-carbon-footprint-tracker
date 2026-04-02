import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Divider, List } from 'react-native-paper';
import { updateDetails, updatePassword } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleUpdateDetails = async () => {
    if (!name.trim() || !email.trim()) { Alert.alert('Error', 'Name and email are required.'); return; }
    setDetailsLoading(true);
    try {
      await updateDetails({ name: name.trim(), email: email.trim() });
      await refreshUser();
      Alert.alert('Success', '✅ Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPass || !newPass) { Alert.alert('Error', 'Both password fields are required.'); return; }
    if (newPass.length < 6) { Alert.alert('Error', 'New password must be at least 6 characters.'); return; }
    setPassLoading(true);
    try {
      await updatePassword({ currentPassword: currentPass, newPassword: newPass });
      setCurrentPass(''); setNewPass('');
      Alert.alert('Success', '✅ Password changed successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleLogout = () => {
    // On web, Alert.alert doesn't fire onPress callbacks — use window.confirm directly
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        logout();
      }
      return;
    }
    // Native (iOS / Android)
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Profile Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{user?.name}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, user?.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
            <Text style={styles.roleText}>{user?.role === 'admin' ? '🛡 Administrator' : '👤 Member'}</Text>
          </View>
        </View>

        {/* Account Info Summary */}
        <View style={styles.infoCard}>
          <List.Item
            title="Account Role"
            description={user?.role === 'admin' ? 'Administrator' : 'Standard User'}
            left={() => <List.Icon icon="shield-account" color={Colors.primary} />}
          />
          <Divider />
          <List.Item
            title="Member Since"
            description={user?.createdAt ? new Date(user.createdAt).toDateString() : 'N/A'}
            left={() => <List.Icon icon="calendar" color={Colors.success} />}
          />
        </View>

        {/* Update Profile */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✏️  Update Profile</Text>
          <Text style={styles.cardSub}>Change your name or email address</Text>
          <Divider style={styles.divider} />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            mode="outlined"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            left={<TextInput.Icon icon="account" color={Colors.textMuted} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" color={Colors.textMuted} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          <Button
            mode="contained"
            icon="content-save"
            onPress={handleUpdateDetails}
            loading={detailsLoading}
            disabled={detailsLoading}
            style={styles.btnPrimary}
            contentStyle={styles.btnContent}
          >
            {detailsLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </View>

        {/* Change Password */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒  Change Password</Text>
          <Text style={styles.cardSub}>Update your account password</Text>
          <Divider style={styles.divider} />

          <Text style={styles.label}>Current Password</Text>
          <TextInput
            mode="outlined"
            value={currentPass}
            onChangeText={setCurrentPass}
            placeholder="Enter current password"
            secureTextEntry={!showCurrent}
            left={<TextInput.Icon icon="lock" color={Colors.textMuted} />}
            right={<TextInput.Icon icon={showCurrent ? 'eye-off' : 'eye'} onPress={() => setShowCurrent(!showCurrent)} color={Colors.textMuted} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            mode="outlined"
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Min. 6 characters"
            secureTextEntry={!showNew}
            left={<TextInput.Icon icon="lock-reset" color={Colors.textMuted} />}
            right={<TextInput.Icon icon={showNew ? 'eye-off' : 'eye'} onPress={() => setShowNew(!showNew)} color={Colors.textMuted} />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
          />

          <Button
            mode="contained"
            icon="lock-check"
            onPress={handleUpdatePassword}
            loading={passLoading}
            disabled={passLoading}
            style={styles.btnDark}
            contentStyle={styles.btnContent}
            buttonColor={Colors.secondary}
          >
            {passLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠️  Danger Zone</Text>
          <Text style={styles.dangerSub}>This will sign you out of your account</Text>
          <Button
            mode="contained"
            icon="logout"
            onPress={handleLogout}
            style={styles.logoutBtn}
            contentStyle={styles.btnContent}
            buttonColor={Colors.danger}
          >
            Sign Out
          </Button>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  hero: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingTop: Spacing.xl + 10, paddingBottom: Spacing.xl,
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: Colors.white },
  heroName: { fontSize: 22, fontWeight: '800', color: Colors.white },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  roleBadge: { borderRadius: Radii.pill, paddingHorizontal: 14, paddingVertical: 4, marginTop: 8 },
  roleBadgeAdmin: { backgroundColor: Colors.warningLight },
  roleBadgeUser: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  infoCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radii.lg, overflow: 'hidden', ...Shadow.sm,
  },
  card: {
    backgroundColor: Colors.white, margin: Spacing.md, marginTop: 0,
    borderRadius: Radii.lg, padding: Spacing.lg, ...Shadow.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  cardSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  divider: { marginVertical: Spacing.md, backgroundColor: Colors.border },
  label: { fontSize: 13, fontWeight: '700', color: Colors.dark, marginTop: Spacing.sm, marginBottom: 4 },
  input: { backgroundColor: Colors.white, marginBottom: 2 },
  btnPrimary: { marginTop: Spacing.md, borderRadius: Radii.md, backgroundColor: Colors.primary },
  btnDark: { marginTop: Spacing.md, borderRadius: Radii.md },
  btnContent: { height: 48 },
  dangerCard: {
    backgroundColor: Colors.dangerLight, margin: Spacing.md, marginTop: 0,
    borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: '#f5c2c7',
  },
  dangerTitle: { fontSize: 15, fontWeight: '800', color: '#842029', marginBottom: 4 },
  dangerSub: { fontSize: 13, color: '#842029', opacity: 0.75, marginBottom: Spacing.md },
  logoutBtn: { borderRadius: Radii.md },
});
