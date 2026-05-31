import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { updateDetails } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/crossAlert';

// ── IPCC recommended daily limit ─────────────────────────────────────────────
const RECOMMENDED = 6.8;

// ── Preset options ────────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: 'hero', kg: 5, icon: '🌟',
    label: 'Eco Hero',
    desc: 'Very low footprint — ambitious but achievable',
    color: '#B2D054',
  },
  {
    id: 'rec', kg: 6.8, icon: '✅',
    label: 'Recommended',
    desc: 'IPCC 1.5°C target — the global science-based goal',
    color: '#B2D054',
    badge: 'WHO / IPCC',
  },
  {
    id: 'avg', kg: 10, icon: '🌍',
    label: 'Global Average',
    desc: 'World average daily footprint per person',
    color: '#F59E0B',
  },
  {
    id: 'custom', kg: null, icon: '✏️',
    label: 'Custom',
    desc: 'Enter your own daily target in kg CO₂',
    color: '#39A7A7',
  },
];

// ── Warning helper ────────────────────────────────────────────────────────────
function getWarning(kg) {
  if (!kg || kg <= 0)   return null;
  if (kg <= RECOMMENDED) return { level: 'good',    text: `✅ Within the IPCC recommended ${RECOMMENDED} kg/day limit.` };
  if (kg <= 10)          return { level: 'caution',  text: `⚠️ Above the IPCC recommended ${RECOMMENDED} kg/day. The WHO advises staying at or below this limit to help limit warming to 1.5°C.` };
  if (kg <= 20)          return { level: 'warning',  text: `🔴 Significantly above the ${RECOMMENDED} kg recommended limit. The global average is ~10 kg/day — consider a lower target.` };
  return                        { level: 'danger',   text: `🚨 Very high target. Even the global average is 10 kg/day. Setting this limit reduces the app's ability to help you improve.` };
}

const WARN_COLORS = {
  good:    '#B2D054',
  caution: '#F59E0B',
  warning: '#F43F5E',
  danger:  '#F43F5E',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { refreshUser } = useAuth();
  const [selected,     setSelected]     = useState('rec');
  const [customKg,     setCustomKg]     = useState('');
  const [saving,       setSaving]       = useState(false);

  const activePreset  = PRESETS.find(p => p.id === selected);
  const finalKg       = selected === 'custom'
    ? parseFloat(customKg) || 0
    : activePreset?.kg ?? RECOMMENDED;
  const warning       = getWarning(finalKg);
  const canSave       = finalKg > 0;

  const handleSave = async () => {
    if (!canSave) {
      showAlert('Enter a value', 'Please enter your daily carbon limit in kg CO₂.');
      return;
    }
    setSaving(true);
    try {
      await updateDetails({
        dailyThreshold:    finalKg,
        onboardingComplete: true,
      });
      await refreshUser();   // re-fetches user → onboardingComplete = true → navigates to app
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={['#0A1A0F', '#0C1B12', '#060D07']} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.emoji}>🌍</Text>
        <Text style={s.title}>Set Your Daily Carbon Goal</Text>
        <Text style={s.sub}>
          Your goal is how much CO₂ you aim to emit per day.{'\n'}
          The charts and alerts will use this number.
        </Text>
      </View>

      {/* ── IPCC info banner ── */}
      <View style={s.infoBanner}>
        <Text style={s.infoIcon}>📋</Text>
        <Text style={s.infoTxt}>
          <Text style={s.infoBold}>WHO / IPCC recommend 6.8 kg CO₂/day</Text> per person to
          keep global warming below 1.5°C. This is the science-based target.
        </Text>
      </View>

      {/* ── Preset cards ── */}
      <Text style={s.sectionLabel}>CHOOSE A PRESET</Text>
      {PRESETS.map(p => {
        const active = selected === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            style={[s.presetCard, active && { borderColor: p.color, backgroundColor: p.color + '14' }]}
            onPress={() => setSelected(p.id)}
            activeOpacity={0.8}
          >
            <View style={[s.presetLeft, active && { backgroundColor: p.color + '22' }]}>
              <Text style={s.presetEmoji}>{p.icon}</Text>
              {p.kg !== null && (
                <Text style={[s.presetKg, { color: active ? p.color : 'rgba(255,255,255,0.45)' }]}>
                  {p.kg} kg
                </Text>
              )}
            </View>

            <View style={s.presetBody}>
              <View style={s.presetTitleRow}>
                <Text style={[s.presetLabel, active && { color: p.color }]}>{p.label}</Text>
                {p.badge && (
                  <View style={[s.badge, { backgroundColor: p.color + '28', borderColor: p.color + '60' }]}>
                    <Text style={[s.badgeTxt, { color: p.color }]}>{p.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={s.presetDesc}>{p.desc}</Text>
            </View>

            <View style={[s.radio, active && { borderColor: p.color }]}>
              {active && <View style={[s.radioDot, { backgroundColor: p.color }]} />}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* ── Custom input ── */}
      {selected === 'custom' && (
        <View style={s.customBox}>
          <Text style={s.customLabel}>Enter your daily limit (kg CO₂)</Text>
          <View style={s.customRow}>
            <TextInput
              style={s.customInput}
              placeholder="e.g. 8"
              placeholderTextColor="rgba(255,255,255,0.30)"
              value={customKg}
              onChangeText={setCustomKg}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={s.customUnit}>kg / day</Text>
          </View>
        </View>
      )}

      {/* ── Warning / confirmation ── */}
      {warning && (
        <View style={[s.warnBox, { borderColor: WARN_COLORS[warning.level] + '55',
                                    backgroundColor: WARN_COLORS[warning.level] + '10' }]}>
          <Text style={[s.warnTxt, { color: WARN_COLORS[warning.level] }]}>
            {warning.text}
          </Text>
        </View>
      )}

      {/* ── CO₂ summary ── */}
      {finalKg > 0 && (
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Your daily limit</Text>
          <Text style={[s.summaryKg, { color: finalKg <= RECOMMENDED ? '#B2D054' : finalKg <= 10 ? '#F59E0B' : '#F43F5E' }]}>
            {finalKg} kg CO₂
          </Text>
          <Text style={s.summaryNote}>per day · {(finalKg * 365).toFixed(0)} kg per year</Text>
        </View>
      )}

      {/* ── CTA ── */}
      <TouchableOpacity
        style={[s.saveBtn, !canSave && { opacity: 0.4 }]}
        onPress={handleSave}
        disabled={!canSave || saving}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#B2D054', '#8FA832']} style={s.saveBtnGrad}>
          {saving
            ? <ActivityIndicator color="#1A2318" />
            : <Text style={s.saveBtnTxt}>🚀  Set My Goal & Start</Text>}
        </LinearGradient>
      </TouchableOpacity>

      <Text style={s.footer}>
        You can change this anytime in Settings → Profile
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:  { flexGrow: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 44 },

  header:  { alignItems: 'center', marginBottom: 24 },
  emoji:   { fontSize: 56, marginBottom: 12 },
  title:   { fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: 30 },
  sub:     { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 10, lineHeight: 20 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(178,208,84,0.10)', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)',
    marginBottom: 24,
  },
  infoIcon:  { fontSize: 18, marginTop: 1 },
  infoTxt:   { flex: 1, fontSize: 13, color: 'rgba(239,244,238,0.72)', lineHeight: 19 },
  infoBold:  { color: '#B2D054', fontWeight: '800' },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },

  presetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18,
    padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)',
  },
  presetLeft: {
    width: 54, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 8,
  },
  presetEmoji:    { fontSize: 22 },
  presetKg:       { fontSize: 11, fontWeight: '800', marginTop: 3 },
  presetBody:     { flex: 1 },
  presetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  presetLabel:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  presetDesc:     { fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 16 },

  badge:    { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  badgeTxt: { fontSize: 9, fontWeight: '800' },

  radio:    { width: 22, height: 22, borderRadius: 11,
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  customBox: {
    backgroundColor: 'rgba(0,196,232,0.08)', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(0,196,232,0.25)',
  },
  customLabel: { fontSize: 12, fontWeight: '700', color: '#39A7A7', marginBottom: 10 },
  customRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFFFFF', fontSize: 22, fontWeight: '800',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  customUnit: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  warnBox: {
    borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1,
  },
  warnTxt: { fontSize: 13, fontWeight: '600', lineHeight: 20 },

  summaryBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18,
    padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: '600', marginBottom: 4 },
  summaryKg:    { fontSize: 42, fontWeight: '900', lineHeight: 48 },
  summaryNote:  { fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 4 },

  saveBtn:     { borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  saveBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  saveBtnTxt:  { fontSize: 17, fontWeight: '900', color: '#1A2318' },

  footer: {
    textAlign: 'center', fontSize: 12,
    color: 'rgba(255,255,255,0.30)', marginBottom: 8,
  },
});
