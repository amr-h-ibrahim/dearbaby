import React from "react";
import { Icon, Provider as ThemeProvider, useTheme } from "@draftbit/ui";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import {
  ActivityIndicator,
  AppState,
  Appearance,
  I18nManager,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaFrameContext,
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { systemWeights } from "react-native-typography";
import { QueryClient, QueryClientProvider } from "react-query";
import Fonts from "../config/Fonts.js";
import * as GlobalVariables from "../config/GlobalVariableContext";
import cacheAssetsAsync from "../config/cacheAssetsAsync";
import Draftbit from "../themes/Draftbit";
import palettes from "../themes/palettes";
import Breakpoints from "../utils/Breakpoints";
import useNavigation from "../utils/useNavigation";
import useWindowDimensions from "../utils/useWindowDimensions";
import AuthDeepLinkHandler from "../components/AuthDeepLinkHandler";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();

const FONT_RESOURCES = {
  Inter_400Regular: Fonts.Inter_400Regular,
  Inter_500Medium: Fonts.Inter_500Medium,
  Inter_600SemiBold: Fonts.Inter_600SemiBold,
  Inter_700Bold: Fonts.Inter_700Bold,
  InterTight_400Regular: Fonts.InterTight_400Regular,
  Poppins_400Regular: Fonts.Poppins_400Regular,
  Poppins_600SemiBold: Fonts.Poppins_600SemiBold,
};

const isFontTimeoutError = (error) =>
  typeof error?.message === "string" && /timeout exceeded/i.test(error.message);

const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadFontWithRetry(fontFamily, source, { maxAttempts = 2, retryDelay = 400 } = {}) {
  let attempt = 0;
  while (attempt <= maxAttempts) {
    try {
      await Font.loadAsync(fontFamily, source);
      return;
    } catch (error) {
      if (!isFontTimeoutError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const retryCount = attempt + 1;
      console.warn(
        `[fonts] Timeout loading "${fontFamily}", retrying (${retryCount + 1}/${maxAttempts + 1})`,
      );
      await waitFor(retryDelay);
      attempt += 1;
    }
  }
}

function useAppFonts() {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadFontsAsync = async () => {
      const entries = Object.entries(FONT_RESOURCES);

      for (const [fontFamily, source] of entries) {
        const normalizedSource =
          typeof source === "object" && source !== null && "uri" in source
            ? { ...source, display: source.display || Font.FontDisplay.FALLBACK }
            : source;

        try {
          await loadFontWithRetry(fontFamily, normalizedSource, {
            maxAttempts: 2,
            retryDelay: 600,
          });
        } catch (fontError) {
          if (!isMounted) {
            return;
          }

          console.warn(`[fonts] Failed to load "${fontFamily}"`, fontError);
          setError((prev) => prev ?? fontError);
        }
      }

      if (isMounted) {
        setLoaded(true);
      }
    };

    loadFontsAsync();

    return () => {
      isMounted = false;
    };
  }, []);

  return { loaded, error };
}

// On web, Appearance.setColorScheme is not implemented
// See https://github.com/necolas/react-native-web/issues/2703
//
// This reimplementation is a workaround to allow the app to switch between light and dark schemes
// by storing the selection in the data-theme attribute of the document element.
if (Platform.OS === "web") {
  Appearance.setColorScheme = (scheme) => {
    document.documentElement.setAttribute("data-theme", scheme);
  };

  Appearance.getColorScheme = () => {
    const systemValue = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const userValue = document.documentElement.getAttribute("data-theme");
    return userValue && userValue !== "null" ? userValue : systemValue;
  };

  Appearance.addChangeListener = (listener) => {
    // Listen for changes of system value
    const systemValueListener = (e) => {
      const newSystemValue = e.matches ? "dark" : "light";
      const userValue = document.documentElement.getAttribute("data-theme");
      listener({
        colorScheme: userValue && userValue !== "null" ? userValue : newSystemValue,
      });
    };
    const systemValue = window.matchMedia("(prefers-color-scheme: dark)");
    systemValue.addEventListener("change", systemValueListener);

    // Listen for changes of user set value
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.attributeName === "data-theme") {
          listener({ colorScheme: Appearance.getColorScheme() });
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    function remove() {
      systemValue.removeEventListener("change", systemValueListener);
      observer.disconnect();
    }

    return { remove };
  };
}

function DefaultAndroidBackIcon({ tintColor }) {
  return (
    <View style={[styles.headerContainer, styles.headerContainerLeft]}>
      <Icon
        name="AntDesign/arrowleft"
        size={24}
        color={tintColor}
        style={[styles.headerIcon, styles.headerIconLeft]}
      />
    </View>
  );
}

const styles = StyleSheet.create({});

const App = () => {
  const [areAssetsCached, setAreAssetsCached] = React.useState(false);

  const { loaded: fontsLoaded, error: fontsError } = useAppFonts();

  React.useEffect(() => {
    if (fontsError) {
      console.warn("[fonts] Continuing with fallback fonts due to load error.", fontsError);
    }
  }, [fontsError]);

  React.useEffect(() => {
    async function prepare() {
      try {
        await cacheAssetsAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setAreAssetsCached(true);
      }
    }

    prepare();
  }, []);

  const dimensions = useWindowDimensions();
  const colorScheme = useColorScheme();

  // SafeAreaProvider sets the 'frame' once and does not update when the window size changes (on web).
  // This is particularly problematic for drawer navigators that depend on the frame size to render the drawer.
  // This overrides the value of the frame to match the current window size which addresses the issue.
  //
  // The Drawer snippet that relies on useSafeAreaFrame: https://github.com/react-navigation/react-navigation/blob/bddcc44ab0e0ad5630f7ee0feb69496412a00217/packages/drawer/src/views/DrawerView.tsx#L112
  // Issue regarding broken useSafeAreaFrame: https://github.com/th3rdwave/react-native-safe-area-context/issues/184
  const SafeAreaFrameContextProvider =
    Platform.OS === "web" ? SafeAreaFrameContext.Provider : React.Fragment;

  const isReady = areAssetsCached && fontsLoaded;
  const onLayoutRootView = React.useCallback(async () => {
    if (isReady) {
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  const theme = useTheme();

  const Constants = GlobalVariables.useValues();

  if (!isReady) {
    return null;
  }

  return (
    <>
      {Platform.OS === "ios" ? (
        <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />
      ) : null}
      {Platform.OS === "android" ? (
        <StatusBar barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} />
      ) : null}
      <ThemeProvider themes={[Draftbit]} breakpoints={{}} initialThemeName={"Draftbit"}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics} onLayout={onLayoutRootView}>
          <SafeAreaFrameContextProvider
            value={{
              x: 0,
              y: 0,
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            <GlobalVariables.GlobalVariableProvider>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AuthDeepLinkHandler>
                    <Stack
                      screenOptions={{
                        cardStyle: { flex: 1 },
                        gestureEnabled: false,
                        headerBackImage: Platform.OS === "android" ? DefaultAndroidBackIcon : null,
                        headerMode: "none",
                        headerShown: false,
                      }}
                      initialRouteName={"index"}
                    >
                      <Stack.Screen
                        name="index"
                        options={{
                          headerShown: false,
                          title: "Login",
                        }}
                      />

                      <Stack.Screen
                        name="ProfileScreen"
                        options={{
                          title: "Profile",
                        }}
                      />

                      <Stack.Screen
                        name="TestDebugScreen"
                        options={{
                          title: "Test_Debug",
                        }}
                      />

                      <Stack.Screen
                        name="MainStack"
                        options={{
                          title: "MainStack",
                        }}
                      />
                      <Stack.Screen
                        name="AuthStack"
                        options={{
                          title: "AuthStack",
                        }}
                      />
                    </Stack>
                  </AuthDeepLinkHandler>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </GlobalVariables.GlobalVariableProvider>
          </SafeAreaFrameContextProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </>
  );
};

export default App;
