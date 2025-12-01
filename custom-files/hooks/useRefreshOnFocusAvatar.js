import { useFocusEffect } from "@react-navigation/native";
import React from "react";

export default function useRefreshOnFocusAvatar({
  objectKey,
  mintViewFn,
  initialUrl = null,
  enabled = true,
}) {
  const [avatarUrl, setAvatarUrl] = React.useState(initialUrl);
  const [loading, setLoading] = React.useState(false);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    setAvatarUrl(initialUrl);
  }, [initialUrl]);

  const refresh = React.useCallback(async () => {
    if (!enabled || !mintViewFn || !objectKey) {
      return;
    }
    setLoading(true);
    try {
      const result = await mintViewFn(objectKey);
      const nextUrl =
        typeof result === "string"
          ? result
          : result && typeof result.url === "string"
            ? result.url
            : null;

      if (isMountedRef.current) {
        setAvatarUrl(nextUrl);
      }
    } catch (error) {
      console.error("Failed to refresh avatar URL:", error);
      if (isMountedRef.current) {
        setAvatarUrl(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, mintViewFn, objectKey]);

  useFocusEffect(
    React.useCallback(() => {
      if (!enabled || !mintViewFn || !objectKey) {
        return () => {};
      }
      refresh();
      return () => {};
    }, [enabled, mintViewFn, objectKey, refresh]),
  );

  return {
    avatarUrl,
    loading,
    refresh,
  };
}
