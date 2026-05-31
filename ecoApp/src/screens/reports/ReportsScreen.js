import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions, Platform,
  Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { getActivitySummary, getAISuggestions } from '../../api/api';
import ScreenTransition from '../../components/ScreenTransition';
import { useAppTheme, buildC } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// ── Donut chart: draws each segment progressively clockwise ───────────────────
function DonutChart({ data, total, size = 134, stroke = 17 }) {
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
      {/* Background track */}
      <Circle cx={CENTER} cy={CENTER} r={R}
              fill="none" stroke="#E8EDE5" strokeWidth={stroke} />
      <G rotation="-90" origin={`${CENTER},${CENTER}`}>
        {data.map((seg, i) => {
          const finalPct = total > 0 ? seg.value / total : 0;
          const startPct = cumPct;
          const endPct   = cumPct + finalPct;

          // How much of this segment is visible right now
          let visPct = 0;
          if      (prog >= endPct)   visPct = finalPct;
          else if (prog >  startPct) visPct = prog - startPct;

          cumPct += finalPct;
          if (visPct <= 0.001) return null;

          const segLen = Math.max(CIRC * visPct - 2, 0);
          return (
            <Circle key={i}
              cx={CENTER} cy={CENTER} r={R}
              fill="none"
              stroke={seg.color}
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

// ── Dark Glass Theme tokens ────────────────────────────────────────────────────
// C is rebuilt dynamically inside the component via buildC(appTheme)

const CATS = {
  transport: { icon: '🚗', label: 'Transport', bg: 'rgba(90,200,250,0.09)',   bar: '#5AC8FA', accent: '#5AC8FA' },
  food:      { icon: '🍽️', label: 'Diet',      bg: 'rgba(178,208,84,0.09)',   bar: '#B2D054', accent: '#B2D054' },
  energy:    { icon: '⚡',  label: 'Energy',    bg: 'rgba(245,158,11,0.09)',   bar: '#F59E0B', accent: '#F59E0B' },
  shopping:  { icon: '🛍️', label: 'Shopping',  bg: 'rgba(244,63,94,0.09)',    bar: '#F43F5E', accent: '#F43F5E' },
};

const CAT_ORDER = ['transport', 'food', 'energy', 'shopping'];

const IMPACT_COLOR  = { high: '#5AC8FA', medium: '#F59E0B', low: '#F43F5E' };

// Professional palette for donut chart
const DONUT_COLORS = {
  transport: '#5AC8FA',
  food:      '#B2D054',
  energy:    '#F59E0B',
  shopping:  '#A855F7',
};

const DEFAULT_LIMIT = 6.8;

export default function ReportsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme: appTheme } = useAppTheme();
  const C = useMemo(() => buildC(appTheme), [appTheme]);
  const s = useMemo(() => makeStyles(C), [C]);
  const DAILY_LIMIT = user?.dailyThreshold ?? DEFAULT_LIMIT;
  const [summary, setSummary]         = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [aiLoading, setAiLoading]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const barAnim = useRef(new Animated.Value(0)).current;
  const [barProg, setBarProg] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const sumRes = await getActivitySummary();
      setSummary(sumRes.data);
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

  useEffect(() => {
    fetchAll();
    fetchSuggestions();
    // Kick off bar animation on mount
    const id = barAnim.addListener(({ value }) => setBarProg(value));
    Animated.timing(barAnim, {
      toValue: 1, duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    return () => barAnim.removeListener(id);
  }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchAll(); fetchSuggestions(); });
    return unsub;
  }, [navigation]);

  if (loading) {
    return (
      <LinearGradient colors={appTheme.bgGrad} style={s.loader}>
        <ActivityIndicator size="large" color={C.green600} />
        <Text style={s.loaderTxt}>Loading your carbon reports…</Text>
      </LinearGradient>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const weekly  = summary?.weekly  ?? [];
  const monthly = summary?.monthly ?? { breakdown: [], total: 0 };
  const stats   = summary?.stats   ?? {};
  const daily30 = summary?.daily30 ?? [];
  const weekly4 = summary?.weekly4 ?? [];

  const todayStr     = new Date().toISOString().slice(0, 10);
  const monthlyTotal = parseFloat((monthly.total ?? 0).toFixed(1));

  // Daily-tab stats (30 days)
  const maxDaily30   = Math.max(...daily30.map(d => d.co2e), 0.1);
  const daily30Avg   = parseFloat((daily30.reduce((s, d) => s + d.co2e, 0) / 30).toFixed(1));
  const daily30Best  = [...daily30].sort((a, b) => a.co2e - b.co2e).find(d => d.co2e > 0);

  // Weekly-tab stats
  const maxWeekly4   = Math.max(...weekly4.map(w => w.co2e), 0.1);
  const weekly4Total = parseFloat(weekly4.reduce((s, w) => s + w.co2e, 0).toFixed(1));
  const weekly4Avg   = weekly4.length > 0 ? parseFloat((weekly4Total / weekly4.length).toFixed(1)) : 0;
  const weekly4Best  = [...weekly4].sort((a, b) => a.co2e - b.co2e).find(w => w.co2e > 0);

  // Monthly: build full 4-category array (fill missing with 0)
  const monthBreakdown = CAT_ORDER.map(cat => {
    const found = monthly.breakdown.find(b => b._id === cat);
    return { cat, total: found?.total ?? 0, count: found?.count ?? 0 };
  });

  return (
    <ScreenTransition>
    <LinearGradient colors={appTheme.bgGrad} style={{ flex: 1 }}>
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchAll(); }}
          tintColor={C.green600}
          colors={[C.green600]}
        />
      }
    >
      {/* ══════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════ */}
      <LinearGradient colors={[C.green50, C.teal50, 'transparent']} style={s.header}>
        <Text style={s.headerTitle}>📊 Carbon Reports</Text>
        <Text style={s.headerSub}>Your 30-day emission analysis</Text>

        {/* 4 summary pills inside header */}
        <View style={s.summaryRow}>
          {[
            { label: 'Monthly Total', value: `${monthlyTotal} kg`, icon: '📅', color: C.teal100   },
            { label: 'Eco Score',     value: stats.ecoScore ?? 50, icon: '🌍', color: C.green100  },
            { label: 'Day Streak',    value: `${stats.currentStreak ?? 0}d`, icon: '🔥', color: C.amber100 },
            { label: 'Activities',    value: stats.totalActivities ?? 0,      icon: '📝', color: C.coral100 },
          ].map((p, i) => (
            <View key={i} style={s.summaryPill}>
              <Text style={s.summaryPillIcon}>{p.icon}</Text>
              <Text style={[s.summaryPillVal, { color: p.color }]}>{p.value}</Text>
              <Text style={s.summaryPillLbl}>{p.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ══════════════════════════════════════════════════════════════
          EMISSIONS OVERVIEW  — Daily / Weekly / Monthly tabs
      ══════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <View style={s.sectionHdr}>
          <Text style={s.sectionTitle}>📊 Emissions Overview</Text>
          <Text style={s.sectionSub}>Last 30 days</Text>
        </View>

        {/* Tab switcher */}
        <View style={s.tabRow}>
          {[
            { key: 'daily',   label: 'Daily'   },
            { key: 'weekly',  label: 'Weekly'  },
            { key: 'monthly', label: 'Monthly' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, activeTab === t.key && s.tabBtnActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnTxt, activeTab === t.key && s.tabBtnTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DAILY TAB: 30-day scrollable bar chart ── */}
        {activeTab === 'daily' && (
          <View>
            <View style={s.weekStatsRow}>
              <View style={[s.weekStat, { backgroundColor: C.teal50, borderColor: C.teal100 }]}>
                <Text style={s.weekStatVal}>{daily30Avg}</Text>
                <Text style={[s.weekStatLbl, { color: C.teal600 }]}>daily avg</Text>
              </View>
              <View style={[s.weekStat, { backgroundColor: C.green50, borderColor: C.green100 }]}>
                <Text style={s.weekStatVal}>{daily30Best ? parseFloat(daily30Best.co2e.toFixed(1)) : 0}</Text>
                <Text style={[s.weekStatLbl, { color: C.green600 }]}>best day</Text>
              </View>
              <View style={[s.weekStat, { backgroundColor: C.amber50, borderColor: C.amber100 }]}>
                <Text style={s.weekStatVal}>{DAILY_LIMIT}</Text>
                <Text style={[s.weekStatLbl, { color: C.amber600 }]}>daily limit</Text>
              </View>
            </View>

            <View style={s.dualChartCard}>
              <Text style={s.miniChartLabel}>Last 30 days · kg CO₂ per day</Text>
              {daily30.every(d => d.co2e === 0) ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>📭</Text>
                  <Text style={s.emptyTxt}>Log activities to see daily trends</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={s.daily30Area}>
                    {daily30.map((day, i) => {
                      const isToday  = day.date === todayStr;
                      const over     = day.co2e > DAILY_LIMIT;
                      const barColor = over ? C.coral600 : isToday ? C.teal600 : C.green600;
                      const h        = maxDaily30 > 0
                        ? Math.max((day.co2e / maxDaily30) * 80, day.co2e > 0 ? 4 : 0)
                        : 0;
                      return (
                        <View key={i} style={s.daily30Col}>
                          {day.co2e > 0 && (
                            <Text style={s.daily30Val}>{parseFloat(day.co2e.toFixed(1))}</Text>
                          )}
                          <View style={s.daily30Track}>
                            <View style={[s.daily30Fill, { height: h, backgroundColor: barColor, opacity: isToday ? 1 : 0.78 }]} />
                          </View>
                          <Text style={[s.daily30DayLbl, isToday && { color: C.teal600, fontWeight: '800' }]}>
                            {isToday ? '●' : day.dayLabel[0]}
                          </Text>
                          <Text style={s.daily30DateLbl}>{day.label.replace(' ', '\n')}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              <View style={[s.miniLegendRow, { marginTop: 12 }]}>
                {[{ c: C.teal600, l: 'Today' }, { c: C.green600, l: 'Under limit' }, { c: C.coral600, l: 'Over limit' }].map((l, i) => (
                  <View key={i} style={s.miniLegendItem}>
                    <View style={[s.miniLegendDot, { backgroundColor: l.c }]} />
                    <Text style={s.miniLegendTxt}>{l.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── WEEKLY TAB: week-by-week bar chart ── */}
        {activeTab === 'weekly' && (
          <View>
            <View style={s.weekStatsRow}>
              <View style={[s.weekStat, { backgroundColor: C.teal50, borderColor: C.teal100 }]}>
                <Text style={s.weekStatVal}>{weekly4Avg}</Text>
                <Text style={[s.weekStatLbl, { color: C.teal600 }]}>weekly avg</Text>
              </View>
              <View style={[s.weekStat, { backgroundColor: C.green50, borderColor: C.green100 }]}>
                <Text style={s.weekStatVal}>{weekly4Best ? parseFloat(weekly4Best.co2e.toFixed(1)) : 0}</Text>
                <Text style={[s.weekStatLbl, { color: C.green600 }]}>best week</Text>
              </View>
              <View style={[s.weekStat, { backgroundColor: C.amber50, borderColor: C.amber100 }]}>
                <Text style={s.weekStatVal}>{weekly4Total}</Text>
                <Text style={[s.weekStatLbl, { color: C.amber600 }]}>30-day total</Text>
              </View>
            </View>

            <View style={s.dualChartCard}>
              {weekly4.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>📭</Text>
                  <Text style={s.emptyTxt}>Log activities to see weekly trends</Text>
                </View>
              ) : (
                <View>
                  <Text style={s.miniChartLabel}>Last {weekly4.length} weeks · kg CO₂ per week</Text>
                  <View style={[s.barMiniArea, { height: 140, marginTop: 8 }]}>
                    {weekly4.map((week, i) => {
                      const isCurrent = i === weekly4.length - 1;
                      const h         = maxWeekly4 > 0
                        ? Math.max((week.co2e / maxWeekly4) * 100, week.co2e > 0 ? 4 : 0)
                        : 0;
                      const animH     = h * barProg;
                      const barColor  = isCurrent ? C.teal600 : C.green600;
                      return (
                        <View key={i} style={[s.miniBarCol, { justifyContent: 'flex-end', paddingBottom: 28 }]}>
                          <Text style={s.miniBarVal}>{week.co2e > 0 ? parseFloat(week.co2e.toFixed(1)) : ''}</Text>
                          <View style={[s.miniBarTrack, { height: 100 }]}>
                            <View style={[s.miniBarFill, { height: animH, backgroundColor: barColor, opacity: isCurrent ? 1 : 0.72 }]} />
                          </View>
                          <Text style={[s.miniBarLbl, isCurrent && { color: C.teal600, fontWeight: '800' }]}>
                            {isCurrent ? '●' : week.label}
                          </Text>
                          <Text style={s.weekStartLbl}>{week.weekStart}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={s.miniLegendRow}>
                    {[{ c: C.teal600, l: 'This week' }, { c: C.green600, l: 'Past weeks' }].map((l, i) => (
                      <View key={i} style={s.miniLegendItem}>
                        <View style={[s.miniLegendDot, { backgroundColor: l.c }]} />
                        <Text style={s.miniLegendTxt}>{l.l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── MONTHLY TAB: category grid + donut + stacked bar ── */}
        {activeTab === 'monthly' && (
          <View>
            <View style={s.weekStatsRow}>
              <View style={[s.weekStat, { backgroundColor: C.teal50, borderColor: C.teal100 }]}>
                <Text style={s.weekStatVal}>{monthlyTotal}</Text>
                <Text style={[s.weekStatLbl, { color: C.teal600 }]}>month total</Text>
              </View>
              <View style={[s.weekStat, { backgroundColor: C.green50, borderColor: C.green100 }]}>
                <Text style={s.weekStatVal}>{monthBreakdown.filter(b => b.total > 0).length}</Text>
                <Text style={[s.weekStatLbl, { color: C.green600 }]}>categories</Text>
              </View>
              <View style={[s.weekStat, { backgroundColor: C.amber50, borderColor: C.amber100 }]}>
                <Text style={s.weekStatVal}>{DAILY_LIMIT}</Text>
                <Text style={[s.weekStatLbl, { color: C.amber600 }]}>daily limit</Text>
              </View>
            </View>

            {/* 2×2 category cards */}
            <View style={s.catGrid}>
              {monthBreakdown.map(({ cat, total }) => {
                const m   = CATS[cat] ?? CATS.transport;
                const pct = monthlyTotal > 0 ? (total / monthlyTotal) * 100 : 0;
                const kg  = parseFloat(total.toFixed(1));
                return (
                  <View key={cat} style={[s.catCard, { backgroundColor: m.bg, borderColor: C.border }]}>
                    <View style={s.catCardTop}>
                      <Text style={s.catCardIcon}>{m.icon}</Text>
                      <Text style={[s.catCardPct, { color: m.accent }]}>{pct.toFixed(0)}%</Text>
                    </View>
                    <Text style={[s.catCardVal, { color: C.green800 }]}>{kg}</Text>
                    <Text style={s.catCardLbl}>{m.label} CO₂ (kg)</Text>
                    <View style={s.catBarBg}>
                      <View style={[s.catBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: m.bar }]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Donut + stacked bar */}
            {monthlyTotal > 0 && (() => {
              const donutData = monthBreakdown
                .filter(b => b.total > 0)
                .map(b => ({
                  value: b.total,
                  color: DONUT_COLORS[b.cat] ?? '#B2D054',
                  label: CATS[b.cat]?.label ?? b.cat,
                  pct:   monthlyTotal > 0 ? ((b.total / monthlyTotal) * 100).toFixed(0) : 0,
                }));
              return (
                <View style={s.dualChartCard}>
                  <View style={s.dualRow}>
                    <View style={s.donutSide}>
                      <Text style={s.miniChartLabel}>Monthly Split</Text>
                      <View style={s.donutWrap}>
                        <DonutChart data={donutData} total={monthlyTotal} size={130} stroke={18} />
                        <View style={s.donutCenter} pointerEvents="none">
                          <Text style={s.donutCenterVal}>{monthlyTotal.toFixed(0)}</Text>
                          <Text style={s.donutCenterUnit}>kg</Text>
                        </View>
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
                    <View style={s.divider} />
                    <View style={[s.barSide, { justifyContent: 'center' }]}>
                      <Text style={s.miniChartLabel}>Proportion</Text>
                      <View style={[s.stackedBar, { marginTop: 10 }]}>
                        {monthBreakdown.filter(b => b.total > 0).map(({ cat, total }) => {
                          const m   = CATS[cat];
                          const pct = (total / monthlyTotal) * 100;
                          return <View key={cat} style={[s.stackedSegment, { flex: pct, backgroundColor: m.bar }]} />;
                        })}
                      </View>
                      <View style={[s.stackedLegend, { marginTop: 14, flexDirection: 'column', gap: 6 }]}>
                        {monthBreakdown.filter(b => b.total > 0).map(({ cat, total }) => {
                          const m   = CATS[cat];
                          const pct = ((total / monthlyTotal) * 100).toFixed(0);
                          return (
                            <View key={cat} style={s.stackedLegendItem}>
                              <View style={[s.stackedDot, { backgroundColor: m.bar }]} />
                              <Text style={s.stackedLegendTxt}>{m.icon} {m.label} {pct}%</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════
          AI SUGGESTIONS
      ══════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <View style={s.sectionHdr}>
          <Text style={s.sectionTitle}>🤖 AI Suggestions</Text>
          <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>Gemini AI</Text></View>
        </View>
        <Text style={s.aiSub}>Personalised tips based on your data</Text>

        {aiLoading ? (
          <View style={s.emptyBox}>
            <ActivityIndicator size="small" color={C.teal600} />
            <Text style={s.emptyTxt}>Generating personalised tips…</Text>
          </View>
        ) : suggestions.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>💡</Text>
            <Text style={s.emptyTxt}>Log activities to receive AI suggestions</Text>
          </View>
        ) : (
          suggestions.map((sg, i) => {
            const ic = IMPACT_COLOR[sg.impact] ?? C.teal600;
            return (
              <View key={i} style={[s.sugRow, { borderLeftColor: ic }]}>
                <Text style={s.sugIcon}>{sg.icon ?? '🌱'}</Text>
                <View style={s.sugBody}>
                  <View style={s.sugTopRow}>
                    <Text style={s.sugTitle}>{sg.title}</Text>
                    <View style={[s.impactTag, { backgroundColor: ic + '22' }]}>
                      <Text style={[s.impactTagTxt, { color: ic }]}>{sg.impact} impact</Text>
                    </View>
                  </View>
                  <Text style={s.sugTip}>{sg.tip}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 36 }} />
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

  /* Header */
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 38, paddingBottom: 24, paddingHorizontal: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  headerSub:   { fontSize: 12, color: C.textSub, marginTop: 4, marginBottom: 20 },
  summaryRow:  { flexDirection: 'row', gap: 8 },
  summaryPill: { flex: 1, backgroundColor: C.card, borderRadius: 14,
                 paddingVertical: 10, alignItems: 'center',
                 borderWidth: 1, borderColor: C.border },
  summaryPillIcon: { fontSize: 16, marginBottom: 4 },
  summaryPillVal:  { fontSize: 14, fontWeight: '800' },
  summaryPillLbl:  { fontSize: 9, color: C.textMuted, marginTop: 2, fontWeight: '600', textAlign: 'center' },

  /* Section */
  section:    { marginHorizontal: 16, marginTop: 22 },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', color: C.green800 },
  sectionSub:  { fontSize: 11, color: C.textMuted, fontWeight: '500' },

  /* Weekly stats row */
  weekStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 10 },
  weekStat:     { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  weekStatVal:  { fontSize: 18, fontWeight: '800', color: C.green800 },
  weekStatLbl:  { fontSize: 10, fontWeight: '600', marginTop: 2 },

  /* ── Dual chart card ── */
  dualChartCard: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 14, ...C.cardShadow,
  },
  dualRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },

  // Bar chart side  (equal flex)
  barSide:       { flex: 1 },
  miniChartLabel:{ fontSize: 10, fontWeight: '700', color: C.textSub, marginBottom: 8, letterSpacing: 0.3 },
  barMiniArea:   { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 2 },
  miniBarCol:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 110 },
  miniBarVal:    { fontSize: 7, color: C.textSub, fontWeight: '700', marginBottom: 2 },
  miniBarTrack:  { width: '76%', height: 90, justifyContent: 'flex-end' },
  miniBarFill:   { width: '100%', borderRadius: 5 },
  miniBarLbl:    { fontSize: 8, color: C.textMuted, marginTop: 4, fontWeight: '500' },
  miniLegendRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  miniLegendItem:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniLegendDot: { width: 7, height: 7, borderRadius: 4 },
  miniLegendTxt: { fontSize: 9, color: C.textSub },

  // Divider
  divider: { width: 1, backgroundColor: C.border, alignSelf: 'stretch', marginHorizontal: 5 },

  // Donut chart side  (equal flex)
  donutSide:       { flex: 1, alignItems: 'center' },
  donutWrap:       { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter:     {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    width: 60, height: 60,
  },
  donutCenterVal:  { fontSize: 18, fontWeight: '900', color: C.green800 },
  donutCenterUnit: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 1 },
  donutEmpty:      { width: 130, height: 130, borderRadius: 65, borderWidth: 18,
                     borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  donutEmptyTxt:   { fontSize: 10, color: C.textMuted },
  donutLegend:     { marginTop: 8, width: '100%', gap: 4 },
  donutLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  donutLegendDot:  { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  donutLegendTxt:  { fontSize: 9, color: C.textSub, flex: 1 },
  donutLegendPct:  { fontSize: 9, fontWeight: '800' },

  // Old chart refs kept for legend reuse
  chartLegend:  { flexDirection: 'row', gap: 14, marginTop: 12, justifyContent: 'center' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  legendTxt:    { fontSize: 10, color: C.textSub, fontWeight: '500' },

  /* Monthly category grid */
  catGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  catCard:    { width: (W - 52) / 2, borderRadius: 16, padding: 14, borderWidth: 1 },
  catCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catCardIcon:{ fontSize: 20 },
  catCardPct: { fontSize: 14, fontWeight: '800' },
  catCardVal: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  catCardLbl: { fontSize: 10, color: C.textSub, fontWeight: '500', marginBottom: 8 },
  catBarBg:   { height: 5, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 5, borderRadius: 4 },

  /* Stacked proportion bar */
  stackedBarWrap:   { marginTop: 16, backgroundColor: C.card, borderRadius: 16,
                      padding: 14, borderWidth: 1, borderColor: C.border },
  stackedBarTitle:  { fontSize: 12, fontWeight: '600', color: C.textSub, marginBottom: 10 },
  stackedBar:       { flexDirection: 'row', height: 14, borderRadius: 8, overflow: 'hidden', gap: 1 },
  stackedSegment:   { borderRadius: 0 },
  stackedLegend:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  stackedLegendItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  stackedDot:       { width: 10, height: 10, borderRadius: 5 },
  stackedLegendTxt: { fontSize: 11, color: C.textSub, fontWeight: '500' },

  /* AI suggestions */
  aiBadge:    { backgroundColor: C.teal50, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: C.teal100 },
  aiBadgeTxt: { fontSize: 10, fontWeight: '700', color: C.teal600 },
  aiSub:      { fontSize: 12, color: C.textMuted, marginBottom: 14, marginTop: 2 },
  sugRow:     { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14,
                padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border,
                borderLeftWidth: 4 },
  sugIcon:    { fontSize: 22, marginRight: 12, marginTop: 2, flexShrink: 0 },
  sugBody:    { flex: 1 },
  sugTopRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sugTitle:   { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  impactTag:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 },
  impactTagTxt:{ fontSize: 9, fontWeight: '700' },
  sugTip:     { fontSize: 12, color: C.textSub, lineHeight: 17 },


  /* Empty state */
  emptyBox:  { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyIcon: { fontSize: 38 },
  emptyTxt:  { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  /* Tab switcher */
  tabRow:          { flexDirection: 'row', backgroundColor: C.pillBg, borderRadius: 14, padding: 3, marginBottom: 14, marginTop: 10, borderWidth: 1, borderColor: C.border },
  tabBtn:          { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  tabBtnActive:    { backgroundColor: C.green600, shadowColor: C.green600, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  tabBtnTxt:       { fontSize: 13, fontWeight: '600', color: C.textSub },
  tabBtnTxtActive: { color: '#1A2318', fontWeight: '800' },

  /* Daily 30-day chart */
  daily30Area:    { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3, paddingBottom: 2 },
  daily30Col:     { width: 24, alignItems: 'center', justifyContent: 'flex-end', height: 130 },
  daily30Val:     { fontSize: 6, color: C.textSub, fontWeight: '700', marginBottom: 2 },
  daily30Track:   { width: 14, height: 80, justifyContent: 'flex-end' },
  daily30Fill:    { width: '100%', borderRadius: 4 },
  daily30DayLbl:  { fontSize: 7, color: C.textMuted, marginTop: 3, fontWeight: '500' },
  daily30DateLbl: { fontSize: 6, color: C.textMuted, textAlign: 'center', lineHeight: 8 },

  /* Weekly bar label */
  weekStartLbl: { fontSize: 7, color: C.textMuted, textAlign: 'center', marginTop: 2 },
}); } // end makeStyles
