if (require("react-native").Platform.OS === "web" && typeof window !== "undefined") {
  const { Child } = require("@draftbit/iframe-element-picker");
  Child.init("https://next.draftbit.com", process.env.EXPO_PUBLIC_PROJECT_PATH, false);

  // Initialize window.previewTheme from URL parameter or default to light theme
  const urlParams = new URLSearchParams(window.location.search);
  const themeFromUrl = urlParams.get("theme");
  window.previewTheme = themeFromUrl === "dark" ? "dark" : "light";

  // On web, logs are only sent to the browser console, this sends the logs to the terminal as well.
  // Uses the Metro HMRClient to send the logs to the terminal
  // Based on https://github.com/expo/expo/blob/main/packages/expo/src/async-require/hmr.ts
  const MetroHMRClient = require("metro-runtime/src/modules/HMRClient");
  const serverScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const hmrClient = new MetroHMRClient(`${serverScheme}://${window.location.host}/hot`);

  const logLevels = [
    "trace",
    "info",
    "warn",
    "error",
    "log",
    "group",
    "groupCollapsed",
    "groupEnd",
    "debug",
  ];

  for (const level of logLevels) {
    const original = console[level];
    const updated = (...args) => {
      original.apply(console, args);
      hmrClient.send(
        JSON.stringify({
          type: "log",
          level: level,
          platform: "web",
          mode: "BRIDGE",
          data: args,
        }),
      );
    };
    console[level] = updated;
  }

  // Also log uncaught errors to have them show up in the terminal as well
  window.onerror = function myErrorHandler(errorMsg) {
    console.error(errorMsg);
    return true;
  };

  window.onunhandledrejection = function myErrorHandler(errorEvent) {
    console.error(errorEvent.reason?.stack || errorEvent.reason || errorEvent);
    return true;
  };

  // Wrap window.matchMedia to intercept queries to light/dark mode, so we can control it.
  const originalMatchMedia = window.matchMedia;

  // Get theme from window.previewTheme property set by the parent
  function isForcedDark() {
    // Check if window.previewTheme is set by the parent window
    if (typeof window.previewTheme !== "undefined") {
      console.log(
        "[matchMedia override] Using theme from window.previewTheme:",
        window.previewTheme,
      );
      return window.previewTheme === "dark";
    }

    // Fallback to system preference if window.previewTheme is not set
    console.log(
      "[matchMedia override] window.previewTheme not set, falling back to system preference",
    );
    return originalMatchMedia.call(window, "(prefers-color-scheme: dark)")?.matches ?? false;
  }

  // State: true = dark, false = light
  let forcedDark = isForcedDark();

  // Keep track of listeners
  const isDarkListeners = new Set();
  const isLightListeners = new Set();

  window.matchMedia = function (query) {
    const reg = /^\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)\s*$/;
    const match = query.match(reg);
    if (match) {
      const matches = match[1] === "dark" ? forcedDark : !forcedDark;
      const listeners = match[1] === "dark" ? isDarkListeners : isLightListeners;
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener(event, callback) {
          if (event === "change") listeners.add(callback);
        },
        removeEventListener(event, callback) {
          if (event === "change") listeners.delete(callback);
        },
        dispatchEvent(event) {
          listeners.forEach((fn) => fn(event));
          return true;
        },
      };
    }
    // fallback for other media queries
    return originalMatchMedia.call(window, query);
  };

  // Function to toggle dark/light
  window.setIsDark = function (isDark) {
    forcedDark = isDark;

    // Update window.previewTheme property
    window.previewTheme = isDark ? "dark" : "light";

    // Dispatch "change" events to light/dark listeners
    isDarkListeners.forEach((fn) => fn(new MediaQueryListEvent("change", { matches: isDark })));
    isLightListeners.forEach((fn) => fn(new MediaQueryListEvent("change", { matches: !isDark })));

    console.log("[matchMedia override] Dark mode is now", forcedDark);
  };
} else if (require("react-native").Platform.OS === "web") {
  console.error("Can't set up iframe init code: window is undefined");
}
