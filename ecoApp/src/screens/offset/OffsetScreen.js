import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { showAlert } from '../../utils/crossAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { getOffsetPrograms, contributeOffset, getOffsetBalance, getOffsetHistory } from '../../api/api';
import BackButton from '../../components/BackButton';
import ScreenTransition from '../../components/ScreenTransition';

export default function OffsetScreen() {
  const [programs, setPrograms]   = useState([]);
  const [balance, setBalance]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [contributing, setContributing] = useState(false);
  const [modal, setModal]         = useState(null); // selected program
  const [qty, setQty]             = useState(1);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, hRes] = await Promise.all([
        getOffsetPrograms(),
        getOffsetBalance(),
        getOffsetHistory(),
      ]);
      setPrograms(pRes.data.data || []);
      setBalance(bRes.data);
      setHistory(hRes.data.data || []);
    } catch {
      showAlert('Error', 'Failed to load offset data');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!modal) return;
    setContributing(true);
    try {
      const res = await contributeOffset({ programId: modal.id, quantity: qty });
      showAlert('🌱 Success!', res.data.message);
      setModal(null);
      setQty(1);
      fetchAll();
    } catch (e) {
      showAlert('Error', e.response?.data?.error || 'Failed to contribute');
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#B2D054" />
        <Text style={styles.loadingText}>Loading offset programs...</Text>
      </View>
    );
  }

  const netPositive = balance?.isPositive ?? false;
  const netBalance  = balance?.netBalance ?? 0;

  return (
    <ScreenTransition>
    <View style={{ flex: 1 }}>
    <BackButton />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <LinearGradient colors={['#0A1A0F', '#0C1B12', '#0E2016']} style={styles.header}>
        <Text style={styles.headerTitle}>🌍 Carbon Offset</Text>
        <Text style={styles.headerSub}>Neutralize your carbon footprint</Text>
      </LinearGradient>

      {/* Balance card */}
      {balance && (
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={netPositive ? ['#0A1A0F', '#0C1B12'] : ['#B71C1C', '#C62828']}
            style={styles.balanceGrad}
          >
            <Text style={styles.balanceTitle}>
              {netPositive ? '🎉 Carbon Positive!' : '⚖️ Carbon Balance'}
            </Text>
            <Text style={styles.balanceNet}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(1)} kg CO₂
            </Text>
            <Text style={styles.balanceSub}>
              {netPositive ? 'You have offset more than you generated!' : 'Offset more to become carbon neutral'}
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatVal}>{balance.totalGenerated.toFixed(1)} kg</Text>
                <Text style={styles.balanceStatLabel}>Generated</Text>
              </View>
              <Text style={styles.balanceVs}>vs</Text>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatVal}>{balance.totalOffset.toFixed(1)} kg</Text>
                <Text style={styles.balanceStatLabel}>Offset</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Programs */}
      <Text style={styles.sectionTitle}>🌱 Offset Programs</Text>
      {programs.map(p => (
        <View key={p.id} style={styles.programCard}>
          <View style={[styles.programIconBox, { backgroundColor: p.colorLight }]}>
            <Text style={styles.programIcon}>{p.icon}</Text>
          </View>
          <View style={styles.programBody}>
            <Text style={styles.programName}>{p.name}</Text>
            <Text style={styles.programDesc}>{p.description}</Text>
            <View style={styles.programMeta}>
              <View style={[styles.metaBadge, { backgroundColor: p.colorLight }]}>
                <Text style={[styles.metaText, { color: p.color }]}>
                  ${p.pricePerUnit} / {p.unit}
                </Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: 'rgba(178,208,84,0.12)' }]}>
                <Text style={[styles.metaText, { color: '#8FA832' }]}>
                  {p.co2PerUnit} kg CO₂/{p.unit}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.contributeBtn, { backgroundColor: p.color }]}
            onPress={() => { setModal(p); setQty(1); }}
          >
            <Text style={styles.contributeBtnText}>Offset</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* History */}
      {history.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📋 Contribution History</Text>
          {history.slice(0, 10).map((h, i) => (
            <View key={i} style={styles.historyItem}>
              <Text style={styles.historyIcon}>{h.programIcon}</Text>
              <View style={styles.historyBody}>
                <Text style={styles.historyName}>{h.programName}</Text>
                <Text style={styles.historyDate}>{new Date(h.date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyOffset}>+{h.co2Offset} kg CO₂</Text>
                <Text style={styles.historyAmount}>${h.amount}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />

      {/* Contribute Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal?.icon} {modal?.name}</Text>
            <Text style={styles.modalDesc}>{modal?.description}</Text>

            <View style={styles.modalStats}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatVal}>{qty}</Text>
                <Text style={styles.modalStatLabel}>{modal?.unit}(s)</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatVal}>${(modal?.pricePerUnit || 0) * qty}</Text>
                <Text style={styles.modalStatLabel}>Cost (sim.)</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={[styles.modalStatVal, { color: '#8FA832' }]}>{(modal?.co2PerUnit || 0) * qty} kg</Text>
                <Text style={styles.modalStatLabel}>CO₂ Offset</Text>
              </View>
            </View>

            {/* Qty selector */}
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(qty + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalNote}>
              💡 This is a simulated contribution for FYP purposes. In production, this would connect to a real carbon offset platform.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: modal?.color }]}
                onPress={handleContribute}
                disabled={contributing}
              >
                {contributing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Contribute</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  content:   { paddingBottom: 40 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:{ color: '#666', fontSize: 15 },

  header:    { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 24, alignItems: 'center' },
  headerTitle:{ fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

  balanceCard:{ margin: 16, borderRadius: 20, overflow: 'hidden', elevation: 6 },
  balanceGrad:{ padding: 24, alignItems: 'center' },
  balanceTitle:{ fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  balanceNet: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 6 },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  balanceStat:{ alignItems: 'center' },
  balanceStatVal:{ fontSize: 18, fontWeight: '800', color: '#fff' },
  balanceStatLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  balanceVs:  { fontSize: 14, color: 'rgba(255,255,255,0.5)' },

  sectionTitle:{ fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },

  programCard:{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', margin: 8, marginTop: 0, borderRadius: 16, padding: 14, elevation: 2 },
  programIconBox:{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  programIcon:{ fontSize: 26 },
  programBody:{ flex: 1 },
  programName:{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  programDesc:{ fontSize: 12, color: '#555', lineHeight: 16, marginBottom: 8 },
  programMeta:{ flexDirection: 'row', gap: 6 },
  metaBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaText:   { fontSize: 11, fontWeight: '600' },
  contributeBtn:{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', alignSelf: 'center', marginLeft: 8 },
  contributeBtnText:{ color: '#fff', fontSize: 12, fontWeight: '700' },

  historyItem:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 8, marginBottom: 6, borderRadius: 12, padding: 12, elevation: 1 },
  historyIcon:{ fontSize: 24, marginRight: 12 },
  historyBody:{ flex: 1 },
  historyName:{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  historyDate:{ fontSize: 11, color: '#999' },
  historyRight:{ alignItems: 'flex-end' },
  historyOffset:{ fontSize: 13, fontWeight: '700', color: '#8FA832' },
  historyAmount:{ fontSize: 11, color: '#999' },

  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  modalDesc:  { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 16 },
  modalStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  modalStat:  { alignItems: 'center' },
  modalStatVal:{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  modalStatLabel:{ fontSize: 11, color: '#888' },
  qtyRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  qtyBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(178,208,84,0.12)', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 24, fontWeight: '700', color: '#8FA832' },
  qtyNum:     { fontSize: 28, fontWeight: '800', color: '#1A1A1A', minWidth: 40, textAlign: 'center' },
  modalNote:  { fontSize: 11, color: '#888', textAlign: 'center', fontStyle: 'italic', marginBottom: 20, lineHeight: 16 },
  modalActions:{ flexDirection: 'row', gap: 12 },
  modalCancel:{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  modalCancelText:{ fontSize: 15, fontWeight: '700', color: '#666' },
  modalConfirm:{ flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalConfirmText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
});
