import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Divider, ProgressBar } from 'react-native-paper';
import { getDashboardStats } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import PostCard from '../../components/PostCard';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

function StatCard({ label, value, icon, color, subtitle }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle ? <Text style={styles.statSub}>{subtitle}</Text> : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchStats);
    return unsub;
  }, [navigation, fetchStats]);

  if (loading) return <Loading />;

  const myPostsRatio = stats?.stats?.totalPosts
    ? (stats.stats.myPosts / stats.stats.totalPosts)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchStats(); }}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Profile Hero */}
      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{user?.name}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, user?.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
            <Text style={styles.roleText}>
              {user?.role === 'admin' ? '🛡 Administrator' : '👤 Member'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Overview</Text>
      </View>
      <View style={styles.statsGrid}>
        <StatCard label="Total Posts" value={stats?.stats?.totalPosts ?? 0} icon="📄" color={Colors.primary} />
        <StatCard label="My Posts" value={stats?.stats?.myPosts ?? 0} icon="✍️" color={Colors.success} />
        <StatCard label="Members" value={stats?.stats?.totalUsers ?? 0} icon="👥" color={Colors.info} />
      </View>

      {/* My Contribution */}
      <View style={styles.contributionCard}>
        <Text style={styles.contribTitle}>My Contribution</Text>
        <ProgressBar
          progress={myPostsRatio}
          color={Colors.primary}
          style={styles.progressBar}
        />
        <Text style={styles.contribText}>
          You've written <Text style={styles.contribBold}>{stats?.stats?.myPosts ?? 0}</Text> of{' '}
          <Text style={styles.contribBold}>{stats?.stats?.totalPosts ?? 0}</Text> total posts
          {' '}({Math.round(myPostsRatio * 100)}%)
        </Text>
      </View>

      {/* New Post CTA */}
      <View style={styles.ctaCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Share your ideas</Text>
          <Text style={styles.ctaSub}>Write a post and reach your audience</Text>
        </View>
        <Button
          mode="contained"
          icon="pencil-plus"
          onPress={() => navigation.navigate('CreatePost')}
          style={styles.ctaBtn}
          labelStyle={{ fontSize: 13 }}
        >
          New Post
        </Button>
      </View>

      {/* My Recent Posts */}
      {stats?.myRecentPosts?.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Recent Posts</Text>
            <Text style={styles.sectionCount}>{stats.myRecentPosts.length} posts</Text>
          </View>
          {stats.myRecentPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPress={() => navigation.navigate('PostDetail', { postId: post._id })}
              onLike={() => {}}
            />
          ))}
        </>
      )}

      {/* Popular Posts */}
      {stats?.popularPosts?.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Popular Posts</Text>
          </View>
          {stats.popularPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPress={() => navigation.navigate('PostDetail', { postId: post._id })}
              onLike={() => {}}
            />
          ))}
        </>
      )}

      {/* Admin Panel */}
      {user?.role === 'admin' && (
        <View style={styles.adminCard}>
          <Text style={styles.adminTitle}>🛡 Admin Panel</Text>
          <Text style={styles.adminSub}>You have administrator privileges</Text>
          <Button
            mode="contained"
            icon="shield-crown"
            onPress={() => {}}
            style={styles.adminBtn}
            buttonColor={Colors.dark}
          >
            Open Admin Dashboard
          </Button>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.primary, flexDirection: 'row',
    alignItems: 'center', padding: Spacing.lg, paddingTop: Spacing.xl,
  },
  heroAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center',
    alignItems: 'center', marginRight: Spacing.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  heroAvatarText: { fontSize: 28, fontWeight: '800', color: Colors.white },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.white },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  roleBadgeAdmin: { backgroundColor: Colors.warningLight },
  roleBadgeUser: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  sectionCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radii.lg,
    padding: Spacing.md, alignItems: 'center', ...Shadow.sm,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  statSub: { fontSize: 10, color: Colors.textMuted },
  contributionCard: {
    backgroundColor: Colors.white, margin: Spacing.md, borderRadius: Radii.lg,
    padding: Spacing.md, ...Shadow.sm,
  },
  contribTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark, marginBottom: Spacing.sm },
  progressBar: { height: 8, borderRadius: 4, marginBottom: Spacing.sm },
  contribText: { fontSize: 13, color: Colors.textMuted },
  contribBold: { fontWeight: '700', color: Colors.primary },
  ctaCard: {
    backgroundColor: Colors.primaryLight, margin: Spacing.md, borderRadius: Radii.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#b6d4fe',
  },
  ctaTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  ctaSub: { fontSize: 12, color: Colors.primary, opacity: 0.75, marginTop: 2 },
  ctaBtn: { borderRadius: Radii.md, backgroundColor: Colors.primary },
  adminCard: {
    backgroundColor: Colors.dark, margin: Spacing.md, borderRadius: Radii.lg, padding: Spacing.lg,
  },
  adminTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  adminSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: Spacing.md },
  adminBtn: { borderRadius: Radii.md },
});
