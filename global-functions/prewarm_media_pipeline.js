import * as FileSystem from "../custom-files/FileSystem";
import * as ImageManipulator from "../custom-files/ImageManipulator";

const prewarm_media_pipeline = async () => {
  try {
    // Touch FileSystem to warm native module
    await FileSystem.getInfoAsync(FileSystem.cacheDirectory || "");

    // Warm ImageManipulator (no-op; error ignored)
    await ImageManipulator.manipulateAsync("file:///__warm__.jpg", [], {
      compress: 0.01,
    }).catch(() => {});
  } catch (_) {}
  return true; // best-effort prewarm

  module.exports = prewarm_media_pipeline;
};

export default prewarm_media_pipeline;
