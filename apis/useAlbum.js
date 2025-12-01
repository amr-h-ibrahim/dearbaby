import { useQuery } from "react-query";
import SupabaseClient from "./SupabaseClient";

const SELECT_COLUMNS =
  "album_id,baby_id,title,description_md,detailed_memory_md,cover_media_id,cover_media_object_key,created_at,updated_at";

const shouldRetryWithWildcardSelect = (error) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (error.status && error.status !== 400) {
    return false;
  }
  const payload = error.payload;
  const extractMessage = () => {
    if (payload && typeof payload === "object") {
      if (typeof payload.message === "string") {
        return payload.message;
      }
      if (typeof payload.error === "string") {
        return payload.error;
      }
    }
    if (typeof error.body === "string") {
      return error.body;
    }
    if (typeof error.message === "string") {
      return error.message;
    }
    return "";
  };
  const message = extractMessage();
  if (!message || typeof message !== "string") {
    return false;
  }
  const lowered = message.toLowerCase();
  return lowered.includes("cover_media_id") || lowered.includes("cover_media_object_key");
};

export default function useAlbum(albumId) {
  return useQuery(
    ["album", albumId],
    async () => {
      if (!albumId) return null;

      const firstAttempt = await SupabaseClient.from("albums")
        .select(SELECT_COLUMNS)
        .eq("album_id", albumId)
        .single();

      if (firstAttempt.error && shouldRetryWithWildcardSelect(firstAttempt.error)) {
        const fallbackAttempt = await SupabaseClient.from("albums")
          .select("*")
          .eq("album_id", albumId)
          .single();

        if (fallbackAttempt.error) {
          throw fallbackAttempt.error;
        }
        return fallbackAttempt.data;
      }

      if (firstAttempt.error) {
        throw firstAttempt.error;
      }

      return firstAttempt.data;
    },
    {
      enabled: Boolean(albumId),
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  );
}
