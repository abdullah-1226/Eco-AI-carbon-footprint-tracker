import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  TouchableOpacity, Image, Platform, Animated, Modal,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDetails, updatePassword } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/crossAlert';
import ScreenTransition from '../../components/ScreenTransition';
import PhotoCropModal from '../../components/PhotoCropModal';
import { Colors, Radii } from '../../theme';

// ─── Exported keys so Dashboard can sync ─────────────────────────────────────
export const avatarKey = (uid) => `profile_avatar_photo_${uid}`;
export const coverKey  = (uid) => `profile_cover_photo_${uid}`;

// Legacy flat keys kept only for the dashboard import — use functions above
export const AVATAR_KEY = 'profile_avatar_photo';
export const COVER_KEY  = 'profile_cover_photo';

const AVATAR_SZ = 90;
const COVER_H   = 190;

const GENDER_OPTIONS = [
  { value: 'male',              label: '👨  Male'               },
  { value: 'female',            label: '👩  Female'             },
  { value: 'non-binary',        label: '🧑  Non-binary'         },
  { value: 'prefer_not_to_say', label: '🤐  Prefer not to say' },
];

function initials(name = '') {
  return name.trim().split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}

// ─── Reusable bottom-sheet options modal ──────────────────────────────────────
function BottomSheet({ visible, onClose, title, options }) {
  const slide = useRef(new Animated.Value(300)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1,   duration: 220, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[bs.backdrop, { opacity: fade }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[bs.sheet, { transform: [{ translateY: slide }] }]}>
        {/* Handle bar */}
        <View style={bs.handle} />

        <Text style={bs.title}>{title}</Text>

        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[bs.row, opt.danger && bs.rowDanger]}
            onPress={() => { onClose(); setTimeout(opt.onPress, 180); }}
            activeOpacity={0.7}
          >
            <Text style={bs.rowIcon}>{opt.icon}</Text>
            <Text style={[bs.rowLabel, opt.danger && bs.rowLabelDanger]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={bs.cancelRow} onPress={onClose} activeOpacity={0.7}>
          <Text style={bs.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const bs = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:      {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D1A10',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: 'rgba(178,208,84,0.2)',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(178,208,84,0.3)', alignSelf: 'center', marginBottom: 14 },
  title:       { fontSize: 15, fontWeight: '800', color: '#EFF4EE', marginBottom: 14, textAlign: 'center' },
  row:         {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: 'rgba(178,208,84,0.1)',
  },
  rowDanger:        { },
  rowIcon:          { fontSize: 20, marginRight: 14, width: 28, textAlign: 'center' },
  rowLabel:         { fontSize: 15, fontWeight: '600', color: '#EFF4EE' },
  rowLabelDanger:   { color: '#FF7B5C' },
  cancelRow:        { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  cancelTxt:        { fontSize: 15, fontWeight: '700', color: 'rgba(239,244,238,0.52)' },
});

// ─── Animated gender pill ─────────────────────────────────────────────────────
function GenderPill({ option, selected, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, tension: 300, friction: 5, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.0,  tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    onPress(option.value);
  };
  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity style={[st.gPill, selected && st.gPillOn]} onPress={press} activeOpacity={0.8}>
        <Text style={[st.gPillTxt, selected && st.gPillTxtOn]}>{option.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Image picker — returns raw URI, no built-in editor (we use our own) ─────
async function pickImage() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    showAlert('Permission needed', 'Please allow photo library access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,   // we show our own crop UI
    quality: 1,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();

  // form fields
  const [name,   setName]   = useState(user?.name   || '');
  const [email,  setEmail]  = useState(user?.email  || '');
  const [bio,    setBio]    = useState(user?.bio     || '');
  const [age,    setAge]    = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState(user?.gender  || null);

  // photos — stored locally in AsyncStorage
  const [avatarUri, setAvatarUri] = useState(null);
  const [coverUri,  setCoverUri]  = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // crop modal state
  const [cropVisible, setCropVisible] = useState(false);
  const [cropRawUri,  setCropRawUri]  = useState(null);
  const [cropMode,    setCropMode]    = useState('avatar'); // 'avatar' | 'cover'

  // bottom-sheet visibility — separate sheets per photo type
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [coverSheetOpen,  setCoverSheetOpen]  = useState(false);

  // password
  const [currentPass, setCurrentPass] = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [passLoading,    setPassLoading]    = useState(false);

  // load stored photos — keyed per user so accounts don't share photos
  useEffect(() => {
    if (!user?._id) return;
    (async () => {
      const [a, c] = await Promise.all([
        AsyncStorage.getItem(avatarKey(user._id)),
        AsyncStorage.getItem(coverKey(user._id)),
      ]);
      if (a) setAvatarUri(a);
      if (c) setCoverUri(c);
    })();
  }, [user?._id]);

  // ── Avatar actions ──────────────────────────────────────────────────────
  const doChangeAvatar = async () => {
    const uri = await pickImage();
    if (uri) {
      setCropRawUri(uri);
      setCropMode('avatar');
      setCropVisible(true);
    }
  };
  const doRemoveAvatar = async () => {
    setAvatarUri(null);
    await AsyncStorage.removeItem(avatarKey(user._id));
  };

  // ── Crop done callbacks ──────────────────────────────────────────────────
  const handleCropDone = async (croppedUri) => {
    setCropVisible(false);
    if (cropMode === 'avatar') {
      setAvatarUri(croppedUri);
      await AsyncStorage.setItem(avatarKey(user._id), croppedUri);
    } else {
      setCoverUri(croppedUri);
      await AsyncStorage.setItem(coverKey(user._id), croppedUri);
    }
  };
  const handleCropCancel = () => setCropVisible(false);

  // ── Cover actions ───────────────────────────────────────────────────────
  const doChangeCover = async () => {
    const uri = await pickImage();
    if (uri) {
      setCropRawUri(uri);
      setCropMode('cover');
      setCropVisible(true);
    }
  };
  const doRemoveCover = async () => {
    setCoverUri(null);
    await AsyncStorage.removeItem(coverKey(user._id));
  };

  // ── Sheet options — profile photo only ─────────────────────────────────
  const avatarOptions = [
    { icon: '📷', label: avatarUri ? 'Update Profile Photo' : 'Add Profile Photo', onPress: doChangeAvatar },
    avatarUri && { icon: '🗑️', label: 'Remove Profile Photo', onPress: doRemoveAvatar, danger: true },
  ].filter(Boolean);

  // ── Sheet options — cover photo only ────────────────────────────────────
  const coverOptions = [
    { icon: '🖼️', label: coverUri ? 'Update Cover Photo' : 'Add Cover Photo', onPress: doChangeCover },
    coverUri && { icon: '🗑️', label: 'Remove Cover Photo', onPress: doRemoveCover, danger: true },
  ].filter(Boolean);

  // ── Save profile ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      showAlert('Error', 'Name and email are required.'); return;
    }
    const parsedAge = age.trim() ? parseInt(age.trim(), 10) : null;
    if (age.trim() && (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      showAlert('Error', 'Valid age required (1–120).'); return;
    }
    setDetailsLoading(true);
    try {
      await updateDetails({ name: name.trim(), email: email.trim(), bio: bio.trim() || null, age: parsedAge, gender: gender || null });
      await refreshUser();
      showAlert('Success', '✅ Profile updated!');
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to update profile.');
    } finally { setDetailsLoading(false); }
  };

  const handleUpdatePassword = async () => {
    if (!currentPass || !newPass) { showAlert('Error', 'Both fields are required.'); return; }
    if (newPass.length < 6)       { showAlert('Error', 'Min. 6 characters for new password.'); return; }
    setPassLoading(true);
    try {
      await updatePassword({ currentPassword: currentPass, newPassword: newPass });
      setCurrentPass(''); setNewPass('');
      showAlert('Success', '✅ Password changed!');
    } catch (err) {
      showAlert('Error', err.response?.data?.error || 'Failed to update password.');
    } finally { setPassLoading(false); }
  };

  const handleLogout = () =>
    showAlert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);

  const genderLabel = GENDER_OPTIONS.find(g => g.value === user?.gender)?.label;

  return (
    <ScreenTransition>

      {/* ── Photo crop editor ──────────────────────────────────────── */}
      <PhotoCropModal
        visible={cropVisible}
        imageUri={cropRawUri}
        mode={cropMode}
        onDone={handleCropDone}
        onCancel={handleCropCancel}
      />

      {/* ── Profile photo sheet ─────────────────────────────────────── */}
      <BottomSheet
        visible={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        title="Profile Photo"
        options={avatarOptions}
      />
      {/* ── Cover photo sheet ───────────────────────────────────────── */}
      <BottomSheet
        visible={coverSheetOpen}
        onClose={() => setCoverSheetOpen(false)}
        title="Cover Photo"
        options={coverOptions}
      />

      <KeyboardAvoidingView style={st.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={st.root} showsVerticalScrollIndicator={false}>

          {/* ════════════════════════════════════════════════════════
              COVER PHOTO HERO
          ════════════════════════════════════════════════════════ */}
          <View style={st.coverWrap}>
            {/* Cover image or placeholder */}
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={st.coverImg} resizeMode="cover" />
            ) : (
              <View style={st.coverEmpty}>
                <Text style={st.coverEmptyIcon}>🌍</Text>
                <Text style={st.coverEmptyTxt}>Tap ⋯ to add a cover photo</Text>
              </View>
            )}

            {/* Loading spinner over cover */}
            {photoLoading && (
              <View style={st.coverSpinner}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}

            {/* ⋯ three-dots — top right — cover photo options only */}
            <TouchableOpacity
              style={st.dotsBtn}
              onPress={() => setCoverSheetOpen(true)}
              activeOpacity={0.85}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={st.dotsBtnTxt}>•••</Text>
            </TouchableOpacity>

            {/* Avatar — overlapping bottom of cover */}
            <View style={st.avatarAnchor}>
              {/* Avatar circle — not tappable directly */}
              <View style={st.avatarRing}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={st.avatarImg} resizeMode="cover" />
                ) : (
                  <View style={st.avatarFallback}>
                    <Text style={st.avatarInitials}>{initials(user?.name)}</Text>
                  </View>
                )}
              </View>

              {/* Camera widget — always shown beside avatar, opens profile sheet */}
              <TouchableOpacity
                style={st.camWidget}
                onPress={() => setAvatarSheetOpen(true)}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={st.camWidgetIcon}>📸</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════
              NAME + META PILLS  (leaves space for avatar overlap)
          ════════════════════════════════════════════════════════ */}
          <View style={st.nameBlock}>
            <Text style={st.nameText}>{user?.name}</Text>
            <Text style={st.emailText}>{user?.email}</Text>
            <View style={st.metaRow}>
              {user?.age   && <View style={st.pill}><Text style={st.pillTxt}>🎂 {user.age} yrs</Text></View>}
              {genderLabel && <View style={st.pill}><Text style={st.pillTxt}>{genderLabel}</Text></View>}
              <View style={[st.pill, st.pillRole]}>
                <Text style={st.pillTxt}>{user?.role === 'admin' ? '🛡 Admin' : '👤 Member'}</Text>
              </View>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════
              UPDATE PROFILE CARD
          ════════════════════════════════════════════════════════ */}
          <View style={st.card}>
            <Text style={st.cardTitle}>✏️  Update Profile</Text>
            <Text style={st.cardSub}>Name · email · bio · age · gender</Text>
            <Divider style={st.divider} />

            <Text style={st.lbl}>Full Name</Text>
            <TextInput mode="outlined" value={name} onChangeText={setName} placeholder="Your full name"
              left={<TextInput.Icon icon="account" color={Colors.textMuted} />}
              style={st.input} outlineColor="rgba(178,208,84,0.25)" activeOutlineColor="#B2D054" theme={{ roundness: Radii.md, colors: { background: "#0A1608", onSurfaceVariant: "rgba(239,244,238,0.6)", placeholder: "rgba(239,244,238,0.35)" } }} />

            <Text style={st.lbl}>Email</Text>
            <TextInput mode="outlined" value={email} onChangeText={setEmail} placeholder="your@email.com"
              keyboardType="email-address" autoCapitalize="none"
              left={<TextInput.Icon icon="email" color={Colors.textMuted} />}
              style={st.input} outlineColor="rgba(178,208,84,0.25)" activeOutlineColor="#B2D054" theme={{ roundness: Radii.md, colors: { background: "#0A1608", onSurfaceVariant: "rgba(239,244,238,0.6)", placeholder: "rgba(239,244,238,0.35)" } }} />

            <Text style={st.lbl}>Bio <Text style={st.lblHint}>({bio.length}/200)</Text></Text>
            <TextInput mode="outlined" value={bio} onChangeText={setBio}
              placeholder="Tell others about yourself…" multiline numberOfLines={3} maxLength={200}
              left={<TextInput.Icon icon="text" color={Colors.textMuted} />}
              style={[st.input, { minHeight: 80 }]} outlineColor="rgba(178,208,84,0.25)" activeOutlineColor="#B2D054" theme={{ roundness: Radii.md, colors: { background: "#0A1608", onSurfaceVariant: "rgba(239,244,238,0.6)", placeholder: "rgba(239,244,238,0.35)" } }} />

            <Text style={st.lbl}>Age</Text>
            <TextInput mode="outlined" value={age} onChangeText={setAge}
              placeholder="Your age" keyboardType="numeric" maxLength={3}
              left={<TextInput.Icon icon="cake" color={Colors.textMuted} />}
              style={st.input} outlineColor="rgba(178,208,84,0.25)" activeOutlineColor="#B2D054" theme={{ roundness: Radii.md, colors: { background: "#0A1608", onSurfaceVariant: "rgba(239,244,238,0.6)", placeholder: "rgba(239,244,238,0.35)" } }} />

            <Text style={st.lbl}>Gender</Text>
            <View style={st.gGrid}>
              {GENDER_OPTIONS.map(opt => (
                <GenderPill key={opt.value} option={opt} selected={gender === opt.value} onPress={setGender} />
              ))}
            </View>

            <Button mode="contained" icon="content-save" onPress={handleSave}
              loading={detailsLoading} disabled={detailsLoading}
              style={st.btnGreen} contentStyle={st.btnH}>
              {detailsLoading ? 'Saving…' : 'Save Profile'}
            </Button>
          </View>

          {/* ════════════════════════════════════════════════════════
              CHANGE PASSWORD
          ════════════════════════════════════════════════════════ */}
          <View style={st.card}>
            <Text style={st.cardTitle}>🔒  Change Password</Text>
            <Text style={st.cardSub}>Update your account password</Text>
            <Divider style={st.divider} />

            <Text style={st.lbl}>Current Password</Text>
            <TextInput mode="outlined" value={currentPass} onChangeText={setCurrentPass}
              placeholder="Current password" secureTextEntry={!showCurrent}
              left={<TextInput.Icon icon="lock" color={Colors.textMuted} />}
              right={<TextInput.Icon icon={showCurrent ? 'eye-off' : 'eye'} onPress={() => setShowCurrent(!showCurrent)} color={Colors.textMuted} />}
              style={st.input} outlineColor="rgba(178,208,84,0.25)" activeOutlineColor="#B2D054" theme={{ roundness: Radii.md, colors: { background: "#0A1608", onSurfaceVariant: "rgba(239,244,238,0.6)", placeholder: "rgba(239,244,238,0.35)" } }} />

            <Text style={st.lbl}>New Password</Text>
            <TextInput mode="outlined" value={newPass} onChangeText={setNewPass}
              placeholder="Min. 6 characters" secureTextEntry={!showNew}
              left={<TextInput.Icon icon="lock-reset" color={Colors.textMuted} />}
              right={<TextInput.Icon icon={showNew ? 'eye-off' : 'eye'} onPress={() => setShowNew(!showNew)} color={Colors.textMuted} />}
              style={st.input} outlineColor="rgba(178,208,84,0.25)" activeOutlineColor="#B2D054" theme={{ roundness: Radii.md, colors: { background: "#0A1608", onSurfaceVariant: "rgba(239,244,238,0.6)", placeholder: "rgba(239,244,238,0.35)" } }} />

            <Button mode="contained" icon="lock-check" onPress={handleUpdatePassword}
              loading={passLoading} disabled={passLoading}
              style={st.btnDark} contentStyle={st.btnH} buttonColor={Colors.secondary}>
              {passLoading ? 'Updating…' : 'Update Password'}
            </Button>
          </View>

          {/* ════════════════════════════════════════════════════════
              DANGER ZONE
          ════════════════════════════════════════════════════════ */}
          <View style={st.dangerCard}>
            <Text style={st.dangerTitle}>⚠️  Danger Zone</Text>
            <Text style={st.dangerSub}>This will sign you out of your account</Text>
            <Button mode="contained" icon="logout" onPress={handleLogout}
              style={st.logoutBtn} contentStyle={st.btnH} buttonColor={Colors.danger}>
              Sign Out
            </Button>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: '#060F08' },

  // Cover hero
  coverWrap:     { width: '100%', height: COVER_H, backgroundColor: '#0A1A0F', position: 'relative' },
  coverImg:      { ...StyleSheet.absoluteFillObject },
  coverEmpty:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1A0F' },
  coverEmptyIcon:{ fontSize: 36, marginBottom: 6 },
  coverEmptyTxt: { fontSize: 13, color: 'rgba(239,244,238,0.52)', fontWeight: '600' },
  coverSpinner:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)',
                   alignItems: 'center', justifyContent: 'center', zIndex: 5 },

  dotsBtn:    {
    position: 'absolute', top: 14, right: 14, zIndex: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  dotsBtnTxt: { color: '#B2D054', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, lineHeight: 18 },

  avatarAnchor: {
    position: 'absolute', bottom: -(AVATAR_SZ / 2), left: 18, zIndex: 15,
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
  },
  avatarRing: {
    width: AVATAR_SZ, height: AVATAR_SZ, borderRadius: AVATAR_SZ / 2,
    borderWidth: 3, borderColor: '#B2D054', overflow: 'hidden',
    shadowColor: '#B2D054', shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },
  avatarImg:      { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, backgroundColor: '#0D1A10', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.3)' },
  avatarInitials: { fontSize: 30, fontWeight: '900', color: '#B2D054' },

  camWidget: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#0C1B12',
    borderWidth: 2, borderColor: '#B2D054',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#B2D054', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
    marginBottom: 4,
  },
  camWidgetIcon: { fontSize: 15 },

  nameBlock: {
    marginTop: AVATAR_SZ / 2 + 14, paddingHorizontal: 18, paddingBottom: 16,
    backgroundColor: '#060F08',
    borderBottomWidth: 1, borderBottomColor: 'rgba(178,208,84,0.1)',
  },
  nameText:  { fontSize: 20, fontWeight: '900', color: '#EFF4EE' },
  emailText: { fontSize: 13, color: 'rgba(239,244,238,0.52)', marginTop: 3, marginBottom: 10 },
  metaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill:      { backgroundColor: 'rgba(178,208,84,0.10)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
               borderWidth: 1, borderColor: 'rgba(178,208,84,0.25)' },
  pillRole:  { backgroundColor: 'rgba(82,199,122,0.1)', borderColor: 'rgba(82,199,122,0.25)' },
  pillTxt:   { fontSize: 11, fontWeight: '700', color: '#B2D054' },

  card: {
    backgroundColor: '#0D1A10', marginHorizontal: 14, marginTop: 14,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#EFF4EE' },
  cardSub:   { fontSize: 13, color: 'rgba(239,244,238,0.52)', marginTop: 2 },
  divider:   { marginVertical: 14, backgroundColor: 'rgba(178,208,84,0.12)' },
  lbl:       { fontSize: 13, fontWeight: '700', color: 'rgba(239,244,238,0.7)', marginTop: 10, marginBottom: 4 },
  lblHint:   { fontSize: 11, color: 'rgba(239,244,238,0.35)', fontWeight: '400' },
  input:     { backgroundColor: '#0A1608', marginBottom: 2 },
  btnGreen:  { marginTop: 16, borderRadius: 14, backgroundColor: Colors.primary },
  btnDark:   { marginTop: 16, borderRadius: 14 },
  btnH:      { height: 50 },

  gGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  gPill:     { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14,
               borderWidth: 1.5, borderColor: 'rgba(178,208,84,0.2)', backgroundColor: '#0A1608', alignItems: 'center' },
  gPillOn:   { borderColor: '#B2D054', backgroundColor: 'rgba(178,208,84,0.12)' },
  gPillTxt:  { fontSize: 12, fontWeight: '600', color: 'rgba(239,244,238,0.52)' },
  gPillTxtOn:{ color: '#B2D054', fontWeight: '800' },

  photoCardRow:       { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarPreviewWrap:  { },
  avatarPreview:      { width: 80, height: 80, borderRadius: 40, overflow: 'hidden' },
  avatarPreviewEmpty: { backgroundColor: '#0A1608', alignItems: 'center', justifyContent: 'center' },
  photoCardActions:   { flex: 1, gap: 8 },
  photoActionBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#0A1608', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)',
  },
  photoActionDanger:  { backgroundColor: 'rgba(255,80,60,0.08)', borderColor: 'rgba(255,80,60,0.25)' },
  photoActionIcon:    { fontSize: 16 },
  photoActionTxt:     { fontSize: 13, fontWeight: '600', color: '#EFF4EE' },
  photoNoPhoto:       { fontSize: 12, color: 'rgba(239,244,238,0.35)', marginTop: 4 },

  coverThumbBtn:      { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  coverThumb:         { width: '100%', height: 130, borderRadius: 14 },
  coverThumbEmpty:    { backgroundColor: 'rgba(178,208,84,0.08)', alignItems: 'center', justifyContent: 'center' },
  coverThumbEmptyTxt: { fontSize: 12, color: 'rgba(239,244,238,0.52)', fontWeight: '600' },
  coverThumbOverlay:  {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 8, alignItems: 'center',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
  },
  coverThumbOverlayTxt: { color: '#EFF4EE', fontSize: 12, fontWeight: '700' },
  coverCardBtns:     { flexDirection: 'row', gap: 10, marginTop: 12 },
  coverCardBtn:      {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#0A1608', borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)',
  },
  coverCardBtnRed:   { backgroundColor: 'rgba(255,80,60,0.08)', borderColor: 'rgba(255,80,60,0.25)' },
  coverCardBtnTxt:   { fontSize: 13, fontWeight: '700', color: '#EFF4EE' },

  linkRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
                 borderBottomWidth: 1, borderBottomColor: 'rgba(178,208,84,0.08)' },
  linkIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(178,208,84,0.10)',
                 alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkLabel:   { fontSize: 14, fontWeight: '700', color: '#EFF4EE' },
  linkDesc:    { fontSize: 12, color: 'rgba(239,244,238,0.45)', marginTop: 1 },
  linkArrow:   { fontSize: 22, color: 'rgba(178,208,84,0.35)' },

  dangerCard:  { backgroundColor: 'rgba(139,0,0,0.12)', marginHorizontal: 14, marginTop: 14,
                 borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,80,60,0.25)' },
  dangerTitle: { fontSize: 15, fontWeight: '800', color: '#FF7B5C', marginBottom: 4 },
  dangerSub:   { fontSize: 13, color: 'rgba(255,123,92,0.7)', marginBottom: 14 },
  logoutBtn:   { borderRadius: 14 },
});
