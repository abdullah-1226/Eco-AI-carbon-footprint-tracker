import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, RefreshControl, ActivityIndicator,
  Animated, Platform, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getChallenges, searchChallengeUser, sendChallenge,
  acceptChallenge, declineChallenge, completeChallenge,
} from '../../api/api';

// showAlert is a no-op on web — use window.alert/confirm instead
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
      if (confirmed) {
        const action = buttons.find(b => b.style === 'destructive' || (b.text && b.text !== 'Cancel'));
        action?.onPress?.();
      }
    } else {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
import { useAuth } from '../../context/AuthContext';
import ScreenTransition from '../../components/ScreenTransition';

const METRICS = [
  { key: 'eco_score',        label: 'Eco Score',      emoji: '🌍', desc: 'Who improves their eco score the most?' },
  { key: 'activities_count', label: 'Most Activities', emoji: '📝', desc: 'Who logs the most activities?' },
  { key: 'streak',           label: 'Longest Streak',  emoji: '🔥', desc: 'Who keeps their streak going longest?' },
  { key: 'co2_saved',        label: 'CO₂ Saved',       emoji: '🌿', desc: 'Who saves the most CO₂ this week?' },
];
const DURATIONS = [7, 14, 30];

const BADGE_INFO = {
  eco_champion:    { icon: '🏆', name: 'Eco Champion'    },
  activity_master: { icon: '📝', name: 'Activity Master' },
  streak_king:     { icon: '🔥', name: 'Streak King'     },
  carbon_crusher:  { icon: '💪', name: 'Carbon Crusher'  },
  challenge_winner:{ icon: '⚔️', name: 'Challenge Winner' },
};

const STATUS_COLOR  = { pending: '#F59E0B', active: '#34D399', completed: '#60A5FA', declined: '#EF4444' };
const STATUS_LABEL  = { pending: 'Pending', active: 'Active', completed: 'Completed', declined: 'Declined' };

// ── Single challenge card ─────────────────────────────────────────────────────
function ChallengeCard({ challenge, userId, onAccept, onDecline, onComplete }) {
  const uid = userId?.toString();
  const isChallenger = !!(
    (challenge.challenger?._id?.toString() === uid) ||
    (challenge.challenger?.id?.toString()  === uid)
  );
  const me      = isChallenger ? challenge.challenger : challenge.opponent;
  const them    = isChallenger ? challenge.opponent   : challenge.challenger;
  const metric  = METRICS.find(m => m.key === challenge.metric) ?? METRICS[0];
  const status  = challenge.status;
  const badge   = BADGE_INFO[challenge.badge_awarded] ?? null;
  const iWon    = !!(challenge.winner && (
    challenge.winner?.toString()        === uid ||
    challenge.winner?._id?.toString()   === uid ||
    challenge.winner?.id?.toString()    === uid
  ));

  const daysLeft = challenge.ends_at
    ? Math.max(0, Math.ceil((new Date(challenge.ends_at) - Date.now()) / 86400000))
    : null;

  return (
    <LinearGradient
      colors={status === 'active' ? ['#0d2010','#122614'] : ['#0a0a0a','#111111']}
      style={[styles.card, status === 'active' && styles.cardActive]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[status] + '22', borderColor: STATUS_COLOR[status] + '55' }]}>
          <Text style={[styles.statusTxt, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
        </View>
        <Text style={styles.metricEmoji}>{metric.emoji}</Text>
      </View>

      {/* Players */}
      <View style={styles.playersRow}>
        <View style={styles.playerBox}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{me?.name?.[0] ?? '?'}</Text></View>
          <Text style={styles.playerName} numberOfLines={1}>{me?.name ?? 'You'}</Text>
          <Text style={styles.playerYou}>(You)</Text>
        </View>
        <Text style={styles.vs}>⚔️</Text>
        <View style={styles.playerBox}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <Text style={styles.avatarTxt}>{them?.name?.[0] ?? '?'}</Text>
          </View>
          <Text style={styles.playerName} numberOfLines={1}>{them?.name ?? 'Opponent'}</Text>
          <Text style={styles.playerYou}>{isChallenger ? 'Challenged' : 'Challenger'}</Text>
        </View>
      </View>

      {/* Metric + Duration */}
      <Text style={styles.cardMetric}>{metric.emoji} {metric.label} · {challenge.duration_days} days</Text>

      {/* Active: time remaining */}
      {status === 'active' && daysLeft !== null && (
        <View style={styles.timerRow}>
          <Text style={styles.timerEmoji}>⏳</Text>
          <Text style={styles.timerTxt}>{daysLeft === 0 ? 'Ends today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}</Text>
        </View>
      )}

      {/* Completed: result */}
      {status === 'completed' && (
        <View style={styles.resultBox}>
          {badge && (
            <Text style={styles.badgeAwarded}>{badge.icon} Badge Awarded: {badge.name}</Text>
          )}
          <Text style={iWon ? styles.wonTxt : styles.lostTxt}>
            {challenge.winner
              ? (iWon ? '🏆 You Won!' : `❌ ${them?.name ?? 'Opponent'} Won`)
              : '🤝 It\'s a Tie!'}
          </Text>
          {challenge.challenger_final !== null && (
            <Text style={styles.finalScores}>
              {me?.name}: {isChallenger ? challenge.challenger_final : challenge.opponent_final}  ·  {them?.name}: {isChallenger ? challenge.opponent_final : challenge.challenger_final}
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      {status === 'pending' && !isChallenger && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(challenge._id)} activeOpacity={0.85}>
            <Text style={styles.acceptTxt}>✅ Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(challenge._id)} activeOpacity={0.85}>
            <Text style={styles.declineTxt}>❌ Decline</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === 'pending' && isChallenger && (
        <Text style={styles.waitingTxt}>⏳ Waiting for {them?.name} to accept…</Text>
      )}
      {status === 'active' && daysLeft === 0 && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => onComplete(challenge._id)} activeOpacity={0.85}>
          <LinearGradient colors={['#B2D054','#8FA832']} style={styles.completeBtnGrad}>
            <Text style={styles.completeBtnTxt}>🏁 Finish Challenge</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// ── Send Challenge Form ───────────────────────────────────────────────────────
function SendForm({ onSent }) {
  const [email,     setEmail]     = useState('');
  const [found,     setFound]     = useState(null);
  const [searching, setSearching] = useState(false);
  const [metric,    setMetric]    = useState('eco_score');
  const [days,      setDays]      = useState(7);
  const [sending,   setSending]   = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success'|'error', text: string }
  const debounce = useRef(null);

  useEffect(() => {
    setFound(null);
    setStatusMsg(null);
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    if (debounce.current) clearTimeout(debounce.current);
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchChallengeUser(email.trim());
        setFound(res.data.data);
      } catch { setFound(null); }
      finally { setSearching(false); }
    }, 600);
    return () => clearTimeout(debounce.current);
  }, [email]);

  const handleSend = async () => {
    if (!found) {
      setStatusMsg({ type: 'error', text: 'Enter a valid registered email first.' });
      return;
    }
    setSending(true);
    setStatusMsg(null);
    try {
      const res = await sendChallenge({ opponent_email: email.trim(), metric, duration_days: days });
      setStatusMsg({ type: 'success', text: res.data.message ?? '⚔️ Challenge sent!' });
      setEmail('');
      setFound(null);
      setTimeout(() => onSent(), 1200);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.error ?? 'Could not send challenge.' });
    } finally {
      setSending(false);
    }
  };

  const canSend = !!found && !sending;

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>⚔️ Challenge a Friend</Text>
      <Text style={styles.formSub}>Enter their EcoTrack AI email address</Text>

      <TextInput
        style={styles.input}
        placeholder="friend@example.com"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={email}
        onChangeText={v => { setEmail(v); setStatusMsg(null); }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {searching && <Text style={styles.searchingTxt}>🔍 Searching…</Text>}
      {found && (
        <View style={styles.foundBox}>
          <View style={styles.foundAvatar}><Text style={{ fontSize: 16 }}>{found.name[0]}</Text></View>
          <View>
            <Text style={styles.foundName}>{found.name}</Text>
            <Text style={styles.foundEmail}>{found.email}</Text>
          </View>
          <Text style={{ color: '#34D399', fontSize: 18 }}>✓</Text>
        </View>
      )}

      {/* Inline status — visible on both web and mobile */}
      {statusMsg && (
        <View style={[styles.statusBox, statusMsg.type === 'success' ? styles.statusSuccess : styles.statusError]}>
          <Text style={[styles.statusTxt, statusMsg.type === 'success' ? styles.statusSuccessTxt : styles.statusErrorTxt]}>
            {statusMsg.type === 'success' ? '✅ ' : '⚠️ '}{statusMsg.text}
          </Text>
        </View>
      )}

      <Text style={styles.sectionLbl}>Battle Type</Text>
      <View style={styles.metricGrid}>
        {METRICS.map(m => (
          <TouchableOpacity key={m.key} style={[styles.metricChip, metric === m.key && styles.metricChipActive]}
            onPress={() => setMetric(m.key)} activeOpacity={0.8}>
            <Text style={styles.metricChipEmoji}>{m.emoji}</Text>
            <Text style={[styles.metricChipLabel, metric === m.key && { color: '#B2D054' }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {metric && <Text style={styles.metricDesc}>{METRICS.find(m => m.key === metric)?.desc}</Text>}

      <Text style={styles.sectionLbl}>Duration</Text>
      <View style={styles.durationRow}>
        {DURATIONS.map(d => (
          <TouchableOpacity key={d} style={[styles.durChip, days === d && styles.durChipActive]}
            onPress={() => setDays(d)} activeOpacity={0.8}>
            <Text style={[styles.durChipTxt, days === d && { color: '#B2D054' }]}>{d} days</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pressable works more reliably than TouchableOpacity on web */}
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={({ pressed }) => [styles.sendBtn, !canSend && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}
      >
        <LinearGradient colors={canSend ? ['#B2D054','#8FA832'] : ['#333','#222']} style={styles.sendBtnGrad}>
          {sending
            ? <ActivityIndicator color="#071209" />
            : <Text style={[styles.sendBtnTxt, !canSend && { color: 'rgba(255,255,255,0.4)' }]}>⚔️ Send Challenge</Text>
          }
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ChallengeScreen({ navigation }) {
  const { user }               = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]          = useState('active'); // 'active' | 'send' | 'history'
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const res = await getChallenges();
      setChallenges(res.data.data ?? []);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  const userId = user?._id || user?.id;

  const handleAccept = useCallback(async (id) => {
    try {
      await acceptChallenge(id);
      showAlert('⚔️ Challenge Accepted!', 'Battle starts now. May the best eco warrior win!');
      fetchData();
    } catch (err) {
      showAlert('Error', err?.response?.data?.error ?? 'Could not accept.');
    }
  }, [fetchData]);

  const handleDecline = useCallback(async (id) => {
    showAlert('Decline Challenge?', 'Are you sure?', [
      { text: 'Yes, Decline', style: 'destructive', onPress: async () => {
        await declineChallenge(id);
        fetchData();
      }},
      { text: 'Cancel' },
    ]);
  }, [fetchData]);

  const handleComplete = useCallback(async (id) => {
    try {
      const res = await completeChallenge(id);
      showAlert('🏁 Challenge Complete!', res.data.message);
      fetchData();
    } catch (err) {
      showAlert('Error', err?.response?.data?.error ?? 'Could not complete.');
    }
  }, [fetchData]);

  const active    = challenges.filter(c => c.status === 'active' || c.status === 'pending');
  const history   = challenges.filter(c => c.status === 'completed' || c.status === 'declined');
  const uidStr = userId?.toString();
  const wins   = history.filter(c => c.winner && (
    c.winner?.toString()       === uidStr ||
    c.winner?._id?.toString()  === uidStr ||
    c.winner?.id?.toString()   === uidStr
  ));

  if (loading) return (
    <LinearGradient colors={['#060a06','#0a0f0a']} style={styles.center}>
      <Text style={{ fontSize: 52 }}>⚔️</Text>
      <ActivityIndicator color="#B2D054" size="large" style={{ marginTop: 12 }} />
      <Text style={styles.loadTxt}>Loading challenges…</Text>
    </LinearGradient>
  );

  return (
    <ScreenTransition>
      <LinearGradient colors={['#060a06','#0a0f0a','#0d120d']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#B2D054" colors={['#B2D054']} />}
        >
          {/* ── Header ─────────────────── */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <Text style={styles.pageLabel}>ECO CHALLENGES</Text>
            <Text style={styles.pageTitle}>⚔️ Battle Arena</Text>
            <View style={styles.winsRow}>
              <View style={styles.winsBadge}>
                <Text style={styles.winsEmoji}>🏆</Text>
                <Text style={styles.winsVal}>{wins.length} wins</Text>
              </View>
              <View style={styles.winsBadge}>
                <Text style={styles.winsEmoji}>⚔️</Text>
                <Text style={styles.winsVal}>{challenges.length} total</Text>
              </View>
              {wins.length > 0 && (
                <View style={styles.winsBadge}>
                  <Text style={styles.winsEmoji}>⚡</Text>
                  <Text style={styles.winsVal}>Champion</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ── Tabs ───────────────────── */}
          <View style={styles.tabRow}>
            {[
              { key: 'active',  label: `⚔️ Active (${active.length})`  },
              { key: 'send',    label: '➕ New Challenge'               },
              { key: 'history', label: `📜 History (${history.length})` },
            ].map(t => (
              <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabActive]}
                onPress={() => setTab(t.key)} activeOpacity={0.8}>
                <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Active / Pending tab ────── */}
          {tab === 'active' && (
            <View style={styles.listSection}>
              {active.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>⚔️</Text>
                  <Text style={styles.emptyTitle}>No active challenges</Text>
                  <Text style={styles.emptyDesc}>Challenge a friend to a green battle!</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('send')} activeOpacity={0.85}>
                    <Text style={styles.emptyBtnTxt}>➕ Start a Challenge</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                active.map(c => (
                  <ChallengeCard key={c._id} challenge={c} userId={userId}
                    onAccept={handleAccept} onDecline={handleDecline} onComplete={handleComplete} />
                ))
              )}
            </View>
          )}

          {/* ── Send Challenge tab ─────── */}
          {tab === 'send' && (
            <View style={styles.listSection}>
              <SendForm onSent={() => { fetchData(); setTab('active'); }} />

              {/* Badge showcase */}
              <View style={styles.badgeShowcase}>
                <Text style={styles.badgeShowcaseTitle}>🏅 Badges You Can Earn</Text>
                {Object.values(BADGE_INFO).map(b => (
                  <View key={b.icon} style={styles.badgeRow}>
                    <Text style={{ fontSize: 24 }}>{b.icon}</Text>
                    <View>
                      <Text style={styles.badgeRowName}>{b.name}</Text>
                      <Text style={styles.badgeRowDesc}>Awarded to challenge winner</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── History tab ────────────── */}
          {tab === 'history' && (
            <View style={styles.listSection}>
              {history.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📜</Text>
                  <Text style={styles.emptyTitle}>No completed challenges yet</Text>
                  <Text style={styles.emptyDesc}>Your battle history will appear here</Text>
                </View>
              ) : (
                history.map(c => (
                  <ChallengeCard key={c._id} challenge={c} userId={userId}
                    onAccept={handleAccept} onDecline={handleDecline} onComplete={handleComplete} />
                ))
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>
    </ScreenTransition>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadTxt:  { color: '#B2D054', fontWeight: '700', fontSize: 14, marginTop: 8 },

  header:     { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 32, paddingBottom: 8 },
  pageLabel:  { fontSize: 10, color: '#B2D054', fontWeight: '800', letterSpacing: 2 },
  pageTitle:  { fontSize: 26, fontWeight: '900', color: '#EFF4EE', marginBottom: 10 },
  winsRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  winsBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(178,208,84,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(178,208,84,0.2)' },
  winsEmoji:  { fontSize: 14 },
  winsVal:    { fontSize: 12, fontWeight: '800', color: '#B2D054' },

  tabRow:     { flexDirection: 'row', marginHorizontal: 12, marginVertical: 10, gap: 6 },
  tabBtn:     { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabActive:  { backgroundColor: 'rgba(178,208,84,0.1)', borderColor: 'rgba(178,208,84,0.3)' },
  tabTxt:     { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },
  tabTxtActive:{ color: '#B2D054' },

  listSection:{ paddingHorizontal: 12, gap: 10 },

  // Challenge card
  card:         { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 2 },
  cardActive:   { borderColor: 'rgba(178,208,84,0.2)' },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusPill:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusTxt:    { fontSize: 11, fontWeight: '800' },
  metricEmoji:  { fontSize: 22 },
  playersRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  playerBox:    { flex: 1, alignItems: 'center', gap: 4 },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(178,208,84,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(178,208,84,0.3)' },
  avatarTxt:    { fontSize: 18, fontWeight: '900', color: '#B2D054' },
  playerName:   { fontSize: 13, fontWeight: '700', color: '#EFF4EE' },
  playerYou:    { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  vs:           { fontSize: 22, marginHorizontal: 8 },
  cardMetric:   { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 6 },
  timerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(178,208,84,0.08)', borderRadius: 8, padding: 8, marginBottom: 6 },
  timerEmoji:   { fontSize: 14 },
  timerTxt:     { fontSize: 12, color: '#B2D054', fontWeight: '700' },
  resultBox:    { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, gap: 4 },
  badgeAwarded: { fontSize: 13, fontWeight: '700', color: '#FBBF24' },
  wonTxt:       { fontSize: 15, fontWeight: '900', color: '#B2D054' },
  lostTxt:      { fontSize: 15, fontWeight: '900', color: '#EF4444' },
  finalScores:  { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  actionsRow:   { flexDirection: 'row', gap: 10, marginTop: 8 },
  acceptBtn:    { flex: 1, backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  acceptTxt:    { color: '#34D399', fontWeight: '800', fontSize: 13 },
  declineBtn:   { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  declineTxt:   { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  waitingTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
  completeBtn:  { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  completeBtnGrad:{ paddingVertical: 12, alignItems: 'center' },
  completeBtnTxt: { fontSize: 14, fontWeight: '900', color: '#071209' },

  // Send form
  formCard:     { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 10 },
  formTitle:    { fontSize: 18, fontWeight: '900', color: '#EFF4EE' },
  formSub:      { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  input:        { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#EFF4EE', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchingTxt: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  statusBox:        { borderRadius: 10, padding: 12, borderLeftWidth: 3 },
  statusSuccess:    { backgroundColor: 'rgba(52,211,153,0.1)', borderLeftColor: '#34D399' },
  statusError:      { backgroundColor: 'rgba(239,68,68,0.1)',  borderLeftColor: '#EF4444' },
  statusTxt:        { fontSize: 13, fontWeight: '600' },
  statusSuccessTxt: { color: '#34D399' },
  statusErrorTxt:   { color: '#FCA5A5' },
  foundBox:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' },
  foundAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(178,208,84,0.15)', justifyContent: 'center', alignItems: 'center' },
  foundName:    { fontSize: 14, fontWeight: '800', color: '#EFF4EE' },
  foundEmail:   { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  sectionLbl:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  metricGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  metricChipActive: { backgroundColor: 'rgba(178,208,84,0.12)', borderColor: 'rgba(178,208,84,0.35)' },
  metricChipEmoji:  { fontSize: 16 },
  metricChipLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  metricDesc:   { fontSize: 11, color: 'rgba(178,208,84,0.6)', fontStyle: 'italic' },
  durationRow:  { flexDirection: 'row', gap: 8 },
  durChip:      { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  durChipActive:{ backgroundColor: 'rgba(178,208,84,0.12)', borderColor: 'rgba(178,208,84,0.35)' },
  durChipTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  sendBtn:      { borderRadius: 13, overflow: 'hidden', marginTop: 4 },
  sendBtnGrad:  { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  sendBtnTxt:   { fontSize: 15, fontWeight: '900', color: '#071209' },

  // Badge showcase
  badgeShowcase:{ marginTop: 14, backgroundColor: 'rgba(251,191,36,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)', gap: 10 },
  badgeShowcaseTitle: { fontSize: 14, fontWeight: '900', color: '#FBBF24', marginBottom: 4 },
  badgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeRowName: { fontSize: 13, fontWeight: '700', color: '#EFF4EE' },
  badgeRowDesc: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 },

  // Empty state
  emptyBox:     { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji:   { fontSize: 52 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: '#EFF4EE' },
  emptyDesc:    { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  emptyBtn:     { marginTop: 8, backgroundColor: 'rgba(178,208,84,0.12)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(178,208,84,0.3)' },
  emptyBtnTxt:  { color: '#B2D054', fontWeight: '800', fontSize: 14 },
});
