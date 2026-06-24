import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Animated, Easing, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { showAlert } from '../../utils/crossAlert';
import {
  getOffsetPrograms, contributeOffset, getOffsetBalance, getOffsetHistory,
} from '../../api/api';
import BackButton from '../../components/BackButton';
import ScreenTransition from '../../components/ScreenTransition';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#060F08',
  card:      '#0D1A10',
  cardBord:  'rgba(178,208,84,0.12)',
  accent:    '#B2D054',
  accentDim: 'rgba(178,208,84,0.18)',
  text:      '#EFF4EE',
  textSub:   'rgba(239,244,238,0.52)',
  pos:       '#52C77A',
  neg:       '#FF7B5C',
};

// ── Animated progress ring ────────────────────────────────────────────────────
const RING_SZ   = 190;
const RING_R    = 76;
const RING_CIRC = 2 * Math.PI * RING_R;

function ProgressRing({ pct, prog, isPositive }) {
  const filled     = RING_CIRC * Math.min(pct, 1) * prog;
  const dashOffset = RING_CIRC - filled;
  return (
    <Svg width={RING_SZ} height={RING_SZ}>
      <Circle
        cx={RING_SZ / 2} cy={RING_SZ / 2} r={RING_R}
        fill="none" stroke="rgba(178,208,84,0.07)" strokeWidth={12}
      />
      <Circle
        cx={RING_SZ / 2} cy={RING_SZ / 2} r={RING_R}
        fill="none"
        stroke={isPositive ? C.pos : C.accent}
        strokeWidth={12}
        strokeDasharray={String(RING_CIRC)}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${RING_SZ / 2}, ${RING_SZ / 2}`}
      />
    </Svg>
  );
}

// ── Category inference (works without backend category field) ─────────────────
const inferCat = (name = '', icon = '') => {
  const n = name.toLowerCase();
  if (n.includes('forest') || n.includes('tree') || n.includes('reforest')) return 'Forest';
  if (n.includes('solar') || n.includes('wind') || n.includes('renew'))     return 'Solar';
  if (n.includes('water') || n.includes('ocean') || n.includes('sea'))      return 'Water';
  if (n.includes('methane') || n.includes('landfill') || n.includes('waste')) return 'Methane';
  return 'Other';
};

const CATS = ['All', '🌲 Forest', '☀️ Solar', '💧 Water', '♻️ Methane'];

const catKey = (cat) =>
  cat.replace(/[^\w]/g, '').toLowerCase(); // "🌲 Forest" → "forest"

// ── Impact equivalencies ──────────────────────────────────────────────────────
const impactItems = (kg) => [
  { icon: '🌳', val: Math.max(0, Math.floor(kg / 21)).toString(),          label: 'Trees\nEquiv.' },
  { icon: '✈️', val: Math.max(0, (kg / 90).toFixed(1)).toString(),         label: 'Flight\nHours' },
  { icon: '🚗', val: Math.max(0, Math.floor(kg / 0.21)).toLocaleString(),   label: 'km Not\nDriven' },
];

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OffsetScreen() {
  const [programs, setPrograms]         = useState([]);
  const [balance, setBalance]           = useState(null);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [contributing, setContributing] = useState(false);
  const [modal, setModal]               = useState(null);
  const [qty, setQty]                   = useState(1);
  const [activeCat, setActiveCat]       = useState('All');
  const [ringProg, setRingProg]         = useState(0);
  const [liveOffset, setLiveOffset]     = useState(0);
  const ringAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liveRef   = useRef(0);
  const tickRef   = useRef(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, hRes] = await Promise.all([
        getOffsetPrograms(), getOffsetBalance(), getOffsetHistory(),
      ]);
      setPrograms(pRes.data.data || []);
      setBalance(bRes.data);
      setHistory(hRes.data.data || []);
    } catch {
      showAlert('Error', 'Failed to load offset data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Start ring animation once data is ready
  useEffect(() => {
    if (loading || !balance) return;
    ringAnim.setValue(0);
    setRingProg(0);
    const id = ringAnim.addListener(({ value }) => setRingProg(value));
    Animated.timing(ringAnim, {
      toValue: 1, duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => ringAnim.removeListener(id);
  }, [loading, balance]);

  // ── Real-time live offset ticker ──────────────────────────────────────────────
  useEffect(() => {
    if (loading || !balance) return;

    const totalOffset = balance?.totalOffset ?? 0;
    if (totalOffset <= 0) return;

    // Rate: assume offset accumulates over 365 days → per ms
    const perMs = (totalOffset * 1000) / (365 * 24 * 60 * 60 * 1000);

    liveRef.current = totalOffset;
    setLiveOffset(totalOffset);

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      liveRef.current = liveRef.current + perMs * 100;
      setLiveOffset(liveRef.current);
    }, 100);

    // Pulsing dot animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [loading, balance]);

  const handleContribute = async () => {
    if (!modal) return;
    setContributing(true);
    try {
      const res = await contributeOffset({ programId: modal.id, quantity: qty });
      showAlert('🌱 Contributed!', res.data.message);
      setModal(null);
      setQty(1);
      fetchAll();
    } catch (e) {
      showAlert('Error', e.response?.data?.error || 'Failed to contribute');
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[S.textSub, { marginTop: 12 }]}>Loading offset programs...</Text>
      </View>
    );
  }

  const netPositive   = balance?.isPositive ?? false;
  const netBalance    = balance?.netBalance ?? 0;
  const totalGen      = balance?.totalGenerated ?? 0;
  const totalOffset   = balance?.totalOffset ?? 0;
  const neutralityPct = totalGen > 0 ? totalOffset / totalGen : 0;

  const displayedPrograms = activeCat === 'All'
    ? programs
    : programs.filter(p => {
        const cat = (p.category || inferCat(p.name, p.icon)).toLowerCase();
        return cat.startsWith(catKey(activeCat));
      });

  const shown = displayedPrograms.length > 0 ? displayedPrograms : programs;

  return (
    <ScreenTransition>
      <View style={S.root}>
        <BackButton />

        <ScrollView
          style={S.scroll}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ─────────────────────────────────────────── */}
          <LinearGradient colors={['#0A1A0F', '#071209', C.bg]} style={S.hero}>
            <Text style={S.heroTitle}>🌍 Carbon Offset</Text>
            <Text style={S.heroSub}>Track · Neutralize · Restore</Text>

            <View style={S.ringWrap}>
              <ProgressRing pct={neutralityPct} prog={ringProg} isPositive={netPositive} />
              <View style={S.ringCenter}>
                <Text style={[S.ringPct, { color: netPositive ? C.pos : C.accent }]}>
                  {Math.min(Math.round(neutralityPct * 100), 100)}%
                </Text>
                <Text style={S.ringLabel}>Neutralized</Text>
              </View>
            </View>

            <Text style={[S.netNum, { color: netPositive ? C.pos : C.neg }]}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(1)} kg CO₂
            </Text>
            <Text style={S.netLabel}>Net Carbon Balance</Text>

            {netPositive && (
              <View style={S.posBadge}>
                <Text style={S.posBadgeText}>🎉 Carbon Positive!</Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Stats row ────────────────────────────────────── */}
          {balance && (
            <View style={S.statsRow}>
              {[
                { label: 'Generated', value: totalGen.toFixed(1),             color: C.neg },
                { label: 'Offset',    value: totalOffset.toFixed(1),           color: C.pos },
                { label: 'Net',       value: Math.abs(netBalance).toFixed(1), color: netPositive ? C.pos : C.neg },
              ].map(s => (
                <View key={s.label} style={S.statCard}>
                  <Text style={[S.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={S.statUnit}>kg CO₂</Text>
                  <Text style={S.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Real-Time Live Offset Tracker ────────────────── */}
          {balance && totalOffset > 0 && (
            <LinearGradient
              colors={['#071A0E', '#0D2414', '#071A0E']}
              style={S.liveCard}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              {/* LIVE badge */}
              <View style={S.liveBadge}>
                <Animated.View style={[S.liveDot, { opacity: pulseAnim }]} />
                <Text style={S.liveBadgeTxt}>LIVE</Text>
              </View>

              <Text style={S.liveTitle}>Real-Time Carbon Offset</Text>
              <Text style={S.liveSubtitle}>Your contributions are actively reducing CO₂</Text>

              {/* Big ticking counter */}
              <View style={S.liveCounterRow}>
                <Text style={S.liveCounter}>{liveOffset.toFixed(6)}</Text>
                <Text style={S.liveUnit}> kg CO₂</Text>
              </View>

              {/* Rate pills */}
              <View style={S.liveRateRow}>
                {[
                  { label: '/sec',  val: ((totalOffset / (365 * 24 * 3600))).toFixed(8) },
                  { label: '/min',  val: ((totalOffset / (365 * 24 * 60))).toFixed(6)   },
                  { label: '/hour', val: ((totalOffset / (365 * 24))).toFixed(4)        },
                  { label: '/day',  val: (totalOffset / 365).toFixed(3)                 },
                ].map(r => (
                  <View key={r.label} style={S.liveRatePill}>
                    <Text style={S.liveRateVal}>{r.val}</Text>
                    <Text style={S.liveRateLabel}>kg{r.label}</Text>
                  </View>
                ))}
              </View>

              <View style={S.liveBarTrack}>
                <Animated.View style={[S.liveBarFill, { width: `${Math.min((liveOffset % (totalOffset * 0.01)) / (totalOffset * 0.01) * 100, 100)}%` }]} />
              </View>
              <Text style={S.liveBarLabel}>Based on your total {totalOffset.toFixed(2)} kg offset spread over a year</Text>
            </LinearGradient>
          )}

          {/* ── Impact equivalencies ─────────────────────────── */}
          {balance && totalOffset > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>✨ Your Offset Equals</Text>
              <View style={S.impactRow}>
                {impactItems(totalOffset).map(item => (
                  <LinearGradient key={item.label} colors={['#0D1A10', '#0A1608']} style={S.impactCard}>
                    <Text style={S.impactIcon}>{item.icon}</Text>
                    <Text style={S.impactVal}>{item.val}</Text>
                    <Text style={S.impactLabel}>{item.label}</Text>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* ── Category filter chips ────────────────────────── */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.catRow}
            style={{ marginTop: 8 }}
          >
            {CATS.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[S.catChip, activeCat === cat && S.catChipActive]}
                onPress={() => setActiveCat(cat)}
                activeOpacity={0.7}
              >
                <Text style={[S.catText, activeCat === cat && S.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Offset programs ──────────────────────────────── */}
          <Text style={[S.sectionTitle, { marginHorizontal: 16, marginTop: 16, marginBottom: 10 }]}>
            🌱 Offset Programs
          </Text>

          {shown.map(p => (
            <View key={p.id} style={S.progCard}>
              {/* Color accent stripe */}
              <View style={[S.progStripe, { backgroundColor: p.color || C.accent }]} />

              <View style={[S.progIconBox, { backgroundColor: p.colorLight || C.accentDim }]}>
                <Text style={S.progIcon}>{p.icon}</Text>
              </View>

              <View style={S.progBody}>
                <Text style={S.progName}>{p.name}</Text>
                <Text style={S.progDesc} numberOfLines={2}>{p.description}</Text>
                <View style={S.progBadges}>
                  <View style={[S.badge, { backgroundColor: p.colorLight || C.accentDim }]}>
                    <Text style={[S.badgeT, { color: p.color || C.accent }]}>
                      Free · per {p.unit}
                    </Text>
                  </View>
                  <View style={S.badge}>
                    <Text style={[S.badgeT, { color: C.accent }]}>
                      {p.co2PerUnit} kg CO₂
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={S.offsetBtn}
                onPress={() => { setModal(p); setQty(1); }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#B2D054', '#8FA832']} style={S.offsetBtnGrad}>
                  <Text style={S.offsetBtnT}>Offset</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))}

          {/* ── Contribution history ─────────────────────────── */}
          {history.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>📋 My Contributions</Text>
              {history.slice(0, 10).map((h, i) => (
                <View key={i} style={S.histCard}>
                  <View style={S.histIconWrap}>
                    <Text style={S.histIcon}>{h.programIcon}</Text>
                  </View>
                  <View style={S.histBody}>
                    <Text style={S.histName}>{h.programName}</Text>
                    <Text style={S.histDate}>{new Date(h.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={S.histRight}>
                    <Text style={S.histOffset}>+{h.co2Offset} kg</Text>
                    <Text style={S.histAmt}>${h.amount}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 56 }} />
        </ScrollView>

        {/* ── Contribute modal (dark bottom sheet) ─────────── */}
        <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
          <View style={S.modalOverlay}>
            <LinearGradient colors={['#0F1F14', '#060F08']} style={S.modalBox}>
              <View style={S.modalHandle} />

              <Text style={S.modalTitle}>{modal?.icon}  {modal?.name}</Text>
              <Text style={S.modalDesc}>{modal?.description}</Text>

              {/* Live preview stats */}
              <View style={S.modalStats}>
                {[
                  { label: `${modal?.unit}(s)`, val: String(qty) },
                  { label: 'Cost',              val: 'Free ✅' },
                  { label: 'CO₂ Offset',        val: `${((modal?.co2PerUnit || 0) * qty).toFixed(1)} kg`, highlight: true },
                ].map(s => (
                  <View key={s.label} style={S.modalStat}>
                    <Text style={[S.modalStatVal, s.highlight && { color: C.pos }]}>{s.val}</Text>
                    <Text style={S.modalStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Qty stepper */}
              <View style={S.qtyRow}>
                <TouchableOpacity style={S.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                  <Text style={S.qtyBtnT}>−</Text>
                </TouchableOpacity>
                <Text style={S.qtyNum}>{qty}</Text>
                <TouchableOpacity style={S.qtyBtn} onPress={() => setQty(qty + 1)}>
                  <Text style={S.qtyBtnT}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={S.modalNote}>
                Log your real eco action — EcoTrack AI records it and updates your carbon balance.
              </Text>

              <View style={S.modalActions}>
                <TouchableOpacity style={S.cancelBtn} onPress={() => setModal(null)}>
                  <Text style={S.cancelBtnT}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={S.confirmBtn} onPress={handleContribute}
                  disabled={contributing} activeOpacity={0.85}
                >
                  <LinearGradient colors={['#B2D054', '#8FA832']} style={S.confirmBtnGrad}>
                    {contributing
                      ? <ActivityIndicator color="#071209" size="small" />
                      : <Text style={S.confirmBtnT}>Contribute 🌱</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>
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

  // ── Hero
  hero: {
    paddingTop:  Platform.OS === 'ios' ? 90 : Platform.OS === 'web' ? 82 : 68,
    paddingBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.3 },
  heroSub:   { fontSize: 12, color: C.textSub, marginTop: 4, marginBottom: 24 },

  ringWrap:   { width: RING_SZ, height: RING_SZ, position: 'relative', marginBottom: 18 },
  ringCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  ringPct:   { fontSize: 34, fontWeight: '900' },
  ringLabel: { fontSize: 11, color: C.textSub, marginTop: 2 },

  netNum:   { fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  netLabel: { fontSize: 12, color: C.textSub, marginTop: 4 },

  posBadge: {
    marginTop: 14,
    backgroundColor: 'rgba(82,199,122,0.12)',
    borderWidth: 1, borderColor: 'rgba(82,199,122,0.3)',
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 7,
  },
  posBadgeText: { color: C.pos, fontSize: 13, fontWeight: '700' },

  // ── Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: -6,
    gap: 8,
  },
  statCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBord,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  statVal:   { fontSize: 20, fontWeight: '800' },
  statUnit:  { fontSize: 9,  color: 'rgba(239,244,238,0.38)', marginTop: 2 },
  statLabel: { fontSize: 11, color: C.textSub, marginTop: 4 },

  // ── Live tracker
  liveCard: {
    marginHorizontal: 16, marginTop: 18,
    borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(82,199,122,0.25)',
    padding: 20,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(82,199,122,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 12, gap: 6,
    borderWidth: 1, borderColor: 'rgba(82,199,122,0.3)',
  },
  liveDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#52C77A' },
  liveBadgeTxt: { fontSize: 10, fontWeight: '900', color: '#52C77A', letterSpacing: 1.5 },

  liveTitle:    { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
  liveSubtitle: { fontSize: 11, color: C.textSub, marginBottom: 16 },

  liveCounterRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  liveCounter: {
    fontSize: 38, fontWeight: '900', color: '#52C77A',
    fontVariant: ['tabular-nums'], letterSpacing: -1,
  },
  liveUnit: { fontSize: 15, fontWeight: '700', color: 'rgba(82,199,122,0.6)', marginBottom: 6, marginLeft: 4 },

  liveRateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  liveRatePill: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(82,199,122,0.07)',
    borderRadius: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(82,199,122,0.12)',
  },
  liveRateVal:   { fontSize: 10, fontWeight: '800', color: '#52C77A' },
  liveRateLabel: { fontSize: 9,  color: C.textSub,  marginTop: 2 },

  liveBarTrack: {
    height: 4, backgroundColor: 'rgba(82,199,122,0.10)',
    borderRadius: 2, marginBottom: 8, overflow: 'hidden',
  },
  liveBarFill:  { height: 4, backgroundColor: '#52C77A', borderRadius: 2 },
  liveBarLabel: { fontSize: 10, color: 'rgba(239,244,238,0.28)', textAlign: 'center' },

  // ── Impact
  section:    { marginHorizontal: 16, marginTop: 24 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },

  impactRow:  { flexDirection: 'row', gap: 10 },
  impactCard: {
    flex: 1, alignItems: 'center', borderRadius: 16,
    borderWidth: 1, borderColor: C.cardBord,
    paddingVertical: 16,
  },
  impactIcon:  { fontSize: 26, marginBottom: 6 },
  impactVal:   { fontSize: 18, fontWeight: '800', color: C.accent },
  impactLabel: { fontSize: 10, color: C.textSub, textAlign: 'center', marginTop: 4, lineHeight: 14 },

  // ── Category chips
  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  catChip: {
    paddingHorizontal: 15, paddingVertical: 7,
    borderRadius: 22, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.cardBord,
  },
  catChipActive: { backgroundColor: 'rgba(178,208,84,0.14)', borderColor: C.accent },
  catText:       { fontSize: 12, color: C.textSub, fontWeight: '500' },
  catTextActive: { color: C.accent, fontWeight: '700' },

  // ── Program cards
  progCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: C.cardBord,
    overflow: 'hidden',
  },
  progStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
  },
  progIconBox: {
    width: 52, height: 52, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginLeft: 6,
  },
  progIcon:   { fontSize: 26 },
  progBody:   { flex: 1 },
  progName:   { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  progDesc:   { fontSize: 11, color: C.textSub, lineHeight: 15, marginBottom: 8 },
  progBadges: { flexDirection: 'row', gap: 6 },
  badge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: C.accentDim,
  },
  badgeT:     { fontSize: 10, fontWeight: '600' },
  offsetBtn:  { alignSelf: 'center', marginLeft: 10, borderRadius: 12, overflow: 'hidden' },
  offsetBtnGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  offsetBtnT: { fontSize: 12, fontWeight: '800', color: '#071209' },

  // ── History
  histCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.07)',
  },
  histIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.accentDim,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  histIcon:   { fontSize: 20 },
  histBody:   { flex: 1 },
  histName:   { fontSize: 13, fontWeight: '600', color: C.text },
  histDate:   { fontSize: 11, color: 'rgba(239,244,238,0.38)', marginTop: 2 },
  histRight:  { alignItems: 'flex-end' },
  histOffset: { fontSize: 13, fontWeight: '700', color: C.pos },
  histAmt:    { fontSize: 11, color: 'rgba(239,244,238,0.38)', marginTop: 2 },

  // ── Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 26,
    borderTopWidth: 1, borderColor: 'rgba(178,208,84,0.18)',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(178,208,84,0.28)',
    alignSelf: 'center', marginBottom: 22,
  },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  modalDesc:      { fontSize: 13, color: C.textSub, lineHeight: 18, marginBottom: 20 },
  modalStats:     { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 22 },
  modalStat:      { alignItems: 'center' },
  modalStatVal:   { fontSize: 22, fontWeight: '800', color: C.text },
  modalStatLabel: { fontSize: 11, color: 'rgba(239,244,238,0.42)', marginTop: 4 },

  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 28, marginBottom: 22,
  },
  qtyBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(178,208,84,0.10)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.22)',
  },
  qtyBtnT: { fontSize: 28, fontWeight: '600', color: C.accent, lineHeight: 32 },
  qtyNum:  { fontSize: 34, fontWeight: '900', color: C.text, minWidth: 52, textAlign: 'center' },

  modalNote: {
    fontSize: 11, color: 'rgba(239,244,238,0.32)',
    textAlign: 'center', fontStyle: 'italic', marginBottom: 26, lineHeight: 16,
  },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnT:    { fontSize: 15, fontWeight: '700', color: 'rgba(239,244,238,0.55)' },
  confirmBtn:    { flex: 2, borderRadius: 16, overflow: 'hidden' },
  confirmBtnGrad:{ paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  confirmBtnT:   { fontSize: 15, fontWeight: '800', color: '#071209' },
});
