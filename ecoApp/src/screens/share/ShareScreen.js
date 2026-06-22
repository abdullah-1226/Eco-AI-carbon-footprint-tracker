import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Linking, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getActivitySummary } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/crossAlert';

const LEVEL_NAMES = ['', 'Eco Starter', 'Green Explorer', 'Eco Warrior', 'Carbon Crusher', 'Eco Champion', 'Planet Guardian'];

// ── Platform definitions ──────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'whatsapp',  label: 'WhatsApp',  emoji: '💬', color: '#25D366', dark: '#1A9E50' },
  { id: 'telegram',  label: 'Telegram',  emoji: '✈️',  color: '#0088CC', dark: '#006499' },
  { id: 'instagram', label: 'Instagram', emoji: '📸',  color: '#E1306C', dark: '#A81F4F' },
  { id: 'facebook',  label: 'Facebook',  emoji: '👍',  color: '#1877F2', dark: '#1055B6' },
  { id: 'twitter',   label: 'Twitter/X', emoji: '🐦',  color: '#1DA1F2', dark: '#1078BA' },
  { id: 'linkedin',  label: 'LinkedIn',  emoji: '💼',  color: '#0A66C2', dark: '#074E96' },
  { id: 'sms',       label: 'SMS',       emoji: '📱',  color: '#34C759', dark: '#27A046' },
  { id: 'email',     label: 'Email',     emoji: '📧',  color: '#EA4335', dark: '#B5312A' },
  { id: 'copy',      label: 'Copy Text', emoji: '📋',  color: '#6B7A6D', dark: '#4A5A4D' },
  { id: 'more',      label: 'More Apps', emoji: '⋯',   color: '#7C3AED', dark: '#5B21B6' },
];

// ── Copy to clipboard (web + native fallback) ─────────────────────────────────
async function copyText(text) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }
  await Share.share({ message: text });
  return false;
}

export default function ShareScreen() {
  const { user }          = useAuth();
  const [tab, setTab]     = useState('score');   // 'score' | 'invite'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    getActivitySummary()
      .then(res => { setStats(res.data.stats); })
      .catch(() => showAlert('Error', 'Failed to load your eco data'))
      .finally(() => setLoading(false));
  }, []);

  // ── Build share texts ─────────────────────────────────────────────────────
  const buildScoreText = () => {
    const s         = stats;
    const ecoScore  = s?.ecoScore ?? 0;
    const level     = s?.level ?? 1;
    const levelName = LEVEL_NAMES[Math.min(level, 6)] || 'Eco Champion';
    const points    = s?.totalPoints ?? 0;
    const streak    = s?.currentStreak ?? 0;
    const monthlyKg = s?.monthlyEmissions ?? 0;
    const badgeList = s?.badges?.map(b => `${b.icon} ${b.name}`).join(' | ') || 'None yet';
    return `🌿 My EcoTrack AI Report 🌿\n━━━━━━━━━━━━━━━━━━━━━━\n👤 ${user?.name || 'Eco User'}\n🌍 Eco Score:   ${ecoScore}/100\n⭐ Level:       ${level} — ${levelName}\n💎 Points:      ${points}\n🔥 Streak:      ${streak} days\n📊 Monthly CO₂: ${monthlyKg.toFixed(1)} kg\n🏆 Badges:      ${badgeList}\n━━━━━━━━━━━━━━━━━━━━━━\nTracking my carbon footprint with EcoTrack AI 🌱\n#EcoTrackAI #CarbonFootprint #ClimateAction`;
  };

  const buildInviteText = () =>
    `Hey! 👋 I've been tracking my carbon footprint with EcoTrack AI — it's helping me live greener every day 🌿\n\nJoin me and start your eco journey! Log daily activities, earn badges, and compete on the leaderboard 🏆\n\n${user?.name ? `— ${user.name}\n\n` : ''}#EcoTrackAI #GreenLife #ClimateAction`;

  // ── Score share handlers ──────────────────────────────────────────────────
  const handleShareAll = async () => {
    try { await Share.share({ message: buildScoreText(), title: 'My EcoTrack AI Score' }); }
    catch { showAlert('Error', 'Could not open share dialog'); }
  };

  const handleWhatsAppScore = async () => {
    const text = encodeURIComponent(buildScoreText());
    const can  = await Linking.canOpenURL('whatsapp://').catch(() => false);
    await Linking.openURL(can ? `whatsapp://send?text=${text}` : `https://wa.me/?text=${text}`);
  };

  const handlePDF = async () => {
    const s         = stats;
    const ecoScore  = s?.ecoScore ?? 0;
    const level     = s?.level ?? 1;
    const levelName = LEVEL_NAMES[Math.min(level, 6)] || 'Eco Champion';
    const points    = s?.totalPoints ?? 0;
    const streak    = s?.currentStreak ?? 0;
    const monthlyKg = (s?.monthlyEmissions ?? 0).toFixed(1);
    const badgesHtml = (s?.badges ?? []).map(b =>
      `<span style="background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:10px;margin:3px;display:inline-block;font-size:12px">${b.icon} ${b.name}</span>`
    ).join('') || '<span style="color:#999">No badges yet</span>';

    const html = `<html><body style="font-family:Arial,sans-serif;background:#f5f7f5;padding:24px;color:#1a1a1a">
      <div style="max-width:480px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,#0a2e0a,#1b4a20);padding:32px;text-align:center">
          <div style="font-size:48px">🌿</div>
          <h1 style="color:#B2D054;margin:8px 0 4px;font-size:22px">EcoTrack AI Report</h1>
          <p style="color:rgba(255,255,255,0.7);margin:0;font-size:14px">${user?.name ?? 'Eco User'}</p>
          <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:12px">${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
        <div style="padding:24px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:100px;height:100px;border-radius:50px;border:4px solid #B2D054;display:inline-flex;align-items:center;justify-content:center;flex-direction:column">
              <div style="font-size:36px;font-weight:900;color:#B2D054">${ecoScore}</div>
              <div style="font-size:10px;color:#666;letter-spacing:1px">ECO SCORE</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            ${[['⭐ Level',`${level} — ${levelName}`],['💎 Points',points],['🔥 Streak',`${streak} days`],['📊 Monthly CO₂',`${monthlyKg} kg`]]
              .map(([k,v])=>`<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666;font-size:13px">${k}</td><td style="padding:10px 0;font-weight:700;text-align:right;font-size:13px">${v}</td></tr>`).join('')}
          </table>
          <p style="color:#666;font-size:12px;margin-bottom:8px">🏆 Badges Earned</p>
          <div>${badgesHtml}</div>
          <div style="margin-top:24px;padding:16px;background:#f9fbe7;border-radius:12px;text-align:center">
            <p style="color:#558b2f;font-size:12px;margin:0">Tracked with EcoTrack AI · ${new Date().getFullYear()}</p>
            <p style="color:#8fa832;font-size:11px;margin:4px 0 0">#EcoTrackAI #CarbonFootprint #ClimateAction</p>
          </div>
        </div>
      </div>
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share your Eco Report PDF' });
      } else {
        showAlert('PDF Created', `Saved to: ${uri}`);
      }
    } catch {
      showAlert('Error', 'Could not generate PDF. Please try again.');
    }
  };

  // ── Invite handler ────────────────────────────────────────────────────────
  const handleInvite = async (platformId) => {
    const text    = buildInviteText();
    const encoded = encodeURIComponent(text);

    try {
      switch (platformId) {
        case 'whatsapp': {
          const can = await Linking.canOpenURL('whatsapp://').catch(() => false);
          await Linking.openURL(can ? `whatsapp://send?text=${encoded}` : `https://wa.me/?text=${encoded}`);
          break;
        }
        case 'telegram':
          await Linking.openURL(`https://t.me/share/url?url=https://ecotrack.ai&text=${encoded}`);
          break;
        case 'instagram': {
          const ok = await copyText(text);
          if (ok) {
            showAlert('Copied! 📋', 'Invite text copied. Open Instagram and paste it in a DM or Story caption.');
          }
          break;
        }
        case 'facebook':
          await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}`);
          break;
        case 'twitter':
          await Linking.openURL(`https://twitter.com/intent/tweet?text=${encoded}`);
          break;
        case 'linkedin': {
          const title   = encodeURIComponent('EcoTrack AI — Carbon Footprint Tracker');
          const summary = encodeURIComponent('Track your carbon footprint, earn badges, and compete with friends!');
          await Linking.openURL(`https://www.linkedin.com/shareArticle?mini=true&title=${title}&summary=${summary}&source=EcoTrackAI`);
          break;
        }
        case 'sms': {
          const sep = Platform.OS === 'ios' ? '&' : '?';
          await Linking.openURL(`sms:${sep}body=${encoded}`);
          break;
        }
        case 'email': {
          const subject = encodeURIComponent('Join me on EcoTrack AI 🌿');
          await Linking.openURL(`mailto:?subject=${subject}&body=${encoded}`);
          break;
        }
        case 'copy': {
          const ok = await copyText(text);
          if (ok) {
            setCopied(true);
            showAlert('Copied! 📋', 'Invite text copied to clipboard.');
            setTimeout(() => setCopied(false), 2000);
          }
          break;
        }
        case 'more':
          await Share.share({ message: text, title: 'Join EcoTrack AI 🌿' });
          break;
        default:
          break;
      }
    } catch {
      showAlert('Error', 'Could not open that app. Make sure it is installed.');
    }
  };

  // ── Score card values ─────────────────────────────────────────────────────
  const ecoScore   = stats?.ecoScore      ?? 0;
  const level      = stats?.level         ?? 1;
  const points     = stats?.totalPoints   ?? 0;
  const streak     = stats?.currentStreak ?? 0;
  const monthlyKg  = stats?.monthlyEmissions ?? 0;
  const badges     = stats?.badges        ?? [];
  const levelName  = LEVEL_NAMES[Math.min(level, 6)] || 'Eco Champion';
  const scoreColor = ecoScore >= 80 ? '#B2D054' : ecoScore >= 60 ? '#8FA832' : ecoScore >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <View style={s.root}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#0A1A0F', '#0C1B12']} style={s.header}>
        <Text style={s.headerTitle}>📤 EcoTrack AI Share</Text>
        <Text style={s.headerSub}>Share your progress · Invite friends to go green</Text>
      </LinearGradient>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'score' && s.tabBtnActive]}
          onPress={() => setTab('score')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabTxt, tab === 'score' && s.tabTxtActive]}>📊 My Eco Score</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'invite' && s.tabBtnActive]}
          onPress={() => setTab('invite')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabTxt, tab === 'invite' && s.tabTxtActive]}>👥 Invite Friends</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ════════════════════════════ MY ECO SCORE TAB ════════════════════ */}
        {tab === 'score' && (
          <>
            {loading ? (
              <View style={s.centerBox}>
                <ActivityIndicator color="#B2D054" size="large" />
                <Text style={s.loadingTxt}>Loading your eco data…</Text>
              </View>
            ) : (
              <>
                {/* Score card */}
                <View style={s.scoreCard}>
                  <LinearGradient colors={['#0A2E0A', '#1B4A20']} style={s.cardGrad}>
                    <View style={s.cardTopRow}>
                      <Text style={s.cardApp}>🌿 EcoTrack AI</Text>
                      <Text style={s.cardUser}>{user?.name || 'Eco User'}</Text>
                    </View>
                    <View style={s.ringWrap}>
                      <View style={[s.ring, { borderColor: scoreColor }]}>
                        <Text style={[s.ringNum, { color: scoreColor }]}>{ecoScore}</Text>
                        <Text style={s.ringLbl}>ECO SCORE</Text>
                      </View>
                    </View>
                    <View style={s.statsRow}>
                      {[
                        { lbl: 'Level',   val: `${level}`,          sub: levelName   },
                        { lbl: 'Points',  val: `${points}`,         sub: 'earned'    },
                        { lbl: 'Streak',  val: `${streak}`,         sub: 'days'      },
                        { lbl: 'Monthly', val: `${monthlyKg.toFixed(0)}`, sub: 'kg CO₂' },
                      ].map((item, i) => (
                        <View key={i} style={s.statBox}>
                          <Text style={s.statVal}>{item.val}</Text>
                          <Text style={s.statLbl}>{item.lbl}</Text>
                          <Text style={s.statSub}>{item.sub}</Text>
                        </View>
                      ))}
                    </View>
                    {badges.length > 0 && (
                      <View style={s.badgesRow}>
                        <Text style={s.badgesLbl}>🏆 Badges</Text>
                        <View style={s.badgeList}>
                          {badges.slice(0, 6).map((b, i) => (
                            <View key={i} style={s.badgePill}>
                              <Text style={s.badgeIcon}>{b.icon}</Text>
                              <Text style={s.badgeName}>{b.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    <Text style={s.cardFooter}>#EcoTrackAI  #ClimateAction  #GreenLife</Text>
                  </LinearGradient>
                </View>

                {/* Share buttons */}
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Share your progress</Text>
                  <Text style={s.sectionSub}>Let the world see your green impact</Text>

                  <TouchableOpacity style={s.shareBtn} onPress={handleShareAll} activeOpacity={0.85}>
                    <LinearGradient colors={['#3b82f6','#1d4ed8']} style={s.shareBtnGrad}>
                      <Text style={s.shareBtnIcon}>📤</Text>
                      <Text style={s.shareBtnTxt}>Share to All Apps</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.shareBtn, { marginTop: 10 }]} onPress={handleWhatsAppScore} activeOpacity={0.85}>
                    <LinearGradient colors={['#25D366','#128C7E']} style={s.shareBtnGrad}>
                      <Text style={s.shareBtnIcon}>💬</Text>
                      <Text style={s.shareBtnTxt}>Share to WhatsApp</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.shareBtn, { marginTop: 10 }]} onPress={handlePDF} activeOpacity={0.85}>
                    <LinearGradient colors={['#ef4444','#b91c1c']} style={s.shareBtnGrad}>
                      <Text style={s.shareBtnIcon}>📄</Text>
                      <Text style={s.shareBtnTxt}>Download PDF Report</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Tips */}
                <View style={s.tipsCard}>
                  <Text style={s.tipsTitle}>💡 Improve Your Score</Text>
                  {[
                    { icon: '🚶', tip: 'Walk or cycle for short trips instead of driving' },
                    { icon: '🥗', tip: 'Switch to plant-based meals 3× per week' },
                    { icon: '💡', tip: 'Turn off lights and unplug devices when not in use' },
                    { icon: '♻️', tip: 'Contribute to a carbon offset program' },
                  ].map((t, i) => (
                    <View key={i} style={s.tipRow}>
                      <Text style={s.tipIcon}>{t.icon}</Text>
                      <Text style={s.tipTxt}>{t.tip}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════ INVITE FRIENDS TAB ═════════════════ */}
        {tab === 'invite' && (
          <>
            {/* Invite card preview */}
            <View style={s.inviteCard}>
              <LinearGradient colors={['#0A2E0A', '#1B4A20']} style={s.inviteCardGrad}>
                <Text style={s.inviteCardEmoji}>🌍</Text>
                <Text style={s.inviteCardTitle}>Join EcoTrack AI</Text>
                <Text style={s.inviteCardBody}>
                  Hey! 👋 I've been tracking my carbon footprint with EcoTrack AI — it's helping me live greener every day 🌿{'\n\n'}
                  Log activities, earn badges, and compete on the leaderboard! 🏆{'\n\n'}
                  {user?.name ? `— ${user.name}` : ''}
                </Text>
                <Text style={s.inviteCardHash}>#EcoTrackAI  #GreenLife  #ClimateAction</Text>
              </LinearGradient>
            </View>

            {/* Platform grid */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Send an Invite</Text>
              <Text style={s.sectionSub}>Choose a platform to invite your friends</Text>

              <View style={s.platformGrid}>
                {PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={s.platformTile}
                    onPress={() => handleInvite(p.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[p.color, p.dark]} style={s.platformGrad}>
                      <Text style={s.platformEmoji}>
                        {p.id === 'copy' && copied ? '✅' : p.emoji}
                      </Text>
                    </LinearGradient>
                    <Text style={s.platformLabel}>
                      {p.id === 'copy' && copied ? 'Copied!' : p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* How it works */}
            <View style={s.tipsCard}>
              <Text style={s.tipsTitle}>🤝 How Inviting Works</Text>
              {[
                { icon: '1️⃣', tip: 'Tap any platform button above to share your invite' },
                { icon: '2️⃣', tip: 'Your friend signs up on EcoTrack AI with their email' },
                { icon: '3️⃣', tip: 'They start logging eco activities and earning points' },
                { icon: '4️⃣', tip: 'Compete together on the Leaderboard and Challenges!' },
              ].map((t, i) => (
                <View key={i} style={s.tipRow}>
                  <Text style={s.tipIcon}>{t.icon}</Text>
                  <Text style={s.tipTxt}>{t.tip}</Text>
                </View>
              ))}
            </View>

            {/* Instagram note */}
            <View style={s.infoBox}>
              <Text style={s.infoIcon}>📸</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Instagram</Text>
                <Text style={s.infoBody}>
                  Tapping Instagram copies the invite text to your clipboard. Open Instagram and paste it in a DM or Story caption.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#060F08' },
  scroll: { flex: 1 },

  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 22, paddingHorizontal: 24, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#EFF4EE' },
  headerSub:   { fontSize: 13, color: 'rgba(239,244,238,0.6)', marginTop: 6, textAlign: 'center' },

  tabRow:       { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, backgroundColor: '#0D1A10', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(178,208,84,0.15)' },
  tabBtn:       { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#B2D054' },
  tabTxt:       { fontSize: 13, fontWeight: '700', color: 'rgba(239,244,238,0.5)' },
  tabTxtActive: { color: '#071209' },

  centerBox:  { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingTxt: { color: 'rgba(239,244,238,0.5)', fontSize: 14 },

  // Score card
  scoreCard: { margin: 16, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14 },
  cardGrad:  { padding: 24 },
  cardTopRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardApp:   { fontSize: 15, fontWeight: '800', color: '#B2D054' },
  cardUser:  { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  ringWrap:  { alignItems: 'center', marginBottom: 22 },
  ring:      { width: 130, height: 130, borderRadius: 65, borderWidth: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  ringNum:   { fontSize: 44, fontWeight: '900' },
  ringLbl:   { fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5 },
  statsRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  statBox:   { alignItems: 'center', flex: 1 },
  statVal:   { fontSize: 19, fontWeight: '800', color: '#fff' },
  statLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  statSub:   { fontSize: 9, color: 'rgba(255,255,255,0.35)' },
  badgesRow: { marginBottom: 14 },
  badgesLbl: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 7 },
  badgeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  badgePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  badgeIcon: { fontSize: 12, marginRight: 4 },
  badgeName: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  cardFooter:{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 4 },

  // Shared section
  section:     { paddingHorizontal: 16, paddingTop: 4 },
  sectionTitle:{ fontSize: 17, fontWeight: '800', color: '#EFF4EE', marginBottom: 4 },
  sectionSub:  { fontSize: 13, color: 'rgba(239,244,238,0.5)', marginBottom: 16 },

  // Share buttons (score tab)
  shareBtn:     { width: '100%', borderRadius: 16, overflow: 'hidden' },
  shareBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  shareBtnIcon: { fontSize: 20 },
  shareBtnTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Tips / info card
  tipsCard:  { margin: 16, backgroundColor: '#0D1A10', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)' },
  tipsTitle: { fontSize: 15, fontWeight: '800', color: '#EFF4EE', marginBottom: 14 },
  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tipIcon:   { fontSize: 18, marginRight: 12, marginTop: 1 },
  tipTxt:    { fontSize: 13, color: 'rgba(239,244,238,0.7)', flex: 1, lineHeight: 19 },

  // Invite card
  inviteCard:     { margin: 16, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14 },
  inviteCardGrad: { padding: 24, alignItems: 'center' },
  inviteCardEmoji:{ fontSize: 48, marginBottom: 10 },
  inviteCardTitle:{ fontSize: 20, fontWeight: '900', color: '#B2D054', marginBottom: 12 },
  inviteCardBody: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  inviteCardHash: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },

  // Platform grid
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  platformTile: { width: '18%', minWidth: 60, alignItems: 'center', gap: 6 },
  platformGrad: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  platformEmoji:{ fontSize: 24 },
  platformLabel:{ fontSize: 10, fontWeight: '700', color: 'rgba(239,244,238,0.65)', textAlign: 'center' },

  // Instagram info box
  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(225,48,108,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(225,48,108,0.25)', gap: 10 },
  infoIcon: { fontSize: 22 },
  infoTitle:{ fontSize: 13, fontWeight: '800', color: '#EFF4EE', marginBottom: 3 },
  infoBody: { fontSize: 12, color: 'rgba(239,244,238,0.6)', lineHeight: 18 },
});
