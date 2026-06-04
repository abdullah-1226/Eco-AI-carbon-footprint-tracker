import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, RefreshControl, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivitySummary, getOffsetBalance } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import ScreenTransition from '../../components/ScreenTransition';
import BackButton from '../../components/BackButton';

const W = Dimensions.get('window').width;

// ── Planet evolution stages ───────────────────────────────────────────────────
const STAGES = [
  {
    id: 0, name: 'Barren Rock',        emoji: '🪨',
    skyGrad: ['#0d0d1a', '#1a1a2e'],   groundColor: '#2d2d2d',
    sun: '🌑',  clouds: [],
    flora: [],  fauna: [],  water: '',  special: '',
    desc: 'Your planet is lifeless. Log eco-friendly activities to awaken it!',
    tip:  'Start by logging a walk or plant-based meal.',
  },
  {
    id: 1, name: 'Desert Awakening',   emoji: '🌵',
    skyGrad: ['#2d1500', '#4a2800'],   groundColor: '#7a5a1a',
    sun: '🌤️', clouds: ['☁️'],
    flora: ['🌵', '🌵', '🌵'],         fauna: [],  water: '',  special: '',
    desc: 'A parched land stirs. The first resilient plants take root.',
    tip:  'Reduce transport emissions to bring rain.',
  },
  {
    id: 2, name: 'First Sprouts',      emoji: '🌱',
    skyGrad: ['#0d2200', '#1a3d0a'],   groundColor: '#4a7a10',
    sun: '🌤️', clouds: ['☁️', '☁️'],
    flora: ['🌱', '🌱', '🌱', '🌵'],   fauna: ['🐛'],  water: '',  special: '',
    desc: 'Life is emerging! Green shoots push through the soil.',
    tip:  'Keep your daily emissions under your limit.',
  },
  {
    id: 3, name: 'Growing Forest',     emoji: '🌿',
    skyGrad: ['#071a0d', '#0d2e14'],   groundColor: '#2a6a14',
    sun: '☀️',  clouds: ['☁️', '☁️'],
    flora: ['🌿', '🌳', '🌳', '🌸'],  fauna: ['🐛', '🦋'],  water: '💧',  special: '',
    desc: 'A young forest flourishes. Small creatures find their home.',
    tip:  'Offset carbon to bring rivers and lakes.',
  },
  {
    id: 4, name: 'Thriving Ecosystem', emoji: '🌳',
    skyGrad: ['#051a0a', '#0a2512'],   groundColor: '#1a5a14',
    sun: '☀️',  clouds: ['☁️', '🐦'],
    flora: ['🌳', '🌳', '🌺', '🌸', '🌿'],  fauna: ['🐦', '🦌', '🦋'],  water: '🌊',  special: '',
    desc: 'A rich ecosystem thrives! Wildlife is flourishing everywhere.',
    tip:  'Maintain your streak to attract rare animals.',
  },
  {
    id: 5, name: 'Rainforest Paradise', emoji: '🌺',
    skyGrad: ['#021206', '#071a0a'],   groundColor: '#0d4010',
    sun: '🌈',  clouds: ['☁️', '🐦', '🐦'],
    flora: ['🌳', '🌺', '🌳', '🌸', '🌻', '🌿'],  fauna: ['🦜', '🦋', '🦌', '🐸'],  water: '🌊🐟',  special: '',
    desc: 'Magnificent! A vibrant rainforest teeming with life.',
    tip:  'You\'re almost at Eco Paradise — keep it up!',
  },
  {
    id: 6, name: 'Eco Paradise',        emoji: '✨',
    skyGrad: ['#010a04', '#051205'],   groundColor: '#0a3010',
    sun: '🌟',  clouds: ['🌈', '🐦', '🦅'],
    flora: ['🌳', '🌺', '🌳', '🌸', '🌻', '🌿', '🌴'],  fauna: ['🦜', '🦋', '🦌', '🐬', '🦅', '🐸'],  water: '🌊🐬🐟',  special: '✨',
    desc: '🎉 Wonder of wonders! Your planet is an Eco Paradise. You are a true Earth Guardian.',
    tip:  'Share your achievement with the world!',
  },
];

// ── Compute planet state from user data ───────────────────────────────────────
function computePlanetState({ ecoScore, currentStreak, totalOffset, monthlyEmissions, totalActivities, todayKg, dailyLimit }) {
  const score     = ecoScore ?? 50;
  const stageIdx  = Math.min(6, Math.floor(score / 15));
  const stage     = STAGES[stageIdx];

  // Trees = 1 per 21 kg offset (1 tree absorbs ~21 kg/yr)
  const trees      = Math.floor((totalOffset ?? 0) / 21);
  // Animals = 1 per 7-day streak
  const animals    = Math.floor((currentStreak ?? 0) / 7);
  // Water level = offset progress
  const waterPct   = Math.min(100, ((totalOffset ?? 0) / 100) * 100);
  // Planet health %
  const health     = score;
  // Stressed today?
  const stressed   = todayKg > dailyLimit;
  // Next stage threshold
  const nextScore  = (stageIdx + 1) * 15;
  const toNext     = Math.max(0, nextScore - score);

  return { stage, stageIdx, trees, animals, waterPct, health, stressed, toNext, nextScore };
}

// ── Floating emoji element ────────────────────────────────────────────────────
function FloatElement({ emoji, delay = 0, amplitude = 8, style }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -amplitude, duration: 1800 + delay * 200, useNativeDriver: true }),
        Animated.timing(y, { toValue:  amplitude, duration: 1800 + delay * 200, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay * 150);
    return () => { clearTimeout(t); loop.stop(); };
  }, []);
  return (
    <Animated.Text style={[{ fontSize: 24 }, style, { transform: [{ translateY: y }] }]}>
      {emoji}
    </Animated.Text>
  );
}

// ── Planet visual ─────────────────────────────────────────────────────────────
function PlanetView({ planetState, pulseAnim }) {
  const { stage, stressed } = planetState;
  const cloudX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cloudX, { toValue: 20, duration: 6000, useNativeDriver: true }),
        Animated.timing(cloudX, { toValue: -20, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[S.planetWrap, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient colors={stage.skyGrad} style={S.planetSky}>

        {/* Stressed overlay */}
        {stressed && (
          <View style={S.stressOverlay} />
        )}

        {/* Sun / moon / rainbow */}
        <View style={S.sunRow}>
          <Text style={S.sunEmoji}>{stage.sun}</Text>
        </View>

        {/* Moving clouds */}
        <Animated.View style={[S.cloudRow, { transform: [{ translateX: cloudX }] }]}>
          {stage.clouds.map((c, i) => (
            <Text key={i} style={[S.cloudEmoji, { marginLeft: i * 60 }]}>{c}</Text>
          ))}
        </Animated.View>

        {/* Special (rainbow, stars) */}
        {stage.special ? <Text style={S.specialEmoji}>{stage.special}</Text> : null}

        {/* Fauna row (birds, butterflies) */}
        <View style={S.faunaRow}>
          {stage.fauna.slice(0, 4).map((f, i) => (
            <FloatElement key={i} emoji={f} delay={i} amplitude={6} style={{ marginHorizontal: 8 }} />
          ))}
        </View>

        {/* Ground + flora */}
        <View style={[S.ground, { backgroundColor: stage.groundColor }]}>
          <View style={S.floraRow}>
            {stage.flora.map((fl, i) => (
              <FloatElement key={i} emoji={fl} delay={i} amplitude={4} style={{ fontSize: i % 2 === 0 ? 28 : 22, marginHorizontal: 4 }} />
            ))}
          </View>

          {/* Water */}
          {stage.water ? (
            <View style={S.waterRow}>
              <Text style={S.waterTxt}>{stage.water}</Text>
            </View>
          ) : null}
        </View>

        {/* Stressed warning */}
        {stressed && (
          <View style={S.stressBanner}>
            <Text style={S.stressTxt}>⚠️ Planet stressed — limit exceeded today</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EcoGardenScreen({ navigation }) {
  const { user }               = useAuth();
  const [data, setData]        = useState(null);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const barAnim    = useRef(new Animated.Value(0)).current;
  const healthAnim = useRef(new Animated.Value(0)).current;

  const DAILY_LIMIT = user?.dailyThreshold ?? 6.8;

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, offsetRes] = await Promise.all([
        getActivitySummary(),
        getOffsetBalance(),
      ]);
      const sum    = sumRes.data;
      const offset = offsetRes.data;

      const planetInput = {
        ecoScore:         sum.stats?.ecoScore ?? 50,
        currentStreak:    sum.stats?.currentStreak ?? 0,
        totalOffset:      offset.totalOffset ?? 0,
        monthlyEmissions: sum.monthly?.total ?? 0,
        totalActivities:  sum.stats?.totalActivities ?? 0,
        todayKg:          parseFloat((sum.today?.co2e ?? 0).toFixed(1)),
        dailyLimit:       DAILY_LIMIT,
      };

      setData({ planetInput, sum, offset });

      // Animate bars
      const ps = computePlanetState(planetInput);
      barAnim.setValue(0);
      healthAnim.setValue(0);
      Animated.parallel([
        Animated.timing(barAnim, { toValue: ps.stageIdx / 6, duration: 1600, useNativeDriver: false }),
        Animated.timing(healthAnim, { toValue: ps.health / 100, duration: 1600, useNativeDriver: false }),
      ]).start();

      // Pulse on load
      Animated.sequence([
        Animated.spring(pulseAnim, { toValue: 1.04, tension: 200, friction: 4, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1.00, tension: 200, friction: 6, useNativeDriver: true }),
      ]).start();
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [DAILY_LIMIT]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  if (loading || !data) {
    return (
      <LinearGradient colors={['#020D06', '#071A0F']} style={S.loader}>
        <Text style={{ fontSize: 52 }}>🌍</Text>
        <Text style={{ color: '#B2D054', fontSize: 14, marginTop: 12 }}>Growing your planet…</Text>
      </LinearGradient>
    );
  }

  const ps     = computePlanetState(data.planetInput);
  const stage  = ps.stage;

  // Planet events feed
  const events = [];
  if (data.planetInput.todayKg <= DAILY_LIMIT && data.planetInput.todayKg > 0)
    events.push({ icon: '🌱', text: `You stayed within your limit today — your planet thrived!` });
  if (data.planetInput.todayKg > DAILY_LIMIT)
    events.push({ icon: '⚠️', text: `Excess emissions stressed your planet today. Offset to recover.`, warn: true });
  if (ps.trees > 0)
    events.push({ icon: '🌳', text: `${ps.trees} virtual trees planted through your carbon offsets!` });
  if (ps.animals > 0)
    events.push({ icon: '🦌', text: `${ps.animals} animal species returned thanks to your streak.` });
  if (data.planetInput.currentStreak >= 7)
    events.push({ icon: '🔥', text: `7-day streak active! Wildlife is thriving on your planet.` });
  if (data.planetInput.currentStreak >= 30)
    events.push({ icon: '⚡', text: `30-day streak! Rare species have made your planet their home.` });
  if (data.offset?.isPositive)
    events.push({ icon: '🎉', text: `Carbon Positive! Your planet glows with golden light.` });

  // Next stage unlocks
  const nextStage    = STAGES[Math.min(6, ps.stageIdx + 1)];
  const progressToNext = ps.stageIdx >= 6 ? 1 : (data.planetInput.ecoScore - ps.stageIdx * 15) / 15;

  return (
    <ScreenTransition>
      <View style={S.root}>
        <BackButton />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#B2D054" colors={['#B2D054']} />
          }
        >
          {/* ── Planet display ────────────────────────────── */}
          <PlanetView planetState={ps} pulseAnim={pulseAnim} />

          {/* ── Stage name + description ──────────────────── */}
          <LinearGradient colors={['#0A1A0F', '#060F08']} style={S.stageCard}>
            <View style={S.stageRow}>
              <Text style={S.stageEmoji}>{stage.emoji}</Text>
              <View style={S.stageInfo}>
                <Text style={S.stageName}>{stage.name}</Text>
                <Text style={S.stageDesc}>{stage.desc}</Text>
              </View>
              <View style={S.stageNumWrap}>
                <Text style={S.stageNum}>{ps.stageIdx}</Text>
                <Text style={S.stageNumOf}>/6</Text>
              </View>
            </View>

            {/* Evolution progress to next stage */}
            {ps.stageIdx < 6 && (
              <View style={S.evolveSection}>
                <View style={S.evolveLabelRow}>
                  <Text style={S.evolveLbl}>→ Next: {nextStage.name} {nextStage.emoji}</Text>
                  <Text style={S.evolvePct}>{(progressToNext * 100).toFixed(0)}%</Text>
                </View>
                <View style={S.evolveBarBg}>
                  <Animated.View style={[S.evolveBarFill, {
                    width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  }]} />
                </View>
                <Text style={S.evolveTip}>💡 {stage.tip}</Text>
              </View>
            )}
            {ps.stageIdx === 6 && (
              <View style={S.maxStage}>
                <Text style={S.maxStageTxt}>✨ Maximum stage reached — Earth Guardian!</Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Planet stats grid ─────────────────────────── */}
          <View style={S.statsGrid}>
            {[
              { icon: '❤️', label: 'Planet Health', value: `${ps.health}/100`, color: ps.health >= 60 ? '#52C77A' : ps.health >= 30 ? '#F59E0B' : '#FF7B5C' },
              { icon: '🌳', label: 'Trees Grown',   value: String(ps.trees),   color: '#B2D054' },
              { icon: '🦌', label: 'Animal Species', value: String(ps.animals), color: '#5AC8FA' },
              { icon: '💧', label: 'Water Level',   value: `${Math.round(ps.waterPct)}%`, color: '#39A7A7' },
              { icon: '🔥', label: 'Day Streak',    value: `${data.planetInput.currentStreak}d`, color: '#F59E0B' },
              { icon: '⭐', label: 'Eco Score',     value: `${ps.health}`, color: '#B2D054' },
            ].map((stat, i) => (
              <View key={i} style={S.statCard}>
                <Text style={S.statIcon}>{stat.icon}</Text>
                <Text style={[S.statVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={S.statLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Planet events ─────────────────────────────── */}
          {events.length > 0 && (
            <View style={S.eventsCard}>
              <Text style={S.eventsTitle}>📋 Planet Journal</Text>
              {events.map((ev, i) => (
                <View key={i} style={[S.eventRow, ev.warn && S.eventRowWarn]}>
                  <Text style={S.eventIcon}>{ev.icon}</Text>
                  <Text style={[S.eventTxt, ev.warn && { color: '#FF7B5C' }]}>{ev.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── How to grow ───────────────────────────────── */}
          <View style={S.howCard}>
            <Text style={S.howTitle}>🌍 How to Grow Your Planet</Text>
            {[
              { icon: '📉', label: 'Lower emissions',    desc: 'Stay under your daily CO₂ limit'       },
              { icon: '🌱', label: 'Log eco activities', desc: 'Walking, cycling, plant-based meals'    },
              { icon: '♻️', label: 'Offset carbon',      desc: 'Each kg offset plants a virtual tree'   },
              { icon: '🔥', label: 'Build a streak',     desc: 'Log daily to bring animals to your planet' },
              { icon: '⭐', label: 'Earn eco score',     desc: 'Score 70+ to unlock Rainforest stage'  },
            ].map((h, i) => (
              <View key={i} style={S.howRow}>
                <View style={S.howIconWrap}><Text style={{ fontSize: 18 }}>{h.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={S.howLabel}>{h.label}</Text>
                  <Text style={S.howDesc}>{h.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── CTAs ──────────────────────────────────────── */}
          <View style={S.ctaRow}>
            <TouchableOpacity style={S.ctaBtn} onPress={() => navigation.navigate('LogActivity')} activeOpacity={0.8}>
              <LinearGradient colors={['#B2D054', '#8FA832']} style={S.ctaBtnGrad}>
                <Text style={S.ctaBtnTxt}>➕ Log Activity</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={S.ctaBtn} onPress={() => navigation.navigate('CarbonOffset')} activeOpacity={0.8}>
              <LinearGradient colors={['#52C77A', '#2D7A4F']} style={S.ctaBtnGrad}>
                <Text style={S.ctaBtnTxt}>🌍 Offset Carbon</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </ScreenTransition>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#060F08' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Planet visual
  planetWrap: { margin: 16, borderRadius: 28, overflow: 'hidden',
    shadowColor: '#B2D054', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  planetSky:  { height: 280, position: 'relative', justifyContent: 'flex-end' },
  stressOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,100,50,0.08)' },
  stressBanner: { position: 'absolute', top: 60, left: 10, right: 10,
    backgroundColor: 'rgba(200,50,0,0.7)', borderRadius: 10, padding: 6, alignItems: 'center' },
  stressTxt:  { fontSize: 11, color: '#fff', fontWeight: '700' },

  sunRow:     { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 38, right: 20 },
  sunEmoji:   { fontSize: 34 },
  cloudRow:   { position: 'absolute', top: 60, left: 20, flexDirection: 'row' },
  cloudEmoji: { fontSize: 22, position: 'absolute' },
  specialEmoji:{ position: 'absolute', top: 48, left: W / 2 - 28 - 32, fontSize: 32 },
  faunaRow:   { position: 'absolute', top: 100, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  ground:     { height: 110, justifyContent: 'flex-start', paddingTop: 8 },
  floraRow:   { flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, alignItems: 'flex-end' },
  waterRow:   { alignItems: 'center', marginTop: 4 },
  waterTxt:   { fontSize: 18, letterSpacing: 4 },

  // Stage card
  stageCard:   { marginHorizontal: 16, marginBottom: 12, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)', padding: 16 },
  stageRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stageEmoji:  { fontSize: 36 },
  stageInfo:   { flex: 1 },
  stageName:   { fontSize: 16, fontWeight: '900', color: '#EFF4EE' },
  stageDesc:   { fontSize: 12, color: 'rgba(239,244,238,0.55)', marginTop: 3, lineHeight: 17 },
  stageNumWrap:{ alignItems: 'center', width: 40 },
  stageNum:    { fontSize: 24, fontWeight: '900', color: '#B2D054' },
  stageNumOf:  { fontSize: 10, color: 'rgba(239,244,238,0.4)' },

  evolveSection:  { },
  evolveLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  evolveLbl:      { fontSize: 12, color: 'rgba(239,244,238,0.6)', fontWeight: '600' },
  evolvePct:      { fontSize: 12, color: '#B2D054', fontWeight: '800' },
  evolveBarBg:    { height: 8, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  evolveBarFill:  { height: 8, borderRadius: 4, backgroundColor: '#B2D054' },
  evolveTip:      { fontSize: 11, color: 'rgba(239,244,238,0.45)', fontStyle: 'italic' },
  maxStage:       { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  maxStageTxt:    { fontSize: 12, color: '#FFD700', fontWeight: '700' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, marginBottom: 12 },
  statCard:  { width: (W - 52) / 3, backgroundColor: '#0D1A10',
    borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)' },
  statIcon:  { fontSize: 22, marginBottom: 4 },
  statVal:   { fontSize: 18, fontWeight: '900' },
  statLbl:   { fontSize: 9, color: 'rgba(239,244,238,0.45)', marginTop: 3, textAlign: 'center' },

  // Events
  eventsCard:   { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0D1A10',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)', padding: 14 },
  eventsTitle:  { fontSize: 13, fontWeight: '800', color: '#B2D054', marginBottom: 10 },
  eventRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  eventRowWarn: { },
  eventIcon:    { fontSize: 16, width: 24 },
  eventTxt:     { flex: 1, fontSize: 12, color: 'rgba(239,244,238,0.7)', lineHeight: 17 },

  // How to grow
  howCard:  { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0D1A10',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)', padding: 14 },
  howTitle: { fontSize: 13, fontWeight: '800', color: '#EFF4EE', marginBottom: 12 },
  howRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  howIconWrap:{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(178,208,84,0.1)',
    alignItems: 'center', justifyContent: 'center' },
  howLabel: { fontSize: 13, fontWeight: '700', color: '#EFF4EE' },
  howDesc:  { fontSize: 11, color: 'rgba(239,244,238,0.45)', marginTop: 1 },

  // CTAs
  ctaRow:    { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 8 },
  ctaBtn:    { flex: 1, borderRadius: 14, overflow: 'hidden' },
  ctaBtnGrad:{ paddingVertical: 14, alignItems: 'center' },
  ctaBtnTxt: { fontSize: 13, fontWeight: '800', color: '#071209' },
});
