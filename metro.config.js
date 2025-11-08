const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const currentMetroConfigForCacheStore = config;

currentMetroConfigForCacheStore.cacheStores = ({ FileStore }) => [
  new FileStore({
    root: ".metro-cache",
  }),
];

const currentMetroConfigForCacheVersion = currentMetroConfigForCacheStore;

currentMetroConfigForCacheVersion.cacheVersion = "0";

module.exports = currentMetroConfigForCacheVersion;
