import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { logActivity, getDistance } from '../../api/api';
import { Colors, Radii, Spacing } from '../../theme';

const CATEGORIES = [
  { id: 'transport', icon: '🚗', label: 'Transport', grad: ['#1565C0','#0D47A1'],
    options: [
      { id: 'car_petrol',           label: 'Car (Petrol)',           icon: '🚗' },
      { id: 'car_diesel',           label: 'Car (Diesel)',           icon: '🚙' },
      { id: 'car_electric',         label: 'Car (Electric)',         icon: '🔋' },
      { id: 'motorcycle',           label: 'Motorcycle',             icon: '🏍️' },
      { id: 'bus',                  label: 'Bus',                    icon: '🚌' },
      { id: 'train',                label: 'Train/Metro',            icon: '🚂' },
      { id: 'flight_domestic',      label: 'Flight (Domestic)',      icon: '✈️' },
      { id: 'flight_international', label: 'Flight (International)', icon: '🛫' },
      { id: 'bicycle',              label: 'Bicycle',                icon: '🚲' },
      { id: 'walking',              label: 'Walking',                icon: '🚶' },
    ],
  },
  { id: 'food', icon: '🍽️', label: 'Food & Diet', grad: ['#2E7D32','#1B5E20'],
    options: [
      { id: 'beef_meal',    label: 'Beef Meal',       icon: '🥩' },
      { id: 'pork_meal',    label: 'Pork Meal',       icon: '🍖' },
      { id: 'chicken_meal', label: 'Chicken Meal',    icon: '🍗' },
      { id: 'fish_meal',    label: 'Fish Meal',       icon: '🐟' },
      { id: 'vegetarian',   label: 'Vegetarian Meal', icon: '🥦' },
      { id: 'vegan',        label: 'Vegan Meal',      icon: '🥗' },
    ],
  },
  { id: 'energy', icon: '⚡', label: 'Home Energy', grad: ['#E65100','#BF360C'],
    options: [
      { id: 'electricity', label: 'Electricity Used', icon: '💡' },
      { id: 'natural_gas', label: 'Natural Gas',      icon: '🔥' },
    ],
  },
  { id: 'shopping', icon: '🛍️', label: 'Shopping', grad: ['#6A1B9A','#4A148C'],
    options: [
      { id: 'clothing',          label: 'Clothing Item',     icon: '👕' },
      { id: 'electronics_small', label: 'Small Electronics', icon: '📱' },
      { id: 'electronics_large', label: 'Large Electronics', icon: '💻' },
      { id: 'furniture',         label: 'Furniture',         icon: '🪑' },
      { id: 'grocery_bag',       label: 'Plastic Bag',       icon: '🛒' },
    ],
  },
];

const EF = {
  car_petrol:0.21,car_diesel:0.17,car_electric:0.05,motorcycle:0.114,
  bus:0.089,train:0.041,flight_domestic:0.255,flight_international:0.195,
  bicycle:0,walking:0,
  beef_meal:6.61,pork_meal:2.45,chicken_meal:1.24,fish_meal:1.51,
  vegetarian:0.94,vegan:0.70,
  electricity:0.233,natural_gas:0.202,
  clothing:25,electronics_small:70,electronics_large:300,furniture:120,grocery_bag:5,
};

const TRANSPORT_IDS = ['car_petrol','car_diesel','car_electric','motorcycle','bus','train','flight_domestic','flight_international','bicycle','walking'];
const UNIT_LABELS   = { transport:'km', food:'meal(s)', energy:'kWh', shopping:'item(s)' };

export default function LogActivityScreen({ navigation, route }) {
  const initCat = route?.params?.category || null;
  const [selectedCat,  setSelectedCat]  = useState(initCat);
  const [selectedType, setSelectedType] = useState(null);
  const [value,        setValue]        = useState('');
  const [note,         setNote]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(null);

  // Maps state
  const [origin,       setOrigin]       = useState('');
  const [destination,  setDestination]  = useState('');
  const [mapsLoading,  setMapsLoading]  = useState(false);
  const [mapsResult,   setMapsResult]   = useState(null);

  const cat       = CATEGORIES.find(c => c.id === selectedCat);
  const typeOpt   = cat?.options.find(o => o.id === selectedType);
  const isTransport = selectedCat === 'transport';
  const co2Preview  = value && selectedType
    ? ((EF[selectedType] ?? 0) * parseFloat(value || 0)).toFixed(2)
    : null;

  const fetchDistance = async () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Missing', 'Enter both origin and destination.');
      return;
    }
    setMapsLoading(true);
    setMapsResult(null);
    try {
      const modeMap = { car_petrol:'driving',car_diesel:'driving',car_electric:'driving',
                        motorcycle:'driving',bus:'transit',train:'transit',
                        bicycle:'bicycling',walking:'walking',
                        flight_domestic:'driving',flight_international:'driving' };
      const mode = modeMap[selectedType] || 'driving';
      const res  = await getDistance({ origin: origin.trim(), destination: destination.trim(), mode });
      if (res.data.fallback) {
        Alert.alert('Maps not configured', 'Add your GOOGLE_MAPS_API_KEY in .env to auto-calculate distance. You can still enter km manually below.');
      } else {
        setMapsResult(res.data);
        setValue(String(res.data.distanceKm));
      }
    } catch {
      Alert.alert('Error', 'Could not calculate distance. Try entering km manually.');
    } finally {
      setMapsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCat || !selectedType || !value || parseFloat(value) <= 0) {
      Alert.alert('Missing Info', 'Please select a category, activity type, and enter a valid value.');
      return;
    }
    setLoading(true);
    try {
      const res = await logActivity({ category: selectedCat, subType: selectedType, value: parseFloat(value), note });
      setSuccess(res.data);
      setValue(''); setNote(''); setSelectedType(null); setMapsResult(null); setOrigin(''); setDestination('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to log activity.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient colors={['#0A2E0A','#1B5E20','#2E7D32']} style={styles.successContainer}>
        <Text style={styles.successIcon}>🌱</Text>
        <Text style={styles.successTitle}>Activity Logged!</Text>
        <Text style={styles.successCo2}>{success.data?.co2e?.toFixed(2)} kg CO₂ recorded</Text>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsText}>+{success.pointsEarned} eco points earned ⭐</Text>
        </View>
        {success.newBadges?.length > 0 && (
          <View style={styles.newBadgesBox}>
            <Text style={styles.newBadgesTitle}>🏅 New Badge{success.newBadges.length > 1 ? 's' : ''} Unlocked!</Text>
            {success.newBadges.map((b, i) => (
              <Text key={i} style={styles.newBadgeItem}>{b.icon} {b.name}</Text>
            ))}
          </View>
        )}
        <View style={styles.successBtns}>
          <TouchableOpacity style={styles.btnWhite} onPress={() => { setSuccess(null); setSelectedCat(null); }}>
            <Text style={styles.btnWhiteText}>Log Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.btnGhostText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Hero */}
      <LinearGradient colors={['#0A2E0A','#1B5E20']} style={styles.hero}>
        <Text style={styles.heroIcon}>➕</Text>
        <Text style={styles.heroTitle}>Log Activity</Text>
        <Text style={styles.heroSub}>Track your daily carbon footprint</Text>
        <Text style={styles.heroNote}>IPCC AR6 · GHG Protocol emission factors</Text>
      </LinearGradient>

      {/* Step 1 — Category */}
      <View style={styles.stepCard}>
        <Text style={styles.stepLabel}>① Select Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catCard, selectedCat === c.id && styles.catCardActive]}
              onPress={() => { setSelectedCat(c.id); setSelectedType(null); setMapsResult(null); }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedCat === c.id ? c.grad : ['rgba(255,255,255,0.06)','rgba(255,255,255,0.02)']}
                style={styles.catGrad}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={[styles.catLabel, selectedCat === c.id && { color: '#fff', fontWeight: '800' }]}>{c.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Step 2 — Activity type */}
      {cat && (
        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>② Select Activity Type</Text>
          <View style={styles.typeList}>
            {cat.options.map(o => (
              <TouchableOpacity
                key={o.id}
                style={[styles.typeRow, selectedType === o.id && styles.typeRowActive]}
                onPress={() => { setSelectedType(o.id); setMapsResult(null); }}
                activeOpacity={0.8}
              >
                <Text style={styles.typeIcon}>{o.icon}</Text>
                <Text style={[styles.typeLabel, selectedType === o.id && { color: '#00E676', fontWeight: '700' }]}>{o.label}</Text>
                {selectedType === o.id && <Text style={styles.typeTick}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 3 — Google Maps (transport only) */}
      {typeOpt && isTransport && TRANSPORT_IDS.includes(selectedType) && (
        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>③ Calculate Distance via Google Maps</Text>
          <Text style={styles.mapNote}>Enter locations to auto-calculate distance, or skip and enter km manually below.</Text>
          <TextInput
            mode="outlined"
            placeholder="Origin (e.g. Lahore, Pakistan)"
            value={origin}
            onChangeText={setOrigin}
            left={<TextInput.Icon icon="map-marker" color="#4FC3F7" />}
            style={styles.mapInput}
            outlineColor="rgba(255,255,255,0.2)"
            activeOutlineColor="#4FC3F7"
            textColor="#fff"
            placeholderTextColor="rgba(255,255,255,0.4)"
            theme={{ roundness: Radii.md, colors: { background: 'rgba(255,255,255,0.08)' } }}
          />
          <TextInput
            mode="outlined"
            placeholder="Destination (e.g. Karachi, Pakistan)"
            value={destination}
            onChangeText={setDestination}
            left={<TextInput.Icon icon="map-marker-check" color="#4FC3F7" />}
            style={[styles.mapInput, { marginTop: 8 }]}
            outlineColor="rgba(255,255,255,0.2)"
            activeOutlineColor="#4FC3F7"
            textColor="#fff"
            placeholderTextColor="rgba(255,255,255,0.4)"
            theme={{ roundness: Radii.md, colors: { background: 'rgba(255,255,255,0.08)' } }}
          />
          <TouchableOpacity style={styles.mapBtn} onPress={fetchDistance} disabled={mapsLoading} activeOpacity={0.8}>
            <LinearGradient colors={['#1565C0','#0D47A1']} style={styles.mapBtnGrad}>
              {mapsLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.mapBtnText}>📍 Calculate Distance</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          {mapsResult && (
            <View style={styles.mapsResultBox}>
              <Text style={styles.mapsResultTitle}>🗺️ Route Found</Text>
              <Text style={styles.mapsResultRow}>📍 From: {mapsResult.origin}</Text>
              <Text style={styles.mapsResultRow}>📍 To: {mapsResult.destination}</Text>
              <Text style={styles.mapsResultRow}>📏 Distance: <Text style={{ color: '#4FC3F7', fontWeight: '700' }}>{mapsResult.distanceText}</Text></Text>
              <Text style={styles.mapsResultRow}>⏱ Duration: {mapsResult.durationText}</Text>
              <Text style={styles.mapsResultNote}>Distance auto-filled below ✓</Text>
            </View>
          )}
        </View>
      )}

      {/* Step 4 — Value input */}
      {typeOpt && (
        <View style={styles.stepCard}>
          <Text style={styles.stepLabel}>{isTransport ? '④' : '③'} Enter {UNIT_LABELS[selectedCat] ?? 'Amount'}</Text>

          {co2Preview !== null && (
            <View style={[styles.previewBox, { borderColor: parseFloat(co2Preview) < 3 ? '#00E676' : '#FFD740' }]}>
              <View>
                <Text style={styles.previewLabel}>Estimated CO₂</Text>
                <Text style={styles.previewHint}>Based on IPCC AR6 factors</Text>
              </View>
              <Text style={[styles.previewValue, { color: parseFloat(co2Preview) < 3 ? '#00E676' : '#FFD740' }]}>
                {co2Preview} kg
              </Text>
            </View>
          )}

          <TextInput
            mode="outlined"
            placeholder={`e.g. 10 ${UNIT_LABELS[selectedCat] ?? ''}`}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon="pencil" color="#00E676" />}
            style={styles.valueInput}
            outlineColor="rgba(255,255,255,0.2)"
            activeOutlineColor="#00E676"
            textColor="#fff"
            placeholderTextColor="rgba(255,255,255,0.4)"
            theme={{ roundness: Radii.md, colors: { background: 'rgba(255,255,255,0.08)' } }}
          />
          <TextInput
            mode="outlined"
            placeholder="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            left={<TextInput.Icon icon="note-text" color="rgba(255,255,255,0.4)" />}
            style={[styles.valueInput, { marginTop: 8 }]}
            outlineColor="rgba(255,255,255,0.15)"
            activeOutlineColor="#00E676"
            textColor="#fff"
            placeholderTextColor="rgba(255,255,255,0.4)"
            theme={{ roundness: Radii.md, colors: { background: 'rgba(255,255,255,0.06)' } }}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#00C853','#1B5E20']} style={styles.submitGrad}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>🌱 Log Activity</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1A0A' },
  content:   { paddingBottom: 40 },

  hero: { paddingTop: 48, paddingBottom: 28, alignItems: 'center' },
  heroIcon:  { fontSize: 44, marginBottom: 8 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  heroNote:  { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 8, letterSpacing: 0.5 },

  stepCard:  { margin: Spacing.md, marginTop: 0, marginBottom: Spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  stepLabel: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', marginBottom: 12, letterSpacing: 0.3 },

  catGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard:   { width: '47.5%', borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  catCardActive: { borderColor: 'rgba(0,230,118,0.5)' },
  catGrad:   { padding: 14, alignItems: 'center' },
  catIcon:   { fontSize: 26, marginBottom: 6 },
  catLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  typeList:     { gap: 6 },
  typeRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'transparent' },
  typeRowActive:{ borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.1)' },
  typeIcon:     { fontSize: 20, marginRight: 12 },
  typeLabel:    { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  typeTick:     { fontSize: 16, color: '#00E676', fontWeight: '800' },

  mapNote:    { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, lineHeight: 17 },
  mapInput:   { backgroundColor: 'rgba(255,255,255,0.08)' },
  mapBtn:     { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  mapBtnGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  mapBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  mapsResultBox:  { marginTop: 12, backgroundColor: 'rgba(79,195,247,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(79,195,247,0.3)' },
  mapsResultTitle:{ fontSize: 13, fontWeight: '800', color: '#4FC3F7', marginBottom: 8 },
  mapsResultRow:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginVertical: 2 },
  mapsResultNote: { fontSize: 11, color: '#00E676', marginTop: 6, fontWeight: '600' },

  previewBox:   { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  previewLabel: { fontSize: 13, color: '#fff', fontWeight: '700' },
  previewHint:  { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  previewValue: { fontSize: 24, fontWeight: '900' },

  valueInput: { backgroundColor: 'rgba(255,255,255,0.08)' },
  submitBtn:  { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successIcon:   { fontSize: 80, marginBottom: 12 },
  successTitle:  { fontSize: 28, fontWeight: '900', color: '#00E676', marginBottom: 4 },
  successCo2:    { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  pointsPill:    { backgroundColor: 'rgba(255,215,64,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,215,64,0.4)' },
  pointsText:    { color: '#FFD740', fontWeight: '700', fontSize: 14 },
  newBadgesBox:  { backgroundColor: 'rgba(0,230,118,0.15)', borderRadius: 16, padding: 14, marginTop: 14, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  newBadgesTitle:{ fontSize: 14, fontWeight: '800', color: '#00E676', marginBottom: 6 },
  newBadgeItem:  { fontSize: 14, color: '#fff', marginVertical: 2 },
  successBtns:   { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnWhite:      { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnWhiteText:  { color: '#0A2E0A', fontWeight: '800', fontSize: 15 },
  btnGhost:      { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnGhostText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
