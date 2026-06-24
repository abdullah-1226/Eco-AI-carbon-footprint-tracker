import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

export default function AnimatedNumber({
  value,
  duration = 1200,
  style,
  decimals = 1,
  prefix = '',
  suffix = '',
}) {
  const numVal  = parseFloat(value) || 0;
  const animVal = useRef(new Animated.Value(0)).current;
  const prevVal = useRef(0);
  const [display, setDisplay] = useState(`${prefix}${numVal.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    const start = prevVal.current;
    prevVal.current = numVal;
    animVal.setValue(start);

    const id = animVal.addListener(({ value: v }) => {
      setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`);
    });

    Animated.timing(animVal, {
      toValue: numVal,
      duration,
      useNativeDriver: false,
    }).start(() => {
      animVal.removeListener(id);
      setDisplay(`${prefix}${numVal.toFixed(decimals)}${suffix}`);
    });

    return () => animVal.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}
