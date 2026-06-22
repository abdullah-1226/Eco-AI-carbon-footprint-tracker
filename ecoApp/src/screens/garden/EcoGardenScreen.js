import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, RefreshControl, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivitySummary, getOffsetBalance, getActivities } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import ScreenTransition from '../../components/ScreenTransition';

const W = Dimensions.get('window').width;
const COLS = 9;
const TILE = Math.floor((W - 24) / COLS);

// ── Tile definitions per zone (3 levels: 0=dead, 1=recovering, 2=alive) ───────
const ZONES = [
  {
    id: 'sky', rows: 1, label: 'Atmosphere',
    levels: [
      { bg: '#1a1a2e', tiles: ['🌫️','🌫️','🌫️','🌫️','🌫️','🌫️','🌫️','🌫️','🌫️'] },
      { bg: '#1a3a5c', tiles: ['⛅','☁️','⛅','☁️','🌤️','☁️','⛅','☁️','🌤️'] },
      { bg: '#1565C0', tiles: ['☀️','🌤️','☀️','🌈','☀️','🌤️','☀️','🌤️','☀️'] },
    ],
  },
  {
    id: 'mountain', rows: 1, label: 'Highlands',
    levels: [
      { bg: '#2d1a0e', tiles: ['⬛','🟫','⬛','🟫','⬛','🟫','⬛','🟫','⬛'] },
      { bg: '#3e2723', tiles: ['🪨','🏔️','🪨','⛰️','🪨','🏔️','🪨','⛰️','🪨'] },
      { bg: '#4a5568', tiles: ['🏔️','❄️','🏔️','🏔️','❄️','🏔️','🏔️','❄️','🏔️'] },
    ],
  },
  {
    id: 'forest', rows: 2, label: 'Forest',
    levels: [
      { bg: '#1a1209', tiles: ['🌵','🌵','💀','🌵','💀','🌵','🌵','💀','🌵'] },
      { bg: '#1b4332', tiles: ['🌿','🌱','🌿','🌱','🌿','🌱','🌿','🌱','🌿'] },
      { bg: '#1a5c2a', tiles: ['🌲','🌳','🌲','🌲','🌳','🌲','🌳','🌲','🌳'] },
    ],
    levels2: [
      { bg: '#120d06', tiles: ['🟫','💀','🟫','🌵','🟫','💀','🟫','🌵','🟫'] },
      { bg: '#145a32', tiles: ['🌱','🌿','🌱','🌿','🌱','🌿','🌱','🌿','🌱'] },
      { bg: '#166534', tiles: ['🌳','🦌','🌲','🐿️','🌳','🦌','🌲','🌳','🦊'] },
    ],
  },
  {
    id: 'river', rows: 1, label: 'Waterways',
    levels: [
      { bg: '#1a0a0a', tiles: ['💀','🟫','💀','🟫','💀','🟫','💀','🟫','💀'] },
      { bg: '#0d47a1', tiles: ['🌊','💧','🌊','💧','🌊','💧','🌊','💧','🌊'] },
      { bg: '#0277bd', tiles: ['🌊','🐟','💧','🐠','🌊','🐡','💧','🐟','🌊'] },
    ],
  },
  {
    id: 'farmland', rows: 1, label: 'Farmland',
    levels: [
      { bg: '#2d1b00', tiles: ['🏜️','🟫','🏜️','🟫','🏜️','🟫','🏜️','🟫','🏜️'] },
      { bg: '#3d5a1a', tiles: ['🌾','🌱','🌾','🌱','🌾','🌱','🌾','🌱','🌾'] },
      { bg: '#4a7c2a', tiles: ['🌻','🥕','🌽','🍅','🌻','🥗','🌽','🌻','🥕'] },
    ],
  },
  {
    id: 'city', rows: 1, label: 'Settlement',
    levels: [
      { bg: '#1a1a1a', tiles: ['🏭','⬛','🏭','⬛','🏭','⬛','🏭','⬛','🏭'] },
      { bg: '#2d3748', tiles: ['🏠','🏡','🏠','🏡','🏠','🏡','🏠','🏡','🏠'] },
      { bg: '#2d4a1a', tiles: ['🏡','☀️','🏡','🌬️','🏡','☀️','🏡','🌬️','🏡'] },
    ],
  },
  {
    id: 'ocean', rows: 1, label: 'Ocean',
    levels: [
      { bg: '#0a0a1a', tiles: ['☠️','⬛','☠️','⬛','☠️','⬛','☠️','⬛','☠️'] },
      { bg: '#01579b', tiles: ['🌊','🌊','🌊','🌊','🌊','🌊','🌊','🌊','🌊'] },
      { bg: '#0288d1', tiles: ['🐳','🌊','🐬','🌊','🐋','🌊','🐬','🌊','🐳'] },
    ],
  },
];

// ── Planet stages ─────────────────────────────────────────────────────────────
const STAGES = [
  { name: 'Barren Rock',      emoji: '🪨', minScore: 0   },
  { name: 'Desert Awakening', emoji: '🌵', minScore: 10  },
  { name: 'First Life',       emoji: '🌱', minScore: 25  },
  { name: 'Blooming World',   emoji: '🌿', minScore: 40  },
  { name: 'Green Planet',     emoji: '🌳', minScore: 60  },
  { name: 'Living Paradise',  emoji: '🌴', minScore: 80  },
  { name: 'Eco Utopia',       emoji: '🌍', minScore: 95  },
];

const getStage = (score) => STAGES.slice().reverse().find(s => score >= s.minScore) ?? STAGES[0];
const clamp    = (v, min, max) => Math.max(min, Math.min(max, v));
const lvl      = (v) => v < 0.33 ? 0 : v < 0.66 ? 1 : 2;

// Derive per-zone health (0-1) from activity data
const computeHealth = (summary, offset, acts) => {
  const score    = clamp((summary?.stats?.ecoScore ?? 0) / 100, 0, 1);
  const streak   = summary?.stats?.currentStreak ?? 0;
  const monthly  = summary?.monthly?.total ?? 999;
  const totalOff = offset?.totalOffset ?? 0;

  const transportActs = acts.filter(a => a.category === 'transport' &&
    ['walking', 'cycling', 'bicycle', 'train', 'bus'].includes(a.subType)).length;
  const foodActs      = acts.filter(a => ['vegan', 'vegetarian', 'vegetables_meal'].includes(a.subType)).length;
  const energyActs    = acts.filter(a => ['solar_energy', 'car_electric'].includes(a.subType)).length;

  return {
    sky:      clamp(1 - monthly / 400, 0, 1),
    mountain: clamp(score, 0, 1),
    forest:   clamp(totalOff / 60, 0, 1),
    forest2:  clamp(streak / 20, 0, 1),
    river:    clamp((score + clamp(totalOff / 50, 0, 1)) / 2, 0, 1),
    farmland: clamp(foodActs / 20, 0, 1),
    city:     clamp(energyActs / 10, 0, 1),
    ocean:    clamp(score, 0, 1),
    overall:  score,
  };
};

// ── Single tile ───────────────────────────────────────────────────────────────
function Tile({ emoji, bg, size, anim }) {
  return (
    <Animated.View style={[{ width: size, height: size, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.3)' }, { opacity: anim }]}>
      <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.72 }}>{emoji}</Text>
    </Animated.View>
  );
}

// ── World grid ────────────────────────────────────────────────────────────────
function WorldGrid({ health }) {
  const fadeAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    fadeAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1, duration: 400, delay: i * 120, useNativeDriver: true,
      }).start();
    });
  }, []);

  const renderRow = (zone, rowIndex, levelDef, animIdx) => {
    const tiles = levelDef.tiles;
    return (
      <Animated.View
        key={`${zone.id}-${rowIndex}`}
        style={{ flexDirection: 'row', opacity: fadeAnims[animIdx] }}
      >
        {Array.from({ length: COLS }).map((_, col) => (
          <Tile
            key={col}
            emoji={tiles[col % tiles.length]}
            bg={levelDef.bg}
            size={TILE}
            anim={new Animated.Value(1)}
          />
        ))}
      </Animated.View>
    );
  };

  let animIdx = 0;
  const rows = [];

  ZONES.forEach(zone => {
    const zoneHealth = health[zone.id] ?? 0;
    const level      = lvl(zoneHealth);
    const levelDef   = zone.levels[level];

    rows.push(renderRow(zone, 0, levelDef, Math.min(animIdx, fadeAnims.length - 1)));
    animIdx++;

    if (zone.rows === 2 && zone.levels2) {
      const level2   = lvl(health.forest2 ?? 0);
      const levelDef2 = zone.levels2[level2];
      rows.push(renderRow(zone, 1, levelDef2, Math.min(animIdx, fadeAnims.length - 1)));
      animIdx++;
    }
  });

  return (
    <View style={{ marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(178,208,84,0.25)' }}>
      {rows}
    </View>
  );
}

// ── Zone health bar ───────────────────────────────────────────────────────────
function ZoneBar({ label, emoji, health, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: health, duration: 1200, useNativeDriver: false }).start();
  }, [health]);

  const pct = Math.round(health * 100);
  return (
    <View style={sb.row}>
      <Text style={sb.zoneEmoji}>{emoji}</Text>
      <View style={sb.info}>
        <View style={sb.labelRow}>
          <Text style={sb.zoneLabel}>{label}</Text>
          <Text style={[sb.zonePct, { color }]}>{pct}%</Text>
        </View>
        <View style={sb.track}>
          <Animated.View style={[sb.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  zoneEmoji: { fontSize: 22, width: 30 },
  info:      { flex: 1 },
  labelRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  zoneLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  zonePct:   { fontSize: 12, fontWeight: '800' },
  track:     { height: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  fill:      { height: 7, borderRadius: 4 },
});

// ── Chronicle event ───────────────────────────────────────────────────────────
function getEvents(health, streak) {
  const events = [];
  if (health.forest  > 0.6) events.push({ icon: '🌲', text: 'Ancient forest is growing! Carbon is being stored.' });
  if (health.ocean   > 0.5) events.push({ icon: '🐳', text: 'Whales have returned to your ocean!' });
  if (health.farmland> 0.4) events.push({ icon: '🌻', text: 'Sunflowers bloomed on your farmland.' });
  if (health.city    > 0.5) events.push({ icon: '☀️', text: 'Solar panels installed in your settlement!' });
  if (health.river   > 0.5) events.push({ icon: '🐠', text: 'Fish have returned to your river.' });
  if (streak >= 7)           events.push({ icon: '🦌', text: `${streak}-day streak! Deer roam your forest.` });
  if (health.sky     > 0.6) events.push({ icon: '🌈', text: 'The atmosphere is clearing up!' });
  if (health.overall > 0.8) events.push({ icon: '🌍', text: 'Your planet is thriving — keep it up!' });
  if (events.length === 0)   events.push({ icon: '🪨', text: 'Your world is barren. Start logging eco activities!' });
  return events.slice(0, 5);
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EcoGardenScreen({ navigation }) {
  const { user }                = useAuth();
  const [summary, setSummary]   = useState(null);
  const [offset, setOffset]     = useState(null);
  const [acts, setActs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState('world'); // 'world' | 'stats' | 'log'

  const headerScale = useRef(new Animated.Value(0.9)).current;
  const headerFade  = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, offRes, actsRes] = await Promise.all([
        getActivitySummary(),
        getOffsetBalance(),
        getActivities({ limit: 100 }),
      ]);
      setSummary(sumRes.data);
      setOffset(offRes.data);
      setActs(actsRes.data?.activities ?? actsRes.data?.data ?? []);

      Animated.parallel([
        Animated.spring(headerScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  const health = summary ? computeHealth(summary, offset, acts) : null;
  const stage  = getStage((summary?.stats?.ecoScore ?? 0));
  const streak = summary?.stats?.currentStreak ?? 0;
  const events = health ? getEvents(health, streak) : [];

  if (loading || !health) {
    return (
      <LinearGradient colors={['#020a04', '#060f08']} style={S.loader}>
        <Animated.Text style={[S.loaderEmoji, { transform: [{ scale: headerScale }] }]}>🌍</Animated.Text>
        <Text style={S.loaderTxt}>Loading your world...</Text>
        <Text style={S.loaderSub}>Calculating eco impact</Text>
      </LinearGradient>
    );
  }

  const healthPct = Math.round(health.overall * 100);

  return (
    <ScreenTransition>
      <LinearGradient colors={['#020a04', '#060f08', '#081209']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#B2D054" colors={['#B2D054']} />
          }
        >
          {/* ── Planet header ────────────────────── */}
          <Animated.View style={[S.header, { opacity: headerFade, transform: [{ scale: headerScale }] }]}>
            <View style={S.planetRow}>
              <View style={S.planetEmoji}>
                <Text style={{ fontSize: 56 }}>{stage.emoji}</Text>
              </View>
              <View style={S.planetInfo}>
                <Text style={S.planetStage}>{stage.name}</Text>
                <Text style={S.planetName}>{user?.name?.split(' ')[0] ?? 'Eco'}'s Planet</Text>

                {/* Health bar */}
                <View style={S.healthRow}>
                  <Text style={S.healthLbl}>World Health</Text>
                  <Text style={[S.healthPct, { color: healthPct > 60 ? '#B2D054' : healthPct > 30 ? '#F59E0B' : '#EF4444' }]}>
                    {healthPct}%
                  </Text>
                </View>
                <View style={S.healthTrack}>
                  <View style={[S.healthFill, {
                    width: `${healthPct}%`,
                    backgroundColor: healthPct > 60 ? '#B2D054' : healthPct > 30 ? '#F59E0B' : '#EF4444',
                  }]} />
                </View>

                <View style={S.badgeRow}>
                  {streak > 0 && (
                    <View style={S.badge}>
                      <Text style={S.badgeTxt}>🔥 {streak} day streak</Text>
                    </View>
                  )}
                  <View style={S.badge}>
                    <Text style={S.badgeTxt}>⭐ Score {summary?.stats?.ecoScore ?? 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Tabs ─────────────────────────────── */}
          <View style={S.tabRow}>
            {[
              { key: 'world', label: '🗺️ World'  },
              { key: 'stats', label: '📊 Stats'  },
              { key: 'log',   label: '📜 Chronicle' },
            ].map(t => (
              <TouchableOpacity key={t.key} style={[S.tabBtn, tab === t.key && S.tabActive]}
                onPress={() => setTab(t.key)} activeOpacity={0.8}>
                <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── World view ───────────────────────── */}
          {tab === 'world' && (
            <View>
              <WorldGrid health={health} />

              {/* Legend */}
              <View style={S.legend}>
                {[
                  { emoji: '⬛', label: 'Dead zone'  },
                  { emoji: '🌱', label: 'Recovering'  },
                  { emoji: '🌲', label: 'Thriving'    },
                ].map(l => (
                  <View key={l.label} style={S.legendItem}>
                    <Text style={{ fontSize: 14 }}>{l.emoji}</Text>
                    <Text style={S.legendTxt}>{l.label}</Text>
                  </View>
                ))}
              </View>

              <View style={S.hintCard}>
                <Text style={S.hintTitle}>How to grow your world 🌱</Text>
                <Text style={S.hintTxt}>🌲 Log carbon offsets → grow your forest</Text>
                <Text style={S.hintTxt}>🌾 Log plant-based meals → bloom farmland</Text>
                <Text style={S.hintTxt}>☀️ Log solar / EV use → power your city</Text>
                <Text style={S.hintTxt}>🌊 Keep emissions low → clear the ocean</Text>
                <Text style={S.hintTxt}>🔥 Keep your streak → animals return</Text>
              </View>

              <View style={S.ctaRow}>
                <TouchableOpacity style={S.ctaBtn} onPress={() => navigation.jumpTo('LogActivity')} activeOpacity={0.85}>
                  <LinearGradient colors={['#B2D054','#8FA832']} style={S.ctaGrad}>
                    <Text style={S.ctaTxt}>➕ Log Activity</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={S.ctaBtn} onPress={() => navigation.jumpTo('CarbonOffset')} activeOpacity={0.85}>
                  <LinearGradient colors={['#52C77A','#2D7A4F']} style={S.ctaGrad}>
                    <Text style={S.ctaTxt}>🌳 Offset Carbon</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Stats view ───────────────────────── */}
          {tab === 'stats' && (
            <View style={S.statsPanel}>
              <Text style={S.statsTitle}>Biome Health</Text>
              <ZoneBar label="Atmosphere"  emoji="🌤️" health={health.sky}      color="#60A5FA" />
              <ZoneBar label="Forest"      emoji="🌲" health={health.forest}   color="#34D399" />
              <ZoneBar label="Farmland"    emoji="🌾" health={health.farmland} color="#FBBF24" />
              <ZoneBar label="Waterways"   emoji="🌊" health={health.river}    color="#38BDF8" />
              <ZoneBar label="Settlement"  emoji="🏡" health={health.city}     color="#A78BFA" />
              <ZoneBar label="Ocean"       emoji="🐳" health={health.ocean}    color="#0EA5E9" />

              <View style={S.divider} />

              <Text style={S.statsTitle}>World Records</Text>
              {[
                { label: 'Total Activities',    val: summary?.stats?.totalActivities ?? 0,   emoji: '📝' },
                { label: 'Carbon Offset (kg)',  val: (offset?.totalOffset ?? 0).toFixed(1),   emoji: '🌳' },
                { label: 'Best Streak',         val: `${summary?.stats?.bestStreak ?? 0} days`, emoji: '🔥' },
                { label: 'Eco Score',           val: summary?.stats?.ecoScore ?? 0,            emoji: '⭐' },
                { label: 'Monthly CO₂ (kg)',    val: (summary?.monthly?.total ?? 0).toFixed(1), emoji: '📊' },
              ].map(r => (
                <View key={r.label} style={S.recordRow}>
                  <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                  <Text style={S.recordLabel}>{r.label}</Text>
                  <Text style={S.recordVal}>{r.val}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Chronicle ────────────────────────── */}
          {tab === 'log' && (
            <View style={S.chronicle}>
              <Text style={S.statsTitle}>World Chronicle</Text>
              <Text style={S.statsSub}>Events happening in your world right now</Text>
              {events.map((e, i) => (
                <LinearGradient key={i} colors={['#0d2010','#112614']} style={S.eventCard}>
                  <Text style={S.eventIcon}>{e.icon}</Text>
                  <Text style={S.eventTxt}>{e.text}</Text>
                </LinearGradient>
              ))}

              {/* Next unlocks */}
              <Text style={[S.statsTitle, { marginTop: 20 }]}>Next Unlocks</Text>
              {[
                { emoji: '🐋', label: 'Whales', cond: 'Offset 30 kg CO₂',         done: (offset?.totalOffset ?? 0) >= 30 },
                { emoji: '🌈', label: 'Rainbow', cond: '7-day streak',             done: streak >= 7 },
                { emoji: '☀️', label: 'Solar City', cond: 'Log 5 solar activities', done: (acts.filter(a => a.subType === 'solar_energy').length) >= 5 },
                { emoji: '🐘', label: 'Elephants', cond: '30-day streak',          done: streak >= 30 },
                { emoji: '🌍', label: 'Utopia', cond: 'Eco Score 95+',             done: (summary?.stats?.ecoScore ?? 0) >= 95 },
              ].map(u => (
                <View key={u.label} style={[S.unlockRow, u.done && S.unlockDone]}>
                  <Text style={{ fontSize: 24, opacity: u.done ? 1 : 0.3 }}>{u.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.unlockLabel, u.done && { color: '#B2D054' }]}>{u.label}</Text>
                    <Text style={S.unlockCond}>{u.done ? '✓ Unlocked!' : u.cond}</Text>
                  </View>
                  {u.done && <Text style={{ color: '#B2D054', fontSize: 18 }}>✓</Text>}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      </LinearGradient>
    </ScreenTransition>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  loader:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderEmoji: { fontSize: 72 },
  loaderTxt:   { fontSize: 18, color: '#EFF4EE', fontWeight: '800' },
  loaderSub:   { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  header:      { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 12 },
  planetRow:   { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  planetEmoji: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(178,208,84,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(178,208,84,0.25)' },
  planetInfo:  { flex: 1 },
  planetStage: { fontSize: 11, color: '#B2D054', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  planetName:  { fontSize: 22, fontWeight: '900', color: '#EFF4EE', marginBottom: 8 },
  healthRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  healthLbl:   { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  healthPct:   { fontSize: 11, fontWeight: '800' },
  healthTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  healthFill:  { height: 8, borderRadius: 4 },
  badgeRow:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge:       { backgroundColor: 'rgba(178,208,84,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(178,208,84,0.2)' },
  badgeTxt:    { fontSize: 10, color: '#B2D054', fontWeight: '700' },

  tabRow:      { flexDirection: 'row', marginHorizontal: 12, marginVertical: 10, gap: 6 },
  tabBtn:      { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabActive:   { backgroundColor: 'rgba(178,208,84,0.12)', borderColor: 'rgba(178,208,84,0.3)' },
  tabTxt:      { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },
  tabTxtActive:{ color: '#B2D054' },

  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 10 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendTxt:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  hintCard:    { marginHorizontal: 12, marginTop: 8, backgroundColor: 'rgba(178,208,84,0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)', gap: 5 },
  hintTitle:   { fontSize: 13, fontWeight: '800', color: '#B2D054', marginBottom: 4 },
  hintTxt:     { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  ctaRow:      { flexDirection: 'row', gap: 10, marginHorizontal: 12, marginTop: 12 },
  ctaBtn:      { flex: 1, borderRadius: 12, overflow: 'hidden' },
  ctaGrad:     { paddingVertical: 13, alignItems: 'center' },
  ctaTxt:      { fontSize: 13, fontWeight: '800', color: '#071209' },

  statsPanel:  { paddingHorizontal: 16, paddingTop: 4 },
  statsTitle:  { fontSize: 16, fontWeight: '900', color: '#EFF4EE', marginBottom: 4 },
  statsSub:    { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 },
  divider:     { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 16 },
  recordRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  recordLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  recordVal:   { fontSize: 16, fontWeight: '900', color: '#EFF4EE' },

  chronicle:   { paddingHorizontal: 16, paddingTop: 4 },
  eventCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(178,208,84,0.1)' },
  eventIcon:   { fontSize: 26 },
  eventTxt:    { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', lineHeight: 18 },
  unlockRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  unlockDone:  { opacity: 1 },
  unlockLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  unlockCond:  { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
});
