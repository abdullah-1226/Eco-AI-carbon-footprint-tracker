import React, { useRef, useState, useCallback, Component, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Colors } from '../../theme';

// ── Navigation map HTML ───────────────────────────────────────────────────────
// Key fix: map sends 'mapReady' after Leaflet initializes, then React Native
// sends 'startNav'. This avoids the CDN timing race where injectJavaScript runs
// before Leaflet has finished loading from unpkg.com.
const buildNavHTML = () => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; background:#e8f4e8; }
  @keyframes navPulse {
    0%   { transform:scale(0.7); opacity:0.7; }
    100% { transform:scale(2.2); opacity:0; }
  }
  .nav-wrap {
    width:48px; height:48px; position:relative;
    display:flex; align-items:center; justify-content:center;
    transform-origin:center center;
  }
  .nav-pulse {
    position:absolute; width:48px; height:48px; border-radius:50%;
    background:rgba(21,101,192,0.35);
    animation:navPulse 2s ease-out infinite;
  }
  .nav-body {
    position:relative; z-index:1;
    width:36px; height:36px; border-radius:50%;
    background:#1565C0;
    border:3px solid #fff;
    box-shadow:0 3px 12px rgba(21,101,192,0.55), 0 1px 4px rgba(0,0,0,0.25);
    display:flex; align-items:center; justify-content:center;
  }
  .nav-triangle {
    width:0; height:0;
    border-left:7px solid transparent;
    border-right:7px solid transparent;
    border-bottom:16px solid #fff;
    margin-top:-3px;
  }
  .dest-pin {
    width:0; height:0;
    border-left:12px solid transparent;
    border-right:12px solid transparent;
    border-top:24px solid #E53935;
    position:relative;
  }
  .dest-pin::after {
    content:'';
    position:absolute; top:-28px; left:-8px;
    width:16px; height:16px; border-radius:50%;
    background:#E53935; border:3px solid #fff;
    box-shadow:0 0 0 3px rgba(229,57,53,0.4);
  }
  .leaflet-popup-content-wrapper { border-radius:10px !important; }
  .leaflet-popup-content { font-size:13px; font-weight:700; color:#1a1a1a; margin:10px 14px; }
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

  var map = L.map('map', { zoomControl:true, attributionControl:false });
  map.setView([30.3753, 69.3451], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom:19, crossOrigin:true,
  }).addTo(map);

  var routeLine    = null;
  var originMarker = null;
  var destMarker   = null;
  var navDLat      = null;
  var navDLng      = null;

  // Tell React Native Leaflet is ready — it will send startNav in response.
  // This is more reliable than a fixed setTimeout because CDN load time varies.
  map.whenReady(function() {
    setTimeout(function() { map.invalidateSize(); }, 100);
    sendUp(JSON.stringify({ action: 'mapReady' }));
  });

  async function startNav(oLat, oLng, dLat, dLng, name) {
    navDLat = dLat;
    navDLng = dLng;

    // Navigation arrow — pulsing blue circle with white triangle, rotates with heading
    originMarker = L.marker([oLat, oLng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="nav-wrap" id="origin-arrow"><div class="nav-pulse"></div><div class="nav-body"><div class="nav-triangle"></div></div></div>',
        iconSize: [48, 48], iconAnchor: [24, 24],
      }),
      zIndexOffset: 1000,
    }).bindPopup('<b>&#x1F535; Your Location</b>').addTo(map);

    // Red pin — destination
    destMarker = L.marker([dLat, dLng], {
      icon: L.divIcon({ className:'', html:'<div class="dest-pin"></div>', iconSize:[24,24], iconAnchor:[12,24] }),
    }).bindPopup('<b>&#x1F4CD; ' + (name || 'Destination') + '</b>').addTo(map);
    destMarker.openPopup();

    // Fit both markers on screen while route loads
    map.fitBounds([[oLat, oLng], [dLat, dLng]], { padding:[60,60] });

    try {
      var url = 'https://router.project-osrm.org/route/v1/driving/'
        + oLng + ',' + oLat + ';' + dLng + ',' + dLat
        + '?overview=full&geometries=geojson';
      var controller = new AbortController();
      var tid = setTimeout(function() { controller.abort(); }, 15000);
      var resp = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      var data = await resp.json();

      if (!data.routes || !data.routes[0]) {
        sendUp(JSON.stringify({ action:'routeError' }));
        return;
      }

      var route  = data.routes[0];
      var coords = route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
      routeLine  = L.polyline(coords, { color:'#1565C0', weight:6, opacity:0.85 }).addTo(map);

      // Fit the full route so user can see the whole path
      map.fitBounds(routeLine.getBounds(), { padding:[50,50] });

      var distKm  = (route.distance / 1000).toFixed(1);
      var mins    = Math.round(route.duration / 60);
      var timeStr = mins >= 60 ? Math.floor(mins/60) + 'h ' + (mins%60) + 'min' : mins + ' min';

      sendUp(JSON.stringify({ action:'routeReady', distKm:distKm, duration:timeStr }));

      // After 2 seconds zoom into destination so user clearly sees where to go
      setTimeout(function() {
        if (destMarker) {
          map.flyTo([dLat, dLng], 17, { duration: 1.2 });
          destMarker.openPopup();
        }
      }, 2500);

    } catch(e) {
      sendUp(JSON.stringify({ action:'routeError' }));
    }
  }

  // Move arrow and rotate it to show direction of travel — no camera pan
  function updateOrigin(lat, lng, heading) {
    if (!originMarker) return;
    originMarker.setLatLng([lat, lng]);
    var el = document.getElementById('origin-arrow');
    if (el && heading !== null && heading >= 0) {
      el.style.transform = 'rotate(' + heading + 'deg)';
    }
  }

  function handleMsg(e) {
    try {
      var d   = e.data;
      var msg = JSON.parse(typeof d === 'string' ? d : JSON.stringify(d));
      if (msg.type === 'startNav')    startNav(msg.oLat, msg.oLng, msg.dLat, msg.dLng, msg.name);
      if (msg.type === 'updateOrigin') updateOrigin(msg.lat, msg.lng, msg.heading);
      if (msg.type === 'flyToDest' && navDLat !== null) {
        map.flyTo([navDLat, navDLng], 17, { duration: 1.0 });
        if (destMarker) destMarker.openPopup();
      }
      if (msg.type === 'fitRoute' && routeLine) {
        map.fitBounds(routeLine.getBounds(), { padding:[50,50] });
      }
    } catch(err) {}
  }
  document.addEventListener('message', handleMsg);
  window.addEventListener('message', handleMsg);
</script>
</body></html>`;

const NAV_HTML = buildNavHTML();

// ── Web iframe wrapper ────────────────────────────────────────────────────────
function WebNavView({ onMessage, mapRef }) {
  const iframeRef = useRef(null);

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
      src="/directions.html"
      style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
    />
  );
}

class MapBoundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DirectionsScreen({ navigation, route }) {
  const { oLat, oLng, dLat, dLng, name } = route.params || {};
  const [routeInfo,  setRouteInfo]  = useState(null);
  const [routeError, setRouteError] = useState(false);
  const [mapKey,     setMapKey]     = useState(0);
  const webRef    = useRef(null);
  const watchRef  = useRef(null);
  // Keep params in a ref so onMessage can read them without stale closure
  const paramsRef = useRef({ oLat, oLng, dLat, dLng, name });

  const postToMap = useCallback((msg) => {
    if (Platform.OS === 'web') {
      webRef.current?.postMessage(JSON.stringify(msg));
    } else {
      webRef.current?.injectJavaScript(
        `handleMsg({data:${JSON.stringify(JSON.stringify(msg))}});true;`
      );
    }
  }, []);

  // Live location watch — blue dot follows user as they walk/drive to destination
  useEffect(() => {
    let cancelled = false;

    const startWatch = async () => {
      if (Platform.OS === 'web') {
        if (!navigator?.geolocation) return;
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            if (cancelled) return;
            postToMap({ type: 'updateOrigin', lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading ?? -1 });
          },
          null,
          { enableHighAccuracy: true, maximumAge: 4000 }
        );
        watchRef.current = { remove: () => navigator.geolocation.clearWatch(id) };
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 4000 },
          (loc) => {
            if (cancelled) return;
            postToMap({ type: 'updateOrigin', lat: loc.coords.latitude, lng: loc.coords.longitude, heading: loc.coords.heading ?? -1 });
          }
        );
        if (cancelled) { sub.remove(); return; }
        watchRef.current = sub;
      }
    };

    startWatch();

    return () => {
      cancelled = true;
      if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    };
  }, [postToMap]);

  // onMessage handles 'mapReady' → sends startNav immediately (no timers)
  const onMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent?.data ?? e.data ?? '{}');

      if (msg.action === 'mapReady') {
        const p = paramsRef.current;
        postToMap({
          type: 'startNav',
          oLat: p.oLat, oLng: p.oLng,
          dLat: p.dLat, dLng: p.dLng,
          name: p.name || 'Destination',
        });
      }

      if (msg.action === 'routeReady') {
        setRouteInfo({ distKm: msg.distKm, duration: msg.duration });
        setRouteError(false);
      }

      if (msg.action === 'routeError') {
        setRouteError(true);
      }
    } catch (_) {}
  }, [postToMap]);

  const retry = useCallback(() => {
    setRouteError(false);
    setRouteInfo(null);
    setMapKey(k => k + 1);
  }, []);

  const flyToDest  = useCallback(() => postToMap({ type: 'flyToDest' }),  [postToMap]);
  const fitRoute   = useCallback(() => postToMap({ type: 'fitRoute'  }),  [postToMap]);

  const showLoading = !routeInfo && !routeError;

  return (
    <View style={s.flex}>

      {/* ── Header ── */}
      <LinearGradient colors={['#0A1A0F', '#0F2010']} style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top:10, bottom:10, left:10, right:10 }}
        >
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>📍 {name || 'Destination'}</Text>
          <Text style={s.headerSub}>
            {routeInfo
              ? `🚗 ${routeInfo.distKm} km · ${routeInfo.duration}`
              : routeError ? 'Route unavailable' : 'Loading map…'}
          </Text>
        </View>
        <View style={s.backBtn} />
      </LinearGradient>

      {/* ── Map ── */}
      <MapBoundary fallback={
        <View style={[s.flex, s.center]}>
          <Text style={s.errTxt}>Map failed to load.</Text>
        </View>
      }>
        <View style={s.flex}>
          {Platform.OS === 'web' ? (
            <WebNavView key={mapKey} onMessage={onMessage} mapRef={webRef} />
          ) : (
            <WebView
              key={mapKey}
              ref={webRef}
              source={{ html: NAV_HTML }}
              onMessage={onMessage}
              javaScriptEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
              style={s.flex}
            />
          )}

          {/* Loading overlay — disappears once routeInfo or routeError is set */}
          {showLoading && (
            <View style={s.loadingOverlay} pointerEvents="none">
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={s.loadingText}>Finding your route…</Text>
              <Text style={s.loadingSub}>Powered by OpenStreetMap</Text>
            </View>
          )}

          {/* Floating "Show Destination" button — appears after route is ready */}
          {routeInfo && (
            <View style={s.fabRow}>
              <TouchableOpacity style={s.fab} onPress={flyToDest} activeOpacity={0.85}>
                <Text style={s.fabText}>📍 Destination</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.fab, s.fabSecondary]} onPress={fitRoute} activeOpacity={0.85}>
                <Text style={s.fabTextSec}>🗺 Full Route</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error overlay */}
          {routeError && (
            <View style={s.errorOverlay}>
              <Text style={s.errIcon}>⚠️</Text>
              <Text style={s.errTitle}>Route Unavailable</Text>
              <Text style={s.errMsg}>
                Could not calculate route.{'\n'}Check your internet and try again.
              </Text>
              <TouchableOpacity style={s.retryBtn} onPress={retry} activeOpacity={0.85}>
                <Text style={s.retryTxt}>↺  Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </MapBoundary>

      {/* ── Bottom panel ── */}
      {routeInfo && (
        <LinearGradient colors={['#0D1A10', '#060F08']} style={s.panel}>
          <View style={s.panelRow}>
            <View style={s.panelStat}>
              <Text style={s.panelValue}>{routeInfo.distKm} km</Text>
              <Text style={s.panelLabel}>Distance</Text>
            </View>
            <View style={s.panelDivider} />
            <View style={s.panelStat}>
              <Text style={s.panelValue}>{routeInfo.duration}</Text>
              <Text style={s.panelLabel}>Est. drive time</Text>
            </View>
          </View>
        </LinearGradient>
      )}

    </View>
  );
}

const TOP_PAD = Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 28) + 10;

const s = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: '#060F08' },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 14,
    paddingTop: TOP_PAD, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(178,208,84,0.18)',
  },
  backBtn:      { paddingVertical: 4, paddingRight: 6, minWidth: 56 },
  backText:     { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: '#EFF4EE', fontSize: 14, fontWeight: '800' },
  headerSub:    { color: Colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.8 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,15,8,0.80)',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  loadingSub:  { color: 'rgba(239,244,238,0.4)', fontSize: 12 },

  // Floating action buttons — sit above the map
  fabRow: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'column', gap: 8,
  },
  fab: {
    backgroundColor: 'rgba(10,26,15,0.92)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(178,208,84,0.4)',
  },
  fabSecondary: { borderColor: 'rgba(178,208,84,0.2)' },
  fabText:    { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  fabTextSec: { color: 'rgba(239,244,238,0.6)', fontSize: 12, fontWeight: '600' },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,15,8,0.94)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  errIcon:  { fontSize: 44 },
  errTitle: { color: '#EFF4EE', fontSize: 18, fontWeight: '800' },
  errMsg:   { color: 'rgba(239,244,238,0.55)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  errTxt:   { color: 'rgba(239,244,238,0.55)', fontSize: 13 },
  retryBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 28, marginTop: 4,
  },
  retryTxt: { color: '#071209', fontSize: 14, fontWeight: '800' },

  panel: {
    paddingHorizontal: 16, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    borderTopWidth: 1, borderTopColor: 'rgba(178,208,84,0.18)',
  },
  panelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  panelStat:    { alignItems: 'center', flex: 1 },
  panelValue:   { color: Colors.primary, fontSize: 22, fontWeight: '900' },
  panelLabel:   { color: 'rgba(239,244,238,0.45)', fontSize: 11, marginTop: 3 },
  panelDivider: { width: 1, height: 36, backgroundColor: 'rgba(178,208,84,0.18)' },
});
