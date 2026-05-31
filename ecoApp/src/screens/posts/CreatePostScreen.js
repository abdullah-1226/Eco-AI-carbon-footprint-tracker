import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { showAlert } from '../../utils/crossAlert';
import { Text, TextInput, Button, Switch, HelperText, ProgressBar } from 'react-native-paper';
import { createPost, updatePost } from '../../api/api';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

const MAX_TITLE = 100;
const MIN_CONTENT = 10;

export default function CreatePostScreen({ route, navigation }) {
  const editPost = route.params?.post;
  const isEdit = !!editPost;

  const [title, setTitle] = useState(editPost?.title || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [tags, setTags] = useState(editPost?.tags?.join(', ') || '');
  const [isPublished, setIsPublished] = useState(editPost?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Post' : 'New Post' });
  }, [isEdit]);

  const handleSubmit = async () => {
    if (!title.trim()) { showAlert('Validation Error', 'Title is required.'); return; }
    if (content.trim().length < MIN_CONTENT) {
      showAlert('Validation Error', `Content must be at least ${MIN_CONTENT} characters.`);
      return;
    }
    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    setLoading(true);
    try {
      const payload = { title: title.trim(), content: content.trim(), tags: tagArray, isPublished };
      if (isEdit) {
        await updatePost(editPost._id, payload);
        showAlert('Success', 'Post updated successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await createPost(payload);
        showAlert('Published!', 'Your post is now live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const titleProgress = title.length / MAX_TITLE;
  const contentOk = content.trim().length >= MIN_CONTENT;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>{isEdit ? '✏️' : '📝'}</Text>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Your Post' : 'Write a New Post'}</Text>
          <Text style={styles.headerSub}>Fill in the details below and hit publish</Text>
        </View>

        <View style={styles.formCard}>
          {/* Title */}
          <Text style={styles.label}>Post Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Enter an engaging title..."
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_TITLE}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
            left={<TextInput.Icon icon="format-title" color={Colors.textMuted} />}
          />
          <View style={styles.progressRow}>
            <ProgressBar
              progress={titleProgress}
              color={titleProgress > 0.9 ? Colors.danger : Colors.primary}
              style={styles.progressBar}
            />
            <Text style={styles.charCount}>{title.length}/{MAX_TITLE}</Text>
          </View>

          {/* Content */}
          <Text style={styles.label}>Content <Text style={styles.required}>*</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="Write your post content here... (minimum 10 characters)"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={8}
            style={[styles.input, styles.textArea]}
            outlineColor={content.length > 0 && !contentOk ? Colors.danger : Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
            textAlignVertical="top"
          />
          {content.length > 0 && !contentOk && (
            <HelperText type="error" visible>
              Content must be at least {MIN_CONTENT} characters
            </HelperText>
          )}
          {contentOk && (
            <HelperText type="info" visible style={styles.helperOk}>
              ✅ {content.trim().length} characters — looks good!
            </HelperText>
          )}

          {/* Tags */}
          <Text style={styles.label}>Tags <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            mode="outlined"
            placeholder="e.g. react, javascript, tutorial"
            value={tags}
            onChangeText={setTags}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            theme={{ roundness: Radii.md }}
            left={<TextInput.Icon icon="tag-outline" color={Colors.textMuted} />}
          />
          <HelperText type="info" visible style={styles.helperInfo}>
            Separate multiple tags with commas
          </HelperText>

          {/* Publish Toggle */}
          <View style={styles.toggleCard}>
            <View>
              <Text style={styles.toggleTitle}>Publish Post</Text>
              <Text style={styles.toggleSub}>
                {isPublished ? 'Visible to everyone' : 'Saved as draft'}
              </Text>
            </View>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              color={Colors.success}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            icon={isEdit ? 'check-circle' : 'send'}
            style={[styles.submitBtn, { backgroundColor: isEdit ? Colors.primary : Colors.success }]}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {loading
              ? (isEdit ? 'Updating...' : 'Publishing...')
              : (isEdit ? 'Update Post' : 'Publish Post')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
            contentStyle={styles.btnContent}
            labelStyle={{ color: Colors.textMuted }}
          >
            Cancel
          </Button>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingVertical: Spacing.xl, paddingHorizontal: Spacing.md,
  },
  headerIcon: { fontSize: 40, marginBottom: Spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  formCard: {
    backgroundColor: Colors.white, margin: Spacing.md,
    borderRadius: Radii.xl, padding: Spacing.lg, ...Shadow.md,
  },
  label: { fontSize: 13, fontWeight: '700', color: Colors.dark, marginTop: Spacing.md, marginBottom: 4 },
  required: { color: Colors.danger },
  optional: { color: Colors.textMuted, fontWeight: '400' },
  input: { backgroundColor: Colors.white },
  textArea: { height: 180 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  charCount: { fontSize: 11, color: Colors.textMuted, minWidth: 40, textAlign: 'right' },
  helperOk: { color: Colors.success },
  helperInfo: { color: Colors.textMuted },
  toggleCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radii.md, padding: Spacing.md,
    marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  toggleSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  actions: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  submitBtn: { borderRadius: Radii.md },
  cancelBtn: { borderRadius: Radii.md, borderColor: Colors.border },
  btnContent: { height: 50 },
  btnLabel: { fontSize: 16, fontWeight: '700' },
});
