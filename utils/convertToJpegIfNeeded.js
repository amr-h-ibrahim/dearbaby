import * as FileSystem from "../custom-files/FileSystem";
import * as ImageManipulator from "../custom-files/ImageManipulator";

const ensureString = (value) => (typeof value === "string" ? value : "");

const lower = (value) => ensureString(value).toLowerCase();

const pickAssetUri = (asset) => {
  if (!asset) {
    return null;
  }
  if (typeof asset.uri === "string" && asset.uri.length) {
    return asset.uri;
  }
  if (typeof asset.localUri === "string" && asset.localUri.length) {
    return asset.localUri;
  }
  if (typeof asset.url === "string" && asset.url.length) {
    return asset.url;
  }
  if (Array.isArray(asset.assets) && asset.assets[0]?.uri) {
    return asset.assets[0].uri;
  }
  return null;
};

const heicRegex = /\.heic$|\.heif$/i;

const isHeicAsset = (asset) => {
  const mime = lower(asset?.mimeType ?? asset?.type ?? "");
  if (mime.includes("heic") || mime.includes("heif")) {
    return true;
  }
  const name = ensureString(asset?.fileName ?? asset?.filename ?? asset?.name ?? "");
  if (name && heicRegex.test(name)) {
    return true;
  }
  const uri = ensureString(asset?.uri ?? asset?.localUri ?? asset?.url ?? "");
  return !!uri && heicRegex.test(uri);
};

const normaliseFileName = (asset) => {
  const source = ensureString(asset?.fileName ?? asset?.filename ?? asset?.name ?? "");
  if (!source) {
    return "photo.jpg";
  }
  const withoutHeic = source.replace(/\.heic$/i, "").replace(/\.heif$/i, "");
  if (!withoutHeic.length) {
    return "photo.jpg";
  }
  const sanitized = withoutHeic.replace(/[^a-zA-Z0-9-_]+/g, "_");
  return `${sanitized || "photo"}.jpg`;
};

const convertToJpegIfNeeded = async (asset) => {
  if (!asset) {
    throw new Error("No asset provided for conversion.");
  }
  const sourceUri = pickAssetUri(asset);
  if (!sourceUri) {
    throw new Error("Asset is missing a valid uri.");
  }

  const heic = isHeicAsset(asset);

  console.log("[convertToJpegIfNeeded] Processing asset", {
    isHeic: heic,
    mimeType: asset?.mimeType ?? asset?.type,
    fileName: asset?.fileName ?? asset?.filename ?? asset?.name,
    width: asset?.width,
    height: asset?.height,
    hasUri: !!sourceUri,
  });

  if (!heic) {
    return {
      uri: sourceUri,
      mimeType: asset?.mimeType ?? asset?.type ?? "image/jpeg",
      fileName: ensureString(asset?.fileName ?? asset?.filename ?? asset?.name) || "photo.jpg",
      bytes: asset?.bytes ?? undefined,
    };
  }

  // For HEIC files, we need to ensure proper conversion to JPEG
  // Even without explicit operations, the format conversion should happen
  const operations = [];
  const width = asset?.width;
  const height = asset?.height;

  // If dimensions are available, add a resize operation to maintain original size
  // This helps ensure the HEIC decoder properly processes the image
  if (width && height && Number.isFinite(width) && Number.isFinite(height)) {
    operations.push({
      resize: {
        width: width,
        height: height,
      },
    });
  }

  // Always attempt the conversion for HEIC files
  // The format parameter ensures conversion to JPEG even with empty operations
  const manipulated = await ImageManipulator.manipulateAsync(sourceUri, operations, {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  if (!manipulated?.uri) {
    throw new Error("HEIC conversion failed - no output URI.");
  }

  let info = null;
  try {
    info = await FileSystem.getInfoAsync(manipulated.uri, { size: true });
  } catch (error) {
    console.warn("[convertToJpegIfNeeded] size lookup failed", error?.message);
  }

  const result = {
    uri: manipulated.uri,
    mimeType: "image/jpeg",
    fileName: normaliseFileName(asset),
    bytes: typeof info?.size === "number" ? info.size : undefined,
  };

  console.log("[convertToJpegIfNeeded] HEIC conversion successful", {
    originalFileName: asset?.fileName ?? asset?.filename ?? asset?.name,
    newFileName: result.fileName,
    bytes: result.bytes,
    hadDimensions: !!(asset?.width && asset?.height),
  });

  return result;
};

export default convertToJpegIfNeeded;
