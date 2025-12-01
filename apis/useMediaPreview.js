import { useQuery } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";
import useMintView from "./useMintView";
import { resolveStorageUrl, resolveStorageExpiresAt } from "../utils/storageUrlHelpers";

const PREVIEW_TTL_MS = 5 * 60 * 1000; // 5 minutes

const useMediaPreview = (objectKey) => {
  const Constants = GlobalVariables.useValues();
  const { mutateAsync: mintView } = useMintView();

  const queryEnabled =
    !!objectKey &&
    typeof Constants?.SUPABASE_URL === "string" &&
    Constants.SUPABASE_URL.trim().length > 0;

  const query = useQuery(
    ["media-preview", objectKey],
    async () => {
      console.log("[MediaPreview] Fetching preview for objectKey:", objectKey);
      const res = await mintView({ objectKey });
      console.log("[MediaPreview] Mint view response:", {
        ok: res?.ok,
        hasUrl: !!resolveStorageUrl(res),
        objectKey,
      });
      const url = resolveStorageUrl(res);
      const expiresAt = resolveStorageExpiresAt(res);
      console.log("[MediaPreview] Resolved URL:", url);
      if (!url) {
        const error = new Error("Signed URL missing for media preview");
        console.error("[MediaPreview] Failed to resolve URL", {
          objectKey,
          response: res,
        });
        throw error;
      }
      return { url, expiresAt };
    },
    {
      enabled: queryEnabled,
      staleTime: 10000, // 10 seconds - refetch more aggressively to pick up new uploads
      cacheTime: PREVIEW_TTL_MS,
      retry: 3, // Retry more times for better reliability
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: false, // Don't auto-refetch on interval
      onError: (error) => {
        console.error("[MediaPreview] Error fetching preview:", {
          objectKey,
          error: error?.message,
          status: error?.status,
          body: error?.body,
        });
      },
    },
  );

  return {
    uri: query.data?.url ?? null,
    loading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
};

export default useMediaPreview;
