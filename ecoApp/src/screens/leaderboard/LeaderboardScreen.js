import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  RefreshControl, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getLeaderboard } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import ScreenTransition from '../../components/ScreenTransition';
import { useAppTheme } from '../../context/ThemeContext';

const W = Dimensions.get('window').width;

// ── Color helpers ─────────────────────────────────────────────────────────────
// Brand accent colours — Carbon Eco AI professional palette
const MINT   = '#B2D054';
const CYAN   = '#5AC8FA';
const CORAL  = '#F43F5E';
const AMBER  = '#F59E0B';
const PURPLE = '#A855F7';
const GOLD   = '#FFD700';
const SILVER = '#C8D6E5';
const BRONZE = '#CD7F32';

const scoreColor = (s) =>
  s >= 70 ? MINT : s >= 40 ? AMBER : CORAL;

const PODIUM_MEDAL = ['#FFD700', '#C8D6E5', '#CD7F32'];
const PODIUM_GLOW  = ['rgba(255,215,0,0.30)', 'rgba(200,214,229,0.20)', 'rgba(205,127,50,0.25)'];
const PLATFORM_H   = [96, 64, 44]; // 1st taller, 2nd mid, 3rd shortest
const RANK_LABEL   = ['1st', '2nd', '3rd'];
const RANK_CROWN   = ['👑', '🥈', '🥉'];

// Order: left=2nd, center=1st, right=3rd
const PODIUM_ORDER = [1, 0, 2]; // index into top3

// ── Podium card (animated) ────────────────────────────────────────────────────
function PodiumCard({ entry, position, anim, isMe, glowAnim }) {
  const rank  = position === 1 ? 0 : position === 0 ? 1 : 2; // map display pos → rank
  const medal = PODIUM_MEDAL[rank];
  const glow  = PODIUM_GLOW[rank];
  const ph    = PLATFORM_H[rank];
  const isFirst = rank === 0;

  const translateY = anim.interpolate({
    inputRange: [0, 1], outputRange: [60, 0],
  });

  return (
    <Animated.View style={[s.podiumSlot, { opacity: anim, transform: [{ translateY }] }]}>
      {/* Card above platform */}
      <View style={[s.podiumCard, isFirst && s.podiumCardFirst]}>
        {/* Glow ring on #1 */}
        {isFirst && (
          <Animated.View style={[s.glowRing, {
            opacity:   glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.80] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }],
          }]} />
        )}

        {/* Crown / medal */}
        <Text style={[s.podiumCrown, isFirst && s.podiumCrownLarge]}>
          {RANK_CROWN[rank]}
        </Text>

        {/* Avatar */}
        <View style={[s.podiumAvatar, { backgroundColor: medal, width: isFirst ? 62 : 48, height: isFirst ? 62 : 48, borderRadius: isFirst ? 31 : 24 }]}>
          {isMe && <View style={s.youRing} />}
          <Text style={[s.podiumAvatarTxt, isFirst && { fontSize: 26 }]}>
            {entry?.user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        {/* Name */}
        <Text style={[s.podiumName, isFirst && s.podiumNameFirst]} numberOfLines={1}>
          {entry?.user?.name?.split(' ')[0] || 'User'}
          {isMe ? '\n(You)' : ''}
        </Text>

        {/* Eco score */}
        <Text style={[s.podiumScore, { color: scoreColor(entry?.ecoScore ?? 0), fontSize: isFirst ? 24 : 18 }]}>
          {entry?.ecoScore ?? 0}
        </Text>
        <Text style={s.podiumPts}>{entry?.totalPoints ?? 0} pts</Text>
      </View>

      {/* Platform bar */}
      <LinearGradient
        colors={[medal + 'EE', medal + '88']}
        style={[s.platform, { height: ph }]}
      >
        <Text style={s.platformLabel}>{RANK_LABEL[rank]}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ── List row (animated) ───────────────────────────────────────────────────────
function ListRow({ entry, rank, anim, isMe }) {
  const sc  = entry.ecoScore ?? 0;
  const col = scoreColor(sc);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateX }] }}>
      <View style={[s.listRow, isMe && s.listRowMe]}>
        {/* Rank */}
        <Text style={[s.listRank, isMe && { color: MINT }]}>#{rank}</Text>

        {/* Avatar */}
        <View style={[s.listAvatar, { backgroundColor: isMe ? MINT : 'rgba(255,255,255,0.12)' }]}>
          <Text style={[s.listAvatarTxt, { color: isMe ? '#1A2318' : '#fff' }]}>
            {entry.user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        {/* Info */}
        <View style={s.listInfo}>
          <Text style={[s.listName, isMe && { color: MINT }]}>
            {entry.user?.name || 'User'}{isMe ? '  (You)' : ''}
          </Text>
          <Text style={s.listSub}>
            {entry.totalPoints} pts · {entry.totalActivities} acts · 🔥{entry.currentStreak}d
          </Text>
          {/* Score bar */}
          <View style={s.scoreBarBg}>
            <Animated.View style={[s.scoreBarFill, {
              width:           `${Math.min(sc, 100)}%`,
              backgroundColor: col,
            }]} />
          </View>
        </View>

        {/* Score badge */}
        <View style={[s.scoreBadge, { backgroundColor: col + '22', borderColor: col + '55' }]}>
          <Text style={[s.scoreBadgeNum, { color: col }]}>{sc}</Text>
          <Text style={s.scoreBadgeLbl}>score</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LeaderboardScreen({ navigation }) {
  const { theme: appTheme } = useAppTheme();
  const { user }                    = useAuth();
  const [board, setBoard]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const podiumAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const rowAnims    = useRef(Array.from({ length: 20 }, () => new Animated.Value(0))).current;

  // Trophy pulse
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const runEntranceAnims = useCallback((data) => {
    // Reset
    podiumAnims.forEach(a => a.setValue(0));
    rowAnims.forEach(a => a.setValue(0));

    // Podium stagger
    Animated.stagger(120, podiumAnims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
    )).start();

    // List rows stagger (after podium)
    const listCount = Math.min(data.length - 3, 20);
    if (listCount > 0) {
      setTimeout(() => {
        Animated.stagger(55, rowAnims.slice(0, listCount).map(a =>
          Animated.spring(a, { toValue: 1, tension: 90, friction: 11, useNativeDriver: true }),
        )).start();
      }, 420);
    }
  }, []);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await getLeaderboard();
      const data = res.data.data;
      setBoard(data);
      runEntranceAnims(data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [runEntranceAnims]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchBoard);
    return unsub;
  }, [navigation, fetchBoard]);

  const top3   = board.slice(0, 3);
  const rest   = board.slice(3);
  const myRank = (() => {
    const i = board.findIndex(e => e.user?._id === user?._id || e.user?.email === user?.email);
    return i >= 0 ? i + 1 : null;
  })();

  if (loading) {
    return (
      <LinearGradient colors={appTheme.bgGrad} style={s.loader}>
        <Text style={s.loaderEmoji}>🏆</Text>
        <Text style={s.loaderTxt}>Loading leaderboard…</Text>
      </LinearGradient>
    );
  }

  return (
    <ScreenTransition>
    <LinearGradient colors={appTheme.bgGrad} style={{ flex: 1 }}>
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchBoard(); }}
          tintColor={MINT} colors={[MINT]}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        {/* Ambient glow blob */}
        <View style={s.headerGlow} />

        <Text style={s.trophyEmoji}>🏆</Text>
        <Text style={s.headerTitle}>Eco Leaderboard</Text>
        <Text style={s.headerSub}>Top eco warriors in the community</Text>

        {myRank && (
          <View style={s.myRankBadge}>
            <Text style={s.myRankTxt}>Your Rank  </Text>
            <Text style={[s.myRankNum, { color: MINT }]}>#{myRank}</Text>
          </View>
        )}
      </View>

      {/* ── Podium ─────────────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <View style={s.podiumWrap}>
          {/* Ground line */}
          <View style={s.podiumGround} />
          <View style={s.podiumRow}>
            {PODIUM_ORDER.map((rankIdx, displayPos) => {
              const entry = top3[rankIdx];
              if (!entry) return <View key={displayPos} style={s.podiumSlot} />;
              const isMe = entry.user?._id === user?._id || entry.user?.email === user?.email;
              return (
                <PodiumCard
                  key={rankIdx}
                  entry={entry}
                  position={displayPos}
                  anim={podiumAnims[rankIdx]}
                  isMe={isMe}
                  glowAnim={glowAnim}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* ── Rest of list ────────────────────────────────────────────────── */}
      {rest.length > 0 && (
        <View style={s.listSection}>
          <Text style={s.listSectionTitle}>Rankings</Text>
          {rest.map((entry, i) => {
            const rank = i + 4;
            const isMe = entry.user?._id === user?._id || entry.user?.email === user?.email;
            return (
              <ListRow
                key={entry._id ?? i}
                entry={entry}
                rank={rank}
                anim={rowAnims[i]}
                isMe={isMe}
              />
            );
          })}
        </View>
      )}

      {board.length === 0 && (
        <View style={s.empty}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>🌱</Text>
          <Text style={s.emptyTitle}>No Rankings Yet</Text>
          <Text style={s.emptyTxt}>Be the first to log activities and claim the top spot!</Text>
        </View>
      )}

      {/* ── Score guide ─────────────────────────────────────────────────── */}
      <View style={s.guideCard}>
        <Text style={s.guideTitle}>📊 Eco Score Guide</Text>
        {[
          { range: '70–100', label: 'Excellent',      color: MINT,  icon: '🌟' },
          { range: '40–69',  label: 'Good',            color: CYAN,  icon: '👍' },
          { range: '20–39',  label: 'Average',         color: AMBER, icon: '⚡' },
          { range: '0–19',   label: 'High Emissions',  color: CORAL, icon: '⚠️' },
        ].map((l, i) => (
          <View key={i} style={s.guideRow}>
            <Text style={s.guideIcon}>{l.icon}</Text>
            <View style={[s.guideDot, { backgroundColor: l.color }]} />
            <Text style={[s.guideRange, { color: l.color }]}>{l.range}</Text>
            <Text style={s.guideLabel}>{l.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </LinearGradient>
    </ScreenTransition>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderEmoji: { fontSize: 52 },
  loaderTxt:   { fontSize: 14, color: 'rgba(255,255,255,0.60)' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: 52, paddingBottom: 36, paddingHorizontal: 24,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute', top: -40, alignSelf: 'center',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(0,229,170,0.07)',
  },
  trophyEmoji:  { fontSize: 58, marginBottom: 12 },
  headerTitle:  { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 5 },
  myRankBadge:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,229,170,0.10)',
    borderWidth: 1, borderColor: 'rgba(0,229,170,0.30)',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8,
    marginTop: 18,
  },
  myRankTxt: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  myRankNum: { fontSize: 18, fontWeight: '900' },

  // ── Podium ──────────────────────────────────────────────────────────────────
  podiumWrap:   {
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingTop: 24, overflow: 'hidden',
  },
  podiumGround: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  podiumRow:    { flexDirection: 'row', alignItems: 'flex-end' },
  podiumSlot:   { flex: 1, alignItems: 'center' },

  podiumCard:   { alignItems: 'center', paddingBottom: 8, paddingHorizontal: 4 },
  podiumCardFirst: { paddingBottom: 12 },

  glowRing: {
    position: 'absolute', top: -10, alignSelf: 'center',
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,215,0,0.18)',
  },
  youRing: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 35, borderWidth: 2.5, borderColor: MINT,
  },
  podiumCrown:      { fontSize: 20, marginBottom: 6 },
  podiumCrownLarge: { fontSize: 26 },
  podiumAvatar:     { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  podiumAvatarTxt:  { fontSize: 20, fontWeight: '900', color: 'rgba(0,0,0,0.75)' },
  podiumName:       { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  podiumNameFirst:  { fontSize: 14, fontWeight: '800' },
  podiumScore:      { fontWeight: '900', marginTop: 2 },
  podiumPts:        { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  platform: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  platformLabel: { fontSize: 12, fontWeight: '900', color: 'rgba(0,0,0,0.60)' },

  // ── List ────────────────────────────────────────────────────────────────────
  listSection:      { marginHorizontal: 16, marginBottom: 16 },
  listSectionTitle: {
    fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    gap: 10,
  },
  listRowMe: {
    backgroundColor: 'rgba(0,229,170,0.08)',
    borderColor: 'rgba(0,229,170,0.28)',
  },
  listRank:      { width: 28, fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.40)', textAlign: 'center' },
  listAvatar:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listAvatarTxt: { fontSize: 17, fontWeight: '900' },
  listInfo:      { flex: 1 },
  listName:      { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  listSub:       { fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 },
  scoreBarBg:    { height: 3, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  scoreBarFill:  { height: 3, borderRadius: 2 },
  scoreBadge:    {
    alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 50, flexShrink: 0,
  },
  scoreBadgeNum: { fontSize: 16, fontWeight: '900' },
  scoreBadgeLbl: { fontSize: 9, color: 'rgba(255,255,255,0.40)', fontWeight: '600', marginTop: 1 },

  // ── Empty ────────────────────────────────────────────────────────────────────
  empty:      { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  emptyTxt:   { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 20 },

  // ── Score guide ──────────────────────────────────────────────────────────────
  guideCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    padding: 16,
  },
  guideTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.70)', marginBottom: 12 },
  guideRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 8 },
  guideIcon:  { fontSize: 16, width: 24 },
  guideDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  guideRange: { fontSize: 13, fontWeight: '700', width: 58 },
  guideLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
});
