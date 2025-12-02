module.exports = {
  ios: {
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {},
    bundleIdentifier: "com.dearbaby.app",
    usesIcloudStorage: false,
    buildNumber: "43",
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
          NSPrivacyAccessedAPITypeReasons: ["E174.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
          NSPrivacyAccessedAPITypeReasons: ["DDA9.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
          NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
        },
      ],
    },
  },
  web: {
    themeColor: "#000000",
    bundler: "metro",
    output: "single",
  },
  icon: "./assets/app/icon.png",
  name: "DearBaby",
  slug: "dearbaby",
  extra: {
    eas: {},
  },
  scheme: "dearbaby",
  splash: {
    image: "./assets/app/splash.png",
    resizeMode: "cover",
    backgroundColor: "#5A45FF",
  },
  android: {
    package: "com.dearbaby.app",
    permissions: [],
    adaptiveIcon: {},
    versionCode: 43,
    blockedPermissions: [],
  },
  privacy: "unlisted",
  platforms: ["ios", "android", "web"],
  description: "A social media app",
  orientation: "default",
  iosStatusBar: {},
  notification: {
    androidMode: "default",
  },
  backgroundColor: "#0A84FF",
  allowFontScaling: true,
  androidStatusBar: {},
  userInterfaceStyle: "automatic",
  androidNavigationBar: {},
  version: "1.0.43",
  assetBundlePatterns: ["**/*"],
  plugins: [
    [
      "expo-screen-orientation",
      {
        initialOrientation: "ALL",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: "35.0.0",
        },
      },
    ],
    [
      "expo-router",
      {
        origin: "https://53fff12001.sandbox.draftbit.dev",
      },
    ],
    ["./plugins/draftbit-auto-launch-url-plugin"],
  ],
};
