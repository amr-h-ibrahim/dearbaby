import * as React from "react";
import { useQuery } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";
import useMintView from "./useMintView";
import { resolveStorageUrl } from "../utils/storageUrlHelpers";

const DEFAULT_SELECT = [
  "media_id",
  "baby_id",
  "album_id",
  "object_key",
  "mime_type",
  "width",
  "height",
  "bytes",
  "created_at",
  "updated_at",
  "deleted_at",
  "preview_url",
  "preview_signed_url",
  "preview_signed_expires_at",
  "reaction_summary",
  "like_count",
  "viewer_reaction",
  "viewer_has_liked",
  "created_by",
  "status",
  "is_pinned",
].join(",");

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

const resolveSupabaseProfile = (constants) => {
  if (
    typeof constants?.["Content-Profile"] === "string" &&
    constants["Content-Profile"].trim().length > 0
  ) {
    return constants["Content-Profile"].trim();
  }
  return "dearbaby";
};

const parseJsonSafe = (text) => {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn("[useMediaAsset] Failed to parse media response", error?.message);
    return null;
  }
};

const buildMediaDetailUrl = ({ baseUrl, mediaId, select }) => {
  const params = new URLSearchParams();
  params.set("select", select && select.length ? select : DEFAULT_SELECT);
  params.set("media_id", `eq.${mediaId}`);
  params.set("limit", "1");
  params.set("deleted_at", "is.null");
  return `${baseUrl}/rest/v1/media_assets_with_social?${params.toString()}`;
};

const fetchMediaAsset = async ({ constants, mediaId, select }) => {
  if (!mediaId) {
    throw new Error("mediaId is required for useMediaAsset");
  }

  const baseUrl = trimSupabaseUrl(constants?.SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey(constants);
  const authorization = resolveSupabaseAuthorization(constants);
  const contentProfile = resolveSupabaseProfile(constants);

  if (!baseUrl || !anonKey || !authorization) {
    throw new Error("Supabase credentials missing for media asset request");
  }

  const url = buildMediaDetailUrl({ baseUrl, mediaId, select });
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authorization,
      apikey: anonKey,
      "Accept-Profile": contentProfile,
      "Content-Profile": contentProfile,
    },
  });

  const text = await response.text();
  const json = parseJsonSafe(text);

  if (!response.ok) {
    const error = new Error(text || `Media detail request failed (${response.status})`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  if (Array.isArray(json) && json.length > 0) {
    return json[0];
  }

  if (json && typeof json === "object" && Array.isArray(json?.data) && json.data.length > 0) {
    return json.data[0];
  }

  return null;
};

const useMediaAsset = ({ mediaId, select = DEFAULT_SELECT, enabled = true } = {}) => {
  const constants = GlobalVariables.useValues();
  const { mutateAsync: mintViewAsync } = useMintView();

  const fetcher = React.useCallback(async () => {
    const asset = await fetchMediaAsset({ constants, mediaId, select });
    if (!asset) {
      return { asset: null, previewUrl: null };
    }

    // Prioritize cached preview URLs from the database
    let previewUrl = asset?.preview_url ?? asset?.preview_signed_url ?? null;
    const objectKey = asset?.object_key ?? asset?.objectKey ?? asset?.media_object_key ?? null;

    // Only mint if no cached URL exists
    if (!previewUrl && objectKey) {
      try {
        const minted = await mintViewAsync({ objectKey, mediaId });
        previewUrl = resolveStorageUrl(minted) ?? null;
      } catch (error) {
        console.warn("[useMediaAsset] Failed to mint signed preview", {
          mediaId,
          objectKey,
          message: error?.message,
        });
      }
    }

    // Normalize the asset to include preview_url consistently
    const normalizedAsset = {
      ...asset,
      preview_url: previewUrl ?? asset?.preview_url ?? asset?.preview_signed_url ?? null,
    };

    return { asset: normalizedAsset, previewUrl };
  }, [constants, mediaId, mintViewAsync, select]);

  const query = useQuery(["media-asset", mediaId, select], fetcher, {
    enabled: Boolean(enabled && mediaId),
    staleTime: 0,
    keepPreviousData: false, // make sure we don't reuse the previous photo's data
  });

  return {
    asset: query.data?.asset ?? null,
    previewUrl: query.data?.previewUrl ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  };
};

export default useMediaAsset;
export { DEFAULT_SELECT as MEDIA_ASSET_DEFAULT_SELECT };
