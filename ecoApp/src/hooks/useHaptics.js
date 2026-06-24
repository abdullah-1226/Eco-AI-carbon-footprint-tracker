import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isNative = Platform.OS !== 'web';

export function useHaptics() {
  const light   = () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const medium  = () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const heavy   = () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  const success = () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  const warning = () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  const error   = () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  return { light, medium, heavy, success, warning, error };
}
