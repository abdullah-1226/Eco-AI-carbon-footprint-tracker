import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Dimensions,
  Platform, ImageBackground, Animated, Easing, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, G } from 'react-native-svg';
import { getActivitySummary, getActivities, getUnreadCount } from '../../api/api';
import { useAppTheme, buildC } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { avatarKey } from '../profile/ProfileScreen';
import ScreenTransition from '../../components/ScreenTransition';
import AnimatedNumber from '../../components/AnimatedNumber';
import { SkeletonDashboard } from '../../components/SkeletonLoader';
import LottieEmptyState from '../../components/LottieEmptyState';
import EcoRefreshControl, { RefreshOverlay } from '../../components/EcoRefreshControl';

// ── Donut colors ──────────────────────────────────────────────────────────────
const DONUT_COLORS = {
  transport: '#5AC8FA',
  food:      '#B2D054',
  energy:    '#F59E0B',
  shopping:  '#A855F7',
};

// ── Animated donut chart — segments draw clockwise progressively ───────────────
function DonutChart({ data, total, size = 120, stroke = 16 }) {
  const R      = (size - stroke - 4) / 2;
  const CIRC   = 2 * Math.PI * R;
  const CENTER = size / 2;
  const [prog, setProg] = useState(0);
  const anim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = anim.addListener(({ value }) => setProg(value));
    Animated.timing(anim, {
      toValue: 1, duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, []);

  let cumPct = 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={CENTER} cy={CENTER} r={R}
              fill="none" stroke="#E8EDE5" strokeWidth={stroke} />
      <G rotation="-90" origin={`${CENTER},${CENTER}`}>
        {data.map((seg, i) => {
          const finalPct = total > 0 ? seg.value / total : 0;
          const startPct = cumPct;
          const endPct   = cumPct + finalPct;
          let visPct = 0;
          if      (prog >= endPct)   visPct = finalPct;
          else if (prog >  startPct) visPct = prog - startPct;
          cumPct += finalPct;
          if (visPct <= 0.001) return null;
          const segLen = Math.max(CIRC * visPct - 2, 0);
          return (
            <Circle key={i}
              cx={CENTER} cy={CENTER} r={R}
              fill="none" stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${segLen} ${CIRC}`}
              strokeDashoffset={-(startPct * CIRC)}
              strokeLinecap="round"
            />
          );
        })}
      </G>
    </Svg>
  );
}

const W = Dimensions.get('window').width;

// ── Stunning aerial forest canopy — 8K quality, ultra-sharp green canopy ──────
const FOREST_IMG = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=100&fit=crop&crop=center&auto=format';

// ── Design tokens — Dark Glass Theme ──────────────────────────────────────────
// C is rebuilt dynamically inside the component via buildC(appTheme)

// Fallback only — actual limit comes from user.dailyThreshold at runtime
const DEFAULT_LIMIT = 6.8;

const CATS = {
  transport: { icon: '🚗', label: 'Transport', bg: 'rgba(90,200,250,0.09)',  accent: '#5AC8FA' },
  food:      { icon: '🍽️', label: 'Diet',      bg: 'rgba(178,208,84,0.09)', accent: '#B2D054' },
  energy:    { icon: '⚡',  label: 'Energy',    bg: 'rgba(245,158,11,0.09)', accent: '#F59E0B' },
  shopping:  { icon: '🛍️', label: 'Shopping',  bg: 'rgba(244,63,94,0.09)',  accent: '#F43F5E' },
};

const TIPS = [
  {
    tag: 'Transport', color: '#5AC8FA',
    text: 'Try cycling for trips under 3 km — this could save 0.8 kg CO₂ daily.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85&fit=crop',
  },
  {
    tag: 'Diet', color: '#B2D054',
    text: 'Swapping one beef meal per week for legumes cuts food emissions by ~0.5 kg CO₂.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&q=85&fit=crop',
  },
  {
    tag: 'Energy', color: '#F59E0B',
    text: 'Setting AC to 25°C instead of 22°C saves up to 0.3 kg CO₂ per day.',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=900&q=85&fit=crop',
  },
  {
    tag: 'Shopping', color: '#A855F7',
    text: 'Buying second-hand instead of new can cut shopping footprint by 60%.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85&fit=crop',
  },
  {
    tag: 'Personalized', color: '#F43F5E',
    text: 'Carpooling 3×/week could reduce transport emissions by 40%.',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=900&q=85&fit=crop',
  },
];

const QUICK_SPOTS = [
  { label: 'Parks 🌳',     q: 'park'        },
  { label: 'Recycling ♻️', q: 'recycling'   },
  { label: 'Nursery 🌱',   q: 'nursery'     },
  { label: 'Organic 🥦',   q: 'organic'     },
  { label: 'EV Charge ⚡', q: 'ev_charging' },
];

function initials(name = '') {
  return name.trim().split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}
function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function pctChange(today, yesterday) {
  if (!yesterday || yesterday === 0) return null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

function formatActivityDate(rawDate) {
  if (!rawDate) return '';
  const d        = new Date(rawDate);
  const now      = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const dUTC     = d.toISOString().slice(0, 10);
  const time     = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const diffDays = Math.round(
    (new Date(todayUTC) - new Date(dUTC)) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { theme: appTheme } = useAppTheme();
  // Use the user's own daily threshold — falls back to IPCC 6.8 if not set
  const DAILY_LIMIT = user?.dailyThreshold ?? DEFAULT_LIMIT;
  // Rebuild colour tokens + styles whenever the theme changes
  const C = useMemo(() => buildC(appTheme), [appTheme]);
  const s = useMemo(() => makeStyles(C), [C]);
  const [summary, setSummary]       = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [spotSearch, setSpotSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const tipIndex    = useRef(Math.floor(Math.random() * TIPS.length));
  const [avatarUri, setAvatarUri] = useState(null);
  const barAnimRef  = useRef(new Animated.Value(0));
  const [barProg, setBarProg] = useState(0);

  // Restart bar animation whenever data refreshes
  const startBarAnim = () => {
    barAnimRef.current.setValue(0);
    setBarProg(0);
    const id = barAnimRef.current.addListener(({ value }) => setBarProg(value));
    Animated.timing(barAnimRef.current, {
      toValue: 1, duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => barAnimRef.current.removeListener(id));
  };

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, actRes, unreadRes] = await Promise.all([
        getActivitySummary(),
        getActivities({ limit: 30 }),
        getUnreadCount().catch(() => ({ data: { count: 0 } })),
      ]);
      setSummary(sumRes.data);
      setActivities(actRes.data?.activities ?? actRes.data?.data ?? []);
      setUnreadCount(unreadRes.data?.count ?? 0);
      startBarAnim();
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // One-time alert when emissions exceed daily limit
  const limitAlertedRef = useRef(false);
  useEffect(() => {
    if (!summary || limitAlertedRef.current) return;
    const todayCO2val = parseFloat((summary.today?.co2e ?? 0).toFixed(1));
    const limit       = user?.dailyThreshold ?? DEFAULT_LIMIT;
    if (todayCO2val > limit) {
      limitAlertedRef.current = true;
      const excess = (todayCO2val - limit).toFixed(1);
      Alert.alert(
        '⚠️ Emission Limit Exceeded',
        `You've emitted ${todayCO2val} kg CO₂ today — ${excess} kg over your ${limit} kg limit.\n\nOffset your carbon footprint now?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: '🌍 Carbon Offset',
            onPress: () => navigation.jumpTo('CarbonOffset', {
              excessKg:  parseFloat(excess),
              todayKg:   todayCO2val,
              threshold: limit,
            }),
          },
        ]
      );
    }
  }, [summary]);

  const loadPhotos = async () => {
    if (!user?._id) return;
    const a = await AsyncStorage.getItem(avatarKey(user._id));
    setAvatarUri(a || null);
  };
  useEffect(() => { loadPhotos(); }, [user?._id]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchData(); if (user?._id) loadPhotos(); });
    return unsub;
  }, [navigation, fetchData]);

  const goToSpots = (q = '') => {
    navigation.jumpTo('EcoSpots', { initialQuery: q });
    setSpotSearch('');
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  // ── Data extraction ────────────────────────────────────────────────────────
  const today     = summary?.today     ?? { co2e: 0, count: 0 };
  const monthly   = summary?.monthly   ?? { breakdown: [], total: 0 };
  const yesterday = summary?.yesterday ?? {};
  const stats     = summary?.stats     ?? {};
  const todayCO2  = parseFloat((today.co2e ?? 0).toFixed(1));
  const limitPct  = Math.min((todayCO2 / DAILY_LIMIT) * 100, 100).toFixed(0);
  const tip       = TIPS[tipIndex.current % TIPS.length];
  const firstName = user?.name?.split(' ')[0] ?? 'Friend';
  const underLimit = todayCO2 <= DAILY_LIMIT;
  const diffKg    = Math.abs(DAILY_LIMIT - todayCO2).toFixed(1);

  const getCatKg = (cat) => {
    const found = monthly.breakdown?.find(b => b._id === cat);
    return parseFloat((found?.total ?? 0).toFixed(1));
  };

  const statCards = ['transport', 'food', 'energy', 'shopping'].map(cat => {
    const kg     = getCatKg(cat);
    const yestKg = parseFloat((yesterday[cat] ?? 0).toFixed(1));
    return { cat, kg, pct: pctChange(kg, yestKg) };
  });

  return (
    <ScreenTransition>
    <LinearGradient colors={appTheme.bgGrad} style={{ flex: 1 }}>
    <RefreshOverlay refreshing={refreshing} />
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <EcoRefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
        />
      }
    >
      {/* ══════════════════════════════════════════════════════════════════
          HERO  —  aerial forest photo + circular glass CO₂ widget
      ══════════════════════════════════════════════════════════════════ */}
      <ImageBackground source={{ uri: FOREST_IMG }} style={s.hero} resizeMode="cover">
        {/* Layered gradients for depth */}
        <LinearGradient
          colors={['rgba(0,0,0,0.0)', 'rgba(0,20,0,0.25)']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(10,40,10,0.45)', 'transparent', 'rgba(5,25,5,0.70)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top bar — notification + settings on right */}
        <View style={s.heroTop}>
          {/* Notification bell with badge */}
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('Alerts')}
            activeOpacity={0.8}
          >
            <Text style={s.notifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeTxt}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Text style={s.notifIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Outer glow ring + circular glass CO₂ widget */}
        <View style={s.circleGlow}>
          <View style={s.circleRing}>
            <View style={s.circleWrap}>
              <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={s.circleContent}>
                <Text style={s.circleLabel}>MY CO₂ TODAY</Text>
                <AnimatedNumber value={todayCO2} style={s.circleVal} decimals={1} duration={1400} />
                <Text style={s.circleUnit}>kg CO₂e</Text>
                <View style={s.circleBar}>
                  <View style={[s.circleBarFill, { width: `${limitPct}%` }]} />
                </View>
                <Text style={s.circlePct}>{limitPct}% of limit</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom info strip */}
        <View style={s.heroStrip}>
          <View style={s.heroStripDot} />
          <Text style={s.heroStripTxt}>
            {underLimit ? `✅  ${diffKg} kg under daily limit` : `⚠️  ${diffKg} kg over daily limit`}
          </Text>
        </View>
      </ImageBackground>

      {/* ══════════════════════════════════════════════════════════════════
          GREETING  —  "Hi, Name!" + goal badge + progress bar
      ══════════════════════════════════════════════════════════════════ */}
      <View style={s.greetCard}>
        <View style={s.greetRow}>
          {/* Avatar — shows real profile photo if set */}
          <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImg} resizeMode="cover" />
            ) : (
              <Text style={s.avatarTxt}>{initials(user?.name)}</Text>
            )}
          </TouchableOpacity>

          {/* Text */}
          <View style={s.greetText}>
            <Text style={s.hiTxt}>Hi, {firstName}! 👋</Text>
            <Text style={s.hiSub}>
              {timeGreeting()} —{' '}
              {underLimit
                ? `${diffKg} kg below your daily limit`
                : `${diffKg} kg above your daily limit`}
            </Text>
          </View>

          {/* Goal badge */}
          <TouchableOpacity style={s.goalBadge} onPress={() => navigation.navigate('Reports')}>
            <Text style={s.goalBadgeIcon}>🎯</Text>
            <Text style={s.goalBadgeTxt}>Goal</Text>
            <Text style={s.goalBadgeVal}>{DAILY_LIMIT} CO₂</Text>
          </TouchableOpacity>
        </View>

        {/* Bio + meta pills */}
        {(user?.bio || user?.age || user?.gender) && (
          <View style={s.greetMeta}>
            {user?.bio ? (
              <Text style={s.greetBio} numberOfLines={2}>{user.bio}</Text>
            ) : null}
            <View style={s.greetPills}>
              {user?.age    && <View style={s.greetPill}><Text style={s.greetPillTxt}>🎂 {user.age} yrs</Text></View>}
              {user?.gender && <View style={s.greetPill}><Text style={s.greetPillTxt}>
                {user.gender === 'male' ? '👨 Male' : user.gender === 'female' ? '👩 Female' : user.gender === 'non-binary' ? '🧑 Non-binary' : '🤐 Private'}
              </Text></View>}
            </View>
          </View>
        )}

        {/* Progress bar */}
        <View style={s.progressBg}>
          <LinearGradient
            colors={underLimit ? ['#B2D054', '#8FA832'] : ['#EF5350', '#BF360C']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.progressFill, { width: `${limitPct}%` }]}
          />
        </View>
        <View style={s.progressMeta}>
          <Text style={s.progressMetaTxt}>0 kg</Text>
          <Text style={[s.progressMetaTxt, { color: underLimit ? C.green600 : C.coral600, fontWeight: '700' }]}>
            {limitPct}% of daily limit
          </Text>
          <Text style={s.progressMetaTxt}>{DAILY_LIMIT} kg</Text>
        </View>

      </View>

      {/* ══════════════════════════════════════════════════════════════════
          STATS PILLS  —  streak · points · badges · level
      ══════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <View style={s.pillRow}>
          {[
            { emoji: '🔥', val: stats.currentStreak ?? 0,  lbl: 'Streak', bg: C.amber50, border: C.amber100, color: C.amber600, isNum: true  },
            { emoji: '⭐', val: stats.totalPoints   ?? 0,  lbl: 'Points', bg: C.teal50,  border: C.teal100,  color: C.teal600,  isNum: true  },
            { emoji: '🏅', val: (stats.badges??[]).length, lbl: 'Badges', bg: C.coral50, border: C.coral100, color: C.coral600, isNum: true  },
            { emoji: '🌿', val: `Lv.${stats.level ?? 1}`,  lbl: 'Level',  bg: C.green50, border: C.green100, color: C.green600, isNum: false },
          ].map((p, i) => (
            <View key={i} style={[s.pill, { backgroundColor: p.bg, borderColor: p.border }]}>
              <Text style={s.pillEmoji}>{p.emoji}</Text>
              {p.isNum
                ? <AnimatedNumber value={p.val} style={[s.pillVal, { color: p.color }]} decimals={0} duration={1000} />
                : <Text style={[s.pillVal, { color: p.color }]}>{p.val}</Text>
              }
              <Text style={[s.pillLbl, { color: p.color }]}>{p.lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          WEEKLY CHART  —  Carbon Footprint (kg) bar chart
      ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const weekly        = summary?.weekly ?? [];
        const maxCO2        = Math.max(...weekly.map(d => d.co2e), 0.1);
        const todayStr      = new Date().toISOString().slice(0, 10);
        const mTotal        = parseFloat((monthly.total ?? 0).toFixed(1));
        const donutData     = ['transport','food','energy','shopping']
          .map(cat => {
            const found = monthly.breakdown?.find(b => b._id === cat);
            return { cat, value: found?.total ?? 0 };
          })
          .filter(d => d.value > 0)
          .map(d => ({ ...d, color: DONUT_COLORS[d.cat] ?? '#B2D054',
                       label: CATS[d.cat]?.label ?? d.cat,
                       pct: mTotal > 0 ? ((d.value / mTotal) * 100).toFixed(0) : 0 }));

        return (
          <View style={s.section}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>Carbon Footprint (kg)</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                <Text style={s.linkTxt}>Full report →</Text>
              </TouchableOpacity>
            </View>

            <View style={s.dualCard}>
              {/* ── LEFT half: animated bar chart ── */}
              <View style={s.dualHalf}>
                <Text style={s.dualLabel}>Weekly · kg CO₂</Text>

                {weekly.length === 0 ? (
                  <Text style={s.chartEmpty}>No data yet</Text>
                ) : (
                  <View style={s.barArea}>
                    {weekly.map((day, i) => {
                      const isToday  = day.date === todayStr;
                      const hPct     = maxCO2 > 0 ? day.co2e / maxCO2 : 0;
                      const finalH   = Math.max(hPct * 88, day.co2e > 0 ? 3 : 0);
                      const animH    = finalH * barProg;
                      const over     = day.co2e > DAILY_LIMIT;
                      const barColor = over ? C.coral600 : isToday ? C.green600 : C.teal600;
                      return (
                        <View key={i} style={s.barCol}>
                          {isToday && (
                            <Text style={s.barTopVal}>{parseFloat(day.co2e.toFixed(1))}</Text>
                          )}
                          <View style={s.barTrack}>
                            <View style={[s.barFill, {
                              height: animH,
                              backgroundColor: barColor,
                              opacity: isToday ? 1 : 0.70,
                            }]} />
                          </View>
                          <Text style={[s.barLbl, isToday && { color: C.green600, fontWeight: '800' }]}>
                            {isToday ? '●' : day.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={s.miniLegend}>
                  {[{ c: C.green600, l: 'Today' }, { c: C.teal600, l: 'OK' }, { c: C.coral600, l: 'Over' }]
                    .map((l, i) => (
                      <View key={i} style={s.miniLegendItem}>
                        <View style={[s.miniLegendDot, { backgroundColor: l.c }]} />
                        <Text style={s.miniLegendTxt}>{l.l}</Text>
                      </View>
                    ))}
                </View>
              </View>

              {/* Divider */}
              <View style={s.vDivider} />

              {/* ── RIGHT half: animated donut chart ── */}
              <View style={s.dualHalf}>
                <Text style={s.dualLabel}>Monthly Split</Text>

                <View style={s.donutWrap}>
                  {donutData.length > 0 ? (
                    <DonutChart data={donutData} total={mTotal} size={120} stroke={16} />
                  ) : (
                    <View style={s.donutEmpty}>
                      <Text style={s.donutEmptyTxt}>No data</Text>
                    </View>
                  )}
                  {donutData.length > 0 && (
                    <View style={s.donutCenter} pointerEvents="none">
                      <Text style={s.donutCenterVal}>{mTotal.toFixed(0)}</Text>
                      <Text style={s.donutCenterUnit}>kg</Text>
                    </View>
                  )}
                </View>

                <View style={s.donutLegend}>
                  {donutData.map((d, i) => (
                    <View key={i} style={s.donutLegendItem}>
                      <View style={[s.donutLegendDot, { backgroundColor: d.color }]} />
                      <Text style={s.donutLegendTxt}>{d.label}</Text>
                      <Text style={[s.donutLegendPct, { color: d.color }]}>{d.pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })()}


      {/* ══════════════════════════════════════════════════════════════════
          FIND ECO SPOTS  —  search bar + quick chips
      ══════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>🗺️ Find Nearby Eco Spots</Text>
          <TouchableOpacity onPress={() => goToSpots('')}>
            <Text style={s.linkTxt}>See all →</Text>
          </TouchableOpacity>
        </View>
        <View style={s.searchCard}>
          <View style={s.searchRow}>
            <View style={s.searchBox}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search parks, recycling, EV…"
                placeholderTextColor={C.textMuted}
                value={spotSearch}
                onChangeText={setSpotSearch}
                returnKeyType="search"
                onSubmitEditing={() => goToSpots(spotSearch)}
              />
              {spotSearch.length > 0 && (
                <TouchableOpacity onPress={() => setSpotSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.clearX}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.goBtn} onPress={() => goToSpots(spotSearch)} activeOpacity={0.85}>
              <Text style={s.goBtnTxt}>Go</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {QUICK_SPOTS.map(c => (
              <TouchableOpacity key={c.q} style={s.chip} onPress={() => goToSpots(c.q)}>
                <Text style={s.chipTxt}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          MONTHLY BREAKDOWN  —  2×2 category grid
      ══════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Monthly Breakdown</Text>
        <View style={s.statGrid}>
          {[statCards.slice(0, 2), statCards.slice(2, 4)].map((row, ri) => (
            <View key={ri} style={s.statRow}>
              {row.map(({ cat, kg, pct }) => {
                const m  = CATS[cat];
                const up = pct !== null && pct > 0;
                const dn = pct !== null && pct < 0;
                return (
                  <View key={cat} style={[s.statCard, { backgroundColor: m.bg, borderColor: C.border }]}>
                    <View style={[s.statIconBox, { backgroundColor: m.accent + '22' }]}>
                      <Text style={s.statIcon}>{m.icon}</Text>
                    </View>
                    <View style={s.statBody}>
                      <Text style={[s.statVal, { color: m.accent }]}>
                        {kg}<Text style={s.statUnit}> kg</Text>
                      </Text>
                      <Text style={s.statLbl}>{m.label}</Text>
                      {pct !== null && (
                        <Text style={[s.statDelta, { color: up ? C.coral600 : C.teal600 }]}>
                          {up ? '▲' : dn ? '▼' : '—'} {Math.abs(pct)}%
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          TREE OFFSET CARD
      ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const mTotal = parseFloat((monthly.total ?? 0).toFixed(1));
        const trees  = mTotal > 0 ? Math.ceil(mTotal / 20) : 0; // 1 tree ≈ 20 kg CO₂/yr
        return (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🌳 Monthly Offset</Text>
            <View style={s.offsetCard}>
              {/* Left info */}
              <View style={s.offsetLeft}>
                <Text style={s.offsetTitle}>Your Carbon Footprint{'\n'}for the month is</Text>
                <View style={s.offsetCo2Ring}>
                  <Text style={s.offsetCo2Val}>{mTotal}</Text>
                  <Text style={s.offsetCo2Unit}>kgCO₂e</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={s.offsetDivider} />

              {/* Right — trees */}
              <View style={s.offsetRight}>
                <View style={s.offsetTreeRing}>
                  <Text style={s.offsetTreeVal}>{trees}</Text>
                </View>
                <Text style={s.offsetTreeLabel}>
                  trees required to{'\n'}offset your emissions
                </Text>
                <Text style={s.offsetNote}>≈ 20 kg CO₂/tree/yr</Text>
              </View>
            </View>

            {/* Carbon Offset CTA — right below Monthly Offset widget */}
            <TouchableOpacity
              style={s.rejuvBtn}
              onPress={() => navigation.jumpTo('CarbonOffset', {
                excessKg:  !underLimit ? parseFloat(diffKg) : 0,
                todayKg:   todayCO2,
                threshold: DAILY_LIMIT,
              })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={!underLimit ? ['#52C77A', '#2D7A4F'] : ['#B2D054', '#8FA832']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.rejuvBtnGrad}
              >
                <Text style={s.rejuvBtnIcon}>{!underLimit ? '🌱' : '🌍'}</Text>
                <View>
                  <Text style={s.rejuvBtnTitle}>Carbon Offset</Text>
                  <Text style={s.rejuvBtnSub}>
                    {!underLimit
                      ? `Offset ${diffKg} kg excess CO₂ now`
                      : 'Offset your carbon footprint'}
                  </Text>
                </View>
                <Text style={s.rejuvBtnArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      })()}


      {/* ══════════════════════════════════════════════════════════════════
          TIP OF THE DAY
      ══════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Tip of the Day 💡</Text>
        <ImageBackground
          source={{ uri: tip.image }}
          style={s.tipCard}
          imageStyle={s.tipCardImg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(6,12,24,0.10)', 'rgba(6,12,24,0.55)', 'rgba(6,12,24,0.93)']}
            style={StyleSheet.absoluteFill}
          />
          {/* Category tag — top left */}
          <View style={[s.tipTag, { backgroundColor: tip.color + 'DD' }]}>
            <Text style={s.tipTagTxt}>{tip.tag}</Text>
          </View>
          {/* Text — bottom */}
          <View style={s.tipBottom}>
            <Text style={s.tipTxt}>{tip.text}</Text>
          </View>
        </ImageBackground>
      </View>

      {/* ── Log Activity button ──────────────────────────────────────────── */}
      <View style={{ marginHorizontal: 16, marginTop: 18 }}>
        <TouchableOpacity
          style={s.logBtn}
          onPress={() => navigation.navigate('LogActivity')}
          activeOpacity={0.85}
        >
          <Text style={s.logBtnTxt}>➕  Log New Activity</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          MY ACTIVITIES
      ══════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>My Activities</Text>
          <Text style={s.countBadge}>{activities.length} logged</Text>
        </View>

        {activities.length === 0 ? (
          <LottieEmptyState
            type="plant"
            message="No activities logged yet"
            subMessage="Tap Log Activity to start tracking your carbon footprint"
          />
        ) : (
          activities.map((act, i) => {
            const cat      = act.category ?? 'transport';
            const meta     = CATS[cat] ?? CATS.transport;
            const kg       = parseFloat((act.co2e ?? act.carbonFootprint ?? 0).toFixed(1));
            const dateLabel = formatActivityDate(act.date ?? act.createdAt);
            const isToday  = (act.date ?? act.createdAt)
              ? new Date(act.date ?? act.createdAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
              : false;
            return (
              <View key={act._id ?? i} style={s.actItem}>
                <View style={[s.actIconBox, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                </View>
                <View style={s.actInfo}>
                  <Text style={s.actName} numberOfLines={1}>
                    {act.label ?? act.subType ?? act.description ?? meta.label}
                  </Text>
                  <Text style={[s.actMeta, isToday && { color: C.green600, fontWeight: '600' }]}>
                    {dateLabel}{act.distance ? ` · ${act.distance} km` : ''}
                  </Text>
                </View>
                <View style={s.actRight}>
                  <Text style={[s.actKg, { color: meta.accent }]}>{kg}</Text>
                  <Text style={s.actKgUnit}>kg CO₂</Text>
                </View>
              </View>
            );
          })
        )}

      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
    </LinearGradient>
    </ScreenTransition>
  );
}

// ── Styles (factory — called via useMemo so colours update with theme) ────────
function makeStyles(C) { return StyleSheet.create({
  root:       { flex: 1, backgroundColor: 'transparent' },
  loader:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loaderTxt: { fontSize: 14, color: C.textSub },

  // ─── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    width: '100%',
    height: Platform.OS === 'ios' ? 430 : 400,
    justifyContent: 'space-between',
    paddingBottom: 0,
  },
  heroTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: Platform.OS === 'ios' ? 58 : Platform.OS === 'web' ? 52 : 16,
    paddingHorizontal: 22,
  },
  heroLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLogoImg:  { width: 28, height: 28, borderRadius: 6 },
  heroLogoTxt:  {
    fontSize: 18, fontWeight: '900', color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  notifIcon: { fontSize: 18 },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#fff',
  },
  notifBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Outer glow → ring → glass circle
  circleGlow: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: 106,
    backgroundColor: 'rgba(127,255,212,0.07)',
  },
  circleRing: {
    padding: 6,
    borderRadius: 94,
    borderWidth: 1.5,
    borderColor: 'rgba(127,255,212,0.35)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  circleWrap: {
    width: 172, height: 172, borderRadius: 86,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
    elevation: 14,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20,
  },
  circleContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(6,12,24,0.55)',
    paddingHorizontal: 16,
  },
  circleLabel: {
    fontSize: 9, color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2, fontWeight: '800', marginBottom: 6,
  },
  circleVal:  {
    fontSize: 48, fontWeight: '900', color: C.mint,
    lineHeight: 52,
    textShadowColor: 'rgba(0,229,170,0.70)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  circleUnit: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, marginBottom: 10 },
  circleBar:  {
    width: 100, height: 4, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden',
    marginBottom: 5,
  },
  circleBarFill: { height: 4, backgroundColor: C.mint, borderRadius: 4 },
  circlePct:  { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.5 },

  // Bottom info strip
  heroStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  heroStripDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.mint },
  heroStripTxt: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: 0.3 },

  // ─── Greeting card ────────────────────────────────────────────────────────
  greetCard: {
    marginHorizontal: 16, marginTop: 18,
    backgroundColor: C.card, borderRadius: 22,
    padding: 18, borderWidth: 1, borderColor: C.border,
    ...C.cardShadow,
  },
  greetRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar:    {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.green600,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    overflow: 'hidden',
    borderWidth: 2, borderColor: C.green100,
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarTxt: { fontSize: 16, fontWeight: '800', color: '#1A2318' },
  greetText: { flex: 1 },
  hiTxt:     { fontSize: 19, fontWeight: '800', color: C.text },
  hiSub:     { fontSize: 12, color: C.textSub, marginTop: 3 },
  greetMeta: { marginBottom: 14 },
  greetBio:  { fontSize: 13, color: C.textSub, lineHeight: 18, marginBottom: 8, fontStyle: 'italic' },
  greetPills:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  greetPill: { backgroundColor: C.green50, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
               borderWidth: 1, borderColor: C.green100 },
  greetPillTxt: { fontSize: 11, fontWeight: '700', color: C.green600 },
  goalBadge: {
    backgroundColor: C.green50, borderRadius: 14,
    paddingHorizontal: 11, paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: C.green100,
    flexShrink: 0,
  },
  goalBadgeIcon: { fontSize: 13, marginBottom: 2 },
  goalBadgeTxt:  { fontSize: 9,  color: C.green600, fontWeight: '600' },
  goalBadgeVal:  { fontSize: 11, color: C.green700, fontWeight: '800' },
  progressBg:   {
    height: 9, backgroundColor: C.border, borderRadius: 9,
    overflow: 'hidden', marginBottom: 7,
  },
  progressFill: { height: 9, borderRadius: 9 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressMetaTxt: { fontSize: 10, color: C.textMuted },

  // ─── Rejuvenate CTA ───────────────────────────────────────────────────────
  // Eco Garden teaser
  gardenTeaser:     { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(178,208,84,0.2)' },
  gardenTeaserLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gardenTeaserEmoji:{ fontSize: 32 },
  gardenTeaserTitle:{ fontSize: 14, fontWeight: '800', color: '#EFF4EE' },
  gardenTeaserSub:  { fontSize: 11, color: 'rgba(239,244,238,0.5)', marginTop: 2 },
  gardenTeaserArrow:{ fontSize: 20, color: '#B2D054', fontWeight: '800' },

  rejuvBtn:     { marginTop: 14, borderRadius: 16, overflow: 'hidden' },
  rejuvBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, gap: 12 },
  rejuvBtnIcon: { fontSize: 22 },
  rejuvBtnTitle:{ fontSize: 14, fontWeight: '800', color: '#071209' },
  rejuvBtnSub:  { fontSize: 11, color: 'rgba(7,18,9,0.7)', marginTop: 1 },
  rejuvBtnArrow:{ fontSize: 18, fontWeight: '800', color: '#071209', marginLeft: 'auto' },

  // ─── Shared section layout ────────────────────────────────────────────────
  section:    { marginHorizontal: 16, marginTop: 22 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', color: C.text },
  linkTxt:    { fontSize: 12, color: C.green600, fontWeight: '600' },
  countBadge: { fontSize: 12, color: C.textSub, fontWeight: '600' },

  // ─── Pills ────────────────────────────────────────────────────────────────
  pillRow:   { flexDirection: 'row', gap: 8 },
  pill:      { flex: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 4,
               alignItems: 'center', borderWidth: 1 },
  pillEmoji: { fontSize: 17, marginBottom: 5 },
  pillVal:   { fontSize: 16, fontWeight: '900' },
  pillLbl:   { fontSize: 9,  fontWeight: '600', marginTop: 2 },

  // ─── Dual chart card (equal halves) ──────────────────────────────────────
  dualCard: {
    backgroundColor: C.card, borderRadius: 22,
    borderWidth: 1, borderColor: C.border,
    padding: 14, flexDirection: 'row', alignItems: 'flex-start',
    ...C.cardShadow,
  },
  dualHalf:  { flex: 1 },                          // ← equal 50 / 50 width
  dualLabel: { fontSize: 10, fontWeight: '700', color: C.textSub,
               marginBottom: 8, letterSpacing: 0.4 },
  vDivider:  { width: 1, backgroundColor: C.border,
               alignSelf: 'stretch', marginHorizontal: 6 },

  // Bar chart (left half)
  barArea:    { flexDirection: 'row', alignItems: 'flex-end', height: 108, gap: 2 },
  barCol:     { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 108 },
  barTopVal:  { fontSize: 7, color: C.green600, fontWeight: '700', marginBottom: 2 },
  barTrack:   { width: '76%', height: 90, justifyContent: 'flex-end' },
  barFill:    { width: '100%', borderRadius: 5 },
  barLbl:     { fontSize: 8, color: C.textMuted, marginTop: 4, fontWeight: '500' },
  chartEmpty: { fontSize: 12, color: C.textMuted, textAlign: 'center', paddingVertical: 24 },
  miniLegend: { flexDirection: 'row', gap: 7, marginTop: 10, flexWrap: 'wrap' },
  miniLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniLegendDot:  { width: 7, height: 7, borderRadius: 4 },
  miniLegendTxt:  { fontSize: 9, color: C.textSub },

  // Donut chart (right half)
  donutWrap:       { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutCenter:     { position: 'absolute', alignItems: 'center', justifyContent: 'center',
                     width: 56, height: 56 },
  donutCenterVal:  { fontSize: 16, fontWeight: '900', color: C.green800 },
  donutCenterUnit: { fontSize: 9, color: C.textMuted, fontWeight: '600' },
  donutEmpty:      { width: 120, height: 120, borderRadius: 60,
                     borderWidth: 16, borderColor: C.border,
                     alignItems: 'center', justifyContent: 'center' },
  donutEmptyTxt:   { fontSize: 10, color: C.textMuted },
  donutLegend:     { marginTop: 8, gap: 4 },
  donutLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  donutLegendDot:  { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  donutLegendTxt:  { fontSize: 9, color: C.textSub, flex: 1 },
  donutLegendPct:  { fontSize: 9, fontWeight: '800' },

  // ─── Eco Spots search ─────────────────────────────────────────────────────
  searchCard:  {
    backgroundColor: C.card, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: C.border, ...C.cardShadow,
  },
  searchRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchBox:   {
    flex: 1, flexDirection: 'row', alignItems: 'center', height: 46,
    backgroundColor: C.inputBg, borderRadius: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: C.border,
  },
  searchIcon:  { fontSize: 15, marginRight: 7 },
  searchInput: { flex: 1, fontSize: 13, color: C.text },
  clearX:      { fontSize: 12, color: C.textMuted, fontWeight: '700', paddingLeft: 6 },
  goBtn:       { backgroundColor: C.green700, borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center' },
  goBtnTxt:    { color: C.mint, fontWeight: '800', fontSize: 14 },
  chipRow:     { gap: 8, paddingBottom: 2 },
  chip:        { backgroundColor: C.green50, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8,
                 borderWidth: 1, borderColor: C.green100 },
  chipTxt:     { fontSize: 12, color: C.green700, fontWeight: '700' },

  // ─── Monthly breakdown grid — compact 2×2 chips ───────────────────────────
  statGrid:   { gap: 8 },
  statRow:    { flexDirection: 'row', gap: 8 },
  statCard:   {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, padding: 12,
    borderWidth: 1, ...C.cardShadow,
  },
  statIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statIcon:  { fontSize: 18 },
  statBody:  { flex: 1 },
  statVal:   { fontSize: 19, fontWeight: '900', lineHeight: 22 },
  statUnit:  { fontSize: 11, fontWeight: '500' },
  statLbl:   { fontSize: 10, color: C.textSub, fontWeight: '500', marginTop: 1 },
  statDelta: { fontSize: 9,  fontWeight: '700', marginTop: 3 },

  // ─── Tree offset card ────────────────────────────────────────────────────
  offsetCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 20, gap: 16, ...C.cardShadow,
  },
  offsetLeft:  { flex: 1, alignItems: 'center', gap: 12 },
  offsetRight: { flex: 1, alignItems: 'center', gap: 8 },
  offsetDivider: { width: 1, height: 100, backgroundColor: C.divider },
  offsetTitle: {
    fontSize: 13, color: C.textSub, fontWeight: '600',
    textAlign: 'center', lineHeight: 19,
  },
  offsetCo2Ring: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 5, borderColor: '#B2D054',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(178,208,84,0.08)',
  },
  offsetCo2Val:  { fontSize: 22, fontWeight: '900', color: C.text, lineHeight: 26 },
  offsetCo2Unit: { fontSize: 9, fontWeight: '700', color: C.textMuted, marginTop: 1 },

  offsetTreeRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 5, borderColor: '#B2D054',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(178,208,84,0.08)',
  },
  offsetTreeVal:   { fontSize: 26, fontWeight: '900', color: C.text },
  offsetTreeLabel: {
    fontSize: 12, color: C.textSub, fontWeight: '600',
    textAlign: 'center', lineHeight: 18,
  },
  offsetNote: { fontSize: 10, color: C.textMuted, fontWeight: '500' },

  // ─── Tip card — full photo ────────────────────────────────────────────────
  tipCard:   {
    height: 195, borderRadius: 22, overflow: 'hidden',
    justifyContent: 'space-between', padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  tipCardImg:{ borderRadius: 22 },
  tipTag:    {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  tipTagTxt: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  tipBottom: { gap: 0 },
  tipTxt:    {
    fontSize: 14, color: '#FFFFFF', lineHeight: 21, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },

  // ─── Activities ──────────────────────────────────────────────────────────
  emptyBox:  { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyTxt:  { fontSize: 13, color: C.textSub },
  actItem:   {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 18, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.border, ...C.cardShadow,
  },
  actIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actInfo:    { flex: 1 },
  actName:    { fontSize: 13, fontWeight: '600', color: C.text },
  actMeta:    { fontSize: 11, color: C.textSub, marginTop: 2 },
  actRight:   { alignItems: 'flex-end' },
  actKg:      { fontSize: 16, fontWeight: '900' },
  actKgUnit:  { fontSize: 10, color: C.textMuted },
  logBtn:     {
    marginTop: 14, backgroundColor: C.green700, borderRadius: 16,
    paddingVertical: 15, alignItems: 'center',
  },
  logBtnTxt:  { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  // ─── Quick actions ────────────────────────────────────────────────────────
  qaRow:   { gap: 10, paddingBottom: 4 },
  qaCard:  { borderRadius: 20, padding: 18, alignItems: 'center', minWidth: 86, borderWidth: 1,
             shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  qaIcon:  { fontSize: 24, marginBottom: 8 },
  qaLabel: { fontSize: 11, fontWeight: '700', color: C.text },
}); } // end makeStyles
