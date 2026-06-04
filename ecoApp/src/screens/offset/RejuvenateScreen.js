import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Animated, Easing, Platform, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { getPatchProjects, getPatchEstimate, createPatchOrder, checkEmissionLimit } from '../../api/api';
import BackButton from '../../components/BackButton';
import ScreenTransition from '../../components/ScreenTransition';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:       '#060F08',
  card:     '#0D1A10',
  border:   'rgba(178,208,84,0.12)',
  accent:   '#B2D054',
  pos:      '#52C77A',
  warn:     '#FF7B5C',
  warnSoft: 'rgba(255,123,92,0.15)',
  text:     '#EFF4EE',
  textSub:  'rgba(239,244,238,0.52)',
};

// ── Pulse ring around the warning number ─────────────────────────────────────
const RING_SZ   = 160;
const RING_R    = 62;
const RING_CIRC = 2 * Math.PI * RING_R;

function WarnRing({ prog }) {
  return (
    <Svg width={RING_SZ} height={RING_SZ}>
      <Circle cx={RING_SZ / 2} cy={RING_SZ / 2} r={RING_R}
        fill="none" stroke="rgba(255,123,92,0.1)" strokeWidth={10} />
      <Circle cx={RING_SZ / 2} cy={RING_SZ / 2} r={RING_R}
        fill="none" stroke={C.warn} strokeWidth={10}
        strokeDasharray={String(RING_CIRC)}
        strokeDashoffset={RING_CIRC * (1 - Math.min(prog, 1))}
        strokeLinecap="round"
        rotation="-90" origin={`${RING_SZ / 2}, ${RING_SZ / 2}`}
      />
    </Svg>
  );
}

// ── Project type → icon/label mapping ────────────────────────────────────────
const TYPE_META = {
  forests:     { icon: '🌲', label: 'Forest Protection' },
  solar:       { icon: '☀️', label: 'Solar Energy' },
  wind:        { icon: '💨', label: 'Wind Power' },
  ocean:       { icon: '🌊', label: 'Ocean Conservation' },
  biomass:     { icon: '🌾', label: 'Biomass' },
  methane:     { icon: '♻️', label: 'Methane Capture' },
  direct_air:  { icon: '🏭', label: 'Direct Air Capture' },
  tree_planting:{ icon: '🌳', label: 'Tree Planting' },
};

const COUNTRY_FLAGS = {
  ID: '🇮🇩', KE: '🇰🇪', IN: '🇮🇳', BR: '🇧🇷', CO: '🇨🇴',
  US: '🇺🇸', AU: '🇦🇺', CN: '🇨🇳', GB: '🇬🇧', DE: '🇩🇪',
  PK: '🇵🇰', NG: '🇳🇬', GH: '🇬🇭', ZA: '🇿🇦', MX: '🇲🇽',
};

// Normalize Patch API project OR local fallback program into a common shape
function normalizeProject(p, source) {
  if (source === 'ecologi') {
    const pricePerKg = (p.amount_per_tonne_cents_usd || 1500) / 100 / 1000; // $/kg
    const type       = p.type || 'forests';
    const meta       = TYPE_META[type] || { icon: '🌍', label: type };
    return {
      id:           p.id,
      name:         p.name,
      description:  p.description || '',
      country:      p.country,
      flag:         COUNTRY_FLAGS[p.country] || '🌍',
      icon:         meta.icon,
      typeLabel:    meta.label,
      pricePerKg,
      priceDisplay: `$${(p.amount_per_tonne_cents_usd / 100).toFixed(0)}/tonne`,
      verifier:     p.verifier || null,
      donateUrl:    p.donate_url || null,
      isPatch:      true,
    };
  }
  // local simulated program
  const pricePerKg = (p.pricePerUnit || 10) / (p.co2PerUnit || 100);
  return {
    id:           p.id,
    name:         p.name,
    description:  p.description,
    country:      null,
    flag:         '',
    icon:         p.icon || '🌍',
    typeLabel:    p.unit ? `per ${p.unit}` : 'offset unit',
    pricePerKg,
    priceDisplay: `$${p.pricePerUnit}/${p.unit}`,
    verifier:     null,
    isPatch:      false,
    color:        p.color,
  };
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function RejuvenateScreen({ route, navigation }) {
  // Params from Dashboard (or defaults if navigated directly)
  const paramExcess = route?.params?.excessKg  ?? 0;
  const paramToday  = route?.params?.todayKg   ?? 0;
  const paramLimit  = route?.params?.threshold ?? 10;

  const [projects, setProjects]       = useState([]);
  const [source, setSource]           = useState('local');
  const [limitData, setLimitData]     = useState({
    exceeded: paramExcess > 0,
    todayKg:  paramToday,
    excessKg: paramExcess,
    threshold: paramLimit,
  });
  const [estimate, setEstimate]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [offsetting, setOffsetting]   = useState(null);
  const [customKg, setCustomKg]       = useState(5);
  const [confirmProject, setConfirmProject] = useState(null);
  const [successMsg, setSuccessMsg]         = useState(null);
  const [errorMsg, setErrorMsg]             = useState(null);
  const [ringProg, setRingProg]       = useState(0);
  const ringAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projRes, limitRes] = await Promise.all([
        getPatchProjects(),
        checkEmissionLimit(),
      ]);

      const src  = projRes.data.source || 'local';
      const raw  = projRes.data.data   || [];
      setSource(src);
      setProjects(raw.slice(0, 8).map(p => normalizeProject(p, src)));

      const lim = limitRes.data;
      setLimitData(lim);

      // Default custom amount = min(5, excess) so it's affordable by default
      const defaultKg = Math.min(5, Math.max(lim.excessKg || paramExcess, 1));
      setCustomKg(parseFloat(defaultKg.toFixed(1)));

      const estRes = await getPatchEstimate(defaultKg);
      setEstimate(estRes.data.data);

      // Animate warning ring
      ringAnim.setValue(0);
      const id = ringAnim.addListener(({ value }) => setRingProg(value));
      Animated.timing(ringAnim, {
        toValue: 1, duration: 1600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return () => ringAnim.removeListener(id);
    } catch {
      // Use route params as fallback
    } finally {
      setLoading(false);
    }
  };

  // Open in-app confirmation modal (replaces Alert.alert — works on web + mobile)
  const handleOffset = (project) => {
    if (customKg <= 0) return;
    setConfirmProject(project);
  };

  const handleDonateWeb = (project) => {
    setConfirmProject(null);
    const url = project.donateUrl || 'https://ecologi.com/offset';
    Linking.openURL(url).catch(() => {});
  };

  const handleRecordInApp = async (project) => {
    setOffsetting(project.id);
    try {
      const res = await createPatchOrder({
        mass_kg:    customKg,
        project_id: project.isEcologi ? project.id : undefined,
      });
      setConfirmProject(null);
      // Show success in-app (no Alert — use state instead)
      setSuccessMsg(res.data.message);
      setTimeout(() => { setSuccessMsg(null); navigation.goBack(); }, 2500);
    } catch (e) {
      setConfirmProject(null);
      setErrorMsg(e.response?.data?.error || 'Failed to record offset. Try again.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setOffsetting(null);
    }
  };

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[S.textSub, { marginTop: 12 }]}>Loading real-time offset options...</Text>
      </View>
    );
  }

  const excessKg    = limitData.excessKg  ?? paramExcess;
  const todayKg     = limitData.todayKg   ?? paramToday;
  const threshold   = limitData.threshold ?? paramLimit;
  const exceeded    = limitData.exceeded  ?? (excessKg > 0);
  const estimateCost = estimate ? (estimate.price_cents_usd / 100).toFixed(2) : (excessKg * 0.015).toFixed(2);
  const ringFill    = exceeded && threshold > 0 ? Math.min(todayKg / threshold, 1.5) : 0;

  return (
    <ScreenTransition>
      <View style={S.root}>
        <BackButton />

        <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Warning hero ──────────────────────────────── */}
          <LinearGradient
            colors={exceeded ? ['#1A0A06', '#200D08', C.bg] : ['#071A0F', '#0A1F12', C.bg]}
            style={S.hero}
          >
            <Text style={S.heroTitle}>
              {exceeded ? '⚠️ Carbon Offset' : '🌍 Carbon Offset'}
            </Text>
            <Text style={S.heroSub}>
              {exceeded ? 'Your daily limit is exceeded' : 'Restore your carbon balance'}
            </Text>

            <View style={S.ringWrap}>
              <WarnRing prog={ringFill * ringProg} />
              <View style={S.ringCenter}>
                {exceeded ? (
                  <>
                    <Text style={S.warnNum}>+{excessKg.toFixed(1)}</Text>
                    <Text style={S.warnUnit}>kg excess CO₂</Text>
                  </>
                ) : (
                  <>
                    <Text style={[S.warnNum, { color: C.pos }]}>✓</Text>
                    <Text style={S.warnUnit}>Within limit</Text>
                  </>
                )}
              </View>
            </View>

            {/* Today vs limit row */}
            <View style={S.heroStats}>
              <View style={S.heroStat}>
                <Text style={[S.heroStatVal, { color: exceeded ? C.warn : C.pos }]}>{todayKg.toFixed(1)}</Text>
                <Text style={S.heroStatLabel}>Today (kg)</Text>
              </View>
              <View style={S.heroDivider} />
              <View style={S.heroStat}>
                <Text style={S.heroStatVal}>{threshold}</Text>
                <Text style={S.heroStatLabel}>Daily Limit</Text>
              </View>
              <View style={S.heroDivider} />
              <View style={S.heroStat}>
                <Text style={[S.heroStatVal, { color: exceeded ? C.warn : C.pos }]}>
                  {exceeded ? `+${excessKg.toFixed(1)}` : `-${(threshold - todayKg).toFixed(1)}`}
                </Text>
                <Text style={S.heroStatLabel}>{exceeded ? 'Excess' : 'Under'}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Amount picker ─────────────────────────────── */}
          <LinearGradient colors={['#0D1A10', '#0A1608']} style={S.planCard}>
            <Text style={S.planTitle}>Choose how much to offset:</Text>

            {/* Quick preset chips */}
            <View style={S.presetRow}>
              {[1, 5, 10, ...(excessKg > 10 ? [Math.round(excessKg)] : [])].map(kg => (
                <TouchableOpacity
                  key={kg}
                  style={[S.presetChip, customKg === kg && S.presetChipActive]}
                  onPress={() => setCustomKg(kg)}
                  activeOpacity={0.7}
                >
                  <Text style={[S.presetChipT, customKg === kg && S.presetChipTActive]}>
                    {kg === Math.round(excessKg) && excessKg > 10 ? `Full\n${kg} kg` : `${kg} kg`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fine stepper */}
            <View style={S.stepperRow}>
              <TouchableOpacity style={S.stepBtn} onPress={() => setCustomKg(k => Math.max(0.5, parseFloat((k - 0.5).toFixed(1))))}>
                <Text style={S.stepBtnT}>−</Text>
              </TouchableOpacity>
              <View style={S.stepVal}>
                <Text style={S.stepValNum}>{customKg}</Text>
                <Text style={S.stepValUnit}>kg CO₂</Text>
              </View>
              <TouchableOpacity style={S.stepBtn} onPress={() => setCustomKg(k => parseFloat((k + 0.5).toFixed(1)))}>
                <Text style={S.stepBtnT}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Live cost estimate */}
            <View style={S.costRow}>
              <Text style={S.costLabel}>Estimated cost:</Text>
              <Text style={S.costVal}>≈ ${(customKg * 0.01025).toFixed(3)} USD</Text>
            </View>

            {source === 'ecologi' && (
              <View style={S.patchBadge}>
                <Text style={S.patchBadgeT}>🌿 Powered by Ecologi</Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Project list ──────────────────────────────── */}
          <Text style={S.sectionTitle}>
            {source === 'ecologi' ? '🌿 Ecologi Carbon Projects' : '🌱 Offset Programs'}
          </Text>
          {source === 'ecologi' && (
            <Text style={S.sectionSub}>Real certified projects powered by Ecologi</Text>
          )}

          {projects.map((p, i) => (
            <View key={p.id} style={S.projCard}>
              {/* Left accent stripe */}
              <View style={[S.stripe, { backgroundColor: p.color || C.accent }]} />

              <View style={[S.projIconBox, { backgroundColor: p.color ? `${p.color}22` : C.border }]}>
                <Text style={S.projIcon}>{p.icon}</Text>
              </View>

              <View style={S.projBody}>
                <View style={S.projNameRow}>
                  <Text style={S.projName} numberOfLines={1}>{p.name}</Text>
                  {p.flag ? <Text style={S.projFlag}>{p.flag}</Text> : null}
                </View>
                <Text style={S.projType}>{p.typeLabel}</Text>
                <Text style={S.projDesc} numberOfLines={2}>{p.description}</Text>

                <View style={S.projMeta}>
                  <View style={S.metaBadge}>
                    <Text style={S.metaT}>{p.priceDisplay}</Text>
                  </View>
                  {p.verifier && (
                    <View style={[S.metaBadge, { backgroundColor: 'rgba(82,199,122,0.12)' }]}>
                      <Text style={[S.metaT, { color: C.pos }]}>✓ {p.verifier}</Text>
                    </View>
                  )}
                  <View style={[S.metaBadge, { backgroundColor: 'rgba(178,208,84,0.1)' }]}>
                    <Text style={[S.metaT, { color: C.accent }]}>≈${(customKg * p.pricePerKg).toFixed(3)} for {customKg} kg</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={S.offsetBtn}
                onPress={() => handleOffset(p)}
                disabled={!!offsetting}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#B2D054', '#8FA832']} style={S.offsetBtnGrad}>
                  {offsetting === p.id
                    ? <ActivityIndicator size="small" color="#071209" />
                    : <Text style={S.offsetBtnT}>Offset{'\n'}🌐</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))}

          {/* ── How it works ──────────────────────────────── */}
          <View style={S.howCard}>
            <Text style={S.howTitle}>💡 How Carbon Offset Works</Text>
            {[
              ['1', 'Your excess CO₂ is calculated from today\'s logged activities vs your daily limit.'],
              ['2', 'Choose a real certified carbon project powered by Patch.io.'],
              ['3', 'Your offset is recorded and your Carbon Balance is updated instantly.'],
            ].map(([n, t]) => (
              <View key={n} style={S.howRow}>
                <View style={S.howNum}><Text style={S.howNumT}>{n}</Text></View>
                <Text style={S.howTxt}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>

        {/* ── Confirmation Modal (replaces Alert.alert — works on web+mobile) ── */}
        <Modal
          visible={!!confirmProject}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmProject(null)}
        >
          <TouchableOpacity
            style={S.confirmOverlay}
            activeOpacity={1}
            onPress={() => setConfirmProject(null)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <LinearGradient colors={['#0F2016', '#060F08']} style={S.confirmBox}>
                {/* Handle */}
                <View style={S.confirmHandle} />

                <Text style={S.confirmTitle}>🌱 Confirm Carbon Offset</Text>

                {/* Project name + stats */}
                <View style={S.confirmProjRow}>
                  <Text style={S.confirmProjIcon}>{confirmProject?.icon}</Text>
                  <Text style={S.confirmProjName} numberOfLines={2}>{confirmProject?.name}</Text>
                </View>

                <View style={S.confirmStatsRow}>
                  <View style={S.confirmStat}>
                    <Text style={S.confirmStatVal}>{customKg} kg</Text>
                    <Text style={S.confirmStatLbl}>CO₂ Offset</Text>
                  </View>
                  <View style={S.confirmDivider} />
                  <View style={S.confirmStat}>
                    <Text style={[S.confirmStatVal, { color: C.pos }]}>
                      ≈${confirmProject ? (customKg * confirmProject.pricePerKg).toFixed(3) : '0'} USD
                    </Text>
                    <Text style={S.confirmStatLbl}>Est. Cost</Text>
                  </View>
                  <View style={S.confirmDivider} />
                  <View style={S.confirmStat}>
                    <Text style={[S.confirmStatVal, { color: C.accent }]}>
                      {confirmProject?.verifier || 'Ecologi'}
                    </Text>
                    <Text style={S.confirmStatLbl}>Verified By</Text>
                  </View>
                </View>

                {/* Record in App — primary CTA */}
                <TouchableOpacity
                  style={S.primaryBtn}
                  onPress={() => handleRecordInApp(confirmProject)}
                  disabled={!!offsetting}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#B2D054', '#8FA832']} style={S.primaryBtnGrad}>
                    {offsetting === confirmProject?.id
                      ? <ActivityIndicator color="#071209" size="small" />
                      : <>
                          <Text style={S.primaryBtnT}>📱 Offset via Ecologi</Text>
                          <Text style={S.primaryBtnSub}>Recorded in app · real CO₂ offset</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Donate on Website — secondary */}
                <TouchableOpacity
                  style={S.secondaryBtn}
                  onPress={() => handleDonateWeb(confirmProject)}
                  activeOpacity={0.8}
                >
                  <Text style={S.secondaryBtnT}>🌐 Donate Directly on Website</Text>
                  <Text style={S.secondaryBtnSub}>Opens certified platform in browser</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setConfirmProject(null)} style={S.cancelLink}>
                  <Text style={S.cancelLinkT}>Cancel</Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Success toast ── */}
        {successMsg && (
          <View style={S.toast}>
            <Text style={S.toastT}>🌿 {successMsg}</Text>
          </View>
        )}

        {/* ── Error toast ── */}
        {errorMsg && (
          <View style={[S.toast, { backgroundColor: 'rgba(255,80,60,0.95)' }]}>
            <Text style={S.toastT}>⚠️ {errorMsg}</Text>
          </View>
        )}

      </View>
    </ScreenTransition>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  textSub:{ color: C.textSub, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Hero
  hero: {
    paddingTop: Platform.OS === 'ios' ? 90 : Platform.OS === 'web' ? 82 : 68,
    paddingBottom: 28, alignItems: 'center', paddingHorizontal: 20,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.3 },
  heroSub:   { fontSize: 12, color: C.textSub, marginTop: 4, marginBottom: 20 },

  ringWrap:   { width: RING_SZ, height: RING_SZ, position: 'relative', marginBottom: 16 },
  ringCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  warnNum:  { fontSize: 30, fontWeight: '900', color: C.warn },
  warnUnit: { fontSize: 11, color: C.textSub, marginTop: 2 },

  heroStats:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroStat:    { alignItems: 'center' },
  heroStatVal: { fontSize: 20, fontWeight: '800', color: C.text },
  heroStatLabel:{ fontSize: 10, color: C.textSub, marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(178,208,84,0.15)' },

  // Amount picker card
  planCard: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)',
  },
  planTitle: { fontSize: 13, color: C.textSub, marginBottom: 12, fontWeight: '600' },

  // Quick preset chips
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  presetChipActive: { backgroundColor: 'rgba(178,208,84,0.15)', borderColor: C.accent },
  presetChipT:      { fontSize: 12, color: C.textSub, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  presetChipTActive:{ color: C.accent, fontWeight: '800' },

  // Fine stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14 },
  stepBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(178,208,84,0.1)',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  stepBtnT:    { fontSize: 24, fontWeight: '600', color: C.accent, lineHeight: 28 },
  stepVal:     { alignItems: 'center', minWidth: 80 },
  stepValNum:  { fontSize: 32, fontWeight: '900', color: C.text },
  stepValUnit: { fontSize: 11, color: C.textSub, marginTop: 2 },

  // Live cost
  costRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  costLabel:{ fontSize: 12, color: C.textSub },
  costVal:  { fontSize: 14, fontWeight: '800', color: C.pos },

  patchBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(178,208,84,0.1)',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  patchBadgeT: { fontSize: 10, color: C.accent, fontWeight: '600' },

  // Section
  sectionTitle:{ fontSize: 15, fontWeight: '800', color: C.text, marginHorizontal: 16, marginTop: 20, marginBottom: 4 },
  sectionSub:  { fontSize: 11, color: C.textSub, marginHorizontal: 16, marginBottom: 10 },

  // Project cards
  projCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  stripe:    { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  projIconBox:{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginRight: 10, marginLeft: 6 },
  projIcon:   { fontSize: 24 },
  projBody:   { flex: 1 },
  projNameRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  projName:   { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  projFlag:   { fontSize: 16 },
  projType:   { fontSize: 10, color: C.accent, fontWeight: '600', marginBottom: 4 },
  projDesc:   { fontSize: 11, color: C.textSub, lineHeight: 15, marginBottom: 8 },
  projMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaBadge:  { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  metaT:      { fontSize: 10, fontWeight: '600', color: C.textSub },

  offsetBtn:     { alignSelf: 'center', marginLeft: 8, borderRadius: 12, overflow: 'hidden' },
  offsetBtnGrad: { paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 52 },
  offsetBtnT:    { fontSize: 11, fontWeight: '800', color: '#071209', textAlign: 'center', lineHeight: 15 },

  // How it works
  howCard: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  howTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 14 },
  howRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  howNum:   { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(178,208,84,0.15)',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.3)',
    justifyContent: 'center', alignItems: 'center' },
  howNumT:  { fontSize: 12, fontWeight: '800', color: C.accent },
  howTxt:   { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 17 },

  // ── Confirmation modal ────────────────────────────────────────────────────
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  confirmBox: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1, borderColor: 'rgba(178,208,84,0.2)',
  },
  confirmHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(178,208,84,0.3)',
    alignSelf: 'center', marginBottom: 20,
  },
  confirmTitle:    { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 14, textAlign: 'center' },
  confirmProjRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
    backgroundColor: 'rgba(178,208,84,0.07)', borderRadius: 14, padding: 12 },
  confirmProjIcon: { fontSize: 26 },
  confirmProjName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  confirmStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 22 },
  confirmStat:     { alignItems: 'center' },
  confirmStatVal:  { fontSize: 18, fontWeight: '800', color: C.text },
  confirmStatLbl:  { fontSize: 10, color: C.textSub, marginTop: 4 },
  confirmDivider:  { width: 1, height: 36, backgroundColor: 'rgba(178,208,84,0.12)' },

  // Primary CTA
  primaryBtn:     { borderRadius: 18, overflow: 'hidden', marginBottom: 10 },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnT:    { fontSize: 15, fontWeight: '800', color: '#071209' },
  primaryBtnSub:  { fontSize: 11, color: 'rgba(7,18,9,0.65)', marginTop: 2 },

  // Secondary CTA
  secondaryBtn: {
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)',
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  secondaryBtnT:   { fontSize: 14, fontWeight: '700', color: C.text },
  secondaryBtnSub: { fontSize: 11, color: C.textSub, marginTop: 3 },

  cancelLink:  { alignItems: 'center', paddingVertical: 10 },
  cancelLinkT: { fontSize: 14, color: C.textSub },

  // Toast
  toast: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: 'rgba(22,60,28,0.97)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.3)',
    alignItems: 'center',
  },
  toastT: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center' },
});
