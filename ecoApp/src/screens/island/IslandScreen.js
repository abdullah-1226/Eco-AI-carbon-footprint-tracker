import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Modal, FlatList, RefreshControl, Platform,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getIsland, placeItem, removeItem } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/crossAlert';
import ScreenTransition from '../../components/ScreenTransition';

const { width: W } = Dimensions.get('window');
const COLS   = 10;
const TILE   = Math.floor((W - 24) / COLS);

// ── Biome background per grid position (checkerboard depth) ──────────────────
const BIOME_ROWS = [
  { bg: '#0d1f35', name: 'Sky'     }, // row 0
  { bg: '#193d1f', name: 'Forest'  }, // row 1
  { bg: '#1a3a0f', name: 'Forest'  }, // row 2
  { bg: '#2d4a1a', name: 'Plains'  }, // row 3
  { bg: '#1a2d0d', name: 'Plains'  }, // row 4
  { bg: '#0d2d3d', name: 'Coast'   }, // row 5
  { bg: '#0d1f3d', name: 'Ocean'   }, // row 6
  { bg: '#091528', name: 'Ocean'   }, // row 7
  { bg: '#060e1c', name: 'Deep'    }, // row 8
  { bg: '#040a14', name: 'Deep'    }, // row 9
];

const TIER_COLOR = { basic: '#34D399', advanced: '#60A5FA', elite: '#F59E0B' };
const HEALTH_COLOR = (h) => h > 60 ? '#B2D054' : h > 30 ? '#F59E0B' : '#EF4444';

// ── Single grid tile ──────────────────────────────────────────────────────────
const Tile = React.memo(({ x, y, occupant, isSelected, onPress, shopItems }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = occupant ? shopItems.find(i => i.item_id === occupant.item_id) : null;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, tension: 400, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.0,  tension: 300, friction: 7,  useNativeDriver: true }),
    ]).start();
    onPress(x, y, occupant);
  };

  const rowBg  = BIOME_ROWS[y % BIOME_ROWS.length]?.bg ?? '#0d1f10';
  const tileBg = occupant ? '#1a4a1f' : ((x + y) % 2 === 0 ? rowBg : rowBg + 'cc');

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[
        styles.tile,
        { width: TILE, height: TILE, backgroundColor: tileBg },
        isSelected && styles.tileSelected,
        occupant   && styles.tileOccupied,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={[styles.tileEmoji, { fontSize: TILE * 0.45 }]}>
          {occupant ? (meta?.emoji ?? '❓') : ''}
        </Text>
        {occupant && (
          <View style={styles.lvlBadge}>
            <Text style={styles.lvlTxt}>L{occupant.level}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

// ── Shop Modal ────────────────────────────────────────────────────────────────
const ShopModal = ({ visible, items, credits, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>🏪 Island Shop</Text>
      <Text style={styles.sheetCredits}>💰 {credits} Eco-Credits available</Text>

      <FlatList
        data={items}
        keyExtractor={i => i.item_id}
        numColumns={2}
        columnWrapperStyle={styles.shopRow}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const disabled = !item.is_unlocked || !item.can_afford;
          return (
            <TouchableOpacity
              style={[styles.shopCard, disabled && styles.shopCardDisabled]}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => onSelect(item)}
            >
              <Text style={styles.shopEmoji}>{item.is_unlocked ? item.emoji : '🔒'}</Text>
              <Text style={styles.shopName}>{item.name}</Text>
              <Text style={[styles.shopTier, { color: TIER_COLOR[item.tier] }]}>
                {item.tier.toUpperCase()}
              </Text>
              <Text style={styles.shopCost}>💰 {item.cost} credits</Text>
              <Text style={styles.shopCO2}>-{item.co2} kg CO₂/day</Text>
              {!item.is_unlocked && (
                <Text style={styles.shopLock}>Unlock at {item.unlock}% health</Text>
              )}
              {item.is_unlocked && !item.can_afford && (
                <Text style={styles.shopLock}>Need more credits</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  </Modal>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function IslandScreen({ navigation }) {
  const { user }                    = useAuth();
  const [island, setIsland]         = useState(null);
  const [shop, setShop]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placing, setPlacing]       = useState(false);
  const [shopVisible, setShopVisible]       = useState(false);
  const [selectedCell, setSelectedCell]     = useState(null); // {x, y}
  const [pendingItem, setPendingItem]       = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const res = await getIsland();
      setIsland(res.data.island);
      setShop(res.data.shop);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch {
      showAlert('Error', 'Could not load your island.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  // Build occupancy map: "x,y" → cell
  const occupancyMap = React.useMemo(() => {
    const map = {};
    (island?.grid ?? []).forEach(c => { map[`${c.x},${c.y}`] = c; });
    return map;
  }, [island?.grid]);

  // Place an item at a specific cell — called from both flows
  const handlePlace = useCallback(async (item, x, y) => {
    setPlacing(true);
    try {
      await placeItem({ item_id: item.item_id, x, y });
      await fetchData();
    } catch (err) {
      showAlert('Error', err?.response?.data?.error ?? 'Could not place item.');
    } finally {
      setPlacing(false);
      setPendingItem(null);
      setSelectedCell(null);
    }
  }, [fetchData]);

  const handleCellPress = useCallback((x, y, occupant) => {
    if (occupant) {
      // Tap on existing item → inspect / remove
      const meta = shop.find(i => i.item_id === occupant.item_id);
      showAlert(
        `${meta?.emoji ?? ''} ${meta?.name ?? occupant.item_id}`,
        `CO₂ reduction: ${occupant.co2_per_day} kg/day\nLevel: ${occupant.level}`,
        [
          {
            text: '🗑 Remove',
            style: 'destructive',
            onPress: async () => { await removeItem(x, y); fetchData(); },
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } else if (pendingItem) {
      // User already picked an item from shop — place it here directly
      showAlert(
        `Place ${pendingItem.emoji} ${pendingItem.name} here?`,
        `Cost: ${pendingItem.cost} Eco-Credits  ·  -${pendingItem.co2} kg CO₂/day`,
        [
          { text: '✅ Place it!', onPress: () => handlePlace(pendingItem, x, y) },
          { text: 'Cancel', style: 'cancel', onPress: () => { setPendingItem(null); setSelectedCell(null); } },
        ]
      );
    } else {
      // Empty cell, no pending item — open shop
      setSelectedCell({ x, y });
      setShopVisible(true);
    }
  }, [shop, pendingItem, fetchData, handlePlace]);

  const handleShopSelect = useCallback((item) => {
    setShopVisible(false);
    if (selectedCell) {
      // Cell was already chosen → confirm immediately
      showAlert(
        `Place ${item.emoji} ${item.name}?`,
        `Cost: ${item.cost} Eco-Credits  ·  -${item.co2} kg CO₂/day`,
        [
          { text: '✅ Place it!', onPress: () => handlePlace(item, selectedCell.x, selectedCell.y) },
          { text: 'Cancel', style: 'cancel', onPress: () => setSelectedCell(null) },
        ]
      );
    } else {
      // Shop opened directly (no cell selected) → show banner, user taps a cell
      setPendingItem(item);
    }
  }, [selectedCell, handlePlace]);

  if (loading) return (
    <LinearGradient colors={['#020a04','#060f08']} style={styles.center}>
      <Text style={{ fontSize: 60 }}>🏝️</Text>
      <ActivityIndicator color="#B2D054" size="large" style={{ marginTop: 16 }} />
      <Text style={styles.loadTxt}>Building your island…</Text>
    </LinearGradient>
  );

  const health  = island?.health_score ?? 100;
  const credits = island?.eco_credits  ?? 0;
  const placed  = island?.grid?.length ?? 0;
  const dailyCO2Saved = (island?.grid ?? []).reduce((s, c) => s + (c.co2_per_day ?? 0), 0);

  return (
    <ScreenTransition>
      <LinearGradient colors={['#020a04','#060f08','#081209']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#B2D054" colors={['#B2D054']} />
          }
        >
          {/* ── Header ───────────────────── */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.islandLabel}>ECO ISLAND</Text>
              <Text style={styles.islandName}>{island?.island_name ?? 'My Island'}</Text>
            </View>
            <View style={styles.creditsChip}>
              <Text style={styles.creditsEmoji}>💰</Text>
              <Text style={styles.creditsVal}>{credits}</Text>
            </View>
          </Animated.View>

          {/* ── Health & Stats ────────────── */}
          <View style={styles.statsCard}>
            <View style={styles.healthRow}>
              <Text style={styles.healthLabel}>🌍 Island Health</Text>
              <Text style={[styles.healthPct, { color: HEALTH_COLOR(health) }]}>
                {Math.round(health)}%
              </Text>
            </View>
            <View style={styles.healthTrack}>
              <Animated.View style={[styles.healthFill, {
                width: `${health}%`,
                backgroundColor: HEALTH_COLOR(health),
              }]} />
            </View>

            <View style={styles.miniStats}>
              {[
                { emoji: '🏗️', label: 'Built',      val: placed },
                { emoji: '🌿', label: 'CO₂/day',    val: `${dailyCO2Saved.toFixed(1)} kg` },
                { emoji: '💸', label: 'Spent',      val: island?.total_spent ?? 0 },
                { emoji: '📈', label: 'Earned',     val: island?.total_earned ?? 0 },
              ].map(s => (
                <View key={s.label} style={styles.miniStat}>
                  <Text style={styles.miniStatEmoji}>{s.emoji}</Text>
                  <Text style={styles.miniStatVal}>{s.val}</Text>
                  <Text style={styles.miniStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Legend ───────────────────── */}
          <View style={styles.legend}>
            <Text style={styles.legendTxt}>🟫 Empty &nbsp;&nbsp; 🟩 Built &nbsp;&nbsp; Tap empty → build • Tap built → inspect</Text>
          </View>

          {/* ── Pending item banner ──────── */}
          {pendingItem && !placing && (
            <TouchableOpacity
              style={styles.pendingBanner}
              onPress={() => setPendingItem(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.pendingEmoji}>{pendingItem.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>👇 Tap any empty grid cell below to place</Text>
                <Text style={styles.pendingSub}>{pendingItem.name}  ·  {pendingItem.cost} credits  ·  Tap this banner to cancel</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Island Grid ──────────────── */}
          {placing && (
            <View style={styles.placingRow}>
              <ActivityIndicator color="#B2D054" size="small" />
              <Text style={styles.placingTxt}>Placing item…</Text>
            </View>
          )}

          <View style={styles.gridWrapper}>
            {Array.from({ length: COLS }, (_, y) => (
              <View key={y} style={styles.gridRow}>
                {Array.from({ length: COLS }, (_, x) => (
                  <Tile
                    key={`${x},${y}`}
                    x={x} y={y}
                    occupant={occupancyMap[`${x},${y}`] ?? null}
                    isSelected={selectedCell?.x === x && selectedCell?.y === y}
                    shopItems={shop}
                    onPress={handleCellPress}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* ── Open Shop ────────────────── */}
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => setShopVisible(true)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#B2D054','#8FA832']} style={styles.shopBtnGrad}>
              <Text style={styles.shopBtnTxt}>🏪  Open Shop  ·  {shop.filter(i => i.is_unlocked && i.can_afford).length} items available</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Full Game Guide ──────────── */}
          <View style={styles.guideSection}>
            <Text style={styles.guideMainTitle}>📖 How to Play — Full Guide</Text>

            {/* Earning Credits */}
            <View style={styles.guideBlock}>
              <LinearGradient colors={['#0d2010','#112614']} style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>💰 Earning Eco-Credits</Text>
                <Text style={styles.guideCardDesc}>Credits are your island currency. You earn them by logging eco-friendly activities that keep your daily CO₂ under your personal limit.</Text>
                {[
                  { icon: '🚶', label: '90% under limit',   val: '+92 credits' },
                  { icon: '🥗', label: '50% under limit',   val: '+60 credits' },
                  { icon: '🚗', label: 'At or over limit',  val: '+0 credits'  },
                ].map((r, i) => (
                  <View key={i} style={styles.guideRow}>
                    <Text style={styles.guideRowIcon}>{r.icon}</Text>
                    <Text style={styles.guideRowLabel}>{r.label}</Text>
                    <Text style={styles.guideRowVal}>{r.val}</Text>
                  </View>
                ))}
                <Text style={styles.guideNote}>💡 The greener your day, the more you earn. Max 100 credits per log.</Text>
              </LinearGradient>
            </View>

            {/* Health */}
            <View style={styles.guideBlock}>
              <LinearGradient colors={['#1a0d0d','#2d1212']} style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>🌍 Island Health Score</Text>
                <Text style={styles.guideCardDesc}>Your island health drops every day — like a Tamagotchi. If it hits 0%, the island turns barren. Place items to slow the decay.</Text>
                {[
                  { icon: '⚠️', label: 'Empty island',       val: '-2.0 pts/day' },
                  { icon: '☀️', label: 'With Solar Panel',   val: '-1.86 pts/day' },
                  { icon: '🌲', label: 'Full island',         val: '-0.1 pts/day' },
                ].map((r, i) => (
                  <View key={i} style={styles.guideRow}>
                    <Text style={styles.guideRowIcon}>{r.icon}</Text>
                    <Text style={styles.guideRowLabel}>{r.label}</Text>
                    <Text style={[styles.guideRowVal, { color: '#EF4444' }]}>{r.val}</Text>
                  </View>
                ))}
                <Text style={styles.guideNote}>💡 Log a green activity to recover up to +5 health points.</Text>
              </LinearGradient>
            </View>

            {/* Items */}
            <View style={styles.guideBlock}>
              <LinearGradient colors={['#0d1a2a','#0f2035']} style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>🏗️ Island Items</Text>
                <Text style={styles.guideCardDesc}>Buy items with your credits and place them on the grid. Each item reduces your daily health decay AND offsets real CO₂.</Text>
                {[
                  { emoji: '🌱', name: 'Sapling',        cost: '50',   co2: '1.5 kg/day', unlock: '0%'  },
                  { emoji: '🌳', name: 'Mature Tree',    cost: '150',  co2: '4.0 kg/day', unlock: '15%' },
                  { emoji: '☀️', name: 'Solar Panel',    cost: '300',  co2: '7.0 kg/day', unlock: '25%' },
                  { emoji: '🌬️', name: 'Wind Turbine',   cost: '500',  co2: '12 kg/day',  unlock: '40%' },
                  { emoji: '🌊', name: 'Ocean Cleaner',  cost: '750',  co2: '15 kg/day',  unlock: '60%' },
                  { emoji: '🏞️', name: 'Forest Reserve', cost: '1200', co2: '25 kg/day',  unlock: '75%' },
                  { emoji: '⚡', name: 'Solar Farm',     cost: '2000', co2: '40 kg/day',  unlock: '90%' },
                ].map((item, i) => (
                  <View key={i} style={styles.itemGuideRow}>
                    <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemGuideName}>{item.name}</Text>
                      <Text style={styles.itemGuideSub}>Unlocks at {item.unlock} health</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemGuideCost}>💰 {item.cost}</Text>
                      <Text style={styles.itemGuideCO2}>-{item.co2}</Text>
                    </View>
                  </View>
                ))}
              </LinearGradient>
            </View>

            {/* How to place */}
            <View style={styles.guideBlock}>
              <LinearGradient colors={['#1a1a0d','#2a2a10']} style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>📍 Placing Items — 2 Ways</Text>
                {[
                  { step: '1', title: 'Tap a cell first', desc: 'Tap any empty cell on the grid → shop opens → pick item → confirm → placed!' },
                  { step: '2', title: 'Open shop first',  desc: 'Tap "Open Shop" → pick an item → banner appears → tap any empty cell on the grid.' },
                ].map((s) => (
                  <View key={s.step} style={styles.stepRow}>
                    <View style={styles.stepBadge}><Text style={styles.stepNum}>{s.step}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{s.title}</Text>
                      <Text style={styles.stepDesc}>{s.desc}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.guideNote}>💡 Tap a placed item to inspect its stats or remove it.</Text>
              </LinearGradient>
            </View>

            {/* Strategy */}
            <View style={styles.guideBlock}>
              <LinearGradient colors={['#0d1f0d','#122614']} style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>🏆 Winning Strategy</Text>
                {[
                  '🌱 Start by buying Saplings — they\'re cheap and slow decay immediately',
                  '📅 Log activities every day to keep earning credits and recovering health',
                  '🎯 Unlock Solar Panels at 25% health for the best credit-to-CO₂ ratio',
                  '🔒 Higher-tier items unlock at higher health — keep your island alive!',
                  '⚡ A full island with Solar Farms loses only 0.1 health/day — nearly immortal',
                ].map((tip, i) => (
                  <Text key={i} style={styles.strategyTip}>· {tip}</Text>
                ))}
              </LinearGradient>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <ShopModal
          visible={shopVisible}
          items={shop}
          credits={credits}
          onSelect={handleShopSelect}
          onClose={() => { setShopVisible(false); setSelectedCell(null); }}
        />
      </LinearGradient>
    </ScreenTransition>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadTxt:     { color: '#B2D054', fontWeight: '700', fontSize: 15, marginTop: 8 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 32, paddingBottom: 10 },
  headerLeft:  { flex: 1 },
  islandLabel: { fontSize: 10, color: '#B2D054', fontWeight: '800', letterSpacing: 2 },
  islandName:  { fontSize: 22, fontWeight: '900', color: '#EFF4EE', marginTop: 2 },
  creditsChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, gap: 6, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  creditsEmoji:{ fontSize: 18 },
  creditsVal:  { fontSize: 17, fontWeight: '900', color: '#FBBF24' },

  statsCard:   { marginHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)', marginBottom: 8 },
  healthRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  healthLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '700' },
  healthPct:   { fontSize: 13, fontWeight: '900' },
  healthTrack: { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' },
  healthFill:  { height: 10, borderRadius: 5 },
  miniStats:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  miniStat:    { alignItems: 'center', gap: 2 },
  miniStatEmoji:{ fontSize: 16 },
  miniStatVal: { fontSize: 13, fontWeight: '900', color: '#EFF4EE' },
  miniStatLabel:{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },

  legend:      { paddingHorizontal: 12, marginBottom: 6 },
  legendTxt:   { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },

  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(178,208,84,0.15)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#B2D054' },
  pendingEmoji:  { fontSize: 28 },
  pendingTitle:  { fontSize: 13, fontWeight: '800', color: '#B2D054' },
  pendingSub:    { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  placingRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 6 },
  placingTxt:  { color: '#B2D054', fontWeight: '700', fontSize: 13 },

  gridWrapper: { marginHorizontal: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(178,208,84,0.2)' },
  gridRow:     { flexDirection: 'row' },

  tile:        { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.3)' },
  tileSelected:{ borderColor: '#B2D054', borderWidth: 2 },
  tileOccupied:{ borderColor: 'rgba(178,208,84,0.2)' },
  tileEmoji:   {},
  lvlBadge:    { position: 'absolute', bottom: 1, right: 1, backgroundColor: 'rgba(178,208,84,0.9)', borderRadius: 3, paddingHorizontal: 2 },
  lvlTxt:      { fontSize: 7, fontWeight: '900', color: '#071209' },

  shopBtn:     { marginHorizontal: 12, marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  shopBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  shopBtnTxt:  { fontSize: 15, fontWeight: '900', color: '#071209' },

  earnCard:    { marginHorizontal: 12, marginTop: 12, backgroundColor: 'rgba(178,208,84,0.06)', borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(178,208,84,0.12)' },
  earnTitle:   { fontSize: 13, fontWeight: '900', color: '#B2D054', marginBottom: 4 },
  earnTip:     { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  // Guide section
  guideSection:    { marginHorizontal: 12, marginTop: 14 },
  guideMainTitle:  { fontSize: 18, fontWeight: '900', color: '#EFF4EE', marginBottom: 12 },
  guideBlock:      { marginBottom: 10 },
  guideCard:       { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 8 },
  guideCardTitle:  { fontSize: 15, fontWeight: '900', color: '#EFF4EE', marginBottom: 4 },
  guideCardDesc:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18, marginBottom: 4 },
  guideRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  guideRowIcon:    { fontSize: 18, width: 26 },
  guideRowLabel:   { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  guideRowVal:     { fontSize: 12, fontWeight: '800', color: '#B2D054' },
  guideNote:       { fontSize: 11, color: 'rgba(178,208,84,0.6)', fontStyle: 'italic', marginTop: 4 },
  itemGuideRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemGuideName:   { fontSize: 12, fontWeight: '700', color: '#EFF4EE' },
  itemGuideSub:    { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  itemGuideCost:   { fontSize: 12, fontWeight: '800', color: '#FBBF24' },
  itemGuideCO2:    { fontSize: 10, color: '#34D399', fontWeight: '600' },
  stepRow:         { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  stepBadge:       { width: 26, height: 26, borderRadius: 13, backgroundColor: '#B2D054', justifyContent: 'center', alignItems: 'center' },
  stepNum:         { fontSize: 13, fontWeight: '900', color: '#071209' },
  stepTitle:       { fontSize: 13, fontWeight: '800', color: '#EFF4EE', marginBottom: 2 },
  stepDesc:        { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 16 },
  strategyTip:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },

  // Shop modal
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       { backgroundColor: '#0d1f10', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '78%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 20, fontWeight: '900', color: '#EFF4EE', marginBottom: 4 },
  sheetCredits:{ fontSize: 14, color: '#FBBF24', fontWeight: '700', marginBottom: 14 },
  shopRow:     { gap: 10 },
  shopCard:    { flex: 1, backgroundColor: '#122614', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(178,208,84,0.2)', alignItems: 'center', gap: 4 },
  shopCardDisabled: { opacity: 0.4 },
  shopEmoji:   { fontSize: 34 },
  shopName:    { fontSize: 12, fontWeight: '800', color: '#EFF4EE', textAlign: 'center' },
  shopTier:    { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  shopCost:    { fontSize: 12, fontWeight: '700', color: '#FBBF24' },
  shopCO2:     { fontSize: 10, color: '#34D399', fontWeight: '600' },
  shopLock:    { fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 2 },
});
