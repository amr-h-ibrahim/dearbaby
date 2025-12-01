import * as React from "react";
import { useInfiniteQuery } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";

const DEFAULT_PAGE_SIZE = 24;

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

const buildMediaAssetsUrl = ({ baseUrl, albumId, babyId, limit, offset }) => {
  const params = [
    "select=media_id,baby_id,album_id,object_key,mime_type,bytes,width,height,created_at,status,preview_signed_url,preview_signed_expires_at,like_count,viewer_has_liked,comment_count,is_pinned",
    `album_id=eq.${encodeURIComponent(albumId)}`,
    `baby_id=eq.${encodeURIComponent(babyId)}`,
    "deleted_at=is.null",
    "status=eq.uploaded",
    "order=created_at.desc",
    `limit=${encodeURIComponent(limit)}`,
    `offset=${encodeURIComponent(offset)}`,
  ];
  return `${baseUrl}/rest/v1/media_assets_with_social?${params.join("&")}`;
};

const parseJsonSafe = (text) => {
  if (!text) {
    return [];
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn("[useAlbumMediaQuery] Failed to parse response", error);
    throw error;
  }
};

const normalizeItems = (rows) => {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => ({
    ...row,
    media_id: row?.media_id,
    baby_id: row?.baby_id,
    album_id: row?.album_id,
    object_key: row?.object_key,
    preview_url: row?.preview_signed_url ?? row?.preview_url ?? null,
    preview_signed_url: row?.preview_signed_url ?? null,
    preview_signed_expires_at: row?.preview_signed_expires_at ?? null,
    like_count: row?.like_count ?? 0,
    viewer_has_liked: row?.viewer_has_liked ?? false,
    comment_count: row?.comment_count ?? 0,
    is_pinned: row?.is_pinned ?? false,
  }));
};

const createAlbumMediaFetcher =
  ({ baseUrl, albumId, babyId, authorization, anonKey, contentProfile, pageSize }) =>
  async ({ pageParam = 0 }) => {
    if (!baseUrl) {
      throw new Error("Supabase URL missing for album media request");
    }
    if (!albumId || !babyId) {
      return { items: [], nextOffset: undefined };
    }

    const limit = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
    const offset = pageParam || 0;
    const url = buildMediaAssetsUrl({ baseUrl, albumId, babyId, limit, offset });

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        apikey: anonKey,
        "Accept-Profile": contentProfile,
        "Content-Profile": contentProfile,
      },
    });

    const text = await res.text();
    const json = text ? parseJsonSafe(text) : [];

    if (!res.ok) {
      const error = new Error(text || `Album media fetch failed (${res.status})`);
      error.status = res.status;
      error.body = text;
      throw error;
    }

    const items = normalizeItems(json);
    const nextOffset = items.length === limit ? offset + limit : undefined;
    return { items, nextOffset };
  };

const useAlbumMediaQuery = (
  { albumId, babyId, pageSize = DEFAULT_PAGE_SIZE } = {},
  options = {},
) => {
  const constants = GlobalVariables.useValues();
  const supabaseUrl = trimSupabaseUrl(constants?.SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey(constants);
  const authorization = resolveSupabaseAuthorization(constants);
  const contentProfile = resolveSupabaseProfile(constants);

  const queryEnabled = Boolean(albumId && babyId && supabaseUrl && anonKey && authorization);
  const fetchAlbumMediaPage = React.useMemo(
    () =>
      createAlbumMediaFetcher({
        baseUrl: supabaseUrl,
        albumId,
        babyId,
        authorization,
        anonKey,
        contentProfile,
        pageSize,
      }),
    [anonKey, authorization, babyId, contentProfile, pageSize, supabaseUrl, albumId],
  );

  return useInfiniteQuery(["album-media", albumId, babyId, pageSize], fetchAlbumMediaPage, {
    enabled: queryEnabled,
    getNextPageParam: (lastPage) => lastPage?.nextOffset,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 60000,
    ...options,
  });
};

export default useAlbumMediaQuery;
