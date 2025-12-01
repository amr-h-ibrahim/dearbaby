import * as React from "react";
import * as GlobalVariables from "../config/GlobalVariableContext";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_ATTEMPTS = 3;
export const FINALIZE_UPLOAD_URL =
  "https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/finalize-upload";

const parseJsonSafe = (text) => {
  if (!text) {
    return {};
  }
  const trimmed = typeof text === "string" ? text.trim() : text;
  if (!trimmed) {
    return {};
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.error("[finalize-upload] Failed to parse response", {
      text: trimmed,
      message: error?.message,
    });
    return undefined;
  }
};

const redactPayloadForLog = (payload) => ({
  albumId: payload?.albumId ?? payload?.album_id ?? null,
  babyId: payload?.babyId ?? payload?.baby_id ?? null,
  objectKey: payload?.objectKey ?? payload?.object_key ?? null,
  bytes: payload?.bytes ?? null,
  width: payload?.width ?? null,
  height: payload?.height ?? null,
  mimeType: payload?.mimeType ?? payload?.mime_type ?? null,
});

const finalizeUploadRequest = async (Constants, payload, options = {}, attempt = 0) => {
  const { signal } = options ?? {};
  if (!Constants?.auth_token) {
    throw new Error("Missing auth token for finalize-upload");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${Constants.auth_token}`,
  };

  let response;
  try {
    console.log("[finalize-upload] request", {
      attempt,
      payload: redactPayloadForLog(payload ?? {}),
    });
    response = await fetch(FINALIZE_UPLOAD_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(150);
      return finalizeUploadRequest(Constants, payload, options, attempt + 1);
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
      await sleep(150);
      return finalizeUploadRequest(Constants, payload, options, attempt + 1);
    }
    throw error;
  }

  let json = parseJsonSafe(text);

  console.log("[finalize-upload] response", {
    attempt,
    status: response.status,
    ok: response.ok,
    body: text,
    parsed: json,
  });
  if (json === undefined) {
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(150);
      return finalizeUploadRequest(Constants, payload, options, attempt + 1);
    }
    json = {};
  }

  if (response.ok) {
    const result = json?.data ?? json ?? {};
    console.log("[finalize-upload] success payload", result);
    return result;
  }

  if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
    await sleep(150);
    return finalizeUploadRequest(Constants, payload, options, attempt + 1);
  }

  const errorMessage =
    text?.trim() || json?.error || json?.message || `Finalize upload failed (${response.status})`;
  const error = new Error(errorMessage);
  error.status = response.status;
  error.body = text;
  error.bodyText = text;
  error.payload = json;
  throw error;
};

const useFinalizeUpload = () => {
  const Constants = GlobalVariables.useValues();

  const mutateAsync = React.useCallback(
    (payload, options) => finalizeUploadRequest(Constants, payload, options),
    [Constants],
  );

  return React.useMemo(
    () => ({
      mutateAsync,
      finalizeUpload: mutateAsync,
    }),
    [mutateAsync],
  );
};

export default useFinalizeUpload;
