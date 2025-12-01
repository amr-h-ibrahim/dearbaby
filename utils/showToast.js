import { Platform, ToastAndroid } from "react-native";

/**
 * Attempts to show a short toast message. Returns true if a native toast
 * was displayed; otherwise false so callers can provide a fallback.
 */
const showToast = (message) => {
  if (!message) {
    return false;
  }
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return true;
  }
  return false;
};

export default showToast;
