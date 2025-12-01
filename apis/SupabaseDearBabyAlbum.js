import * as GlobalVariables from "../config/GlobalVariableContext";

let cachedConstants = null;

export const setSupabaseDearBabyAlbumConstants = (values) => {
  if (values && typeof values === "object") {
    cachedConstants = values;
  }
};

const resolveConstants = (override) => {
  if (override && typeof override === "object") {
    return override;
  }
  if (cachedConstants && typeof cachedConstants === "object") {
    return cachedConstants;
  }
  if (typeof globalThis !== "undefined" && globalThis.__draftbitGlobalValues) {
    return globalThis.__draftbitGlobalValues;
  }
  return GlobalVariables.AppVariables || {};
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RETRY_DELAYS_MS = [150, 400];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers).filter(([_, value]) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === "string" && value.trim() === "") {
        return false;
      }
      return true;
    }),
  );

const trimTrailingSlash = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\/+$/, "");
};

const resolveAnonKey = (constants) => {
  if (typeof constants?.SUPABASE_ANON_KEY === "string" && constants.SUPABASE_ANON_KEY.trim()) {
    return constants.SUPABASE_ANON_KEY.trim();
  }
  if (typeof constants?.apiKey === "string" && constants.apiKey.trim()) {
    return constants.apiKey.trim();
  }
  return undefined;
};

const resolveAuthorization = (constants) => {
  if (
    typeof constants?.AUTHORIZATION_HEADER === "string" &&
    constants.AUTHORIZATION_HEADER.trim()
  ) {
    return constants.AUTHORIZATION_HEADER.trim();
  }
  if (typeof constants?.auth_token === "string" && constants.auth_token.trim()) {
    const token = constants.auth_token.trim();
    return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
  }
  return undefined;
};

const parseJsonSafe = async (response) => {
  const text = await response.text();
  if (!text) {
    return { json: undefined, rawText: "" };
  }
  try {
    return { json: JSON.parse(text), rawText: text };
  } catch (error) {
    console.warn(
      "[SupabaseDearBabyAlbum] Failed to parse JSON response",
      response.status,
      error?.message,
    );
    return { json: undefined, rawText: text };
  }
};

const isRetryableStatus = (status) =>
  status === 429 || (typeof status === "number" && status >= 500 && status < 600);

const normalizeError = (error) => {
  if (!error) {
    return "unknown_error";
  }
  if (typeof error === "string") {
    return error || "unknown_error";
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  const payload = error?.payload;
  if (payload && typeof payload === "object") {
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  }
  if (typeof error?.status === "number") {
    return `http_${error.status}`;
  }
  return "unknown_error";
};

const callAlbumUpdateDescriptionRpc = async (constants, payload) => {
  const supabaseUrl = trimTrailingSlash(constants?.SUPABASE_URL);
  const anonKey = resolveAnonKey(constants);
  const authorization = resolveAuthorization(constants);
  const contentProfile =
    typeof constants?.["Content-Profile"] === "string" && constants["Content-Profile"].trim()
      ? constants["Content-Profile"].trim()
      : "dearbaby";

  if (!supabaseUrl) {
    const error = new Error("missing_supabase_url");
    error.status = 0;
    throw error;
  }
  if (!anonKey) {
    const error = new Error("missing_supabase_anon_key");
    error.status = 0;
    throw error;
  }
  if (!authorization) {
    const error = new Error("missing_auth_token");
    error.status = 401;
    throw error;
  }

  const url = `${supabaseUrl}/rest/v1/rpc/album_update_description`;
  const headers = cleanHeaders({
    Accept: "application/json",
    Authorization: authorization,
    apikey: anonKey,
    "Accept-Profile": contentProfile,
    "Content-Profile": contentProfile,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_album_id: payload.album_id,
      p_description_md: payload.description_md,
    }),
  });

  const { json, rawText } = await parseJsonSafe(response);

  if (!response.ok) {
    const error = new Error(
      (json && (json.error || json.message)) || response.statusText || "album_update_failed",
    );
    error.status = response.status;
    error.payload = json ?? { rawText };
    throw error;
  }

  return json;
};

const callAlbumUpdateDetailedMemoryRpc = async (constants, payload) => {
  const supabaseUrl = trimTrailingSlash(constants?.SUPABASE_URL);
  const anonKey = resolveAnonKey(constants);
  const authorization = resolveAuthorization(constants);
  const contentProfile =
    typeof constants?.["Content-Profile"] === "string" && constants["Content-Profile"].trim()
      ? constants["Content-Profile"].trim()
      : "dearbaby";

  if (!supabaseUrl) {
    const error = new Error("missing_supabase_url");
    error.status = 0;
    throw error;
  }
  if (!anonKey) {
    const error = new Error("missing_supabase_anon_key");
    error.status = 0;
    throw error;
  }
  if (!authorization) {
    const error = new Error("missing_auth_token");
    error.status = 401;
    throw error;
  }

  const url = `${supabaseUrl}/rest/v1/rpc/album_update_detailed_memory`;
  const headers = cleanHeaders({
    Accept: "application/json",
    Authorization: authorization,
    apikey: anonKey,
    "Accept-Profile": contentProfile,
    "Content-Profile": contentProfile,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_album_id: payload.album_id,
      p_detailed_memory_md: payload.detailed_memory_md,
    }),
  });

  const { json, rawText } = await parseJsonSafe(response);

  if (!response.ok) {
    const message =
      (json && (json.error || json.message)) ||
      response.statusText ||
      "album_update_detailed_memory_failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = json ?? { rawText };
    throw error;
  }

  return json;
};

export const albumUpdateDescription = async ({ album_id, description_md, constants } = {}) => {
  if (typeof album_id !== "string" || !UUID_REGEX.test(album_id.trim())) {
    return { ok: false, error: "invalid_album_id" };
  }

  if (typeof description_md !== "string") {
    return { ok: false, error: "invalid_description" };
  }

  if (description_md.length > 4096) {
    return { ok: false, error: "description_too_long" };
  }

  const resolvedConstants = resolveConstants(constants);
  setSupabaseDearBabyAlbumConstants(resolvedConstants);

  let attempt = 0;
  while (attempt <= RETRY_DELAYS_MS.length) {
    try {
      const rpcResult = await callAlbumUpdateDescriptionRpc(resolvedConstants, {
        album_id: album_id.trim(),
        description_md,
      });
      const normalizedData = Array.isArray(rpcResult)
        ? (rpcResult[0] ?? null)
        : (rpcResult ?? null);
      return { ok: true, data: normalizedData };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = error?.status;

      if (isRetryableStatus(status) && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }

      console.warn(
        `[SupabaseDearBabyAlbum] albumUpdateDescription failed (${status ?? "unknown"})`,
        normalized,
      );
      return {
        ok: false,
        error: normalized,
        status: typeof status === "number" ? status : undefined,
      };
    }
  }

  return { ok: false, error: "unknown_error" };
};

export const albumUpdateDetailedMemory = async ({
  album_id,
  detailed_memory_md,
  constants,
} = {}) => {
  if (typeof album_id !== "string" || !album_id.trim()) {
    return { ok: false, error: "invalid_album_id" };
  }

  if (typeof detailed_memory_md !== "string") {
    return { ok: false, error: "invalid_detailed_memory" };
  }

  if (detailed_memory_md.length > 16384) {
    return { ok: false, error: "long_description_too_long" };
  }

  const resolvedConstants = resolveConstants(constants);
  setSupabaseDearBabyAlbumConstants(resolvedConstants);

  let attempt = 0;
  while (attempt <= RETRY_DELAYS_MS.length) {
    try {
      const rpcResult = await callAlbumUpdateDetailedMemoryRpc(resolvedConstants, {
        album_id: album_id.trim(),
        detailed_memory_md,
      });
      const normalizedData = Array.isArray(rpcResult)
        ? (rpcResult[0] ?? null)
        : (rpcResult ?? null);
      return { ok: true, data: normalizedData };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = error?.status;

      if (isRetryableStatus(status) && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }

      console.warn(
        `[SupabaseDearBabyAlbum] albumUpdateDetailedMemory failed (${status ?? "unknown"})`,
        normalized,
      );
      return {
        ok: false,
        error: normalized,
        status: typeof status === "number" ? status : undefined,
      };
    }
  }

  return { ok: false, error: "unknown_error" };
};

export default albumUpdateDescription;
