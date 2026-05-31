import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { showAlert } from '../../utils/crossAlert';
import { Text, Button, Chip, Divider, ActivityIndicator, Badge } from 'react-native-paper';
import { getPost, likePost, deletePost } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);

  useEffect(() => { fetchPost(); }, []);

  const fetchPost = async () => {
    try {
      const res = await getPost(postId);
      setPost(res.data.data);
    } catch {
      showAlert('Error', 'Failed to load post');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    setLiking(true);
    try {
      await likePost(postId);
      setPost((p) => ({ ...p, likes: p.likes + 1 }));
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to like');
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = () => {
    showAlert(
      'Delete Post',
      'This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deletePost(postId);
              navigation.goBack();
            } catch (err) {
              showAlert('Error', err.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const isOwner = user && post && (user.id === post.user?._id || user.role === 'admin');

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
  if (!post) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Status Banner */}
      <View style={[styles.banner, post.isPublished ? styles.bannerSuccess : styles.bannerWarning]}>
        <Text style={[styles.bannerText, post.isPublished ? styles.bannerTextSuccess : styles.bannerTextWarning]}>
          {post.isPublished ? '✅ Published' : '📝 Draft — Not publicly visible'}
        </Text>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{post.title}</Text>

        {/* Author row */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>{post.user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{post.user?.name || 'Unknown'}</Text>
            <Text style={styles.authorDate}>
              {new Date(post.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{post.likes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{post.views}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{post.tags?.length || 0}</Text>
          <Text style={styles.statLabel}>Tags</Text>
        </View>
      </View>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {post.tags.map((tag, i) => (
              <Chip key={i} style={styles.chip} textStyle={styles.chipText} compact>
                #{tag}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content</Text>
        <View style={styles.contentBox}>
          <Text style={styles.body}>{post.content}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Button
          mode="contained"
          icon="heart"
          onPress={handleLike}
          loading={liking}
          disabled={liking}
          style={styles.likeBtn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          Like ({post.likes})
        </Button>

        {isOwner && (
          <View style={styles.ownerActions}>
            <Button
              mode="contained-tonal"
              icon="pencil"
              onPress={() => navigation.navigate('CreatePost', { post })}
              style={styles.editBtn}
              contentStyle={styles.btnContent}
            >
              Edit
            </Button>
            <Button
              mode="contained"
              icon="delete"
              onPress={handleDelete}
              style={styles.deleteBtn}
              contentStyle={styles.btnContent}
              buttonColor={Colors.danger}
            >
              Delete
            </Button>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  banner: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  bannerSuccess: { backgroundColor: Colors.successLight, borderBottomColor: '#a3cfbb' },
  bannerWarning: { backgroundColor: Colors.warningLight, borderBottomColor: '#ffd97d' },
  bannerText: { fontSize: 13, fontWeight: '700' },
  bannerTextSuccess: { color: Colors.success },
  bannerTextWarning: { color: '#664d03' },
  titleSection: { backgroundColor: Colors.white, padding: Spacing.lg, ...Shadow.sm },
  title: { fontSize: 22, fontWeight: '800', color: Colors.dark, lineHeight: 30, marginBottom: Spacing.md },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  authorAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  authorInitial: { color: Colors.white, fontWeight: '800', fontSize: 18 },
  authorName: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  authorDate: { fontSize: 12, color: Colors.textMuted },
  statsCard: {
    flexDirection: 'row', backgroundColor: Colors.white,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radii.lg, padding: Spacing.md, ...Shadow.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  section: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  contentBox: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, ...Shadow.sm },
  body: { fontSize: 15, color: Colors.text, lineHeight: 26 },
  actionsSection: { marginHorizontal: Spacing.md, marginTop: Spacing.lg },
  likeBtn: { borderRadius: Radii.md, backgroundColor: Colors.danger },
  btnContent: { height: 48 },
  btnLabel: { fontSize: 15, fontWeight: '700' },
  ownerActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  editBtn: { flex: 1, borderRadius: Radii.md },
  deleteBtn: { flex: 1, borderRadius: Radii.md },
});
