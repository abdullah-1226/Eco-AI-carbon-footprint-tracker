// Web stub — react-native-maps doesn't run in a browser
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Stub = () => (
  <View style={s.box}>
    <Text style={s.txt}>🗺️ Map view requires native build</Text>
  </View>
);

const s = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
  txt: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
});

export default Stub;
export const Marker        = () => null;
export const Callout       = ({ children }) => children || null;
export const PROVIDER_DEFAULT = null;
export const PROVIDER_GOOGLE  = null;
