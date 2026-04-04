import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { getActivitySummary } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

const W = Dimensions.get('window').width;

const CAT_META = {
  transport: { icon: '🚗', color: '#4FC3F7', label: 'Transport' },
  food:      { icon: '🍽️', color: '#81C784', label: 'Food'      },
  energy:    { icon: '⚡', color: '#FFD54F', label: 'Energy'    },
  shopping:  { icon: '🛍️', color: '#CE93D8', label: 'Shopping'  },
};

const scoreColor  = (s) => s >= 70 ? '#00E676' : s >= 40 ? '#FFD740' : '#FF5252';
const scoreLabel  = (s) => s >= 70 ? 'Excellent 🌟' : s >= 40 ? 'Average ⚡' : 'Needs Work ⚠️';
const levelTitle  = (l) => ['', 'Seedling', 'Sapling', 'Green Leaf', 'Eco Warrior', 'Climate Hero', 'Earth Guardian'][Math.min(l, 6)] || 'Earth Guardian';

// ── Glass card component ──────────────────────────────────────────────────────
function GlassCard({ children, style }) {
  return (
    <View style={[glassStyles.glass, style]}>
      {children}
    </View>
  );
}

const glassStyles = StyleSheet.create({
  glass: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
});

// ── Animated circular score ───────────────────────────────────────────────────
function EcoScoreRing({ score }) {
  const color = scoreColor(score);
  return (
    <View style={ringStyles.wrap}>
      <View style={[ringStyles.outer, { borderColor: color + '40' }]}>
        <View style={[ringStyles.inner, { borderColor: color }]}>
          <Text style={[ringStyles.num, { color }]}>{score}</Text>
          <Text style={ringStyles.label}>ECO SCORE</Text>
        </View>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap:  { alignItems: 'center', justifyContent: 'center' },
  outer: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 90,  height: 90,  borderRadius: 45, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  num:   { fontSize: 26, fontWeight: '900' },
  label: { fontSize: 9,  color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 },
});

// ── Gamification badge pill ───────────────────────────────────────────────────
function BadgePill({ badge }) {
  return (
    <View style={badgeStyles.pill}>
      <Text style={badgeStyles.icon}>{badge.icon}</Text>
      <Text style={badgeStyles.name}>{badge.name}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  icon: { fontSize: 16 },
  name: { fontSize: 11, color: '#fff', fontWeight: '700' },
});

export default function DashboardScreen({ navigation }) {
  const { user }                      = useAuth();
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#00E676" colors={["#00E676"]} />}
    >
      {/* ── Hero gradient header ─────────────────────────────────────── */}
      <LinearGradient colors={['#0A2E0A', '#1B5E20', '#2E7D32']} style={styles.hero}>

        {/* User row */}
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreet}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.heroLevel}>Lv.{level} — {levelTitle(level)}</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakText}>🔥 {streak}-day streak</Text>
              <View style={styles.ptsBadge}><Text style={styles.ptsText}>⭐ {totalPoints} pts</Text></View>
            </View>
          </View>
          <EcoScoreRing score={ecoScore} />
        </View>

        {/* Level progress bar */}
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Level {level} → {level + 1}</Text>
          <Text style={styles.levelPts}>{totalPoints % 200}/200 pts</Text>
        </View>
        <View style={styles.levelBarBg}>
          <View style={[styles.levelBarFill, { width: `${levelPct * 100}%` }]} />
        </View>

        {/* Score status */}
        <View style={styles.scoreStatusRow}>
          <Text style={[styles.scoreStatus, { color: scoreColor(ecoScore) }]}>
            {scoreLabel(ecoScore)}
          </Text>
          <Text style={styles.scoreHint}>World avg: 400 kg CO₂/month</Text>
        </View>
      </LinearGradient>

      {/* ── Quick stats ──────────────────────────────────────────────── */}
      <LinearGradient colors={['#1B5E20', '#0d3d14']} style={styles.statsGradient}>
        <View style={styles.statsRow}>
          {[
            { label: "Today",   value: `${today.co2e.toFixed(1)}kg`, icon: '🌍', sub: 'CO₂ emitted' },
            { label: "Monthly", value: `${monthly.total.toFixed(0)}kg`, icon: '📅', sub: 'This month' },
            { label: "Badges",  value: badges.length, icon: '🏅', sub: 'Earned' },
            { label: "Logs",    value: stats?.totalActivities ?? 0, icon: '📝', sub: 'Activities' },
          ].map((s, i) => (
            <GlassCard key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </GlassCard>
          ))}
        </View>
      </LinearGradient>

      {/* ── 7-Day chart ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 7-Day Emission Trend</Text>
        <View style={styles.chartCard}>
          {hasChart ? (
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: chartValues, color: () => '#00E676', strokeWidth: 2.5 }] }}
              width={W - 48}
              height={190}
              chartConfig={chartCfg}
              bezier
              style={{ borderRadius: 16 }}
              withInnerLines={false}
              withDots
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>Log activities to see your trends</Text>
              <TouchableOpacity style={styles.logNowBtn} onPress={() => navigation.navigate('LogActivity')}>
                <Text style={styles.logNowText}>+ Log Activity Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Monthly pie breakdown ─────────────────────────────────────── */}
      {pieData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥧 Monthly CO₂ Breakdown</Text>
          <View style={styles.chartCard}>
            <PieChart
              data={pieData}
              width={W - 48}
              height={180}
              chartConfig={chartCfg}
              accessor="co2"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </View>
        </View>
      )}

      {/* ── Category tiles ────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📂 Category Overview</Text>
        <View style={styles.catGrid}>
          {Object.entries(CAT_META).map(([key, meta]) => {
            const found = monthly.breakdown.find(b => b._id === key);
            const kg    = found?.total ?? 0;
            const pct   = monthly.total > 0 ? (kg / monthly.total) * 100 : 0;
            return (
              <TouchableOpacity
                key={key}
                style={styles.catCard}
                onPress={() => navigation.navigate('LogActivity', { category: key })}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[meta.color + '30', meta.color + '10']} style={styles.catGrad}>
                  <Text style={styles.catIcon}>{meta.icon}</Text>
                  <Text style={[styles.catKg, { color: meta.color }]}>{kg.toFixed(1)} kg</Text>
                  <Text style={styles.catLabel}>{meta.label}</Text>
                  <View style={styles.catBarBg}>
                    <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                  </View>
                  <Text style={styles.catPct}>{pct.toFixed(0)}% of total</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Gamification: Badges ─────────────────────────────────────── */}
      <LinearGradient colors={['#0A2E0A', '#1B5E20']} style={styles.gamifSection}>
        <Text style={styles.gamifTitle}>🏆 Achievements & Badges</Text>
        {badges.length === 0 ? (
          <Text style={styles.gamifEmpty}>Log eco-friendly activities to earn your first badge!</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
            {badges.map((b, i) => <BadgePill key={i} badge={b} />)}
          </ScrollView>
        )}

        {/* Next badge hint */}
        <GlassCard style={styles.nextBadge}>
          <Text style={styles.nextBadgeTitle}>🎯 Next Goal</Text>
          {streak < 7
            ? <Text style={styles.nextBadgeText}>🔥 Log activities {7 - streak} more day{7 - streak !== 1 ? 's' : ''} to earn the <Text style={{ color: '#FFD740', fontWeight: '700' }}>7-Day Streak</Text> badge!</Text>
            : streak < 30
            ? <Text style={styles.nextBadgeText}>⚡ Keep going! {30 - streak} more days for the <Text style={{ color: '#FFD740', fontWeight: '700' }}>30-Day Streak</Text> badge!</Text>
            : <Text style={styles.nextBadgeText}>🌟 You're a legend! Keep your streak going!</Text>
          }
        </GlassCard>
      </LinearGradient>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleDark}>⚡ Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'Log Activity',  icon: '➕', screen: 'LogActivity',  grad: ['#2E7D32','#1B5E20'] },
            { label: 'CO₂ Reports',   icon: '📊', screen: 'Reports',      grad: ['#00695C','#004D40'] },
            { label: 'Eco Coach',     icon: '🤖', screen: 'Chatbot',      grad: ['#1565C0','#0D47A1'] },
            { label: 'Leaderboard',   icon: '🏆', screen: 'Leaderboard',  grad: ['#6A1B9A','#4A148C'] },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.85}>
              <LinearGradient colors={a.grad} style={styles.actionGrad}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Eco Features ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleDark}>🌍 Eco Features</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'Alerts',        icon: '🔔', screen: 'Alerts',    grad: ['#E65100','#BF360C'] },
            { label: 'Share Score',   icon: '📤', screen: 'Share',     grad: ['#00838F','#006064'] },
            { label: 'Eco Spots',     icon: '🗺️', screen: 'EcoSpots', grad: ['#558B2F','#33691E'] },
            { label: 'Carbon Offset', icon: '🌱', screen: 'Offset',    grad: ['#37474F','#263238'] },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.85}>
              <LinearGradient colors={a.grad} style={styles.actionGrad}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>🌍 Emissions calculated per IPCC AR6 · GHG Protocol standards</Text>
        <Text style={styles.footerText}>Data privacy compliant · GDPR · ISO 14064</Text>
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
  container:    { flex: 1, backgroundColor: '#0A1A0A' },

  // Hero
  hero:         { paddingTop: 52, paddingBottom: 20, paddingHorizontal: Spacing.lg },
  heroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroGreet:    { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroLevel:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  streakRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  streakText:   { fontSize: 13, color: '#FFD740', fontWeight: '700' },
  ptsBadge:     { backgroundColor: 'rgba(255,215,64,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,64,0.4)' },
  ptsText:      { fontSize: 11, color: '#FFD740', fontWeight: '700' },
  levelRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  levelPts:     { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  levelBarBg:   { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  levelBarFill: { height: 6, backgroundColor: '#00E676', borderRadius: 3 },
  scoreStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreStatus:  { fontSize: 14, fontWeight: '800' },
  scoreHint:    { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  // Stats
  statsGradient:{ paddingVertical: 16, paddingHorizontal: Spacing.md },
  statsRow:     { flexDirection: 'row', gap: 8 },
  statCard:     { flex: 1, padding: 10, alignItems: 'center' },
  statIcon:     { fontSize: 20, marginBottom: 4 },
  statValue:    { fontSize: 15, fontWeight: '800', color: '#fff' },
  statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginTop: 1 },
  statSub:      { fontSize: 9,  color: 'rgba(255,255,255,0.5)' },

  // Sections
  section:      { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 10 },
  sectionTitleDark: { fontSize: 15, fontWeight: '800', color: '#E8F5E9', marginBottom: 10 },

  // Charts
  chartCard:    { backgroundColor: '#0d2b0d', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.15)', overflow: 'hidden' },
  emptyChart:   { alignItems: 'center', paddingVertical: 32 },
  emptyIcon:    { fontSize: 44, marginBottom: 10 },
  emptyText:    { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  logNowBtn:    { marginTop: 14, backgroundColor: '#00E676', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  logNowText:   { color: '#0A2E0A', fontWeight: '800', fontSize: 14 },

  // Category grid
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard:      { width: '47.5%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  catGrad:      { padding: 14 },
  catIcon:      { fontSize: 26, marginBottom: 6 },
  catKg:        { fontSize: 20, fontWeight: '800' },
  catLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  catBarBg:     { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  catBarFill:   { height: 4, borderRadius: 2 },
  catPct:       { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  // Gamification
  gamifSection: { marginTop: Spacing.md, padding: Spacing.lg },
  gamifTitle:   { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
  gamifEmpty:   { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  badgeScroll:  { gap: 8, paddingBottom: 12 },
  nextBadge:    { marginTop: 12, padding: 14 },
  nextBadgeTitle: { fontSize: 12, fontWeight: '800', color: '#FFD740', marginBottom: 4 },
  nextBadgeText:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },

  // Actions
  actionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard:   { width: '47.5%', borderRadius: 16, overflow: 'hidden' },
  actionGrad:   { padding: 18, alignItems: 'center', justifyContent: 'center' },
  actionIcon:   { fontSize: 30, marginBottom: 8 },
  actionLabel:  { fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' },

  // Footer
  footer:       { alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg },
  footerText:   { fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 4 },
});
