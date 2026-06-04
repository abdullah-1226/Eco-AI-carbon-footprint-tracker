import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  RefreshControl, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getLeaderboard, getCommunityGoal } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import ScreenTransition from '../../components/ScreenTransition';
import { useAppTheme } from '../../context/ThemeContext';

const W = Dimensions.get('window').width;

const MINT   = '#B2D054';
const CYAN   = '#5AC8FA';
const CORAL  = '#F43F5E';
const AMBER  = '#F59E0B';
const GOLD   = '#FFD700';
const SILVER = '#C8D6E5';
const BRONZE = '#CD7F32';

const scoreColor = (s) => s >= 70 ? MINT : s >= 40 ? AMBER : CORAL;

const PODIUM_MEDAL = [GOLD, SILVER, BRONZE];
const PODIUM_GLOW  = ['rgba(255,215,0,0.30)', 'rgba(200,214,229,0.20)', 'rgba(205,127,50,0.25)'];
const PLATFORM_H   = [96, 64, 44];
const RANK_LABEL   = ['1st', '2nd', '3rd'];
const RANK_CROWN   = ['👑', '🥈', '🥉'];
const PODIUM_ORDER = [1, 0, 2];

// ── Badge chip ────────────────────────────────────────────────────────────────
function BadgeChip({ badge, small }) {
  return (
    <View style={[bs.chip, small && bs.chipSm]}>
      <Text style={[bs.chipIcon, small && { fontSize: 10 }]}>{badge.icon}</Text>
      {!small && <Text style={bs.chipName}>{badge.name}</Text>}
    </View>
  );
}

const bs = StyleSheet.create({
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(178,208,84,0.12)',
             borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
             borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)' },
  chipSm:  { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  chipIcon:{ fontSize: 12 },
  chipName:{ fontSize: 10, color: '#B2D054', fontWeight: '700' },
});

// ── Podium card ───────────────────────────────────────────────────────────────
function PodiumCard({ entry, position, anim, isMe, glowAnim, sortBy }) {
  const rank    = position === 1 ? 0 : position === 0 ? 1 : 2;
  const medal   = PODIUM_MEDAL[rank];
  const glow    = PODIUM_GLOW[rank];
  const ph      = PLATFORM_H[rank];
  const isFirst = rank === 0;
  const topBadges = (entry?.badges ?? []).slice(0, 3);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <Animated.View style={[s.podiumSlot, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={[s.podiumCard, isFirst && s.podiumCardFirst]}>
        {isFirst && (
          <Animated.View style={[s.glowRing, {
            opacity:   glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.80] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) }],
          }]} />
        )}
        <Text style={[s.podiumCrown, isFirst && s.podiumCrownLarge]}>{RANK_CROWN[rank]}</Text>
        <View style={[s.podiumAvatar, {
          backgroundColor: medal,
          width: isFirst ? 62 : 48, height: isFirst ? 62 : 48,
          borderRadius: isFirst ? 31 : 24,
        }]}>
          {isMe && <View style={s.youRing} />}
          <Text style={[s.podiumAvatarTxt, isFirst && { fontSize: 26 }]}>
            {entry?.user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={[s.podiumName, isFirst && s.podiumNameFirst]} numberOfLines={1}>
          {entry?.user?.name?.split(' ')[0] || 'User'}{isMe ? '\n(You)' : ''}
        </Text>

        {/* Primary metric */}
        {sortBy === 'score' ? (
          <>
            <Text style={[s.podiumScore, { color: scoreColor(entry?.ecoScore ?? 0), fontSize: isFirst ? 24 : 18 }]}>
              {entry?.ecoScore ?? 0}
            </Text>
            <Text style={s.podiumMetaLbl}>eco score</Text>
            <Text style={s.podiumPts}>{(entry?.totalPoints ?? 0).toLocaleString()} pts</Text>
          </>
        ) : (
          <>
            <Text style={[s.podiumScore, { color: MINT, fontSize: isFirst ? 22 : 16 }]}>
              {(entry?.totalPoints ?? 0).toLocaleString()}
            </Text>
            <Text style={s.podiumMetaLbl}>pts</Text>
            <Text style={s.podiumPts}>score {entry?.ecoScore ?? 0}</Text>
          </>
        )}

        {/* Badges mini row */}
        {topBadges.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {topBadges.map((b, i) => <BadgeChip key={i} badge={b} small />)}
          </View>
        )}
      </View>

      <LinearGradient colors={[medal + 'EE', medal + '88']} style={[s.platform, { height: ph }]}>
        <Text style={s.platformLabel}>{RANK_LABEL[rank]}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────
function ListRow({ entry, rank, anim, isMe, sortBy }) {
  const sc  = entry.ecoScore ?? 0;
  const col = scoreColor(sc);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const topBadges  = (entry.badges ?? []).slice(0, 4);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateX }] }}>
      <View style={[s.listRow, isMe && s.listRowMe]}>
        <Text style={[s.listRank, isMe && { color: MINT }]}>#{rank}</Text>

        <View style={[s.listAvatar, { backgroundColor: isMe ? MINT : 'rgba(255,255,255,0.12)' }]}>
          <Text style={[s.listAvatarTxt, { color: isMe ? '#1A2318' : '#fff' }]}>
            {entry.user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        <View style={s.listInfo}>
          <Text style={[s.listName, isMe && { color: MINT }]}>
            {entry.user?.name || 'User'}{isMe ? '  (You)' : ''}
          </Text>

          {/* Badges row */}
          {topBadges.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {topBadges.map((b, i) => <BadgeChip key={i} badge={b} small />)}
            </View>
          )}

          <View style={s.listMetaRow}>
            <Text style={s.listSub}>
              🔥{entry.currentStreak}d streak · {entry.totalActivities} acts
            </Text>
          </View>

          <View style={s.scoreBarBg}>
            <Animated.View style={[s.scoreBarFill, { width: `${Math.min(sc, 100)}%`, backgroundColor: col }]} />
          </View>
        </View>

        {/* Score + pts stacked */}
        <View style={s.scoreStack}>
          <View style={[s.scoreBadge, { backgroundColor: col + '22', borderColor: col + '55' }]}>
            <Text style={[s.scoreBadgeNum, { color: col }]}>{sc}</Text>
            <Text style={s.scoreBadgeLbl}>score</Text>
          </View>
          <Text style={s.ptsBadge}>{(entry.totalPoints ?? 0).toLocaleString()} pts</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LeaderboardScreen({ navigation }) {
  const { theme: appTheme } = useAppTheme();
  const { user }                    = useAuth();
  const [board, setBoard]           = useState([]);
  const [community, setCommunity]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy]         = useState('score');
  const goalBarAnim = useRef(new Animated.Value(0)).current;

  const glowAnim    = useRef(new Animated.Value(0)).current;
  const podiumAnims = useRef([0,1,2].map(() => new Animated.Value(0))).current;
  const rowAnims    = useRef(Array.from({ length: 20 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const runEntranceAnims = useCallback((data) => {
    podiumAnims.forEach(a => a.setValue(0));
    rowAnims.forEach(a => a.setValue(0));
    Animated.stagger(120, podiumAnims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
    )).start();
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
      const [lbRes, cgRes] = await Promise.all([
        getLeaderboard(),
        getCommunityGoal().catch(() => null),
      ]);
      const data = lbRes.data.data;
      setBoard(data);
      runEntranceAnims(data);

      if (cgRes?.data) {
        setCommunity(cgRes.data);
        goalBarAnim.setValue(0);
        Animated.timing(goalBarAnim, {
          toValue: cgRes.data.progress / 100,
          duration: 1800,
          useNativeDriver: false,
        }).start();
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [runEntranceAnims]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchBoard);
    return unsub;
  }, [navigation, fetchBoard]);

  // Sort board based on toggle
  const sortedBoard = [...board].sort((a, b) =>
    sortBy === 'score'
      ? (b.ecoScore ?? 0) - (a.ecoScore ?? 0) || (b.totalPoints ?? 0) - (a.totalPoints ?? 0)
      : (b.totalPoints ?? 0) - (a.totalPoints ?? 0) || (b.ecoScore ?? 0) - (a.ecoScore ?? 0)
  );

  const top3   = sortedBoard.slice(0, 3);
  const rest   = sortedBoard.slice(3);
  const myEntry = board.find(e => e.user?._id === user?._id || e.user?.email === user?.email);
  const myRank  = (() => {
    const i = sortedBoard.findIndex(e => e.user?._id === user?._id || e.user?.email === user?.email);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBoard(); }} tintColor={MINT} colors={[MINT]} />}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
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

      {/* ── Community Goal Bar ─────────────────────────────────────── */}
      {community && (
        <View style={s.communityCard}>
          <View style={s.communityHeader}>
            <View>
              <Text style={s.communityTitle}>🌍 Community Goal</Text>
              <Text style={s.communitySub}>
                {community.userCount} warriors · {community.milestonesHit > 0 ? `🎉 ${community.milestonesHit} milestone${community.milestonesHit > 1 ? 's' : ''} hit!` : 'First milestone: 10,000 kg'}
              </Text>
            </View>
            <View style={s.communityPctWrap}>
              <Text style={s.communityPct}>{community.progress.toFixed(0)}%</Text>
              <Text style={s.communityPctLbl}>done</Text>
            </View>
          </View>

          {/* Animated progress bar */}
          <View style={s.goalBarBg}>
            {/* Milestone markers */}
            {[25, 50, 75].map(m => (
              <View key={m} style={[s.goalMark, { left: `${m}%` }]} />
            ))}
            <Animated.View style={[s.goalBarFill, {
              width: goalBarAnim.interpolate({
                inputRange: [0, 1], outputRange: ['0%', '100%'],
              }),
            }]} />
          </View>

          <View style={s.goalLabelRow}>
            <Text style={s.goalLabelLeft}>0 kg</Text>
            <View style={s.goalCenterWrap}>
              <Text style={s.goalCurrent}>{community.totalOffset.toLocaleString()} kg</Text>
              <Text style={s.goalCurrentLbl}>offset so far</Text>
            </View>
            <Text style={s.goalLabelRight}>{(community.communityGoal).toLocaleString()} kg</Text>
          </View>

          {/* Next milestone */}
          <View style={s.goalNextWrap}>
            <Text style={s.goalNextTxt}>
              🎯 {Math.max(0, community.communityGoal - community.totalOffset % community.communityGoal).toLocaleString()} kg more to next milestone
            </Text>
          </View>
        </View>
      )}

      {/* ── Sort toggle ─────────────────────────────────────────────── */}
      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Sort by:</Text>
        {[
          { key: 'score', label: '🌿 Eco Score', hint: 'Lower emissions = higher score' },
          { key: 'pts',   label: '⭐ Points',    hint: 'Earned by logging activities' },
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[s.sortChip, sortBy === opt.key && s.sortChipActive]}
            onPress={() => setSortBy(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.sortChipTxt, sortBy === opt.key && s.sortChipTxtActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Score vs pts explanation */}
      <View style={s.scoreNote}>
        <Text style={s.scoreNoteTxt}>
          {sortBy === 'score'
            ? '🌿 Eco Score: based on monthly CO₂ emissions. Lower emissions = higher score (0–100).'
            : '⭐ Points: earned by logging activities. More logging = more points.'}
        </Text>
      </View>

      {/* ── Podium ─────────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <View style={s.podiumWrap}>
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
                  sortBy={sortBy}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* ── My Badges section ───────────────────────────────────────── */}
      {myEntry && (myEntry.badges ?? []).length > 0 && (
        <View style={s.myBadgesCard}>
          <Text style={s.myBadgesTitle}>🎖️ My Badges</Text>
          <View style={s.myBadgesGrid}>
            {(myEntry.badges ?? []).map((badge, i) => (
              <View key={i} style={s.myBadgeItem}>
                <View style={s.myBadgeIconWrap}>
                  <Text style={s.myBadgeIcon}>{badge.icon}</Text>
                </View>
                <Text style={s.myBadgeName}>{badge.name}</Text>
                <Text style={s.myBadgeDesc} numberOfLines={2}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Rest of list ────────────────────────────────────────────── */}
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
                sortBy={sortBy}
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

      {/* ── Score guide ─────────────────────────────────────────────── */}
      <View style={s.guideCard}>
        <Text style={s.guideTitle}>📊 How Rankings Work</Text>
        <View style={s.guideDivider} />
        <Text style={s.guideSubhead}>🌿 Eco Score (0–100)</Text>
        {[
          { range: '70–100', label: 'Excellent — low emissions', color: MINT,  icon: '🌟' },
          { range: '40–69',  label: 'Good',                      color: CYAN,  icon: '👍' },
          { range: '20–39',  label: 'Average',                   color: AMBER, icon: '⚡' },
          { range: '0–19',   label: 'High Emissions',            color: CORAL, icon: '⚠️' },
        ].map((l, i) => (
          <View key={i} style={s.guideRow}>
            <Text style={s.guideIcon}>{l.icon}</Text>
            <View style={[s.guideDot, { backgroundColor: l.color }]} />
            <Text style={[s.guideRange, { color: l.color }]}>{l.range}</Text>
            <Text style={s.guideLabel}>{l.label}</Text>
          </View>
        ))}
        <View style={[s.guideDivider, { marginTop: 10 }]} />
        <Text style={s.guideSubhead}>⭐ Points</Text>
        <Text style={s.guideNote}>Points are earned by logging activities. They measure engagement, not emission level. A user can have high points but low eco score if they log many high-emission activities.</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </LinearGradient>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderEmoji: { fontSize: 52 },
  loaderTxt:   { fontSize: 14, color: 'rgba(255,255,255,0.60)' },

  header: { alignItems: 'center', paddingTop: 52, paddingBottom: 28, paddingHorizontal: 24, overflow: 'hidden' },
  headerGlow:   { display: 'none' },
  trophyEmoji:  { fontSize: 58, marginBottom: 12 },
  headerTitle:  { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 5 },
  myRankBadge:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(178,208,84,0.12)',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.30)',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginTop: 14,
  },
  myRankTxt: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  myRankNum: { fontSize: 18, fontWeight: '900' },

  // Community Goal
  communityCard:   { marginHorizontal: 16, marginBottom: 14,
    backgroundColor: 'rgba(178,208,84,0.07)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(178,208,84,0.22)', padding: 16 },
  communityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  communityTitle:  { fontSize: 15, fontWeight: '900', color: '#EFF4EE' },
  communitySub:    { fontSize: 11, color: 'rgba(239,244,238,0.52)', marginTop: 3 },
  communityPctWrap:{ alignItems: 'center', backgroundColor: 'rgba(178,208,84,0.15)',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.3)' },
  communityPct:    { fontSize: 20, fontWeight: '900', color: '#B2D054' },
  communityPctLbl: { fontSize: 9, color: 'rgba(178,208,84,0.7)', fontWeight: '600' },

  goalBarBg:  { height: 14, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  goalBarFill:{ height: 14, borderRadius: 7,
    backgroundColor: '#B2D054',
    shadowColor: '#B2D054', shadowOpacity: 0.5, shadowRadius: 6 },
  goalMark:   { position: 'absolute', top: 0, bottom: 0, width: 1.5,
    backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 2 },

  goalLabelRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalLabelLeft:   { fontSize: 10, color: 'rgba(239,244,238,0.4)' },
  goalLabelRight:  { fontSize: 10, color: 'rgba(239,244,238,0.4)' },
  goalCenterWrap:  { alignItems: 'center' },
  goalCurrent:     { fontSize: 15, fontWeight: '900', color: '#B2D054' },
  goalCurrentLbl:  { fontSize: 9, color: 'rgba(239,244,238,0.45)' },
  goalNextWrap:    { backgroundColor: 'rgba(178,208,84,0.08)', borderRadius: 10,
    padding: 8, alignItems: 'center' },
  goalNextTxt:     { fontSize: 11, color: 'rgba(239,244,238,0.6)', fontWeight: '600' },

  // Sort toggle
  sortRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 6 },
  sortLabel:      { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  sortChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sortChipActive: { backgroundColor: 'rgba(178,208,84,0.15)', borderColor: 'rgba(178,208,84,0.4)' },
  sortChipTxt:    { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  sortChipTxtActive: { color: '#B2D054', fontWeight: '800' },

  scoreNote:    { marginHorizontal: 16, marginBottom: 14,
    backgroundColor: 'rgba(178,208,84,0.07)', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)' },
  scoreNoteTxt: { fontSize: 11, color: 'rgba(239,244,238,0.6)', lineHeight: 16 },

  // Podium
  podiumWrap:   { marginHorizontal: 16, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', paddingTop: 24, overflow: 'hidden' },
  podiumGround: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)' },
  podiumRow:    { flexDirection: 'row', alignItems: 'flex-end' },
  podiumSlot:   { flex: 1, alignItems: 'center' },
  podiumCard:   { alignItems: 'center', paddingBottom: 8, paddingHorizontal: 4 },
  podiumCardFirst: { paddingBottom: 12 },
  glowRing: {
    position: 'absolute', top: -10, alignSelf: 'center',
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,215,0,0.18)',
  },
  youRing:         { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 35, borderWidth: 2.5, borderColor: '#B2D054' },
  podiumCrown:     { fontSize: 20, marginBottom: 6 },
  podiumCrownLarge:{ fontSize: 26 },
  podiumAvatar:    { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  podiumAvatarTxt: { fontSize: 20, fontWeight: '900', color: 'rgba(0,0,0,0.75)' },
  podiumName:      { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  podiumNameFirst: { fontSize: 14, fontWeight: '800' },
  podiumScore:     { fontWeight: '900', marginTop: 2 },
  podiumMetaLbl:   { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  podiumPts:       { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  platform:        { width: '100%', alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  platformLabel:   { fontSize: 12, fontWeight: '900', color: 'rgba(0,0,0,0.60)' },

  // My Badges
  myBadgesCard:  { marginHorizontal: 16, marginBottom: 16,
    backgroundColor: 'rgba(178,208,84,0.06)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(178,208,84,0.2)', padding: 16 },
  myBadgesTitle: { fontSize: 14, fontWeight: '800', color: '#B2D054', marginBottom: 12 },
  myBadgesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  myBadgeItem:   { width: (W - 80) / 4, alignItems: 'center' },
  myBadgeIconWrap:{ width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(178,208,84,0.12)', borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  myBadgeIcon:   { fontSize: 22 },
  myBadgeName:   { fontSize: 9, fontWeight: '800', color: '#B2D054', textAlign: 'center' },
  myBadgeDesc:   { fontSize: 8, color: 'rgba(239,244,238,0.45)', textAlign: 'center', marginTop: 2, lineHeight: 11 },

  // List
  listSection:      { marginHorizontal: 16, marginBottom: 16 },
  listSectionTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  listRow:     { flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 10 },
  listRowMe:   { backgroundColor: 'rgba(178,208,84,0.08)', borderColor: 'rgba(178,208,84,0.28)' },
  listRank:    { width: 28, fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.40)', textAlign: 'center' },
  listAvatar:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listAvatarTxt:{ fontSize: 17, fontWeight: '900' },
  listInfo:    { flex: 1 },
  listName:    { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  listMetaRow: { marginTop: 4 },
  listSub:     { fontSize: 10, color: 'rgba(255,255,255,0.40)' },
  scoreBarBg:  { height: 3, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  scoreBarFill:{ height: 3, borderRadius: 2 },
  scoreStack:  { alignItems: 'center', gap: 4 },
  scoreBadge:  { alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 50, flexShrink: 0 },
  scoreBadgeNum:{ fontSize: 16, fontWeight: '900' },
  scoreBadgeLbl:{ fontSize: 9, color: 'rgba(255,255,255,0.40)', fontWeight: '600', marginTop: 1 },
  ptsBadge:    { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },

  // Empty
  empty:      { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  emptyTxt:   { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 20 },

  // Guide
  guideCard:    { marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', padding: 16 },
  guideTitle:   { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.70)', marginBottom: 10 },
  guideDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  guideSubhead: { fontSize: 12, fontWeight: '700', color: '#B2D054', marginBottom: 8 },
  guideRow:     { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 8 },
  guideIcon:    { fontSize: 16, width: 24 },
  guideDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  guideRange:   { fontSize: 13, fontWeight: '700', width: 58 },
  guideLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  guideNote:    { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },
});
