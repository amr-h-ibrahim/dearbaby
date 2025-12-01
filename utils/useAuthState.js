import React from "react";
import * as GlobalVariables from "../config/GlobalVariableContext";
import useNavigation from "./useNavigation";

const stripBearerToken = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  if (/^Bearer\s+/i.test(value)) {
    return value.replace(/^Bearer\s+/i, "").trim();
  }

  return value.trim();
};

const isLikelyJwt = (token) => {
  if (typeof token !== "string") {
    return false;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return false;
  }

  const segments = trimmed.split(".");
  return segments.length === 3 && segments.every((segment) => segment.length > 0);
};

const base64UrlToBase64 = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return normalized + padding;
};

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const decodeBase64 = (value) => {
  let output = "";
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "=" || char === "\n" || char === "\r" || char === "\t" || char === " ") {
      continue;
    }

    const index = base64Alphabet.indexOf(char);
    if (index < 0) {
      return "";
    }

    buffer = (buffer << 6) | index;
    bitsCollected += 6;

    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      const code = (buffer >> bitsCollected) & 0xff;
      output += String.fromCharCode(code);
      buffer &= (1 << bitsCollected) - 1;
    }
  }

  return output;
};

const decodeJwtPayload = (token) => {
  if (!isLikelyJwt(token)) {
    return null;
  }

  try {
    const payloadSegment = token.split(".")[1];
    const normalized = base64UrlToBase64(payloadSegment);
    const jsonString = decodeBase64(normalized)
      .split("")
      .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
      .join("");

    return JSON.parse(decodeURIComponent(jsonString));
  } catch (error) {
    return null;
  }
};

const getJwtExpiration = (token) => {
  const payload = decodeJwtPayload(token);
  if (payload && typeof payload.exp === "number") {
    return payload.exp;
  }
  return null;
};

const isJwtExpired = (token, clockSkewSeconds = 30) => {
  const exp = getJwtExpiration(token);
  if (typeof exp !== "number") {
    return true;
  }

  const nowInSeconds = Date.now() / 1000;
  return exp + clockSkewSeconds <= nowInSeconds;
};

export const useAuthState = () => {
  const constants = GlobalVariables.useValues();

  const authToken = typeof constants?.auth_token === "string" ? constants.auth_token.trim() : "";
  const headerToken = stripBearerToken(constants?.AUTHORIZATION_HEADER);

  const hasValidAuthToken = isLikelyJwt(authToken) && !isJwtExpired(authToken);
  const hasValidAuthHeader = isLikelyJwt(headerToken) && !isJwtExpired(headerToken);
  const isAuthenticated = hasValidAuthToken || hasValidAuthHeader;

  const authTokenExpiry = getJwtExpiration(authToken);
  const headerTokenExpiry = getJwtExpiration(headerToken);

  return React.useMemo(
    () => ({
      authToken,
      headerToken,
      hasValidAuthToken,
      hasValidAuthHeader,
      isAuthenticated,
      authTokenExpiry,
      headerTokenExpiry,
    }),
    [
      authToken,
      headerToken,
      hasValidAuthToken,
      hasValidAuthHeader,
      isAuthenticated,
      authTokenExpiry,
      headerTokenExpiry,
    ],
  );
};

export const useRequireAuth = () => {
  const navigation = useNavigation();
  const authState = useAuthState();
  const constants = GlobalVariables.useValues();
  const setGlobalVariableValue = GlobalVariables.useSetValue();

  React.useEffect(() => {
    const supabaseAnonKey =
      (typeof constants?.SUPABASE_ANON_KEY === "string" && constants.SUPABASE_ANON_KEY.trim()) ||
      "";
    const currentApiKey = typeof constants?.apiKey === "string" ? constants.apiKey.trim() : "";

    if (!currentApiKey && supabaseAnonKey) {
      setGlobalVariableValue({ key: "apiKey", value: supabaseAnonKey });
    }
  }, [constants?.SUPABASE_ANON_KEY, constants?.apiKey, setGlobalVariableValue]);

  React.useEffect(() => {
    if (
      authState.hasValidAuthToken &&
      authState.authToken &&
      (!constants?.AUTHORIZATION_HEADER || !constants.AUTHORIZATION_HEADER.trim())
    ) {
      setGlobalVariableValue({
        key: "AUTHORIZATION_HEADER",
        value: `Bearer ${authState.authToken}`,
      });
    }
  }, [
    authState.authToken,
    authState.hasValidAuthToken,
    constants?.AUTHORIZATION_HEADER,
    setGlobalVariableValue,
  ]);

  React.useEffect(() => {
    if (!authState.isAuthenticated) {
      const resetAndRedirect = async () => {
        await Promise.all([
          setGlobalVariableValue({ key: "auth_token", value: "" }),
          setGlobalVariableValue({ key: "AUTHORIZATION_HEADER", value: "" }),
          setGlobalVariableValue({ key: "refresh_token", value: "" }),
          setGlobalVariableValue({ key: "session_exp", value: 0 }),
          setGlobalVariableValue({ key: "user_id", value: "" }),
        ]);
        navigation.replace("AuthStack", { screen: "" });
      };

      resetAndRedirect();
    }
  }, [authState.isAuthenticated, navigation, setGlobalVariableValue]);

  return authState;
};

export default useAuthState;
