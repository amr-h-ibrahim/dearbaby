module.exports = function (api) {
  api.cache(true);

  const currentConfig = {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin", "@babel/plugin-proposal-export-namespace-from"],
  };

  if (!currentConfig.plugins) {
    currentConfig.plugins = [];
  }

  currentConfig.plugins.push("@draftbit/babel-plugin-inject-jsx-source");

  return currentConfig;
};
