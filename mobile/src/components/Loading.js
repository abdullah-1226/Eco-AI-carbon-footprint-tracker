import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { Colors } from '../theme';

export default function Loading({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator animating size="large" color={Colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  text: { marginTop: 14, color: Colors.textMuted, fontSize: 14 },
});
