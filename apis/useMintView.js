import * as React from "react";
import * as GlobalVariables from "../config/GlobalVariableContext";
import { resolveStorageExpiresAt, resolveStorageUrl } from "../utils/storageUrlHelpers";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const trimSupabaseUrl = (value) => (typeof value === "string" ? value.replace(/\/+$/, "") : "");

const resolveSupabaseAnonKey = (constants) => {
  if (
    typeof constants?.SUPABASE_ANON_KEY === "string" &&
    constants.SUPABASE_ANON_KEY.trim().length > 0
  ) {
    return constants.SUPABASE_ANON_KEY.trim();
  }
  if (typeof constants?.apiKey === "string" && constants.apiKey.trim().length > 0) {
    return constants.apiKey.trim();
  }
  return undefined;
};

const resolveSupabaseAuthorization = (constants) => {
  if (
    typeof constants?.AUTHORIZATION_HEADER === "string" &&
    constants.AUTHORIZATION_HEADER.trim().length > 0
  ) {
    return constants.AUTHORIZATION_HEADER.trim();
  }
  if (typeof constants?.auth_token === "string" && constants.auth_token.trim().length > 0) {
    const token = constants.auth_token.trim();
    return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
  }
  return undefined;
};

const parseJsonSafe = (text) => {
  if (!text) {
    return null;
  }
  const trimmed = typeof text === "string" ? text.trim() : text;
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.error("[mint-view] Failed to parse response JSON", error);
    return null;
  }
};

const normalizePayload = (input) => {
  if (typeof input === "string") {
    return { objectKey: input, mediaId: null };
  }
  const source = input && typeof input === "object" ? input : {};
  const objectKey =
    source.objectKey ??
    source.object_key ??
    source.key ??
    source.objectkey ??
    (typeof source?.payload === "string" ? source.payload : null);
  const mediaId = source.mediaId ?? source.media_id ?? source.p_media_id ?? source.id ?? null;
  return { objectKey, mediaId };
};

const buildRequestBody = (objectKey, mediaId) => {
  const body = {
    target: "media",
  };

  // Prefer mediaId if available, otherwise use objectKey
  if (mediaId) {
    body.mediaId = mediaId;
    body.p_media_id = mediaId;
  }

  // Always include objectKey for backwards compatibility
  if (objectKey) {
    body.object_key = objectKey;
    body.objectKey = objectKey;
  }

  return body;
};

const mintViewRequest = async (constants, payload, options = {}, attempt = 0) => {
  const { signal } = options ?? {};
  const supabaseUrl = trimSupabaseUrl(constants?.SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey(constants);
  const authorization = resolveSupabaseAuthorization(constants);

  if (!supabaseUrl || !anonKey || !authorization) {
    throw new Error("Supabase credentials not ready for mint-view");
  }

  const { objectKey, mediaId } = normalizePayload(payload ?? {});
  if (!objectKey && !mediaId) {
    throw new Error("Either objectKey or mediaId is required for mint-view");
  }

  const url = `${supabaseUrl}/functions/v1/mint-view`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization,
        apikey: anonKey,
      },
      body: JSON.stringify(buildRequestBody(objectKey, mediaId)),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAY_MS);
      return mintViewRequest(constants, payload, options, attempt + 1);
    }
    throw error;
  }

  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAY_MS);
      return mintViewRequest(constants, payload, options, attempt + 1);
    }
    throw error;
  }

  const json = text ? parseJsonSafe(text) : null;

  if (!response.ok || !json?.ok) {
    if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAY_MS);
      return mintViewRequest(constants, payload, options, attempt + 1);
    }
    const error = new Error(
      json?.error || json?.message || text || `mint-view failed (${response.status})`,
    );
    error.status = response.status;
    error.body = text;
    error.payload = json;
    throw error;
  }

  const resolvedUrl = resolveStorageUrl(json) ?? json?.signedUrl ?? json?.signed_url ?? null;
  const resolvedExpiresAt =
    resolveStorageExpiresAt(json) ?? json?.expiresAt ?? json?.expires_at ?? null;

  return {
    ...json,
    signedUrl: json?.signedUrl ?? json?.signed_url ?? resolvedUrl ?? null,
    signed_url: json?.signed_url ?? json?.signedUrl ?? resolvedUrl ?? null,
    url: resolvedUrl ?? json?.url ?? null,
    resolvedUrl: resolvedUrl ?? null,
    publicUrl: resolvedUrl ?? json?.publicUrl ?? json?.public_url ?? null,
    public_url: resolvedUrl ?? json?.public_url ?? json?.publicUrl ?? null,
    expiresAt: json?.expiresAt ?? json?.expires_at ?? resolvedExpiresAt ?? null,
    expires_at: json?.expires_at ?? json?.expiresAt ?? resolvedExpiresAt ?? null,
    mediaId: json?.mediaId ?? json?.media_id ?? mediaId ?? null,
    media_id: json?.media_id ?? json?.mediaId ?? mediaId ?? null,
    cached: json?.cached ?? false,
    raw: json,
    data: json,
  };
};

const useMintView = () => {
  const constants = GlobalVariables.useValues();

  const mutateAsync = React.useCallback(
    (payload, options) => mintViewRequest(constants, payload, options),
    [constants],
  );

  return React.useMemo(
    () => ({
      mutateAsync,
      mintView: mutateAsync,
    }),
    [mutateAsync],
  );
};

export default useMintView;
