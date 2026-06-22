import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivitySummary, getLeaderboard, getActivities } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import ScreenTransition from '../../components/ScreenTransition';

const W = Dimensions.get('window').width;

// ── Daily challenges definition ───────────────────────────────────────────────
const DAILY_CHALLENGES = [
  {
    id: 'walk_or_cycle',
    emoji: '🚶',
    title: 'Green Commuter',
    desc: 'Log a walk or cycling activity today',
    points: 50,
    xp: 120,
    color: '#4CAF50',
    grad: ['#2E7D32', '#388E3C'],
    check: (acts) => acts.some(a =>
      ['walking', 'cycling', 'bicycle'].includes(a.subType) &&
      isToday(a.date ?? a.createdAt)
    ),
  },
  {
    id: 'plant_meal',
    emoji: '🥗',
    title: 'Plant Powered',
    desc: 'Log a vegan or vegetarian meal today',
    points: 40,
    xp: 100,
    color: '#8BC34A',
    grad: ['#558B2F', '#689F38'],
    check: (acts) => acts.some(a =>
      ['vegan', 'vegetarian', 'vegetables_meal'].includes(a.subType) &&
      isToday(a.date ?? a.createdAt)
    ),
  },
  {
    id: 'under_limit',
    emoji: '🌡️',
    title: 'Carbon Saver',
    desc: 'Keep your daily emissions under your limit',
    points: 60,
    xp: 150,
    color: '#00BCD4',
    grad: ['#006064', '#00838F'],
    check: (acts, summary) => {
      const todayKg = parseFloat((summary?.today?.co2e ?? 999).toFixed(1));
      const limit   = summary?.stats?.dailyThreshold ?? 10;
      return todayKg > 0 && todayKg <= limit;
    },
  },
  {
    id: 'log_3_acts',
    emoji: '📝',
    title: 'Activity Tracker',
    desc: 'Log at least 3 activities today',
    points: 45,
    xp: 110,
    color: '#FF9800',
    grad: ['#E65100', '#F57C00'],
    check: (acts) => acts.filter(a => isToday(a.date ?? a.createdAt)).length >= 3,
  },
  {
    id: 'solar_or_bike',
    emoji: '☀️',
    title: 'Clean Energy Hero',
    desc: 'Log solar energy or electric vehicle use',
    points: 55,
    xp: 130,
    color: '#FFC107',
    grad: ['#F57F17', '#F9A825'],
    check: (acts) => acts.some(a =>
      ['solar_energy', 'car_electric'].includes(a.subType) &&
      isToday(a.date ?? a.createdAt)
    ),
  },
  {
    id: 'offset_today',
    emoji: '🌳',
    title: 'Tree Planter',
    desc: 'Make a carbon offset contribution today',
    points: 70,
    xp: 180,
    color: '#009688',
    grad: ['#004D40', '#00695C'],
    check: (acts) => acts.some(a =>
      a.category === 'offset' && isToday(a.date ?? a.createdAt)
    ),
  },
];

// ── Weekly challenges ─────────────────────────────────────────────────────────
const WEEKLY_CHALLENGES = [
  {
    id: 'streak_7',
    emoji: '🔥',
    title: '7-Day Streak',
    desc: 'Log activities every day for 7 days',
    points: 200,
    xp: 500,
    color: '#FF5722',
    grad: ['#BF360C', '#D84315'],
    check: (acts, summary) => (summary?.stats?.currentStreak ?? 0) >= 7,
    progress: (acts, summary) => Math.min(summary?.stats?.currentStreak ?? 0, 7),
    total: 7,
  },
  {
    id: 'low_week',
    emoji: '🌍',
    title: 'Eco Week',
    desc: 'Stay under your daily limit for 5 days this week',
    points: 150,
    xp: 380,
    color: '#3F51B5',
    grad: ['#1A237E', '#283593'],
    check: (acts, summary) => (summary?.stats?.lowCarbonDays ?? 0) >= 5,
    progress: (acts, summary) => Math.min(summary?.stats?.lowCarbonDays ?? 0, 5),
    total: 5,
  },
  {
    id: 'activities_20',
    emoji: '🏅',
    title: 'Super Logger',
    desc: 'Log 20 activities this week',
    points: 120,
    xp: 300,
    color: '#9C27B0',
    grad: ['#4A148C', '#6A1B9A'],
    check: (acts) => getWeekActs(acts) >= 20,
    progress: (acts) => Math.min(getWeekActs(acts), 20),
    total: 20,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.toISOString().slice(0, 10) === t.toISOString().slice(0, 10);
};
const getWeekActs = (acts) => {
  const week = new Date(); week.setDate(week.getDate() - 7);
  return acts.filter(a => new Date(a.date ?? a.createdAt) >= week).length;
};

const TIER_LABELS = ['🌱 Seedling', '🌿 Sprout', '🌲 Sapling', '🌳 Tree', '🌴 Forest', '🏆 Legend'];
const getTier = (points) => {
  if (points < 100)  return 0;
  if (points < 300)  return 1;
  if (points < 600)  return 2;
  if (points < 1000) return 3;
  if (points < 2000) return 4;
  return 5;
};

// ── Animated challenge card ───────────────────────────────────────────────────
function ChallengeCard({ item, done, isWeekly, summary, acts, navigation, onJumpTo }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    if (done) {
      Animated.spring(glowAnim, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }).start();
    }
  }, [done]);

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true }).start();

  const progress = isWeekly && item.progress ? item.progress(acts, summary) : null;
  const total    = isWeekly ? item.total : null;
  const pct      = total ? progress / total : 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => !done && onJumpTo('LogActivity')}
        disabled={done}
      >
        <LinearGradient
          colors={done ? ['#1B3A1F', '#223D26'] : ['#0F1F12', '#172B1A']}
          style={[S.card, done && S.cardDone]}
        >
          {/* Done badge */}
          {done && (
            <View style={S.doneBadge}>
              <Text style={S.doneBadgeTxt}>✓ Done</Text>
            </View>
          )}

          <View style={S.cardTop}>
            {/* Icon */}
            <LinearGradient colors={done ? ['#2E7D32', '#388E3C'] : item.grad} style={S.iconBox}>
              <Text style={S.iconEmoji}>{item.emoji}</Text>
            </LinearGradient>

            {/* Info */}
            <View style={S.cardInfo}>
              <Text style={[S.cardTitle, done && S.cardTitleDone]}>{item.title}</Text>
              <Text style={S.cardDesc} numberOfLines={2}>{item.desc}</Text>
            </View>

            {/* Points */}
            <View style={S.pointsBox}>
              <Text style={[S.pointsNum, { color: done ? '#B2D054' : item.color }]}>+{item.points}</Text>
              <Text style={S.pointsLbl}>pts</Text>
              <Text style={S.xpTxt}>+{item.xp} XP</Text>
            </View>
          </View>

          {/* Weekly progress bar */}
          {isWeekly && total && (
            <View style={S.progRow}>
              <View style={S.progTrack}>
                <Animated.View
                  style={[S.progFill, {
                    width: `${Math.round(pct * 100)}%`,
                    backgroundColor: done ? '#B2D054' : item.color,
                  }]}
                />
              </View>
              <Text style={S.progTxt}>{progress}/{total}</Text>
            </View>
          )}

          {/* Action hint */}
          {!done && (
            <Text style={[S.actionHint, { color: item.color }]}>
              Tap to log activity →
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ChallengeScreen({ navigation }) {
  const { user }                   = useAuth();
  const [summary, setSummary]      = useState(null);
  const [acts, setActs]            = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]      = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [tab, setTab]              = useState('daily'); // 'daily' | 'weekly' | 'rank'

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, actsRes, lbRes] = await Promise.all([
        getActivitySummary(),
        getActivities({ limit: 50 }),
        getLeaderboard(),
      ]);
      setSummary(sumRes.data);
      setActs(actsRes.data?.activities ?? actsRes.data?.data ?? []);
      setLeaderboard(lbRes.data?.data ?? []);

      Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  const dailyDone    = DAILY_CHALLENGES.filter(c => c.check(acts, summary));
  const weeklyDone   = WEEKLY_CHALLENGES.filter(c => c.check(acts, summary));
  const totalPoints  = dailyDone.length * 50 + weeklyDone.length * 150 +
                       (summary?.stats?.ecoScore ?? 0);
  const tier         = getTier(totalPoints);
  const dailyPct     = DAILY_CHALLENGES.length ? dailyDone.length / DAILY_CHALLENGES.length : 0;

  const onJumpTo = (screen) => navigation.jumpTo(screen);

  if (loading) {
    return (
      <LinearGradient colors={['#060F08', '#0A1A0F']} style={S.loader}>
        <Text style={S.loaderEmoji}>⚔️</Text>
        <Text style={S.loaderTxt}>Loading Challenges...</Text>
      </LinearGradient>
    );
  }

  return (
    <ScreenTransition>
      <LinearGradient colors={['#060F08', '#0A1A0F', '#0C1B12']} style={S.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#B2D054" colors={['#B2D054']} />
          }
        >
          {/* ── Header ─────────────────────────────────────── */}
          <Animated.View style={[S.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
            <LinearGradient colors={['#0D2010', '#122B15']} style={S.headerCard}>
              <View style={S.headerTop}>
                <View>
                  <Text style={S.greeting}>Carbon Challenge ⚔️</Text>
                  <Text style={S.userName}>{user?.name?.split(' ')[0] ?? 'Eco Warrior'}</Text>
                </View>
                <View style={S.tierBadge}>
                  <Text style={S.tierTxt}>{TIER_LABELS[tier]}</Text>
                </View>
              </View>

              {/* Daily progress ring summary */}
              <View style={S.statsRow}>
                <View style={S.statBox}>
                  <Text style={S.statNum}>{dailyDone.length}/{DAILY_CHALLENGES.length}</Text>
                  <Text style={S.statLbl}>Daily Done</Text>
                </View>
                <View style={S.statDivider} />
                <View style={S.statBox}>
                  <Text style={S.statNum}>{weeklyDone.length}/{WEEKLY_CHALLENGES.length}</Text>
                  <Text style={S.statLbl}>Weekly Done</Text>
                </View>
                <View style={S.statDivider} />
                <View style={S.statBox}>
                  <Text style={[S.statNum, { color: '#B2D054' }]}>{totalPoints}</Text>
                  <Text style={S.statLbl}>Total Pts</Text>
                </View>
              </View>

              {/* Daily progress bar */}
              <View style={S.headerProg}>
                <Text style={S.headerProgLbl}>Today's Progress</Text>
                <View style={S.headerProgTrack}>
                  <View style={[S.headerProgFill, { width: `${Math.round(dailyPct * 100)}%` }]} />
                </View>
                <Text style={S.headerProgPct}>{Math.round(dailyPct * 100)}%</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Tabs ───────────────────────────────────────── */}
          <View style={S.tabRow}>
            {[
              { key: 'daily',  label: '⚡ Daily'  },
              { key: 'weekly', label: '📅 Weekly' },
              { key: 'rank',   label: '🏆 Ranking' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[S.tabBtn, tab === t.key && S.tabBtnActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.75}
              >
                <Text style={[S.tabBtnTxt, tab === t.key && S.tabBtnTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Daily tab ──────────────────────────────────── */}
          {tab === 'daily' && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Daily Challenges</Text>
              <Text style={S.sectionSub}>Resets every midnight · Complete all for a bonus!</Text>
              {DAILY_CHALLENGES.map(c => (
                <ChallengeCard
                  key={c.id}
                  item={c}
                  done={dailyDone.some(d => d.id === c.id)}
                  isWeekly={false}
                  summary={summary}
                  acts={acts}
                  navigation={navigation}
                  onJumpTo={onJumpTo}
                />
              ))}
              {dailyDone.length === DAILY_CHALLENGES.length && (
                <LinearGradient colors={['#1B4A20', '#2E7D32']} style={S.allDoneBanner}>
                  <Text style={S.allDoneEmoji}>🎉</Text>
                  <Text style={S.allDoneTxt}>All daily challenges complete! Amazing work!</Text>
                </LinearGradient>
              )}
            </View>
          )}

          {/* ── Weekly tab ─────────────────────────────────── */}
          {tab === 'weekly' && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Weekly Challenges</Text>
              <Text style={S.sectionSub}>Bigger rewards · Resets every Monday</Text>
              {WEEKLY_CHALLENGES.map(c => (
                <ChallengeCard
                  key={c.id}
                  item={c}
                  done={weeklyDone.some(d => d.id === c.id)}
                  isWeekly={true}
                  summary={summary}
                  acts={acts}
                  navigation={navigation}
                  onJumpTo={onJumpTo}
                />
              ))}
            </View>
          )}

          {/* ── Ranking tab ────────────────────────────────── */}
          {tab === 'rank' && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Challenge Ranking</Text>
              <Text style={S.sectionSub}>Based on eco score · Updated in real-time</Text>

              {leaderboard.length === 0 ? (
                <View style={S.emptyBox}>
                  <Text style={S.emptyEmoji}>🏆</Text>
                  <Text style={S.emptyTxt}>No rankings yet. Log activities to appear here!</Text>
                </View>
              ) : (
                leaderboard.slice(0, 10).map((entry, i) => {
                  const isMe = entry.userId === (user?._id || user?.id);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <LinearGradient
                      key={entry.userId ?? i}
                      colors={isMe ? ['#1B3A1F', '#223D26'] : ['#0D1F10', '#112414']}
                      style={[S.rankRow, isMe && S.rankRowMe]}
                    >
                      <Text style={S.rankNum}>{medals[i] ?? `#${i + 1}`}</Text>
                      <View style={S.rankAvatar}>
                        <Text style={{ fontSize: 18 }}>
                          {entry.name?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={S.rankInfo}>
                        <Text style={[S.rankName, isMe && S.rankNameMe]}>
                          {isMe ? `${entry.name} (You)` : entry.name}
                        </Text>
                        <Text style={S.rankSub}>Eco Score: {entry.ecoScore ?? 0}</Text>
                      </View>
                      <View style={S.rankPts}>
                        <Text style={[S.rankPtsNum, isMe && { color: '#B2D054' }]}>
                          {entry.ecoScore ?? 0}
                        </Text>
                        <Text style={S.rankPtsLbl}>pts</Text>
                      </View>
                    </LinearGradient>
                  );
                })
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </LinearGradient>
    </ScreenTransition>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:    { flex: 1 },
  loader:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderEmoji: { fontSize: 48 },
  loaderTxt:   { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  // Header
  header:      { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 4 },
  headerCard:  { borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)' },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting:    { fontSize: 13, color: 'rgba(178,208,84,0.7)', fontWeight: '600', marginBottom: 4 },
  userName:    { fontSize: 24, fontWeight: '900', color: '#EFF4EE' },
  tierBadge:   { backgroundColor: 'rgba(178,208,84,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(178,208,84,0.3)' },
  tierTxt:     { color: '#B2D054', fontSize: 12, fontWeight: '800' },

  statsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statBox:     { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '900', color: '#EFF4EE' },
  statLbl:     { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },

  headerProg:      { gap: 6 },
  headerProgLbl:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  headerProgTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  headerProgFill:  { height: 6, backgroundColor: '#B2D054', borderRadius: 3 },
  headerProgPct:   { fontSize: 11, color: '#B2D054', fontWeight: '700', textAlign: 'right' },

  // Tabs
  tabRow:       { flexDirection: 'row', marginHorizontal: 16, marginVertical: 14, gap: 8 },
  tabBtn:       { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabBtnActive: { backgroundColor: 'rgba(178,208,84,0.12)', borderColor: 'rgba(178,208,84,0.35)' },
  tabBtnTxt:    { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  tabBtnTxtActive: { color: '#B2D054' },

  // Section
  section:      { paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#EFF4EE', marginBottom: 2 },
  sectionSub:   { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500', marginBottom: 4 },

  // Challenge card
  card:        { borderRadius: 16, padding: 14, marginBottom: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardDone:    { borderColor: 'rgba(178,208,84,0.25)' },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:     { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  iconEmoji:   { fontSize: 22 },
  cardInfo:    { flex: 1 },
  cardTitle:   { fontSize: 14, fontWeight: '800', color: '#EFF4EE', marginBottom: 3 },
  cardTitleDone: { color: '#B2D054' },
  cardDesc:    { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 16 },
  pointsBox:   { alignItems: 'center' },
  pointsNum:   { fontSize: 16, fontWeight: '900' },
  pointsLbl:   { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  xpTxt:       { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginTop: 1 },
  doneBadge:   { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(178,208,84,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  doneBadgeTxt:{ fontSize: 10, color: '#B2D054', fontWeight: '800' },
  progRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progTrack:   { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progFill:    { height: 5, borderRadius: 3 },
  progTxt:     { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', minWidth: 30, textAlign: 'right' },
  actionHint:  { fontSize: 11, fontWeight: '700', marginTop: 8, textAlign: 'right' },
  allDoneBanner: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  allDoneEmoji:  { fontSize: 28 },
  allDoneTxt:    { flex: 1, color: '#fff', fontWeight: '800', fontSize: 14 },

  // Ranking
  rankRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  rankRowMe:  { borderColor: 'rgba(178,208,84,0.3)' },
  rankNum:    { fontSize: 20, width: 30, textAlign: 'center' },
  rankAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(178,208,84,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(178,208,84,0.2)' },
  rankInfo:   { flex: 1 },
  rankName:   { fontSize: 14, fontWeight: '700', color: '#EFF4EE' },
  rankNameMe: { color: '#B2D054' },
  rankSub:    { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  rankPts:    { alignItems: 'center' },
  rankPtsNum: { fontSize: 16, fontWeight: '900', color: '#EFF4EE' },
  rankPtsLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  emptyBox:  { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyEmoji:{ fontSize: 48 },
  emptyTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', fontWeight: '600' },
});
