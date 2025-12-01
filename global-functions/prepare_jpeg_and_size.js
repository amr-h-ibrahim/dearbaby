import * as FileSystem from "../custom-files/FileSystem";
import * as ImageManipulator from "../custom-files/ImageManipulator";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForNonZeroSizeFS = async (uri, attempts, delayMs) => {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (info?.exists && info.size > 0) {
        return info.size;
      }
    } catch (error) {
      console.warn("[prepare_jpeg_and_size] getInfoAsync failed", error?.message);
    }
    await sleep(delayMs);
  }
  return 0;
};

const blobSizeWithRetry = async (uri, attempts, delayMs) => {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(uri);
      if (response?.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          return blob.size;
        }
      }
    } catch (error) {
      console.warn("[prepare_jpeg_and_size] blob fetch failed", error?.message);
    }
    await sleep(delayMs);
  }
  return 0;
};

const resolveSourceUri = (input) => {
  if (!input) {
    return null;
  }
  if (typeof input === "string") {
    return input;
  }
  if (typeof input === "object") {
    if (input.uri) {
      return input.uri;
    }
    if (Array.isArray(input.assets) && input.assets[0]?.uri) {
      return input.assets[0].uri;
    }
  }
  return null;
};

const prepare_jpeg_and_size = async (input, maxWidth, quality) => {
  const sourceUri = resolveSourceUri(input);
  if (!sourceUri) {
    throw new Error("[prepare_jpeg_and_size] missing input uri");
  }

  const resizeWidth = Number(maxWidth) || 512;
  const compressQuality = Number(quality) || 0.82;

  const manipulation = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: resizeWidth } }],
    {
      compress: compressQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  const { uri: outputUri, width, height } = manipulation ?? {};
  if (!outputUri) {
    throw new Error("[prepare_jpeg_and_size] no output uri from manipulator");
  }

  const hasFileSystem = typeof FileSystem?.getInfoAsync === "function";
  const isFileUri = typeof outputUri === "string" && outputUri.startsWith("file://");

  let bytes = 0;
  if (hasFileSystem && isFileUri) {
    bytes = await waitForNonZeroSizeFS(outputUri, 10, 70);
  } else {
    bytes = await blobSizeWithRetry(outputUri, 5, 80);
  }

  if (!bytes || bytes <= 0) {
    throw new Error("[prepare_jpeg_and_size] output not ready");
  }

  return {
    uri: outputUri,
    bytes,
    width: width ?? null,
    height: height ?? null,
  };
};

export default prepare_jpeg_and_size;
