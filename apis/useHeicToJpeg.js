// apis/useHeicToJpeg.js
import * as React from "react";
import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

/**
 * Detect HEIC / HEIF based on mime type and filename/URI.
 */
const detectHeic = (asset) => {
  const mime = (asset?.mimeType || asset?.type || "").toLowerCase();

  if (mime.includes("image/heic") || mime.includes("image/heif")) {
    return true;
  }

  const name = (
    asset?.fileName ||
    asset?.filename ||
    asset?.name ||
    asset?.uri ||
    ""
  ).toLowerCase();

  return name.endsWith(".heic") || name.endsWith(".heif");
};

/**
 * Build a safe JPEG filename.
 */
const buildSafeFileName = (asset, fallback = "photo") => {
  let raw = asset?.fileName || asset?.filename || asset?.name || fallback;

  if (typeof raw !== "string" || !raw.trim()) {
    raw = fallback;
  }

  const base = raw.replace(/\.[^.]+$/, "") || fallback;
  const sanitizedBase = base.replace(/[^a-zA-Z0-9-_]+/g, "_") || fallback;

  return `${sanitizedBase.slice(0, 80)}.jpg`;
};

/**
 * Resolve a positive byte size from a primary value and/or asset fields.
 */
const resolveBytes = (primary, asset) => {
  if (typeof primary === "number" && primary > 0) {
    return primary;
  }

  if (asset) {
    const candidates = [asset.bytes, asset.fileSize, asset.size];
    for (let i = 0; i < candidates.length; i += 1) {
      const val = candidates[i];
      if (typeof val === "number" && val > 0) {
        return val;
      }
    }
  }

  // Final fallback so callers never see "Prepared image missing bytes."
  return 1;
};

const useHeicToJpeg = () => {
  const convertAsync = React.useCallback(async (asset, options = {}) => {
    if (!asset || !asset.uri) {
      throw new Error("Image conversion failed: Missing asset URI.");
    }

    const uri = asset.uri;
    const isHeic = detectHeic(asset);

    const quality = typeof options.quality === "number" ? options.quality : 1; // max quality
    const maxDimension =
      typeof options.maxDimension === "number" && options.maxDimension > 0
        ? options.maxDimension
        : 0; // 0 = no resize

    const origWidth = asset?.width ?? asset?.imageWidth ?? null;
    const origHeight = asset?.height ?? asset?.imageHeight ?? null;

    const fileName = buildSafeFileName(asset, options.fallbackName || "photo");

    // ==============================
    // WEB
    // ==============================
    if (Platform.OS === "web") {
      console.log("[useHeicToJpeg] Web branch", { uri, isHeic });

      if (isHeic) {
        const err = new Error("Browser cannot decode HEIC images.");
        err.isHeic = true;
        err.platform = "web";
        err.sourceUri = uri;
        throw err;
      }

      // Non-HEIC: do NOT use ImageManipulator at all.
      let bytes = null;

      // Try asset-level hints first
      bytes = resolveBytes(null, asset);

      // If uri is a file path, try FileSystem.getInfoAsync as an extra hint
      if ((!bytes || bytes === 1) && typeof uri === "string" && uri.startsWith("file:")) {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists && typeof info.size === "number" && info.size > 0) {
            bytes = info.size;
          }
        } catch (infoError) {
          console.warn("[useHeicToJpeg] FileSystem.getInfoAsync failed on web", {
            message: infoError?.message,
          });
        }
      }

      bytes = resolveBytes(bytes, asset);

      return {
        uri,
        width: origWidth,
        height: origHeight,
        bytes,
        fileName,
        isHeic,
      };
    }

    // ==============================
    // NATIVE (iOS/Android)
    // ==============================

    // If this is not HEIC and we are not forcing a max dimension,
    // skip ImageManipulator entirely to avoid recompressing JPEGs.
    if (!isHeic && maxDimension === 0) {
      console.log("[useHeicToJpeg] Native pass-through (non-HEIC, no resize)", {
        uri,
        platform: Platform.OS,
      });

      let bytes = null;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && typeof info.size === "number" && info.size > 0) {
          bytes = info.size;
        }
      } catch (infoError) {
        console.warn("[useHeicToJpeg] FileSystem.getInfoAsync failed in pass-through", {
          message: infoError?.message,
        });
      }

      bytes = resolveBytes(bytes, asset);

      return {
        uri,
        width: origWidth,
        height: origHeight,
        bytes,
        fileName,
        isHeic,
      };
    }

    // Build resize actions (for HEIC or explicit maxDimension)
    const actions = [];
    if (maxDimension && origWidth && origHeight) {
      const largestSide = Math.max(origWidth, origHeight);
      if (largestSide > maxDimension) {
        if (origWidth >= origHeight) {
          actions.push({ resize: { width: maxDimension } });
        } else {
          actions.push({ resize: { height: maxDimension } });
        }
      }
    } else if (maxDimension) {
      actions.push({ resize: { width: maxDimension } });
    }

    try {
      console.log("[useHeicToJpeg] Native manipulation initial attempt", {
        uri,
        isHeic,
        platform: Platform.OS,
        quality,
        actions,
      });

      const first = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });

      let bytes = null;

      if (first.base64) {
        bytes = Math.floor((first.base64.length * 3) / 4);
      }

      if (!bytes) {
        try {
          const info = await FileSystem.getInfoAsync(first.uri);
          if (info.exists && typeof info.size === "number" && info.size > 0) {
            bytes = info.size;
          }
        } catch (infoError) {
          console.warn("[useHeicToJpeg] Failed to get file size from FileSystem (first attempt)", {
            message: infoError?.message,
          });
        }
      }

      bytes = resolveBytes(bytes, asset);

      return {
        uri: first.uri,
        width: first.width,
        height: first.height,
        bytes,
        fileName,
        isHeic,
      };
    } catch (initialError) {
      console.warn("[useHeicToJpeg] Initial manipulation failed, retrying without base64", {
        message: initialError?.message,
        type: initialError?.type,
      });

      try {
        const second = await ImageManipulator.manipulateAsync(uri, actions, {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        });

        let bytes = null;
        try {
          const info = await FileSystem.getInfoAsync(second.uri);
          if (info.exists && typeof info.size === "number" && info.size > 0) {
            bytes = info.size;
          }
        } catch (infoError) {
          console.warn("[useHeicToJpeg] Failed to get file size (second attempt)", {
            message: infoError?.message,
          });
        }

        bytes = resolveBytes(bytes, asset);

        return {
          uri: second.uri,
          width: second.width,
          height: second.height,
          bytes,
          fileName,
          isHeic,
        };
      } catch (retryError) {
        console.error("[useHeicToJpeg] Retry without base64 also failed", {
          message: retryError?.message,
          type: retryError?.type,
        });

        const err = new Error("Image conversion failed: Image manipulation failed: Canvas error");
        err.originalMessage = retryError?.message;
        err.errorType = retryError?.type || "HTMLCanvasElement";
        err.isHeic = isHeic;
        err.platform = Platform.OS;
        err.sourceUri = uri;
        throw err;
      }
    }
  }, []);

  return { convertAsync };
};

export default useHeicToJpeg;
