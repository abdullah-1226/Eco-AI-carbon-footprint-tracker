import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivitySummary } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const LEVEL_NAMES = ['', 'Eco Starter', 'Green Explorer', 'Eco Warrior', 'Carbon Crusher', 'Eco Champion', 'Planet Guardian'];

export default function ShareScreen() {
  const { user }          = useAuth();
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getActivitySummary();
        setStats(res.data.stats);
        setSummary(res.data);
      } catch {
        Alert.alert('Error', 'Failed to load your eco data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return '#00C853';
    if (score >= 60) return '#64DD17';
    if (score >= 40) return '#FFD600';
    if (score >= 20) return '#FF6D00';
    return '#DD2C00';
  };

  const handleShare = async () => {
    if (!stats) return;
    const ecoScore    = stats.ecoScore ?? 0;
    const level       = stats.level ?? 1;
    const levelName   = LEVEL_NAMES[Math.min(level, 6)] || 'Eco Champion';
    const points      = stats.totalPoints ?? 0;
    const streak      = stats.currentStreak ?? 0;
    const monthlyKg   = stats.monthlyEmissions ?? 0;
    const badgeList   = stats.badges?.map(b => `${b.icon} ${b.name}`).join(' | ') || 'None yet';

    const shareText = `
🌿 My EcoTrack AI Report 🌿
━━━━━━━━━━━━━━━━━━━━━━
👤 ${user?.name || 'Eco User'}
🌍 Eco Score:    ${ecoScore}/100
⭐ Level:        ${level} — ${levelName}
💎 Points:       ${points}
🔥 Streak:       ${streak} days
📊 Monthly CO₂:  ${monthlyKg.toFixed(1)} kg
🏆 Badges:       ${badgeList}
━━━━━━━━━━━━━━━━━━━━━━
Tracking my carbon footprint with EcoTrack AI 🌱
#EcoTrackAI #CarbonFootprint #ClimateAction #GreenLife
    `.trim();

    try {
      await Share.share({ message: shareText, title: 'My EcoTrack AI Score' });
    } catch (e) {
      Alert.alert('Error', 'Could not open share dialog');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.loadingText}>Loading your eco data...</Text>
      </View>
    );
  }

  const ecoScore  = stats?.ecoScore  ?? 0;
  const level     = stats?.level     ?? 1;
  const points    = stats?.totalPoints ?? 0;
  const streak    = stats?.currentStreak ?? 0;
  const monthlyKg = stats?.monthlyEmissions ?? 0;
  const badges    = stats?.badges ?? [];
  const scoreColor = getScoreColor(ecoScore);
  const levelName  = LEVEL_NAMES[Math.min(level, 6)] || 'Eco Champion';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <LinearGradient colors={['#1B5E20', '#2E7D32', '#43A047']} style={styles.header}>
        <Text style={styles.headerTitle}>📤 Share Eco Score</Text>
        <Text style={styles.headerSub}>Show the world your green impact</Text>
      </LinearGradient>

      {/* Score Card (shareable preview) */}
      <View style={styles.scoreCard}>
        <LinearGradient colors={['#0A2E0A', '#1B4A20']} style={styles.cardGradient}>
          {/* Top bar */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardAppName}>🌿 EcoTrack AI</Text>
            <Text style={styles.cardUserName}>{user?.name || 'Eco User'}</Text>
          </View>

          {/* Score ring */}
          <View style={styles.scoreRingOuter}>
            <View style={[styles.scoreRingInner, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNum, { color: scoreColor }]}>{ecoScore}</Text>
              <Text style={styles.scoreLabel}>ECO SCORE</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Level', value: `${level}`, sub: levelName },
              { label: 'Points', value: `${points}`, sub: 'earned' },
              { label: 'Streak', value: `${streak}`, sub: 'days' },
              { label: 'Monthly', value: `${monthlyKg.toFixed(0)}`, sub: 'kg CO₂' },
            ].map((s, i) => (
              <View key={i} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statSub}>{s.sub}</Text>
              </View>
            ))}
          </View>

          {/* Badges */}
          {badges.length > 0 && (
            <View style={styles.badgesRow}>
              <Text style={styles.badgesLabel}>🏆 Badges</Text>
              <View style={styles.badgeList}>
                {badges.slice(0, 6).map((b, i) => (
                  <View key={i} style={styles.badgePill}>
                    <Text style={styles.badgeIcon}>{b.icon}</Text>
                    <Text style={styles.badgeName}>{b.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Footer */}
          <Text style={styles.cardFooter}>#EcoTrackAI  #ClimateAction  #GreenLife</Text>
        </LinearGradient>
      </View>

      {/* Share buttons */}
      <View style={styles.shareSection}>
        <Text style={styles.shareTitle}>Share your progress</Text>
        <Text style={styles.shareSub}>Share to WhatsApp, Instagram, Twitter and more</Text>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <LinearGradient colors={['#25D366', '#128C7E']} style={styles.shareBtnGrad}>
            <Text style={styles.shareBtnIcon}>📤</Text>
            <Text style={styles.shareBtnText}>Share My Eco Score</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Improve Your Score</Text>
        {[
          { icon: '🚶', tip: 'Walk or cycle for short trips instead of driving' },
          { icon: '🥗', tip: 'Switch to plant-based meals 3× per week' },
          { icon: '💡', tip: 'Turn off lights and unplug devices when not in use' },
          { icon: '♻️', tip: 'Contribute to a carbon offset program' },
        ].map((t, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipIcon}>{t.icon}</Text>
            <Text style={styles.tipText}>{t.tip}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  content:   { paddingBottom: 40 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', fontSize: 16 },

  header:    { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 24, alignItems: 'center' },
  headerTitle:{ fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

  scoreCard: { margin: 16, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12 },
  cardGradient: { padding: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardAppName:{ fontSize: 16, fontWeight: '800', color: '#66BB6A' },
  cardUserName:{ fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  scoreRingOuter: { alignItems: 'center', marginBottom: 24 },
  scoreRingInner: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  scoreNum:  { fontSize: 44, fontWeight: '900' },
  scoreLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },

  statsRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox:   { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statSub:   { fontSize: 9,  color: 'rgba(255,255,255,0.4)' },

  badgesRow: { marginBottom: 16 },
  badgesLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  badgeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeIcon: { fontSize: 12, marginRight: 4 },
  badgeName: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  cardFooter:{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 4 },

  shareSection:{ padding: 20, alignItems: 'center' },
  shareTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  shareSub:   { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 },
  shareBtn:   { width: '100%', borderRadius: 16, overflow: 'hidden' },
  shareBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  shareBtnIcon:{ fontSize: 20 },
  shareBtnText:{ fontSize: 16, fontWeight: '800', color: '#fff' },

  tipsCard:  { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2 },
  tipsTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 14 },
  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tipIcon:   { fontSize: 20, marginRight: 12 },
  tipText:   { fontSize: 13, color: '#444', flex: 1, lineHeight: 18 },
});
