import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on iOS, Android, and web.
 * Alert.alert() is a no-op on web; this falls back to window.alert / window.confirm.
 */
export const showAlert = (title, message = '', buttons = [], options = {}) => {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons.length ? buttons : undefined, options);
    return;
  }

  const confirmButtons = buttons.filter(b => b.style !== 'cancel');
  const cancelButton   = buttons.find(b => b.style === 'cancel');

  if (confirmButtons.length > 0 && cancelButton) {
    // Destructive / confirmation dialog
    const msg = [title, message].filter(Boolean).join('\n');
    if (window.confirm(msg)) {
      confirmButtons[0]?.onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
  } else if (confirmButtons.length > 0) {
    window.alert([title, message].filter(Boolean).join('\n'));
    confirmButtons[0]?.onPress?.();
  } else {
    window.alert([title, message].filter(Boolean).join('\n'));
    cancelButton?.onPress?.();
  }
};
