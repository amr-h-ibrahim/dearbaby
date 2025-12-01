const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

config.cacheStores = ({ FileStore }) => [
  new FileStore({
    root: ".metro-cache",
  }),
];

config.cacheVersion = "0";

// Add resolver configuration to handle symlinks and @draftbit packages
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  unstable_enablePackageExports: true,
  nodeModulesPaths: [
    path.resolve(__dirname, "node_modules"),
    path.resolve(__dirname, "/tmp/node_modules"),
  ],
};

config.watchFolders = [path.resolve(__dirname), path.resolve(__dirname, "/tmp/node_modules")];

module.exports = withNativeWind(config, { input: "./global.css" });
