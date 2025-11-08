import * as FileSystem from "../custom-files/FileSystem";

const get_file_size_bytes_xplat = async (input) => {
  {
    const uri = _resolveUri(input);
    const retries = 3;
    const baseWaitMs = 120;

    // Web/blob or http(s): fetch and use Blob.size (reliable)
    if (/^(blob:|https?:)/i.test(uri)) {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(uri);
          if (!res.ok) throw new Error(`fetch(${uri}) -> ${res.status}`);
          const blob = await res.blob();
          if (blob && typeof blob.size === "number" && blob.size > 0) return blob.size;
        } catch (_) {}
        if (i < retries) await _sleep(baseWaitMs * Math.pow(2, i));
      }
      throw new Error(`[size] Could not read blob size for ${uri}`);
    }

    // Android content:// is rare after convert_to_JPEG, but guard anyway
    if (uri.startsWith("content://")) {
      // Try fetching as blob as a fallback
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(uri);
          if (!res.ok) throw new Error(`fetch(${uri}) -> ${res.status}`);
          const blob = await res.blob();
          if (blob && typeof blob.size === "number" && blob.size > 0) return blob.size;
        } catch (_) {}
        if (i < retries) await _sleep(baseWaitMs * Math.pow(2, i));
      }
      throw new Error(
        `[size] content:// not readable; ensure you pass the JPEG file:// uri from convert_to_JPEG`,
      );
    }

    // file:// (native) -> use FileSystem.getInfoAsync with retries
    if (uri.startsWith("file://")) {
      for (let i = 0; i <= retries; i++) {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (info?.exists && typeof info.size === "number" && info.size > 0) return info.size;
        } catch (_) {}
        if (i < retries) await _sleep(baseWaitMs * Math.pow(2, i));
      }
      throw new Error(`[size] File exists but size is 0 for ${uri} (after retries).`);
    }

    throw new Error(`[size] Unsupported URI scheme: ${uri}`);
  }

  function _resolveUri(input) {
    if (typeof input === "string") return input;
    if (input && typeof input === "object") {
      if (input.uri) return input.uri;
      if (Array.isArray(input.assets) && input.assets[0]?.uri) return input.assets[0].uri;
    }
    throw new Error(
      "get_file_size_bytes_xplat: pass a URI string or an object with .uri (picker result supported).",
    );
  }

  function _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  module.exports = get_file_size_bytes_xplat;
};

export default get_file_size_bytes_xplat;
