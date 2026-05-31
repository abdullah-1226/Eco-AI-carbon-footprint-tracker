import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
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

const THEMES = [
  { key: 'dark',  label: 'Dark Glass', icon: '🌑', desc: 'Dark background with glass card effects' },
  { key: 'light', label: 'Light Mode', icon: '☀️', desc: 'Clean white background, easy on the eyes' },
  { key: 'auto',  label: 'System',     icon: '📱', desc: 'Follows your device dark/light setting' },
];

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
  const { themeKey, setThemeKey, theme: appTheme } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const C = useMemo(() => buildC(appTheme), [appTheme]);
  const s = useMemo(() => makeStyles(C), [C]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifStatus,  setNotifStatus]  = useState('default');
  const [sharing, setSharing]           = useState(false);

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
      await refreshUser();
      setLimitOpen(false);
      Alert.alert('Saved!', `Your daily carbon limit is now ${finalKg} kg CO₂.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save. Please try again.');
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

  // ── Theme selection — updates ThemeContext live ────────────────────────────
  const handleTheme = useCallback(async (key) => {
    await setThemeKey(key);
  }, [setThemeKey]);

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
          onPress={() => Alert.alert('Thank you!', 'App store rating coming soon.')}
          accent={AMBER}
          s={s} C={C}
        />
      </Section>

      {/* ── Theme ──────────────────────────────────────────────────────── */}
      <Section title="🎨 Theme" s={s}>
        {THEMES.map((t, i) => {
          const active = themeKey === t.key;
          return (
            <View key={t.key}>
              {i > 0 && <Divider s={s} />}
              <TouchableOpacity
                style={[s.row, active && s.rowActive]}
                onPress={() => handleTheme(t.key)}
                activeOpacity={0.7}
              >
                <View style={[s.rowIcon, { backgroundColor: active ? 'rgba(178,208,84,0.14)' : C.pillBg }]}>
                  <Text style={s.rowIconTxt}>{t.icon}</Text>
                </View>
                <View style={s.rowBody}>
                  <Text style={[s.rowLabel, active && { color: MINT }]}>{t.label}</Text>
                  <Text style={s.rowSub}>{t.desc}</Text>
                </View>
                <View style={[s.radioRing, active && s.radioRingActive]}>
                  {active && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
        <Text style={s.themeNote}>
          ✦ Theme preference is saved — changes apply instantly
        </Text>
      </Section>

      {/* ── About ──────────────────────────────────────────────────────── */}
      <Section title="ℹ️ About" s={s}>
        <ButtonRow
          icon="📋"
          iconBg="rgba(168,85,247,0.10)"
          label="Privacy Policy"
          sub="How we handle your data"
          onPress={() => Alert.alert('Privacy Policy', 'We never sell your data. All emission data is stored securely and privately.')}
          s={s} C={C}
        />
        <Divider s={s} />
        <ButtonRow
          icon="📄"
          iconBg="rgba(168,85,247,0.10)"
          label="Terms of Service"
          sub="Usage terms and conditions"
          onPress={() => Alert.alert('Terms of Service', 'By using EcoTrack AI you agree to our terms of service.')}
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
  headerGlow: {
    position: 'absolute', top: 60, alignSelf: 'center',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(0,196,232,0.06)',
  },
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
