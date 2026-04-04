import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from '../../api/api';

const TYPE_CONFIG = {
  threshold_exceeded: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', label: 'Threshold Alert' },
  daily_reminder:     { color: '#FFA726', bg: 'rgba(255,167,38,0.15)',  label: 'Reminder' },
  badge_earned:       { color: '#66BB6A', bg: 'rgba(102,187,106,0.15)', label: 'Achievement' },
  milestone:          { color: '#42A5F5', bg: 'rgba(66,165,245,0.15)',  label: 'Milestone' },
  weekly_report:      { color: '#AB47BC', bg: 'rgba(171,71,188,0.15)',  label: 'Weekly Report' },
};

function AlertCard({ item, onRead, onDelete }) {
  const cfg = TYPE_CONFIG[item.alertType] || TYPE_CONFIG.daily_reminder;
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => !item.isRead && onRead(item._id)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMsg}>{item.message}</Text>
        <Text style={styles.cardTime}>{timeAgo(item.triggeredAt)}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item._id)}>
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await getAlerts();
      setAlerts(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      Alert.alert('Error', 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleRead = async (id) => {
    try {
      await markAlertRead(id);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Alert', 'Remove this alert?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteAlert(id);
            setAlerts(prev => prev.filter(a => a._id !== id));
          } catch {}
        },
      },
    ]);
  };

  const handleMarkAll = async () => {
    try {
      await markAllAlertsRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>🔔 Alerts</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {alerts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>No Alerts Yet</Text>
          <Text style={styles.emptySub}>You'll be notified when your emissions exceed your daily limit or when you earn badges.</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <AlertCard item={item} onRead={handleRead} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAlerts(); }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F5F7F5' },
  centerBox:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:{ color: '#666', fontSize: 16 },

  header:     { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:{ fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  markAllBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  markAllText:{ color: '#fff', fontSize: 12, fontWeight: '700' },

  list:       { padding: 16 },

  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#2E7D32' },
  iconBox:    { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconText:   { fontSize: 22 },
  cardBody:   { flex: 1 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  typeBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6 },
  typeText:   { fontSize: 11, fontWeight: '700' },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32' },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  cardMsg:    { fontSize: 13, color: '#555', lineHeight: 18 },
  cardTime:   { fontSize: 11, color: '#999', marginTop: 4 },
  deleteBtn:  { padding: 4, justifyContent: 'flex-start' },
  deleteIcon: { fontSize: 14, color: '#ccc' },

  emptyBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon:  { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 8 },
  emptySub:   { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});
