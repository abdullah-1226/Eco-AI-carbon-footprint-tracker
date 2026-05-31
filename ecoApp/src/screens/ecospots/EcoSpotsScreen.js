import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Linking, ActivityIndicator, ScrollView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { getRealNearbyPlaces, getAutocomplete } from '../../api/api';
import { showAlert } from '../../utils/crossAlert';
import BackButton from '../../components/BackButton';

// ── Category config ───────────────────────────────────────────────────────────
const PLACE_TYPES = [
  { id: 'all',         label: 'All Spots', icon: '🗺️', color: '#B2D054', marker: 'green' },
  { id: 'park',        label: 'Parks',     icon: '🌳', color: '#0A1A0F', marker: 'green' },
  { id: 'nursery',     label: 'Nursery',   icon: '🌱', color: '#8FA832', marker: 'green' },
  { id: 'organic',     label: 'Organic',   icon: '🥦', color: '#558B2F', marker: 'green' },
  { id: 'recycling',   label: 'Recycling', icon: '♻️', color: '#0F6E56', marker: 'blue'  },
  { id: 'ev_charging', label: 'EV Charge', icon: '⚡', color: '#1565C0', marker: 'blue'  },
];

const TYPE_COLORS = Object.fromEntries(PLACE_TYPES.map(t => [t.id, t.color]));
const TYPE_ICONS  = Object.fromEntries(PLACE_TYPES.map(t => [t.id, t.icon]));
const TYPE_MARKER = Object.fromEntries(PLACE_TYPES.map(t => [t.id, t.marker]));

// ── Leaflet map ───────────────────────────────────────────────────────────────
// CartoCDN Voyager tiles — much closer to Google Maps visual style
// "Search this area" fires only on user-initiated pans, not programmatic flyTo
const buildMapHTML = () => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; background:#e8f4e8; }
  .user-dot { width:18px; height:18px; border-radius:50%; background:#1565C0;
              border:3px solid #fff; box-shadow:0 0 0 4px rgba(21,101,192,0.3); }
  .leaflet-popup-content { font-size:13px; min-width:180px; }
  .popup-title  { font-weight:700; color:#1a1a1a; margin-bottom:4px; font-size:14px; }
  .popup-dist   { color:#555; font-size:12px; margin-bottom:6px; }
  .popup-addr   { color:#777; font-size:11px; margin-bottom:8px; }
  .popup-btn    { display:block; background:#0A1A0F; color:#fff; padding:7px 12px;
                  border-radius:8px; text-align:center; font-weight:700; font-size:12px;
                  text-decoration:none; cursor:pointer; border:none; width:100%; }
  .leaflet-control-zoom { border:none !important; box-shadow:0 2px 8px rgba(0,0,0,0.15) !important; }
  .leaflet-control-zoom a { border-radius:8px !important; margin:2px; }
</style>
</head><body>
<div id="map"></div>
<script>
  function sendUp(data) {
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(data); }
    else { window.parent.postMessage(data, '*'); }
  }

  var map = L.map('map', { zoomControl: true, attributionControl: false });
  map.setView([20, 0], 2);

  // Voyager tiles — polished, Google Maps-like style
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, crossOrigin: true,
  }).addTo(map);

  var userMarker   = null;
  var spotMarkers  = [];
  var locationSet  = false;
  var blockReport  = false;  // suppress mapMoved after programmatic flyTo
  var blockTimer   = null;

  function blockMoveReport(ms) {
    blockReport = true;
    clearTimeout(blockTimer);
    blockTimer = setTimeout(function() { blockReport = false; }, ms);
  }

  function userIcon() {
    return L.divIcon({ className:'', html:'<div class="user-dot"></div>', iconSize:[18,18], iconAnchor:[9,9] });
  }

  function setUserLocation(lat, lng) {
    blockMoveReport(2500);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat,lng], { icon: userIcon(), zIndexOffset: 1000 })
      .bindPopup('<b>\\u{1F4CD} Your Location</b>')
      .addTo(map);
    if (!locationSet) {
      map.flyTo([lat, lng], 14, { duration: 1.0, easeLinearity: 0.5 });
      locationSet = true;
    } else {
      map.flyTo([lat, lng], 14, { duration: 0.8 });
    }
  }

  function setPlaces(places) {
    spotMarkers.forEach(m => map.removeLayer(m));
    spotMarkers = [];
    places.forEach(function(p) {
      var color = p.markerColor || 'green';
      var icon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
      });
      var m = L.marker([p.lat, p.lng], { icon: icon });
      var popup = '<div class="popup-title">' + p.icon + ' ' + p.name + '</div>'
        + '<div class="popup-dist">\\u{1F4CF} ' + p.distance + ' km away</div>'
        + (p.address ? '<div class="popup-addr">\\u{1F4CD} ' + p.address + '</div>' : '')
        + '<button class="popup-btn" onclick="sendUp(JSON.stringify({action:\\'directions\\',lat:' + p.lat + ',lng:' + p.lng + ',name:\\"' + p.name.replace(/"/g,\\'\\') + '\\"}))">\\u{1F5FA}\\uFE0F Get Directions</button>';
      m.bindPopup(popup);
      m.on('click', function() { sendUp(JSON.stringify({ action:'select', id: p.id })); });
      m.addTo(map);
      spotMarkers.push(m);
    });
  }

  function flyTo(lat, lng) {
    blockMoveReport(2000);
    map.flyTo([lat, lng], 16, { duration: 0.8 });
  }

  // Emit center after user-initiated pan/zoom (not programmatic moves)
  var moveTimer = null;
  map.on('moveend', function() {
    if (blockReport) return;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(function() {
      var c = map.getCenter();
      sendUp(JSON.stringify({ action: 'mapMoved', lat: c.lat, lng: c.lng }));
    }, 700);
  });

  setTimeout(function() { map.invalidateSize(); }, 300);

  document.addEventListener('message', handleMsg);
  window.addEventListener('message', handleMsg);
  function handleMsg(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'init')   setUserLocation(msg.lat, msg.lng);
      if (msg.type === 'places') setPlaces(msg.places);
      if (msg.type === 'flyTo')  flyTo(msg.lat, msg.lng);
    } catch(_) {}
  }
</script>
</body></html>`;

// ── Stable HTML string (defined once, never re-created) ──────────────────────
const MAP_HTML = buildMapHTML();

// ── Web map: load from /map.html static file (blob URLs block CDN on web) ────
function WebMapView({ onLoad, onMessage, mapRef }) {
  const iframeRef = useRef(null);

  // When user clicks anywhere outside the iframe, restore parent window focus.
  // Without this, after clicking the map the sidebar/tabs need two clicks to work
  // because the first click just moves focus back from the iframe to the parent.
  useEffect(() => {
    const restoreFocus = (e) => {
      if (iframeRef.current && !iframeRef.current.contains(e.target)) {
        window.focus();
      }
    };
    document.addEventListener('mousedown', restoreFocus, true);
    return () => document.removeEventListener('mousedown', restoreFocus, true);
  }, []);

  useEffect(() => {
    if (mapRef) {
      mapRef.current = {
        postMessage: (data) => {
          iframeRef.current?.contentWindow?.postMessage(data, '*');
        },
      };
    }
  }, [mapRef]);

  useEffect(() => {
    const handler = (e) => {
      if (iframeRef.current && e.source === iframeRef.current.contentWindow) {
        onMessage?.({ nativeEvent: { data: e.data } });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    <iframe
      ref={iframeRef}
      src="/map.html"
      onLoad={onLoad}
      allow="geolocation"
      tabIndex="-1"
      style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────
class MapBoundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export default function EcoSpotsScreen() {
  const [location, setLocation]               = useState(null);
  const [places, setPlaces]                   = useState([]);
  const [activeType, setActiveType]           = useState('park');
  const [loading, setLoading]                 = useState(false);
  const [locError, setLocError]               = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedId, setSelectedId]           = useState(null);
  const [mapReady, setMapReady]               = useState(false);
  // Autocomplete
  const [suggestions, setSuggestions]         = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topSectionH, setTopSectionH]         = useState(160);
  // "Search this area"
  const [showSearchArea, setShowSearchArea]   = useState(false);
  const [mapCenter, setMapCenter]             = useState(null);

  const webRef     = useRef(null);
  const debounce   = useRef(null);
  const acDebounce = useRef(null);

  // ── Send message to Leaflet map ─────────────────────────────────────────
  const postToMap = useCallback((msg) => {
    if (Platform.OS === 'web') {
      webRef.current?.postMessage(JSON.stringify(msg));
    } else {
      webRef.current?.injectJavaScript(`handleMsg({data:${JSON.stringify(JSON.stringify(msg))}});true;`);
    }
  }, []);

  // ── IP-based geolocation fallback ─────────────────────────────────────────
  const getLocationByIP = async () => {
    try {
      const res  = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.latitude && data.longitude)
        return { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) };
    } catch {}
    try {
      const res  = await fetch('https://ip-api.com/json/?fields=lat,lon,status');
      const data = await res.json();
      if (data.status === 'success')
        return { latitude: data.lat, longitude: data.lon };
    } catch {}
    return null;
  };

  // ── Location ─────────────────────────────────────────────────────────────
  const getLocation = useCallback(async () => {
    setLocError(null);

    if (Platform.OS === 'web') {
      const browserCoords = await new Promise((resolve) => {
        if (!navigator?.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          ()    => resolve(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      });
      if (browserCoords) { setLocation(browserCoords); return browserCoords; }
      const ipCoords = await getLocationByIP();
      if (ipCoords) { setLocation(ipCoords); return ipCoords; }
      setLocError('Could not detect your location. Please check your internet connection.');
      return null;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocError('Location permission denied. Enable it in Settings.');
      return null;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      return loc.coords;
    } catch {
      setLocError('Could not get your location. Please try again.');
      return null;
    }
  }, []);

  // ── Fetch places ──────────────────────────────────────────────────────────
  const fetchPlaces = useCallback(async (type, coords, query = '') => {
    const loc = coords || location;
    if (!loc) return;
    setLoading(true);
    try {
      const res     = await getRealNearbyPlaces(loc.latitude, loc.longitude, type, query);
      const fetched = (res.data.places ?? []).map(p => ({
        ...p,
        icon:        TYPE_ICONS[p.type]  ?? TYPE_ICONS[type] ?? '📍',
        markerColor: TYPE_MARKER[p.type] ?? TYPE_MARKER[type] ?? 'green',
      }));
      setPlaces(fetched);
      if (mapReady) postToMap({ type: 'places', places: fetched });
    } catch {
      showAlert('Error', 'Could not load nearby places. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [location, mapReady, postToMap]);

  // ── Boot: get location then load spots ─────────────────────────────────
  useEffect(() => {
    (async () => {
      const coords = await getLocation();
      if (coords) fetchPlaces('park', coords);
    })();
  }, []);

  // ── Push location + places to map once both are ready ──────────────────
  useEffect(() => {
    if (mapReady && location) {
      postToMap({ type: 'init', lat: location.latitude, lng: location.longitude });
    }
  }, [mapReady, location]);

  useEffect(() => {
    if (mapReady && places.length > 0) {
      postToMap({ type: 'places', places });
    }
  }, [mapReady, places]);

  const onMapReady = useCallback(() => {
    setMapReady(true);
    if (location) postToMap({ type: 'init', lat: location.latitude, lng: location.longitude });
    if (places.length > 0) postToMap({ type: 'places', places });
  }, [location, places, postToMap]);

  // ── Category change ─────────────────────────────────────────────────────
  const handleTypeChange = (type) => {
    setActiveType(type);
    setSearchQuery('');
    setSelectedId(null);
    setSuggestions([]);
    setShowSuggestions(false);
    fetchPlaces(type, null, '');
  };

  // ── Search — dual mode:
  //    1. Show place autocomplete suggestions (fly map to selected city/area)
  //    2. Filter loaded spots by keyword as fallback
  const handleSearchChange = (text) => {
    setSearchQuery(text);

    if (acDebounce.current) clearTimeout(acDebounce.current);
    if (debounce.current)   clearTimeout(debounce.current);

    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      fetchPlaces(activeType, null, '');
      return;
    }

    if (text.trim().length >= 2) {
      acDebounce.current = setTimeout(async () => {
        try {
          const res   = await getAutocomplete(text.trim());
          const preds = res.data.predictions ?? [];
          setSuggestions(preds.slice(0, 5));
          setShowSuggestions(preds.length > 0);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 350);
    }

    // Also filter loaded spots after a slightly longer delay
    debounce.current = setTimeout(() => {
      fetchPlaces('all', null, text);
    }, 600);
  };

  // ── Autocomplete selection — fly map to chosen place, re-fetch spots there
  const handleSuggestionSelect = useCallback((suggestion) => {
    const newLoc = { latitude: suggestion.lat, longitude: suggestion.lng };
    setLocation(newLoc);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setShowSearchArea(false);
    postToMap({ type: 'init', lat: newLoc.latitude, lng: newLoc.longitude });
    fetchPlaces(activeType, newLoc, '');
  }, [activeType, postToMap, fetchPlaces]);

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedId(null);
    setSuggestions([]);
    setShowSuggestions(false);
    fetchPlaces(activeType, null, '');
  };

  // ── Map messages ────────────────────────────────────────────────────────
  const onMapMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent?.data ?? e.data ?? '{}');
      if (msg.action === 'select')     setSelectedId(msg.id);
      if (msg.action === 'directions') openDirections(msg.lat, msg.lng);
      if (msg.action === 'mapMoved') {
        setMapCenter({ latitude: msg.lat, longitude: msg.lng });
        setShowSearchArea(true);
      }
    } catch (_) {}
  }, []);

  // ── "Search this area" — re-fetch spots for the panned map center ───────
  const searchThisArea = () => {
    if (!mapCenter) return;
    setLocation(mapCenter);
    setShowSearchArea(false);
    setSearchQuery('');
    postToMap({ type: 'init', lat: mapCenter.latitude, lng: mapCenter.longitude });
    fetchPlaces(activeType, mapCenter, '');
  };

  const handleCardPress = (place) => {
    setSelectedId(place.id);
    postToMap({ type: 'flyTo', lat: place.lat, lng: place.lng });
  };

  const flyToMe = () => {
    if (location) postToMap({ type: 'init', lat: location.latitude, lng: location.longitude });
  };

  const openDirections = (lat, lng) => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    if (Platform.OS === 'web') {
      window.open(mapsUrl, '_blank');
    } else {
      const nativeUrl = Platform.OS === 'ios'
        ? `maps:?daddr=${lat},${lng}`
        : `google.navigation:q=${lat},${lng}`;
      Linking.canOpenURL(nativeUrl).then(ok => Linking.openURL(ok ? nativeUrl : mapsUrl));
    }
  };

  const getDirections = (place) => openDirections(place.lat, place.lng);

  const activeCfg   = PLACE_TYPES.find(t => t.id === activeType) || PLACE_TYPES[0];
  const isSearching = searchQuery.trim().length > 0;
  const hasPlaces   = !loading && places.length > 0;

  return (
    <View style={s.container}>
      <BackButton />

      {/* ── Measure header + chips height so dropdown can float below them ── */}
      <View onLayout={e => setTopSectionH(e.nativeEvent.layout.height)}>
        {/* Header */}
        <LinearGradient colors={['#0A1A0F', '#B2D054']} style={s.header}>
          <Text style={s.headerTitle}>🗺️ Nearby Eco Spots</Text>
          <Text style={s.headerSub}>
            {location
              ? `📍 ${location.latitude.toFixed(5)},  ${location.longitude.toFixed(5)}`
              : '📍 Detecting your location…'}
          </Text>

          {/* Search bar */}
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search city, parks, EV chargers…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              onSubmitEditing={async () => {
                setShowSuggestions(false);
                if (suggestions.length > 0) { handleSuggestionSelect(suggestions[0]); return; }
                if (searchQuery.trim().length < 2) return;
                // Geocode the typed query → fly map to result → load spots there
                try {
                  const res   = await getAutocomplete(searchQuery.trim());
                  const preds = res.data.predictions ?? [];
                  if (preds.length > 0) handleSuggestionSelect(preds[0]);
                } catch {}
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.clearX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Category chips */}
        <View style={s.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {PLACE_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[s.chip, activeType === t.id && !isSearching && { backgroundColor: t.color }]}
                onPress={() => handleTypeChange(t.id)}
              >
                <Text style={s.chipIcon}>{t.icon}</Text>
                <Text style={[s.chipLabel, activeType === t.id && !isSearching && s.chipLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ── Autocomplete dropdown — floats over map ──────────────────────── */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[s.suggestBox, { top: topSectionH }]}>
          {suggestions.map((sugg, i) => (
            <TouchableOpacity
              key={sugg.placeId ?? i}
              style={[s.suggestItem, i < suggestions.length - 1 && s.suggestDivider]}
              onPress={() => handleSuggestionSelect(sugg)}
              activeOpacity={0.75}
            >
              <Text style={s.suggestPin}>📍</Text>
              <View style={s.suggestBody}>
                <Text style={s.suggestName} numberOfLines={1}>
                  {sugg.shortName || sugg.description.split(',')[0]}
                </Text>
                <Text style={s.suggestDesc} numberOfLines={1}>{sugg.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {locError && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>⚠️ {locError}</Text>
          <TouchableOpacity onPress={getLocation} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <View style={[s.mapWrap, !hasPlaces && s.mapWrapFull]}>
        <MapBoundary fallback={
          <View style={s.mapFallback}>
            <Text style={s.mapFallbackTxt}>🗺️ Map unavailable</Text>
          </View>
        }>
          {Platform.OS === 'web' ? (
            // Native iframe via Blob URL — works on web where WebView srcdoc blocks CDN tiles
            <WebMapView
              mapRef={webRef}
              onLoad={onMapReady}
              onMessage={onMapMessage}
            />
          ) : (
            <WebView
              ref={webRef}
              source={{ html: MAP_HTML }}
              style={s.map}
              onLoad={onMapReady}
              onMessage={onMapMessage}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
              allowFileAccess
            />
          )}
        </MapBoundary>

        {/* My location button */}
        <TouchableOpacity style={s.myLocBtn} onPress={flyToMe}>
          <Text style={s.myLocIcon}>🎯</Text>
        </TouchableOpacity>

        {/* "Search this area" — appears after user pans map, like Google Maps */}
        {showSearchArea && (
          <View style={s.searchAreaWrap}>
            <TouchableOpacity style={s.searchAreaBtn} onPress={searchThisArea}>
              <Text style={s.searchAreaTxt}>🔍 Search this area</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Count pill */}
        {hasPlaces && (
          <View style={s.countPill}>
            <Text style={s.countTxt}>
              {isSearching ? `${places.length} results` : `${places.length} spots`}
            </Text>
          </View>
        )}

        {/* Loading overlay */}
        {loading && (
          <View style={s.mapLoader}>
            <ActivityIndicator size="large" color="#B2D054" />
            <Text style={s.mapLoaderTxt}>
              {isSearching
                ? `Searching "${searchQuery}"…`
                : `Finding ${activeCfg.label.toLowerCase()} nearby…`}
            </Text>
          </View>
        )}
      </View>

      {/* ── Results bar ──────────────────────────────────────────────────── */}
      {hasPlaces && (
        <View style={s.resultsBar}>
          <Text style={s.resultsTxt}>
            {isSearching
              ? `🔍 ${places.length} result${places.length !== 1 ? 's' : ''} · "${searchQuery}"`
              : `${activeCfg.icon} ${places.length} ${activeCfg.label} near you · OpenStreetMap`}
          </Text>
        </View>
      )}

      {/* ── Spot cards ───────────────────────────────────────────────────── */}
      {hasPlaces && (
        <FlatList
          data={places}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item, index }) => {
            const color    = TYPE_COLORS[item.type] || '#B2D054';
            const icon     = item.icon || TYPE_ICONS[item.type] || '📍';
            const selected = selectedId === item.id;
            return (
              <TouchableOpacity
                style={[s.card, selected && { borderColor: color, borderWidth: 2 }]}
                onPress={() => handleCardPress(item)}
                activeOpacity={0.85}
              >
                <View style={[s.cardNum, { backgroundColor: color }]}>
                  <Text style={s.cardNumTxt}>{index + 1}</Text>
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardNameRow}>
                    <Text style={s.cardIcon}>{icon}</Text>
                    <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  {isSearching && (
                    <Text style={[s.cardTypeLbl, { color }]}>
                      {PLACE_TYPES.find(t => t.id === item.type)?.label ?? item.type}
                    </Text>
                  )}
                  {!!item.address && (
                    <Text style={s.cardAddr} numberOfLines={1}>📍 {item.address}</Text>
                  )}
                  <Text style={s.cardDist}>📏 {item.distance} km away</Text>
                </View>
                <TouchableOpacity
                  style={[s.goBtn, { backgroundColor: color }]}
                  onPress={() => getDirections(item)}
                >
                  <Text style={s.goBtnTxt}>Go</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && places.length === 0 && !locError && location && (
        <View style={s.emptyBox}>
          <Text style={s.emptyIcon}>{isSearching ? '🔍' : activeCfg.icon}</Text>
          <Text style={s.emptyTitle}>
            {isSearching ? `No results for "${searchQuery}"` : `No ${activeCfg.label} Found Nearby`}
          </Text>
          <Text style={s.emptySub}>
            {isSearching
              ? 'Try different keywords — e.g. "park", "recycling", "nursery".'
              : `No ${activeCfg.label.toLowerCase()} found within 10 km of your location.`}
          </Text>
          {isSearching && (
            <TouchableOpacity style={s.clearBtn2} onPress={clearSearch}>
              <Text style={s.clearBtn2Txt}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },

  // Header
  header:      { paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 14, paddingHorizontal: 18 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 12,
                 fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)',
                 borderRadius: 14, paddingHorizontal: 12, height: 42,
                 borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  clearX:      { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

  // Category chips
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterRow:  { paddingHorizontal: 10, paddingVertical: 9, gap: 7 },
  chip:            { alignItems: 'center', paddingVertical: 7, paddingHorizontal: 11,
                     borderRadius: 20, backgroundColor: '#F0F0F0', flexDirection: 'row', gap: 4 },
  chipIcon:        { fontSize: 14 },
  chipLabel:       { fontSize: 11, color: '#555', fontWeight: '600' },
  chipLabelActive: { color: '#fff' },

  // Autocomplete dropdown
  suggestBox: {
    position: 'absolute',
    left: 12, right: 12,
    zIndex: 999,
    elevation: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  suggestItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  suggestDivider: { borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  suggestPin:     { fontSize: 16, marginRight: 10 },
  suggestBody:    { flex: 1 },
  suggestName:    { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  suggestDesc:    { fontSize: 11, color: '#999' },

  // Error
  errorBox:  { margin: 12, backgroundColor: '#FFF3CD', borderRadius: 12, padding: 12,
               flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontSize: 13, color: '#856404', flex: 1 },
  retryBtn:  { marginLeft: 10, backgroundColor: '#856404', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  retryTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Map
  mapWrap:        { height: Math.round(Dimensions.get('window').height * 0.45), position: 'relative' },
  mapWrapFull:    { flex: 1 },
  map:            { flex: 1 },
  mapFallback:    { flex: 1, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
  mapFallbackTxt: { fontSize: 15, color: '#B2D054', fontWeight: '600' },

  myLocBtn:  { position: 'absolute', bottom: 56, right: 12, width: 42, height: 42,
               borderRadius: 21, backgroundColor: '#fff', justifyContent: 'center',
               alignItems: 'center', elevation: 4,
               shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4 },
  myLocIcon: { fontSize: 20 },

  // "Search this area" button — centered at bottom of map
  searchAreaWrap: {
    position: 'absolute',
    bottom: 12,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  searchAreaBtn: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  searchAreaTxt: { fontSize: 13, fontWeight: '700', color: '#0A1A0F' },

  countPill: { position: 'absolute', top: 10, left: 10,
               backgroundColor: 'rgba(27,94,32,0.9)', borderRadius: 20,
               paddingHorizontal: 12, paddingVertical: 5 },
  countTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  mapLoader:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(245,247,245,0.85)',
                  justifyContent: 'center', alignItems: 'center', gap: 10 },
  mapLoaderTxt: { fontSize: 13, color: '#B2D054', fontWeight: '600', textAlign: 'center' },

  // Results
  resultsBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff',
                borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultsTxt: { fontSize: 12, color: '#444', fontWeight: '600' },

  // Spot cards
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8,
          flexDirection: 'row', alignItems: 'center',
          elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5,
          borderWidth: 1, borderColor: 'transparent' },
  cardNum:     { width: 30, height: 30, borderRadius: 9, justifyContent: 'center',
                 alignItems: 'center', marginRight: 10, flexShrink: 0 },
  cardNumTxt:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  cardBody:    { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  cardIcon:    { fontSize: 13 },
  cardName:    { fontSize: 13, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  cardTypeLbl: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  cardAddr:    { fontSize: 11, color: '#888', marginBottom: 2 },
  cardDist:    { fontSize: 11, color: '#666' },
  goBtn:       { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  goBtnTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Empty state
  emptyBox:     { padding: 40, alignItems: 'center' },
  emptyIcon:    { fontSize: 52, marginBottom: 14 },
  emptyTitle:   { fontSize: 17, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  clearBtn2:    { marginTop: 16, backgroundColor: '#B2D054', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  clearBtn2Txt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
