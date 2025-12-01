import * as React from "react";
import * as GlobalVariables from "../config/GlobalVariableContext";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_ATTEMPTS = 3;
export const MINT_UPLOAD_URL = "https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/mint-upload";

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
    console.error("[mint-upload] Failed to parse response", {
      text: trimmed,
      message: error?.message,
    });
    return undefined;
  }
};

const redactPayloadForLog = (payload) => ({
  albumId: payload?.albumId ?? payload?.album_id ?? null,
  babyId: payload?.babyId ?? payload?.baby_id ?? null,
  bytes: payload?.bytes ?? null,
  filename: payload?.filename ?? null,
  target: payload?.target ?? null,
});

const mintUploadRequest = async (Constants, payload, options = {}, attempt = 0) => {
  const { signal } = options ?? {};
  if (!Constants?.auth_token) {
    throw new Error("Missing auth token for mint-upload");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${Constants.auth_token}`,
  };

  let response;
  try {
    console.log("[mint-upload] request", {
      attempt,
      payload: redactPayloadForLog(payload ?? {}),
    });
    response = await fetch(MINT_UPLOAD_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(150);
      return mintUploadRequest(Constants, payload, options, attempt + 1);
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
      return mintUploadRequest(Constants, payload, options, attempt + 1);
    }
    throw error;
  }

  let json = parseJsonSafe(text);

  console.log("[mint-upload] response", {
    attempt,
    status: response.status,
    ok: response.ok,
    body: text,
    parsed: json,
  });
  if (json === undefined) {
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(150);
      return mintUploadRequest(Constants, payload, options, attempt + 1);
    }
    json = {};
  }

  if (response.ok) {
    const result = json?.data ?? json ?? {};
    console.log("[mint-upload] success payload", result);
    return result;
  }

  if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
    await sleep(150);
    return mintUploadRequest(Constants, payload, options, attempt + 1);
  }

  const errorMessage =
    text?.trim() || json?.error || json?.message || `Mint upload failed (${response.status})`;
  const error = new Error(errorMessage);
  error.status = response.status;
  error.body = text;
  error.bodyText = text;
  error.payload = json;
  throw error;
};

const useMintUpload = () => {
  const Constants = GlobalVariables.useValues();

  const mutateAsync = React.useCallback(
    (payload, options) => mintUploadRequest(Constants, payload, options),
    [Constants],
  );

  return React.useMemo(
    () => ({
      mutateAsync,
      mintUpload: mutateAsync,
    }),
    [mutateAsync],
  );
};

export default useMintUpload;
