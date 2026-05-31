import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Sit right at the top of the safe area on every platform
const TOP  = Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? 26 : 10;
const LEFT = 14;

export default function BackButton({ onPress, dark = false, inline = false }) {
  const navigation = useNavigation();
  const go = onPress ?? (() => navigation.goBack());

  if (inline) {
    return (
      <TouchableOpacity style={[styles.circle, dark && styles.circleDark, styles.inlineCircle]} onPress={go} activeOpacity={0.7}>
        <Text style={[styles.arrow, dark && styles.arrowDark]}>‹</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity style={[styles.circle, dark && styles.circleDark]} onPress={go} activeOpacity={0.7}>
        <Text style={[styles.arrow, dark && styles.arrowDark]}>‹</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top:      TOP,
    left:     LEFT,
    zIndex:   999,
  },
  circle: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth:     1.5,
    borderColor:     'rgba(255,255,255,0.45)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  inlineCircle: {
    marginLeft: 8,
  },
  circleDark: {
    backgroundColor: 'rgba(178,208,84,0.12)',
    borderColor:     'rgba(178,208,84,0.30)',
  },
  arrow: {
    fontSize:   22,
    color:      '#fff',
    lineHeight: 26,
    marginTop:  -1,
    marginLeft: -2,
  },
  arrowDark: { color: '#8FA832' },
});
