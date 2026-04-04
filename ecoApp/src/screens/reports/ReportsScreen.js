import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { getActivitySummary, getActivities, getAISuggestions } from '../../api/api';
import Loading from '../../components/Loading';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

const W = Dimensions.get('window').width;

const catColor = { transport: '#1565C0', food: '#2E7D32', energy: '#F57F17', shopping: '#6A1B9A' };
const impactColor = { high: '#2E7D32', medium: '#F57F17', low: '#1565C0' };

export default function ReportsScreen({ navigation }) {
  const [summary, setSummary]         = useState(null);
  const [activities, setActivities]   = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [aiLoading, setAiLoading]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, actRes] = await Promise.all([
        getActivitySummary(),
        getActivities({ days: 30, limit: 50 }),
      ]);
      setSummary(sumRes.data);
      setActivities(actRes.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await getAISuggestions();
      setSuggestions(res.data.suggestions || []);
    } catch { /* ignore */ }
    finally { setAiLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); fetchSuggestions(); }, [fetchAll, fetchSuggestions]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchAll(); fetchSuggestions(); });
    return unsub;
  }, [navigation, fetchAll, fetchSuggestions]);

  if (loading) return <Loading message="Loading reports..." />;

  const weekly  = summary?.weekly  ?? [];
  const monthly = summary?.monthly ?? { breakdown: [], total: 0 };
  const stats   = summary?.stats;

  const barLabels = monthly.breakdown.map(b => b._id.slice(0, 4));
  const barValues = monthly.breakdown.map(b => parseFloat(b.total.toFixed(1)));

  const lineLabels = weekly.map(d => d.label);
  const lineValues = weekly.map(d => parseFloat(d.co2e.toFixed(2)));
  const hasLine    = lineValues.some(v => v > 0);
  const hasBar     = barValues.some(v => v > 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={Colors.primary} colors={[Colors.primary]} />}
    >
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>📊</Text>
        <Text style={styles.heroTitle}>Carbon Reports</Text>
        <Text style={styles.heroSub}>Your 30-day emission analysis</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        {[
          { label: 'Monthly Total', value: `${monthly.total.toFixed(1)} kg`, icon: '📅', color: Colors.primary },
          { label: 'Eco Score',     value: stats?.ecoScore ?? 50,            icon: '🌍', color: Colors.success },
          { label: 'Streak',        value: `${stats?.currentStreak ?? 0}d`,  icon: '🔥', color: Colors.warning },
          { label: 'Activities',    value: stats?.totalActivities ?? 0,       icon: '📝', color: Colors.secondary },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { borderTopColor: s.color }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* 7-Day Line Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📈 Daily Emissions (7 Days)</Text>
        <Text style={styles.cardSub}>kg CO₂ per day</Text>
        {hasLine ? (
          <LineChart
            data={{ labels: lineLabels, datasets: [{ data: lineValues, color: () => Colors.primary, strokeWidth: 2 }] }}
            width={W - 64}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={{ marginTop: 10, borderRadius: Radii.md }}
            withInnerLines={false}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data yet — log some activities to see trends</Text>
          </View>
        )}
      </View>

      {/* Monthly Bar Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Monthly by Category</Text>
        <Text style={styles.cardSub}>kg CO₂ breakdown</Text>
        {hasBar ? (
          <BarChart
            data={{ labels: barLabels, datasets: [{ data: barValues }] }}
            width={W - 64}
            height={180}
            chartConfig={barChartConfig}
            style={{ marginTop: 10, borderRadius: Radii.md }}
            showValuesOnTopOfBars
            fromZero
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No monthly data yet</Text>
          </View>
        )}
      </View>

      {/* Category Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗂️ Category Breakdown</Text>
        {monthly.breakdown.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No data yet</Text></View>
        ) : (
          monthly.breakdown.map((b, i) => {
            const pct = monthly.total > 0 ? (b.total / monthly.total) * 100 : 0;
            const color = catColor[b._id] ?? Colors.primary;
            return (
              <View key={i} style={styles.catRow}>
                <View style={styles.catMeta}>
                  <Text style={styles.catName}>{b._id.charAt(0).toUpperCase() + b._id.slice(1)}</Text>
                  <Text style={styles.catKg}>{b.total.toFixed(1)} kg · {pct.toFixed(0)}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* AI Suggestions */}
      <View style={styles.card}>
        <View style={styles.aiHeader}>
          <Text style={styles.cardTitle}>🤖 AI Suggestions</Text>
          <Text style={styles.aiBadge}>Powered by Gemini</Text>
        </View>
        <Text style={styles.cardSub}>Personalized eco-friendly tips based on your data</Text>
        {aiLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Generating personalized tips...</Text>
          </View>
        ) : suggestions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Log activities to get AI suggestions</Text>
          </View>
        ) : (
          suggestions.map((s, i) => (
            <View key={i} style={[styles.suggestionRow, { borderLeftColor: impactColor[s.impact] || '#2E7D32' }]}>
              <Text style={styles.suggestionIcon}>{s.icon}</Text>
              <View style={styles.suggestionBody}>
                <View style={styles.suggestionTop}>
                  <Text style={styles.suggestionTitle}>{s.title}</Text>
                  <View style={[styles.impactBadge, { backgroundColor: impactColor[s.impact] + '20' }]}>
                    <Text style={[styles.impactText, { color: impactColor[s.impact] }]}>{s.impact} impact</Text>
                  </View>
                </View>
                <Text style={styles.suggestionTip}>{s.tip}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Activities */}
      <Text style={styles.sectionTitle}>📋 Recent Activities</Text>
      {activities.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Text style={styles.emptyText}>No activities logged yet</Text>
        </View>
      ) : (
        activities.slice(0, 10).map((a, i) => (
          <View key={i} style={styles.actRow}>
            <View style={[styles.actDot, { backgroundColor: catColor[a.category] ?? Colors.primary }]} />
            <View style={styles.actInfo}>
              <Text style={styles.actLabel}>{a.label}</Text>
              <Text style={styles.actMeta}>{a.value} {a.unit} · {new Date(a.date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.actCo2, { color: a.co2e < 2 ? Colors.success : Colors.warning }]}>
              {a.co2e.toFixed(2)} kg
            </Text>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: Colors.white, backgroundGradientFrom: Colors.white, backgroundGradientTo: Colors.white,
  decimalPlaces: 1, color: (o = 1) => `rgba(46,125,50,${o})`, labelColor: () => Colors.textMuted,
  propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
};
const barChartConfig = {
  backgroundColor: Colors.white, backgroundGradientFrom: Colors.white, backgroundGradientTo: Colors.white,
  decimalPlaces: 0, color: (o = 1) => `rgba(0,137,123,${o})`, labelColor: () => Colors.textMuted,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { backgroundColor: Colors.secondary, alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  heroIcon:  { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: Colors.white },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsRow:  { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginTop: Spacing.md },
  statCard:  { flex: 1, backgroundColor: Colors.white, borderRadius: Radii.lg, padding: 10, alignItems: 'center', borderTopWidth: 3, ...Shadow.sm },
  statIcon:  { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  card:      { backgroundColor: Colors.white, margin: Spacing.md, marginTop: Spacing.sm, borderRadius: Radii.lg, padding: Spacing.md, ...Shadow.sm },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.dark },
  cardSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty:     { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  catRow:    { marginVertical: 8 },
  catMeta:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName:   { fontSize: 13, fontWeight: '700', color: Colors.dark },
  catKg:     { fontSize: 12, color: Colors.textMuted },
  barBg:     { height: 10, backgroundColor: Colors.background, borderRadius: 5, overflow: 'hidden' },
  barFill:   { height: 10, borderRadius: 5 },
  aiHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiBadge:   { fontSize: 10, fontWeight: '700', color: '#1565C0', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, paddingLeft: 10, borderLeftWidth: 3 },
  suggestionIcon: { fontSize: 22, marginRight: 10, marginTop: 2 },
  suggestionBody: { flex: 1 },
  suggestionTop:  { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  suggestionTitle:{ fontSize: 13, fontWeight: '800', color: Colors.dark, flex: 1 },
  impactBadge:    { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 },
  impactText:     { fontSize: 10, fontWeight: '700' },
  suggestionTip:  { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.dark, marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4 },
  actRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginBottom: 6, borderRadius: Radii.md, padding: 12, ...Shadow.sm },
  actDot:    { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  actInfo:   { flex: 1 },
  actLabel:  { fontSize: 13, fontWeight: '700', color: Colors.dark },
  actMeta:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  actCo2:    { fontSize: 13, fontWeight: '800' },
});
