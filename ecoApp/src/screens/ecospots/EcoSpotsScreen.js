import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Linking, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { getNearbyPlaces } from '../../api/api';

const PLACE_TYPES = [
  { id: 'recycling',   label: 'Recycling',     icon: '♻️',  color: '#2D6A4F' },
  { id: 'ev_charging', label: 'EV Charging',   icon: '⚡',  color: '#1565C0' },
  { id: 'organic',     label: 'Organic Store', icon: '🥦',  color: '#558B2F' },
  { id: 'park',        label: 'Nature Park',   icon: '🌳',  color: '#1B5E20' },
];

export default function EcoSpotsScreen() {
  const [location, setLocation]   = useState(null);
  const [places, setPlaces]       = useState([]);
  const [activeType, setActiveType] = useState('recycling');
  const [loading, setLoading]     = useState(false);
  const [locError, setLocError]   = useState(null);

  const getLocation = useCallback(async () => {
    setLocError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocError('Location permission denied. Please enable it in settings.');
      return null;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
      return loc.coords;
    } catch {
      setLocError('Could not get your location. Please try again.');
      return null;
    }
  }, []);

  const fetchPlaces = useCallback(async (type, coords) => {
    const loc = coords || location;
    if (!loc) return;
    setLoading(true);
    try {
      const res = await getNearbyPlaces(loc.latitude, loc.longitude, type);
      if (res.data.fallback) {
        Alert.alert('API Key Required', 'Add your Google Maps API key to .env to find nearby eco spots.');
        setPlaces([]);
      } else {
        setPlaces(res.data.places || []);
      }
    } catch {
      Alert.alert('Error', 'Failed to load nearby places');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    (async () => {
      const coords = await getLocation();
      if (coords) fetchPlaces(activeType, coords);
    })();
  }, []);

  const handleTypeChange = (type) => {
    setActiveType(type);
    fetchPlaces(type);
  };

  const openMaps = (place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}&query_place_id=${place.id}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Maps'));
  };

  const getDirections = (place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Maps'));
  };

  const renderStar = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    return '⭐'.repeat(full) + (rating % 1 >= 0.5 ? '½' : '');
  };

  const activeCfg = PLACE_TYPES.find(t => t.id === activeType) || PLACE_TYPES[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Nearby Eco Spots</Text>
        <Text style={styles.headerSub}>
          {location ? `📍 Location found` : '📍 Locating you...'}
        </Text>
      </LinearGradient>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {PLACE_TYPES.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.filterBtn, activeType === t.id && { backgroundColor: t.color }]}
            onPress={() => handleTypeChange(t.id)}
          >
            <Text style={styles.filterIcon}>{t.icon}</Text>
            <Text style={[styles.filterLabel, activeType === t.id && styles.filterLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error */}
      {locError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {locError}</Text>
          <TouchableOpacity onPress={getLocation} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Finding {activeCfg.label.toLowerCase()} nearby...</Text>
        </View>
      )}

      {/* Places list */}
      {!loading && places.length > 0 && (
        <FlatList
          data={places}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.placeCard}>
              <View style={[styles.placeIndex, { backgroundColor: activeCfg.color }]}>
                <Text style={styles.placeIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.placeBody}>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text style={styles.placeAddr}>📍 {item.address}</Text>
                {item.rating && (
                  <Text style={styles.placeRating}>{renderStar(item.rating)} {item.rating}</Text>
                )}
                {item.open !== null && (
                  <Text style={[styles.placeOpen, { color: item.open ? '#2E7D32' : '#C62828' }]}>
                    {item.open ? '🟢 Open Now' : '🔴 Closed'}
                  </Text>
                )}
              </View>
              <View style={styles.placeActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeCfg.color }]} onPress={() => getDirections(item)}>
                  <Text style={styles.actionText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openMaps(item)}>
                  <Text style={[styles.actionTextOutline, { color: activeCfg.color }]}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Empty */}
      {!loading && places.length === 0 && !locError && location && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>{activeCfg.icon}</Text>
          <Text style={styles.emptyTitle}>No {activeCfg.label} Found</Text>
          <Text style={styles.emptySub}>No {activeCfg.label.toLowerCase()} spots found within 5 km of your location.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },

  header:    { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 24 },
  headerTitle:{ fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  filterRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: '#F0F0F0' },
  filterIcon:{ fontSize: 18 },
  filterLabel:{ fontSize: 10, color: '#555', fontWeight: '600', marginTop: 2 },
  filterLabelActive: { color: '#fff' },

  errorBox:  { margin: 16, backgroundColor: '#FFF3CD', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontSize: 13, color: '#856404', flex: 1 },
  retryBtn:  { marginLeft: 10, backgroundColor: '#856404', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  loadingBox:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText:{ fontSize: 14, color: '#666' },

  list:      { padding: 12 },
  placeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  placeIndex:{ width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  placeIndexText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  placeBody: { flex: 1 },
  placeName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  placeAddr: { fontSize: 12, color: '#666', marginBottom: 3 },
  placeRating:{ fontSize: 12, color: '#F9A825', marginBottom: 2 },
  placeOpen: { fontSize: 12, fontWeight: '600' },
  placeActions:{ justifyContent: 'center', gap: 6, marginLeft: 8 },
  actionBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionText:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  actionBtnOutline: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd' },
  actionTextOutline: { fontSize: 11, fontWeight: '700' },

  emptyBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle:{ fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 8 },
  emptySub:  { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});
