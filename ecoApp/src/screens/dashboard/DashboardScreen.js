import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { getActivitySummary } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import { Shadow, Radii, Spacing } from '../../theme';

const W = Dimensions.get('window').width;

const CAT_META = {
  transport: { icon: '🚗', color: '#4FC3F7', label: 'Transport' },
  food:      { icon: '🍽️', color: '#81C784', label: 'Food'      },
  energy:    { icon: '⚡',  color: '#FFD54F', label: 'Energy'    },
  shopping:  { icon: '🛍️', color: '#CE93D8', label: 'Shopping'  },
};

const scoreColor = (s) => s >= 70 ? '#00E676' : s >= 40 ? '#FFD740' : '#FF5252';
const scoreLabel = (s) => s >= 70 ? 'Excellent 🌟' : s >= 40 ? 'Average ⚡' : 'Needs Work ⚠️';
const levelTitle = (l) => ['', 'Seedling', 'Sapling', 'Green Leaf', 'Eco Warrior', 'Climate Hero', 'Earth Guardian'][Math.min(l, 6)] || 'Earth Guardian';

export default function DashboardScreen({ navigation }) {
  const { user }                    = useAuth();
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getActivitySummary();
      setSummary(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  if (loading) return <Loading message="Loading your eco dashboard..." />;

  const stats       = summary?.stats;
  const today       = summary?.today   ?? { co2e: 0, count: 0 };
  const weekly      = summary?.weekly  ?? [];
  const monthly     = summary?.monthly ?? { breakdown: [], total: 0 };
  const ecoScore    = stats?.ecoScore    ?? 50;
  const totalPoints = stats?.totalPoints ?? 0;
  const streak      = stats?.currentStreak ?? 0;
  const level       = stats?.level ?? 1;
  const badges      = stats?.badges ?? [];
  const levelPct    = ((totalPoints % 200) / 200);

  const chartLabels = weekly.map(d => d.label);
  const chartValues = weekly.map(d => parseFloat(d.co2e.toFixed(2)));
  const hasChart    = chartValues.some(v => v > 0);

  const pieData = monthly.breakdown.map(b => {
    const meta = CAT_META[b._id] ?? { color: '#aaa', label: b._id };
    return { name: meta.label, co2: parseFloat(b.total.toFixed(1)), color: meta.color, legendFontColor: '#ccc', legendFontSize: 11 };
  });

  const color = scoreColor(ecoScore);

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#00E676" colors={['#00E676']} />
      }
    >
      {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
      <LinearGradient colors={['#052e05', '#0f4a0f', '#1a6b1a']} style={styles.header}>
        {/* Greeting */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greetHi}>Good day, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.greetSub}>Track · Reduce · Offset</Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakDay}>days</Text>
          </View>
        </View>

        {/* Central Eco Score */}
        <View style={styles.scoreCenter}>
          <View style={[styles.scoreRingOuter, { borderColor: color + '50' }]}>
            <View style={[styles.scoreRingInner, { borderColor: color }]}>
              <Text style={[styles.scoreNum, { color }]}>{ecoScore}</Text>
              <Text style={styles.scoreCaption}>ECO SCORE</Text>
            </View>
          </View>
          <Text style={[styles.scoreStatus, { color }]}>{scoreLabel(ecoScore)}</Text>
          <Text style={styles.scoreRef}>World avg: 400 kg CO₂/month</Text>
        </View>

        {/* Level + points */}
        <View style={styles.levelBox}>
          <View style={styles.levelTopRow}>
            <Text style={styles.levelName}>Lv.{level}  {levelTitle(level)}</Text>
            <View style={styles.ptsPill}>
              <Text style={styles.ptsLabel}>⭐ {totalPoints} pts</Text>
            </View>
          </View>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${levelPct * 100}%` }]} />
          </View>
          <Text style={styles.levelHint}>{totalPoints % 200} / 200 pts to level {level + 1}</Text>
        </View>
      </LinearGradient>

      {/* ── TODAY HIGHLIGHT ────────────────────────────────────────────── */}
      <View style={styles.todayWrap}>
        <LinearGradient colors={['#0e3d0e', '#1a5c1a']} style={styles.todayCard}>
          <View style={styles.todayLeft}>
            <Text style={styles.todayLabel}>Today's Emissions</Text>
            <Text style={styles.todayVal}>{today.co2e.toFixed(2)} <Text style={styles.todayUnit}>kg CO₂</Text></Text>
            <Text style={styles.todayLogs}>{today.count} activit{today.count !== 1 ? 'ies' : 'y'} logged</Text>
          </View>
          <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('LogActivity')}>
            <Text style={styles.logBtnText}>+ Log</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ── QUICK ACTIONS HORIZONTAL ───────────────────────────────────── */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHead}>⚡ Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {[
            { label: 'Log Activity', icon: '➕', screen: 'LogActivity', colors: ['#2E7D32','#1B5E20'] },
            { label: 'Reports',      icon: '📊', screen: 'Reports',     colors: ['#00695C','#004D40'] },
            { label: 'Eco Coach',    icon: '🤖', screen: 'Chatbot',     colors: ['#1565C0','#0D47A1'] },
            { label: 'Leaderboard', icon: '🏆', screen: 'Leaderboard', colors: ['#6A1B9A','#4A148C'] },
            { label: 'Alerts',       icon: '🔔', screen: 'Alerts',      colors: ['#E65100','#BF360C'] },
            { label: 'Share Score',  icon: '📤', screen: 'Share',       colors: ['#00838F','#006064'] },
            { label: 'Eco Spots',    icon: '🗺️', screen: 'EcoSpots',   colors: ['#558B2F','#33691E'] },
            { label: 'Offset',       icon: '🌱', screen: 'Offset',      colors: ['#37474F','#263238'] },
          ].map((a, i) => (
            <TouchableOpacity key={i} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.85} style={styles.actionPill}>
              <LinearGradient colors={a.colors} style={styles.actionPillGrad}>
                <Text style={styles.actionPillIcon}>{a.icon}</Text>
                <Text style={styles.actionPillLabel}>{a.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── STATS CARDS 2×2 ────────────────────────────────────────────── */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHead}>📋 Your Stats</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Monthly CO₂', value: `${monthly.total.toFixed(0)} kg`, icon: '📅', bg: '#0e3d0e' },
            { label: 'Badges',      value: badges.length,                     icon: '🏅', bg: '#1a1a3d' },
            { label: 'Activities',  value: stats?.totalActivities ?? 0,       icon: '📝', bg: '#2d1a00' },
            { label: 'Streak',      value: `${streak} days`,                  icon: '🔥', bg: '#3d0d0d' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 7-DAY CHART ─────────────────────────────────────────────────── */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHead}>📈 7-Day Emission Trend</Text>
        <View style={styles.chartBox}>
          {hasChart ? (
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: chartValues, color: () => '#00E676', strokeWidth: 2.5 }] }}
              width={W - 40}
              height={195}
              chartConfig={chartCfg}
              bezier
              style={{ borderRadius: 16 }}
              withInnerLines={false}
              withDots
            />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>Log activities to see your emission trend</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('LogActivity')}>
                <Text style={styles.emptyBtnText}>+ Log Activity Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── CATEGORY LIST ───────────────────────────────────────────────── */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHead}>📂 Category Breakdown</Text>
        <View style={styles.catList}>
          {Object.entries(CAT_META).map(([key, meta]) => {
            const found = monthly.breakdown.find(b => b._id === key);
            const kg    = found?.total ?? 0;
            const pct   = monthly.total > 0 ? (kg / monthly.total) * 100 : 0;
            return (
              <TouchableOpacity
                key={key}
                style={styles.catRow}
                onPress={() => navigation.navigate('LogActivity', { category: key })}
                activeOpacity={0.8}
              >
                <View style={[styles.catIconBox, { backgroundColor: meta.color + '22' }]}>
                  <Text style={styles.catEmoji}>{meta.icon}</Text>
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTopRow}>
                    <Text style={styles.catName}>{meta.label}</Text>
                    <Text style={[styles.catKg, { color: meta.color }]}>{kg.toFixed(1)} kg</Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View style={[styles.catFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                  </View>
                  <Text style={styles.catPct}>{pct.toFixed(0)}% of monthly total</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── MONTHLY PIE ─────────────────────────────────────────────────── */}
      {pieData.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHead}>🥧 Monthly CO₂ by Category</Text>
          <View style={styles.chartBox}>
            <PieChart
              data={pieData}
              width={W - 40}
              height={180}
              chartConfig={chartCfg}
              accessor="co2"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </View>
        </View>
      )}

      {/* ── ACHIEVEMENTS ────────────────────────────────────────────────── */}
      <LinearGradient colors={['#0A2E0A', '#163d16']} style={styles.achieveSection}>
        <Text style={styles.achieveHead}>🏆 Achievements & Badges</Text>

        {badges.length === 0 ? (
          <Text style={styles.achieveEmpty}>Log eco-friendly activities to earn your first badge!</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
            {badges.map((b, i) => (
              <View key={i} style={styles.badgePill}>
                <Text style={styles.badgeIcon}>{b.icon}</Text>
                <Text style={styles.badgeName}>{b.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Next goal */}
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>🎯 Next Goal</Text>
          {streak < 7
            ? <Text style={styles.goalText}>🔥 Log activities <Text style={styles.goalHighlight}>{7 - streak} more day{7 - streak !== 1 ? 's' : ''}</Text> to earn the <Text style={styles.goalHighlight}>7-Day Streak</Text> badge!</Text>
            : streak < 30
            ? <Text style={styles.goalText}>⚡ Just <Text style={styles.goalHighlight}>{30 - streak} more days</Text> for the <Text style={styles.goalHighlight}>30-Day Streak</Text> badge!</Text>
            : <Text style={styles.goalText}>🌟 You're a legend! Keep your streak going!</Text>
          }
        </View>
      </LinearGradient>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerLine}>🌍 Emissions calculated per IPCC AR6 · GHG Protocol standards</Text>
        <Text style={styles.footerLine}>Data privacy compliant · GDPR · ISO 14064</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const chartCfg = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: '#0d2b0d',
  backgroundGradientTo: '#1a3d1a',
  decimalPlaces: 1,
  color: (o = 1) => `rgba(0,230,118,${o})`,
  labelColor: () => 'rgba(255,255,255,0.6)',
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#00E676' },
  propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255,255,255,0.05)' },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071407' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header:       { paddingTop: 54, paddingBottom: 24, paddingHorizontal: 20 },
  greetRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetHi:      { fontSize: 20, fontWeight: '800', color: '#fff' },
  greetSub:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  streakPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,64,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,215,64,0.35)' },
  streakEmoji:  { fontSize: 16 },
  streakNum:    { fontSize: 18, fontWeight: '900', color: '#FFD740' },
  streakDay:    { fontSize: 11, color: '#FFD740', fontWeight: '600' },

  // Score ring centered
  scoreCenter:  { alignItems: 'center', marginBottom: 22 },
  scoreRingOuter:{ width: 128, height: 128, borderRadius: 64, borderWidth: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scoreRingInner:{ width: 104, height: 104, borderRadius: 52, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  scoreNum:     { fontSize: 32, fontWeight: '900' },
  scoreCaption: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 1.2 },
  scoreStatus:  { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scoreRef:     { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  // Level bar
  levelBox:     { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14 },
  levelTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelName:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  ptsPill:      { backgroundColor: 'rgba(255,215,64,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,215,64,0.35)' },
  ptsLabel:     { fontSize: 11, color: '#FFD740', fontWeight: '700' },
  levelTrack:   { height: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  levelFill:    { height: 7, backgroundColor: '#00E676', borderRadius: 4 },
  levelHint:    { fontSize: 10, color: 'rgba(255,255,255,0.45)' },

  // Today card
  todayWrap:    { paddingHorizontal: 16, marginTop: 16 },
  todayCard:    { borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  todayLeft:    { flex: 1 },
  todayLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600', marginBottom: 4 },
  todayVal:     { fontSize: 30, fontWeight: '900', color: '#00E676' },
  todayUnit:    { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  todayLogs:    { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  logBtn:       { backgroundColor: '#00E676', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 12 },
  logBtnText:   { color: '#052e05', fontWeight: '900', fontSize: 14 },

  // Section wrapper
  sectionWrap:  { paddingHorizontal: 16, marginTop: 20 },
  sectionHead:  { fontSize: 15, fontWeight: '800', color: '#E8F5E9', marginBottom: 12 },

  // Horizontal scroll actions
  hScroll:      { gap: 10, paddingBottom: 4 },
  actionPill:   { borderRadius: 14, overflow: 'hidden' },
  actionPillGrad:{ paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', minWidth: 90 },
  actionPillIcon:{ fontSize: 24, marginBottom: 6 },
  actionPillLabel:{ fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },

  // Stats 2x2 grid
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:     { width: '47.5%', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statIcon:     { fontSize: 26, marginBottom: 8 },
  statVal:      { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  statLbl:      { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  // Chart box
  chartBox:     { backgroundColor: '#0d2b0d', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.12)', overflow: 'hidden' },
  emptyBox:     { alignItems: 'center', paddingVertical: 36 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyText:    { color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center' },
  emptyBtn:     { marginTop: 16, backgroundColor: '#00E676', borderRadius: 22, paddingHorizontal: 26, paddingVertical: 11 },
  emptyBtnText: { color: '#052e05', fontWeight: '900', fontSize: 14 },

  // Category list
  catList:      { gap: 10 },
  catRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e1e0e', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 14 },
  catIconBox:   { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catEmoji:     { fontSize: 24 },
  catInfo:      { flex: 1 },
  catTopRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName:      { fontSize: 14, fontWeight: '700', color: '#fff' },
  catKg:        { fontSize: 14, fontWeight: '800' },
  catTrack:     { height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  catFill:      { height: 5, borderRadius: 3 },
  catPct:       { fontSize: 10, color: 'rgba(255,255,255,0.4)' },

  // Achievements
  achieveSection:{ marginTop: 20, padding: 20 },
  achieveHead:  { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 14 },
  achieveEmpty: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  badgeRow:     { gap: 8, paddingBottom: 14 },
  badgePill:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  badgeIcon:    { fontSize: 17 },
  badgeName:    { fontSize: 12, color: '#fff', fontWeight: '700' },
  goalCard:     { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,64,0.2)' },
  goalTitle:    { fontSize: 12, fontWeight: '800', color: '#FFD740', marginBottom: 6 },
  goalText:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 19 },
  goalHighlight:{ color: '#FFD740', fontWeight: '800' },

  // Footer
  footer:       { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, marginTop: 8 },
  footerLine:   { fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 3 },
});
