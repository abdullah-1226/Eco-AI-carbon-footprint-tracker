import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Modal,
  TouchableOpacity, Share, Alert, Platform, Linking,
  TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenTransition from '../../components/ScreenTransition';
import { useAppTheme, buildC } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateDetails } from '../../api/api';

// ── Storage key ───────────────────────────────────────────────────────────────
const KEY_NOTIF = '@ecotrack_notifications';

// Accent colours — Carbon Eco AI professional palette
const MINT   = '#B2D054';
const CYAN   = '#39A7A7';
const AMBER  = '#F59E0B';
const PURPLE = '#A855F7';

const RECOMMENDED = 6.8;

const LIMIT_PRESETS = [
  { kg: 5,    label: 'Eco Hero',    icon: '🌟' },
  { kg: 6.8,  label: 'Recommended', icon: '✅', badge: 'IPCC' },
  { kg: 10,   label: 'Global Avg',  icon: '🌍' },
  { kg: null, label: 'Custom',      icon: '✏️' },
];

function limitWarning(kg) {
  if (!kg || kg <= 0)     return null;
  if (kg <= RECOMMENDED)  return { color: MINT,    text: `✅ Within IPCC recommended ${RECOMMENDED} kg/day` };
  if (kg <= 10)           return { color: AMBER,   text: `⚠️ Above IPCC limit (${RECOMMENDED} kg/day)` };
  return                         { color: '#F43F5E', text: `🔴 Very high — global average is 10 kg/day` };
}


// ── Helpers ───────────────────────────────────────────────────────────────────
async function checkNotifPermission() {
  if (Platform.OS === 'web') {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }
  // Native: read stored preference
  const stored = await AsyncStorage.getItem(KEY_NOTIF);
  return stored ?? 'default';
}

async function requestNotifPermission() {
  if (Platform.OS === 'web') {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  // Native: show system-style dialog and store preference
  return new Promise((resolve) => {
    Alert.alert(
      'Allow Notifications',
      'EcoTrack AI would like to send you eco tips, daily summaries, and emission alerts.',
      [
        { text: 'Don\'t Allow', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Allow',        style: 'default', onPress: () => resolve(true)  },
      ],
    );
  });
}

// ── Sub-components receive s (styles) and C (colours) as props ───────────────
function Section({ title, children, s }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function ToggleRow({ icon, label, sub, value, onValueChange, disabled, iconBg, s, C }) {
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: iconBg ?? C.pillBg }]}>
        <Text style={s.rowIconTxt}>{icon}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: C.trackBg, true: MINT + 'AA' }}
        thumbColor={value ? MINT : '#999'}
        ios_backgroundColor={C.trackBg}
      />
    </View>
  );
}

function ButtonRow({ icon, label, sub, onPress, accent, iconBg, rightIcon = '›', s, C }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.rowIcon, { backgroundColor: iconBg ?? C.pillBg }]}>
        <Text style={s.rowIconTxt}>{icon}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowLabel, accent && { color: accent }]}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={s.rowChevron}>{rightIcon}</Text>
    </TouchableOpacity>
  );
}

function Divider({ s }) {
  return <View style={s.divider} />;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const { theme: appTheme } = useAppTheme();
  const { user, refreshUser, updateUser } = useAuth();
  const C = useMemo(() => buildC(appTheme), [appTheme]);
  const s = useMemo(() => makeStyles(C), [C]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifStatus,  setNotifStatus]  = useState('default');
  const [sharing, setSharing]           = useState(false);
  const [legalModal, setLegalModal]     = useState(null); // 'privacy' | 'terms' | null

  // ── Carbon limit state ────────────────────────────────────────────────────
  const currentLimit = user?.dailyThreshold ?? RECOMMENDED;
  const [limitOpen,    setLimitOpen]    = useState(false);
  const [limitPreset,  setLimitPreset]  = useState(null);   // preset kg or null=custom
  const [customKg,     setCustomKg]     = useState('');
  const [limitSaving,  setLimitSaving]  = useState(false);

  // When panel opens, initialise state from current user value
  const openLimit = useCallback(() => {
    const preset = LIMIT_PRESETS.find(p => p.kg === currentLimit);
    if (preset) {
      setLimitPreset(preset.kg);
      setCustomKg('');
    } else {
      setLimitPreset(null);
      setCustomKg(String(currentLimit));
    }
    setLimitOpen(true);
  }, [currentLimit]);

  const finalKg = limitPreset !== null ? limitPreset : (parseFloat(customKg) || 0);
  const warning  = limitWarning(finalKg);

  const handleSaveLimit = useCallback(async () => {
    if (!finalKg || finalKg <= 0) {
      Alert.alert('Invalid value', 'Please enter a carbon limit greater than 0 kg.');
      return;
    }
    setLimitSaving(true);
    try {
      await updateDetails({ dailyThreshold: finalKg });
      try { await refreshUser(); } catch { updateUser({ dailyThreshold: finalKg }); }
      setLimitOpen(false);
      Alert.alert('Saved!', `Your daily carbon limit is now ${finalKg} kg CO₂.`);
    } catch (err) {
      const msg = err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Request timed out. Is the server running?' : null)
        || (!err.response ? 'Cannot reach server. Make sure the backend is running on port 3000.' : null)
        || 'Could not save. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLimitSaving(false);
    }
  }, [finalKg, refreshUser]);

  // Load notification preference
  useEffect(() => {
    (async () => {
      const perm = await checkNotifPermission();
      setNotifStatus(perm);
      setNotifEnabled(perm === 'granted');
    })();
  }, []);

  // ── Notification toggle ────────────────────────────────────────────────────
  const handleNotifToggle = useCallback(async (val) => {
    if (val) {
      if (notifStatus === 'denied') {
        // Already denied — send user to system settings
        Alert.alert(
          'Notifications Blocked',
          'You previously denied notifications. Please enable them in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
                if (Platform.OS === 'web') {
                  Alert.alert('Open your browser settings to re-enable notifications.');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ],
        );
        return;
      }
      const granted = await requestNotifPermission();
      if (granted) {
        setNotifEnabled(true);
        setNotifStatus('granted');
        await AsyncStorage.setItem(KEY_NOTIF, 'granted');
      }
    } else {
      setNotifEnabled(false);
      await AsyncStorage.setItem(KEY_NOTIF, 'denied');
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Notifications Disabled',
          'You can re-enable them anytime in Settings.',
          [{ text: 'OK' }],
        );
      }
    }
  }, [notifStatus]);

  // ── Share app ──────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await Share.share({
        title:   'EcoTrack AI',
        message: '🌿 I\'m tracking my carbon footprint with EcoTrack AI! Join me in reducing emissions. Download now.',
      });
    } catch { /* user cancelled */ }
    finally { setSharing(false); }
  }, [sharing]);


  const notifSubLabel = () => {
    if (notifStatus === 'denied')      return 'Blocked — tap to open device settings';
    if (notifStatus === 'unsupported') return 'Not supported on this device';
    if (notifEnabled)                  return 'All notifications enabled — eco tips, summaries & alerts';
    return 'Enable to receive eco tips, summaries and alerts';
  };

  return (
    <ScreenTransition>
    <LinearGradient colors={appTheme.bgGrad} style={{ flex: 1 }}>
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        {/* Back button — inline so it's never clipped */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.7}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backTxt}>Back</Text>
        </TouchableOpacity>
        <View style={s.headerGlow} />
        <Text style={s.headerEmoji}>⚙️</Text>
        <Text style={s.headerTitle}>Settings</Text>
        <Text style={s.headerSub}>Manage your EcoTrack AI preferences</Text>
      </View>

      {/* ── Carbon Limit ───────────────────────────────────────────────── */}
      <Section title="🎯 Daily Carbon Limit" s={s}>
        {/* Current value row */}
        <TouchableOpacity style={s.row} onPress={limitOpen ? () => setLimitOpen(false) : openLimit} activeOpacity={0.7}>
          <View style={[s.rowIcon, { backgroundColor: 'rgba(178,208,84,0.14)' }]}>
            <Text style={s.rowIconTxt}>⚖️</Text>
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Daily CO₂ Limit</Text>
            <Text style={[s.rowSub, { color: limitWarning(currentLimit)?.color ?? C.textMuted }]}>
              {currentLimit} kg CO₂/day · tap to change
            </Text>
          </View>
          <Text style={[s.limitBadge, { color: MINT, borderColor: MINT + '55', backgroundColor: 'rgba(178,208,84,0.10)' }]}>
            {currentLimit} kg
          </Text>
        </TouchableOpacity>

        {/* Expandable editor */}
        {limitOpen && (
          <View style={s.limitPanel}>
            {/* Preset chips */}
            <Text style={s.limitSectionLbl}>CHOOSE A PRESET</Text>
            <View style={s.limitPresets}>
              {LIMIT_PRESETS.map(p => {
                const active = p.kg !== null ? limitPreset === p.kg : limitPreset === null;
                return (
                  <TouchableOpacity
                    key={p.kg ?? 'custom'}
                    style={[s.limitChip, active && s.limitChipActive]}
                    onPress={() => { setLimitPreset(p.kg); if (p.kg !== null) setCustomKg(''); }}
                    activeOpacity={0.75}
                  >
                    <Text style={s.limitChipIcon}>{p.icon}</Text>
                    <Text style={[s.limitChipLbl, active && { color: MINT }]}>{p.label}</Text>
                    {p.badge && (
                      <View style={s.limitChipBadge}>
                        <Text style={s.limitChipBadgeTxt}>{p.badge}</Text>
                      </View>
                    )}
                    {p.kg !== null && (
                      <Text style={[s.limitChipKg, active && { color: MINT }]}>{p.kg} kg</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom input */}
            {limitPreset === null && (
              <View style={s.limitCustomRow}>
                <TextInput
                  style={s.limitInput}
                  placeholder="e.g. 8"
                  placeholderTextColor={C.textMuted}
                  value={customKg}
                  onChangeText={setCustomKg}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={s.limitUnit}>kg / day</Text>
              </View>
            )}

            {/* Warning */}
            {warning && (
              <View style={[s.limitWarn, { borderColor: warning.color + '44', backgroundColor: warning.color + '10' }]}>
                <Text style={[s.limitWarnTxt, { color: warning.color }]}>{warning.text}</Text>
              </View>
            )}

            {/* Save / Cancel */}
            <View style={s.limitActions}>
              <TouchableOpacity style={s.limitCancelBtn} onPress={() => setLimitOpen(false)} activeOpacity={0.7}>
                <Text style={s.limitCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.limitSaveBtn, (!finalKg || finalKg <= 0) && { opacity: 0.4 }]}
                onPress={handleSaveLimit}
                disabled={limitSaving || !finalKg || finalKg <= 0}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#B2D054', '#8FA832']} style={s.limitSaveGrad}>
                  {limitSaving
                    ? <ActivityIndicator color="#1A2318" size="small" />
                    : <Text style={s.limitSaveTxt}>Save Limit</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Section>

      {/* ── Notifications ──────────────────────────────────────────────── */}
      <Section title="🔔 Notifications" s={s}>
        <ToggleRow
          icon="🔔"
          iconBg={notifEnabled ? 'rgba(178,208,84,0.14)' : C.pillBg}
          label="Push Notifications"
          sub={notifSubLabel()}
          value={notifEnabled}
          onValueChange={handleNotifToggle}
          disabled={notifStatus === 'unsupported'}
          s={s} C={C}
        />
      </Section>

      {/* ── Share ──────────────────────────────────────────────────────── */}
      <Section title="📤 Share" s={s}>
        <ButtonRow
          icon="📤"
          iconBg="rgba(0,196,232,0.12)"
          label="Share EcoTrack AI"
          sub="Invite friends to track their footprint"
          onPress={handleShare}
          accent={CYAN}
          s={s} C={C}
        />
        <Divider s={s} />
        <ButtonRow
          icon="⭐"
          iconBg="rgba(245,158,11,0.12)"
          label="Rate the App"
          sub="Love the app? Leave us a review"
          onPress={() => {
            const url = Platform.OS === 'ios'
              ? 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID?action=write-review'
              : 'market://details?id=com.ecotrack.ai';
            Linking.canOpenURL(url)
              .then(supported => {
                if (supported) {
                  Linking.openURL(url);
                } else {
                  Linking.openURL('https://play.google.com/store/apps/details?id=com.ecotrack.ai');
                }
              })
              .catch(() => Alert.alert('Thank you! 🌿', 'App store review — coming when we publish on stores!'));
          }}
          accent={AMBER}
          s={s} C={C}
        />
      </Section>


      {/* ── About ──────────────────────────────────────────────────────── */}
      <Section title="ℹ️ About" s={s}>
        <ButtonRow
          icon="📋"
          iconBg="rgba(168,85,247,0.10)"
          label="Privacy Policy"
          sub="How we handle your data"
          onPress={() => setLegalModal('privacy')}
          s={s} C={C}
        />
        <Divider s={s} />
        <ButtonRow
          icon="📄"
          iconBg="rgba(168,85,247,0.10)"
          label="Terms of Service"
          sub="Usage terms and conditions"
          onPress={() => setLegalModal('terms')}
          s={s} C={C}
        />
        <Divider s={s} />
        <View style={[s.row, { paddingVertical: 14 }]}>
          <View style={[s.rowIcon, { backgroundColor: 'rgba(178,208,84,0.12)' }]}>
            <Text style={s.rowIconTxt}>🌍</Text>
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>EcoTrack AI</Text>
            <Text style={s.rowSub}>Version 1.0.0 · Built for the planet 🌍</Text>
          </View>
        </View>
      </Section>

      <View style={{ height: 48 }} />
    </ScrollView>
    </LinearGradient>

    {/* ── Privacy Policy / Terms of Service Modal ── */}
    <Modal
      visible={!!legalModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setLegalModal(null)}
    >
      <LinearGradient colors={['#060F08', '#0A1A0F']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingTop: Platform.OS === 'ios' ? 56 : 36,
          paddingHorizontal: 20, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: 'rgba(178,208,84,0.15)',
        }}>
          <TouchableOpacity
            onPress={() => setLegalModal(null)}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(178,208,84,0.12)',
              alignItems: 'center', justifyContent: 'center', marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 18, color: '#B2D054' }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#EFF4EE' }}>
              {legalModal === 'privacy' ? '📋 Privacy Policy' : '📄 Terms of Service'}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(239,244,238,0.5)', marginTop: 2 }}>
              EcoTrack AI · Effective: January 2025
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {legalModal === 'privacy' ? (
            <>
              {[
                { title: '1. Information We Collect', body: 'EcoTrack AI collects information you provide directly, including your name, email address, and carbon activity logs (transport, food, energy, and shopping habits). We also collect anonymized usage data to improve app performance.' },
                { title: '2. How We Use Your Data', body: 'Your data is used exclusively to:\n• Calculate your carbon footprint\n• Provide personalized eco recommendations\n• Generate reports and track your progress\n• Send optional daily reminders\n\nWe do NOT sell, trade, or rent your personal data to third parties.' },
                { title: '3. Data Storage & Security', body: 'All data is encrypted in transit (TLS/HTTPS) and stored on secure servers. Passwords are hashed using bcrypt. We implement industry-standard security measures to protect your information from unauthorized access.' },
                { title: '4. Third-Party Services', body: 'EcoTrack AI integrates with:\n• Google OAuth (sign-in only — we receive your name and email)\n• Ecologi API (carbon offset processing)\n• OpenStreetMap (eco spots location data)\n\nThese services have their own privacy policies.' },
                { title: '5. Data Retention', body: 'You may request deletion of your account and all associated data at any time by contacting us. Upon deletion, all personal data is permanently removed from our servers within 30 days.' },
                { title: '6. Children\'s Privacy', body: 'EcoTrack AI is not directed to children under 13. We do not knowingly collect personal information from children.' },
                { title: '7. Your Rights', body: 'You have the right to:\n• Access your personal data\n• Correct inaccurate data\n• Request data deletion\n• Export your activity data\n\nTo exercise these rights, contact us at abdullahjarale@gmail.com' },
                { title: '8. Contact Us', body: 'For privacy concerns or questions:\n📧 abdullahjarale@gmail.com\n🌍 EcoTrack AI — Final Year Project\n📍 Pakistan' },
              ].map((section, i) => (
                <View key={i} style={{ marginBottom: 22 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#B2D054', marginBottom: 8 }}>
                    {section.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(239,244,238,0.75)', lineHeight: 21 }}>
                    {section.body}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <>
              {[
                { title: '1. Acceptance of Terms', body: 'By downloading, installing, or using EcoTrack AI, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.' },
                { title: '2. Description of Service', body: 'EcoTrack AI is a carbon footprint tracking application that helps users monitor, understand, and reduce their environmental impact through activity logging, AI coaching, and carbon offset features.' },
                { title: '3. User Accounts', body: 'You are responsible for:\n• Maintaining the confidentiality of your account credentials\n• All activities that occur under your account\n• Providing accurate and truthful information\n• Notifying us immediately of any unauthorized access' },
                { title: '4. Acceptable Use', body: 'You agree NOT to:\n• Use the app for any unlawful purpose\n• Attempt to gain unauthorized access to our systems\n• Submit false or misleading activity data\n• Reverse engineer or copy any part of the application\n• Harass other users on the community features' },
                { title: '5. Carbon Offset Features', body: 'Carbon offset contributions made through EcoTrack AI are processed via Ecologi. Offset calculations are based on standard environmental data (1 tree ≈ 21 kg CO₂/year). These are estimates for educational awareness and may vary in real-world impact.' },
                { title: '6. Intellectual Property', body: 'EcoTrack AI, its logo, design, and content are the intellectual property of the development team. The app is developed as a Final Year Project. Unauthorized commercial use is prohibited.' },
                { title: '7. Disclaimer of Warranties', body: 'EcoTrack AI is provided "as is" without warranties of any kind. Carbon footprint calculations are estimates based on published emission factors and may not reflect exact real-world values.' },
                { title: '8. Limitation of Liability', body: 'The EcoTrack AI team shall not be liable for any indirect, incidental, or consequential damages arising from use of the application, including but not limited to data loss or emission calculation inaccuracies.' },
                { title: '9. Changes to Terms', body: 'We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms. We will notify users of significant changes.' },
                { title: '10. Contact', body: 'Questions about these Terms?\n📧 abdullahjarale@gmail.com\n🌍 EcoTrack AI — Final Year Project\n📍 Pakistan' },
              ].map((section, i) => (
                <View key={i} style={{ marginBottom: 22 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#B2D054', marginBottom: 8 }}>
                    {section.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(239,244,238,0.75)', lineHeight: 21 }}>
                    {section.body}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </Modal>

    </ScreenTransition>
  );
}

// ── Styles factory — receives live C so colours update with theme ─────────────
function makeStyles(C) { return StyleSheet.create({
  root:   { flex: 1 },

  header: {
    alignItems: 'center',
    paddingTop: 16, paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginBottom: 16,
    backgroundColor: C.pillBg,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  backArrow: { fontSize: 20, color: C.text, lineHeight: 24 },
  backTxt:   { fontSize: 14, color: C.text, fontWeight: '600' },
  headerGlow: { display: 'none' },
  headerEmoji: { fontSize: 44, marginBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 0.2 },
  headerSub:   { fontSize: 13, color: C.textSub, marginTop: 5, textAlign: 'center' },

  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: C.textMuted,
    letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: C.isDark ? 0.0 : 0.06, shadowRadius: 8, elevation: C.isDark ? 0 : 2,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  rowActive: { backgroundColor: 'rgba(178,208,84,0.07)' },
  rowIcon:   {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowIconTxt: { fontSize: 18 },
  rowBody:    { flex: 1 },
  rowLabel:   { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub:     { fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 16 },
  rowChevron: { fontSize: 20, color: C.textMuted, fontWeight: '300' },

  divider: { height: 1, backgroundColor: C.divider, marginLeft: 66 },

  themeNote: {
    fontSize: 11, color: C.textMuted, textAlign: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
  },

  // Radio button for theme
  radioRing: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioRingActive: { borderColor: MINT },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: MINT },

  // ── Carbon limit ──────────────────────────────────────────────────────────
  limitBadge: {
    fontSize: 12, fontWeight: '800', borderRadius: 10,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  limitPanel: {
    paddingHorizontal: 14, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: C.divider,
  },
  limitSectionLbl: {
    fontSize: 10, fontWeight: '800', color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginTop: 14, marginBottom: 10,
  },
  limitPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  limitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.pillBg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1.5, borderColor: C.border,
  },
  limitChipActive: { borderColor: MINT, backgroundColor: 'rgba(178,208,84,0.10)' },
  limitChipIcon:  { fontSize: 14 },
  limitChipLbl:   { fontSize: 13, fontWeight: '700', color: C.text },
  limitChipKg:    { fontSize: 11, fontWeight: '700', color: C.textMuted },
  limitChipBadge: {
    backgroundColor: 'rgba(178,208,84,0.20)', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  limitChipBadgeTxt: { fontSize: 9, fontWeight: '800', color: MINT },

  limitCustomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12,
  },
  limitInput: {
    flex: 1, backgroundColor: C.inputBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    color: C.text, fontSize: 20, fontWeight: '800',
    borderWidth: 1, borderColor: C.border,
  },
  limitUnit: { fontSize: 13, color: C.textMuted, fontWeight: '600' },

  limitWarn: {
    borderRadius: 10, padding: 10, marginTop: 12,
    borderWidth: 1,
  },
  limitWarnTxt: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

  limitActions: {
    flexDirection: 'row', gap: 10, marginTop: 14,
  },
  limitCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  limitCancelTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  limitSaveBtn:   { flex: 2, borderRadius: 12, overflow: 'hidden' },
  limitSaveGrad:  { paddingVertical: 13, alignItems: 'center' },
  limitSaveTxt:   { fontSize: 14, fontWeight: '900', color: '#1A2318' },
}); } // end makeStyles
