import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, IconButton, Divider } from 'react-native-paper';
import { Colors, Shadow, Radii, Spacing } from '../theme';

export default function PostCard({ post, onPress, onLike }) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.wrapper}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.authorBadge}>
              <Text style={styles.authorInitial}>
                {post.user?.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.user?.name || 'Unknown'}</Text>
              <Text style={styles.date}>{date}</Text>
            </View>
            <View style={[styles.statusBadge, post.isPublished ? styles.published : styles.draft]}>
              <Text style={[styles.statusText, post.isPublished ? styles.publishedText : styles.draftText]}>
                {post.isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Title & Content */}
          <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
          <Text style={styles.excerpt} numberOfLines={3}>{post.content}</Text>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {post.tags.slice(0, 3).map((tag, i) => (
                <Chip key={i} style={styles.chip} textStyle={styles.chipText} compact>
                  #{tag}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>

        <Divider />

        {/* Footer */}
        <Card.Actions style={styles.actions}>
          <TouchableOpacity style={styles.statItem} onPress={onLike}>
            <Text style={styles.statEmoji}>❤️</Text>
            <Text style={styles.statCount}>{post.likes}</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>👁</Text>
            <Text style={styles.statCount}>{post.views}</Text>
          </View>
          <View style={styles.readMore}>
            <Text style={styles.readMoreText}>Read more →</Text>
          </View>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: Spacing.md, marginVertical: Spacing.sm / 2 },
  card: { borderRadius: Radii.lg, backgroundColor: Colors.white, ...Shadow.sm },
  content: { paddingBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  authorBadge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  authorInitial: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  authorInfo: { flex: 1, marginLeft: Spacing.sm },
  authorName: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  date: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  published: { backgroundColor: Colors.successLight },
  draft: { backgroundColor: Colors.warningLight },
  statusText: { fontSize: 11, fontWeight: '700' },
  publishedText: { color: Colors.success },
  draftText: { color: '#856404' },
  divider: { marginVertical: Spacing.sm, backgroundColor: Colors.border },
  title: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginBottom: 6, lineHeight: 22 },
  excerpt: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: 6 },
  chip: { backgroundColor: Colors.primaryLight, height: 26 },
  chipText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  actions: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: Spacing.md },
  statEmoji: { fontSize: 14 },
  statCount: { fontSize: 13, color: Colors.textMuted, marginLeft: 4, fontWeight: '600' },
  readMore: { flex: 1, alignItems: 'flex-end' },
  readMoreText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
});
