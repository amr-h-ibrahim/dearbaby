module.exports = function (api) {
  api.cache(true);
  const plugins = ["@draftbit/babel-plugin-inject-jsx-source"];

  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins,
  };
};
