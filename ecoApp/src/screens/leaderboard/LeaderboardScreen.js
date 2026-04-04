import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { getLeaderboard } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

const RANK_META = [
  { bg: '#FFD700', icon: '🥇', label: '1st' },
  { bg: '#C0C0C0', icon: '🥈', label: '2nd' },
  { bg: '#CD7F32', icon: '🥉', label: '3rd' },
];

const scoreColor = (s) => s >= 70 ? Colors.success : s >= 40 ? Colors.warning : Colors.danger;

export default function LeaderboardScreen({ navigation }) {
  const { user }                    = useAuth();
  const [board, setBoard]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await getLeaderboard();
      setBoard(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchBoard);
    return unsub;
  }, [navigation, fetchBoard]);

  if (loading) return <Loading message="Loading leaderboard..." />;

  const myEntry   = board.find(e => e.user?._id === user?._id || e.user?.email === user?.email);
  const myRank    = myEntry ? board.indexOf(myEntry) + 1 : null;
  const top3      = board.slice(0, 3);
  const rest      = board.slice(3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBoard(); }} tintColor={Colors.primary} colors={[Colors.primary]} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🏆</Text>
        <Text style={styles.heroTitle}>Eco Leaderboard</Text>
        <Text style={styles.heroSub}>Top eco warriors in the community</Text>
        {myRank && (
          <View style={styles.myRankBadge}>
            <Text style={styles.myRankText}>Your Rank: #{myRank}</Text>
          </View>
        )}
      </View>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <View style={styles.podium}>
          {/* 2nd */}
          {top3[1] && (
            <View style={[styles.podiumCard, { marginTop: 24 }]}>
              <Text style={styles.podiumRankIcon}>🥈</Text>
              <View style={[styles.podiumAvatar, { backgroundColor: '#C0C0C0' }]}>
                <Text style={styles.podiumAvatarText}>{top3[1].user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{top3[1].user?.name?.split(' ')[0] || 'User'}</Text>
              <Text style={[styles.podiumScore, { color: scoreColor(top3[1].ecoScore) }]}>{top3[1].ecoScore}</Text>
              <Text style={styles.podiumPts}>{top3[1].totalPoints} pts</Text>
            </View>
          )}
          {/* 1st */}
          {top3[0] && (
            <View style={[styles.podiumCard, styles.podiumFirst]}>
              <Text style={styles.podiumCrown}>👑</Text>
              <View style={[styles.podiumAvatar, { backgroundColor: '#FFD700', width: 64, height: 64, borderRadius: 32 }]}>
                <Text style={[styles.podiumAvatarText, { fontSize: 26 }]}>{top3[0].user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <Text style={[styles.podiumName, { fontSize: 15, fontWeight: '800' }]} numberOfLines={1}>{top3[0].user?.name?.split(' ')[0] || 'User'}</Text>
              <Text style={[styles.podiumScore, { color: scoreColor(top3[0].ecoScore), fontSize: 22 }]}>{top3[0].ecoScore}</Text>
              <Text style={styles.podiumPts}>{top3[0].totalPoints} pts</Text>
            </View>
          )}
          {/* 3rd */}
          {top3[2] && (
            <View style={[styles.podiumCard, { marginTop: 36 }]}>
              <Text style={styles.podiumRankIcon}>🥉</Text>
              <View style={[styles.podiumAvatar, { backgroundColor: '#CD7F32' }]}>
                <Text style={styles.podiumAvatarText}>{top3[2].user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{top3[2].user?.name?.split(' ')[0] || 'User'}</Text>
              <Text style={[styles.podiumScore, { color: scoreColor(top3[2].ecoScore) }]}>{top3[2].ecoScore}</Text>
              <Text style={styles.podiumPts}>{top3[2].totalPoints} pts</Text>
            </View>
          )}
        </View>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <View style={styles.listCard}>
          {rest.map((entry, i) => {
            const rank   = i + 4;
            const isMe   = entry.user?._id === user?._id || entry.user?.email === user?.email;
            return (
              <View key={entry._id} style={[styles.listRow, isMe && styles.listRowMe]}>
                <Text style={styles.listRank}>#{rank}</Text>
                <View style={[styles.listAvatar, isMe && { backgroundColor: Colors.primary }]}>
                  <Text style={styles.listAvatarText}>{entry.user?.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, isMe && { color: Colors.primary }]}>
                    {entry.user?.name || 'User'}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.listPts}>{entry.totalPoints} pts · {entry.totalActivities} activities · 🔥{entry.currentStreak}d</Text>
                </View>
                <View style={[styles.listScore, { backgroundColor: scoreColor(entry.ecoScore) + '20' }]}>
                  <Text style={[styles.listScoreNum, { color: scoreColor(entry.ecoScore) }]}>{entry.ecoScore}</Text>
                  <Text style={styles.listScoreLabel}>Score</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {board.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptyText}>Be the first to log activities and claim the top spot!</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>📊 Eco Score Guide</Text>
        {[
          { range: '80–100', label: 'Excellent', color: Colors.success, icon: '🌟' },
          { range: '60–79',  label: 'Good',      color: Colors.primary, icon: '👍' },
          { range: '40–59',  label: 'Average',   color: Colors.warning, icon: '⚡' },
          { range: '0–39',   label: 'High Emissions', color: Colors.danger, icon: '⚠️' },
        ].map((l, i) => (
          <View key={i} style={styles.legendRow}>
            <Text style={styles.legendIcon}>{l.icon}</Text>
            <Text style={[styles.legendRange, { color: l.color }]}>{l.range}</Text>
            <Text style={styles.legendLabel}>{l.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { backgroundColor: Colors.primary, alignItems: 'center', paddingTop: 40, paddingBottom: 28 },
  heroIcon:  { fontSize: 44, marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: Colors.white },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  myRankBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radii.pill, paddingHorizontal: 16, paddingVertical: 6, marginTop: 10 },
  myRankText:  { color: Colors.white, fontWeight: '700', fontSize: 14 },
  podium:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, gap: 8 },
  podiumCard:{ alignItems: 'center', flex: 1 },
  podiumFirst: { marginBottom: 0 },
  podiumCrown: { fontSize: 24, marginBottom: 4 },
  podiumRankIcon: { fontSize: 22, marginBottom: 4 },
  podiumAvatar:  { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  podiumAvatarText: { fontSize: 22, fontWeight: '800', color: Colors.white },
  podiumName:  { fontSize: 13, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  podiumScore: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  podiumPts:   { fontSize: 11, color: Colors.textMuted },
  listCard:  { backgroundColor: Colors.white, margin: Spacing.md, borderRadius: Radii.lg, overflow: 'hidden', ...Shadow.sm },
  listRow:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  listRowMe: { backgroundColor: Colors.primaryLight ?? '#E8F5E9' },
  listRank:  { width: 30, fontSize: 14, fontWeight: '800', color: Colors.textMuted },
  listAvatar:{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  listAvatarText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  listInfo:  { flex: 1 },
  listName:  { fontSize: 14, fontWeight: '700', color: Colors.dark },
  listPts:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  listScore: { alignItems: 'center', borderRadius: Radii.md, padding: 8, minWidth: 52 },
  listScoreNum:   { fontSize: 18, fontWeight: '800' },
  listScoreLabel: { fontSize: 10, color: Colors.textMuted },
  empty:     { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle:{ fontSize: 20, fontWeight: '800', color: Colors.dark, marginBottom: 6 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  legendCard:{ backgroundColor: Colors.white, margin: Spacing.md, borderRadius: Radii.lg, padding: Spacing.md, ...Shadow.sm },
  legendTitle: { fontSize: 14, fontWeight: '800', color: Colors.dark, marginBottom: 10 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  legendIcon:  { fontSize: 16, marginRight: 8 },
  legendRange: { fontSize: 13, fontWeight: '700', width: 60 },
  legendLabel: { fontSize: 13, color: Colors.dark },
});
