import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Asset from "expo-asset";
import * as FileSystem from "../custom-files/FileSystem";
import * as ImageManipulator from "../custom-files/ImageManipulator";

const prepare_jpeg_and_size = async (input, maxWidth, quality) => {
  {
    // Resolve a usable URI from string, {uri}, or {assets:[{uri}]}
    let src = null;
    if (typeof input === "string") src = input;
    else if (input?.uri) src = input.uri;
    else if (Array.isArray(input?.assets) && input.assets[0]?.uri) src = input.assets[0].uri;
    if (!src) throw new Error("[prepare_jpeg_and_size] missing input uri");

    // Convert to JPEG (returns a URI; on native it's file://, on web often blob:/data:)
    const { uri: outUri } = await ImageManipulator.manipulateAsync(
      src,
      [{ resize: { width: Number(maxWidth) || 512 } }],
      {
        compress: Number(quality) || 0.82,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    if (!outUri) throw new Error("[prepare_jpeg_and_size] no output uri from manipulator");

    // Decide strategy: native FS vs web Blob
    const hasFS = !!(FileSystem && typeof FileSystem.getInfoAsync === "function");
    const isFile = typeof outUri === "string" && outUri.startsWith("file://");

    let bytes = 0;
    if (hasFS && isFile) {
      // Native path: poll FileSystem until non-zero size (flush)
      bytes = await _waitForNonZeroSizeFS(outUri, 10, 70); // ~700ms worst-case
      if (bytes <= 0) throw new Error("[prepare_jpeg_and_size] file not ready");
    } else {
      // Web (or non-file URI): read as Blob and use blob.size
      bytes = await _blobSizeWithRetry(outUri, 5, 80); // quick retry in case URL isn't ready
      if (bytes <= 0) throw new Error("[prepare_jpeg_and_size] blob not ready");
    }

    return { uri: outUri, bytes };
  }

  async function _waitForNonZeroSizeFS(uri, attempts, delayMs) {
    for (let i = 0; i < attempts; i++) {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (info.exists && info.size > 0) return info.size;
      await _sleep(delayMs);
    }
    return 0;
  }

  async function _blobSizeWithRetry(uri, attempts, delayMs) {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(uri);
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 0) return blob.size;
        }
      } catch (_) {}
      await _sleep(delayMs);
    }
    return 0;
  }

  function _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  module.exports = prepare_jpeg_and_size;
};

export default prepare_jpeg_and_size;
