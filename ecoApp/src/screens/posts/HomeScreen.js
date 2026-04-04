import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Searchbar, FAB, Chip } from 'react-native-paper';
import { getPosts, likePost } from '../../api/api';
import PostCard from '../../components/PostCard';
import Loading from '../../components/Loading';
import { Colors, Spacing, Radii, Shadow } from '../../theme';

const SORT_OPTIONS = [
  { label: 'Newest', value: '-createdAt' },
  { label: 'Popular', value: '-views' },
  { label: 'Most Liked', value: '-likes' },
];

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('-createdAt');

  const fetchPosts = useCallback(async (pageNum = 1, replace = true, sortVal = sort) => {
    try {
      const res = await getPosts({ page: pageNum, limit: 10, sort: sortVal });
      const { data, pagination } = res.data;
      setPosts((prev) => replace ? data : [...prev, ...data]);
      setHasMore(!!pagination.next);
      setPage(pageNum);
    } catch {
      // silently fail on pagination errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sort]);

  useEffect(() => { fetchPosts(1, true, sort); }, [sort]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchPosts());
    return unsub;
  }, [navigation, fetchPosts]);

  const handleLike = async (id) => {
    try {
      await likePost(id);
      setPosts((prev) => prev.map((p) => p._id === id ? { ...p, likes: p.likes + 1 } : p));
    } catch { /* ignore */ }
  };

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      {/* Search & Filter Bar */}
      <View style={styles.toolbar}>
        <Searchbar
          placeholder="Search posts..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor={Colors.primary}
          theme={{ roundness: Radii.md }}
        />
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={sort === opt.value}
              onPress={() => setSort(opt.value)}
              style={[styles.sortChip, sort === opt.value && styles.sortChipActive]}
              textStyle={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}
              compact
            >
              {opt.label}
            </Chip>
          ))}
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Showing <Text style={styles.statsCount}>{filtered.length}</Text> posts
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
            onLike={() => handleLike(item._id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPosts(1, true); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={() => { if (hasMore) fetchPosts(page + 1, false); }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Posts Found</Text>
            <Text style={styles.emptySubtitle}>Be the first to write something!</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
        color={Colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  toolbar: {
    backgroundColor: Colors.white, paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border, ...Shadow.sm,
  },
  searchbar: {
    backgroundColor: Colors.background, elevation: 0,
    borderWidth: 1, borderColor: Colors.border, height: 44,
  },
  searchInput: { fontSize: 14 },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  sortChip: { backgroundColor: Colors.light, borderColor: Colors.border, borderWidth: 1 },
  sortChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  sortChipText: { fontSize: 12, color: Colors.textMuted },
  sortChipTextActive: { color: Colors.primary, fontWeight: '700' },
  statsBar: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  statsText: { fontSize: 13, color: Colors.textMuted },
  statsCount: { fontWeight: '700', color: Colors.primary },
  list: { paddingVertical: Spacing.sm, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: Colors.primary },
});
