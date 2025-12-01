import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";
import { MEDIA_ASSET_DEFAULT_SELECT } from "./useMediaAsset";

const DEFAULT_PAGE_LIMIT = 20;

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
    console.warn("[useMediaSocial] Failed to parse RPC response", error?.message);
    return null;
  }
};

const callSupabaseRpc = async (constants, rpcName, payload = {}) => {
  const baseUrl = trimSupabaseUrl(constants?.SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey(constants);
  const authorization = resolveSupabaseAuthorization(constants);
  const contentProfile = resolveSupabaseProfile(constants);

  if (!baseUrl || !anonKey || !authorization) {
    throw new Error(`Supabase credentials missing for RPC ${rpcName}`);
  }

  const url = `${baseUrl}/rest/v1/rpc/${rpcName}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorization,
      apikey: anonKey,
      "Accept-Profile": contentProfile,
      "Content-Profile": contentProfile,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const json = parseJsonSafe(text);

  if (!response.ok) {
    const message =
      (json && (json.message || json.error)) || text || `${rpcName} failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.body = text;
    error.payload = json;
    throw error;
  }

  return json;
};

const extractArrayPayload = (raw) => {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (Array.isArray(raw?.data)) {
    return raw.data;
  }
  if (Array.isArray(raw?.items)) {
    return raw.items;
  }
  if (Array.isArray(raw?.comments)) {
    return raw.comments;
  }
  return [];
};

const normalizeComment = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const commentId =
    entry.comment_id ?? entry.commentId ?? entry.id ?? entry.uuid ?? entry.pk ?? null;

  // Handle author info - prioritize fields from comments_with_author view
  const authorObj = entry.author ?? null;
  const authorDisplayName =
    entry.author_display_name ??
    entry.authorDisplayName ??
    authorObj?.display_name ??
    entry.display_name ??
    entry.displayName ??
    entry.author_name ??
    null; // Don't fall back to UUID - null is better
  const authorAvatarUrl =
    entry.author_avatar_url ??
    entry.authorAvatarUrl ??
    entry.avatar_object_key ??
    entry.avatarObjectKey ??
    authorObj?.avatar_url ??
    authorObj?.avatar_object_key ??
    entry.avatar_url ??
    null;

  return {
    ...entry,
    comment_id: commentId,
    parent_comment_id: entry.parent_comment_id ?? entry.parentCommentId ?? null,
    body: entry.body ?? entry.comment_body ?? "",
    author_display_name: authorDisplayName,
    author_avatar_url: authorAvatarUrl,
    is_pinned: Boolean(entry.is_pinned),
    created_at: entry.created_at ?? entry.createdAt ?? null,
    updated_at: entry.updated_at ?? entry.updatedAt ?? null,
    deleted_at: entry.deleted_at ?? entry.deletedAt ?? null,
    created_by: entry.created_by ?? entry.createdBy ?? null,
  };
};

const deriveNextCursor = (raw, items, limit) => {
  const sources = [raw, raw?.paging, raw?.meta, raw?.data, raw?.cursor].filter(Boolean);

  for (const source of sources) {
    if (typeof source?.next_before === "string" && source.next_before) {
      return source.next_before;
    }
    if (typeof source?.next_cursor === "string" && source.next_cursor) {
      return source.next_cursor;
    }
    if (typeof source?.next === "string" && source.next) {
      return source.next;
    }
    if (typeof source?.cursor === "string" && source.cursor) {
      return source.cursor;
    }
  }

  if (Array.isArray(items) && limit && items.length === limit) {
    const last = items[items.length - 1];
    return last?.created_at ?? last?.comment_id ?? null;
  }

  return null;
};

const normalizeReactionState = (payload) => {
  const source = Array.isArray(payload) ? (payload[0] ?? null) : (payload ?? null);
  const summary =
    source?.reaction_summary ??
    source?.reactionSummary ??
    source?.counts ??
    source?.reactions ??
    {};
  const heartKey = "❤️";
  const summaryHeart =
    summary?.[heartKey] ?? summary?.heart ?? summary?.hearts ?? summary?.love ?? null;
  const summaryCount =
    typeof summaryHeart === "number"
      ? summaryHeart
      : typeof summaryHeart === "object" && summaryHeart !== null
        ? summaryHeart.count
        : null;
  const likeCountRaw =
    source?.like_count ?? source?.heart_count ?? source?.reaction_count ?? summaryCount ?? 0;
  const likedRaw =
    source?.is_liked ??
    source?.viewer_has_liked ??
    source?.did_like ??
    source?.liked ??
    (Array.isArray(source?.viewer_reactions)
      ? source.viewer_reactions.includes(heartKey)
      : undefined) ??
    (typeof source?.viewer_reaction === "string" ? source.viewer_reaction === heartKey : undefined);
  const likeCount =
    typeof likeCountRaw === "number" ? likeCountRaw : parseInt(likeCountRaw, 10) || 0;

  return {
    likeCount: likeCount < 0 ? 0 : likeCount,
    isLiked: Boolean(likedRaw),
  };
};

const listCommentsForMedia = async (constants, { mediaId, limit, before }) => {
  if (!mediaId) {
    throw new Error("mediaId is required for list_comments_for_media");
  }

  const baseUrl = trimSupabaseUrl(constants?.SUPABASE_URL);
  const anonKey = resolveSupabaseAnonKey(constants);
  const authorization = resolveSupabaseAuthorization(constants);
  const contentProfile = resolveSupabaseProfile(constants);

  if (!baseUrl || !anonKey || !authorization) {
    throw new Error("Supabase credentials missing for listCommentsForMedia");
  }

  // Build query parameters - ONLY filter by media_id, nothing else
  // RLS policies will handle who can see what
  const params = new URLSearchParams();
  params.append("media_id", `eq.${mediaId}`);
  params.append("order", "created_at.desc");
  params.append("limit", String(limit || DEFAULT_PAGE_LIMIT));

  if (before) {
    params.append("created_at", `lt.${before}`);
  }

  // Select all fields from comments_with_author view (includes author info from profiles)
  params.append(
    "select",
    "comment_id,media_id,body,created_by,created_at,updated_at,deleted_at,parent_comment_id,is_pinned,author_display_name,author_avatar_url",
  );

  // Query the comments_with_author view which includes joined profile data
  const url = `${baseUrl}/rest/v1/comments_with_author?${params.toString()}`;

  console.log("[useListCommentsForMedia] Fetching from URL:", url);

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

  if (!response.ok) {
    const text = await response.text();
    console.error("[useListCommentsForMedia] ERROR:", {
      status: response.status,
      statusText: response.statusText,
      body: text,
      url,
    });
    const json = parseJsonSafe(text);
    const message =
      (json && (json.message || json.error)) || text || `Query failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  const raw = await response.json();
  console.log("[useListCommentsForMedia] Raw response:", raw);

  // The view already includes author_display_name and author_avatar_url from the profiles join
  const rows = (Array.isArray(raw) ? raw : []).filter(Boolean);

  const normalizedRows = rows.map(normalizeComment).filter(Boolean);

  console.log(
    "[useListCommentsForMedia] sample comment author",
    normalizedRows?.[0]?.author_display_name,
  );
  console.log(
    "[useListCommentsForMedia] mediaId",
    mediaId,
    "comments returned",
    normalizedRows.length,
  );

  return {
    items: normalizedRows,
    nextCursor: deriveNextCursor(raw, normalizedRows, limit),
  };
};

const createComment = (constants, payload) => callSupabaseRpc(constants, "create_comment", payload);

const updateComment = (constants, payload) => callSupabaseRpc(constants, "update_comment", payload);

const deleteComment = (constants, payload) => callSupabaseRpc(constants, "delete_comment", payload);

const toggleReaction = (constants, payload) =>
  callSupabaseRpc(constants, "toggle_reaction", payload);

const togglePinMedia = (constants, payload) =>
  callSupabaseRpc(constants, "toggle_pin_media", payload);

const getCommentsQueryKey = (mediaId, limit) => ["media-comments", mediaId, limit];

export const useListCommentsForMedia = (
  { mediaId, limit = DEFAULT_PAGE_LIMIT } = {},
  { enabled = true } = {},
) => {
  const constants = GlobalVariables.useValues();

  const query = useInfiniteQuery(
    getCommentsQueryKey(mediaId, limit),
    ({ pageParam }) =>
      listCommentsForMedia(constants, {
        mediaId,
        limit,
        before: pageParam,
      }),
    {
      enabled: Boolean(enabled && mediaId),
      getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
      staleTime: 0,
    },
  );

  const comments = React.useMemo(() => {
    if (!query.data?.pages?.length) {
      return [];
    }
    return query.data.pages.flatMap((page) => page?.items ?? []);
  }, [query.data]);

  return { ...query, comments };
};

export const useCreateComment = () => {
  const constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  return useMutation((args) => createComment(constants, args), {
    onSuccess: (_data, variables) => {
      if (variables?.p_media_id) {
        queryClient.invalidateQueries({
          queryKey: getCommentsQueryKey(
            variables.p_media_id,
            variables?.p_limit ?? DEFAULT_PAGE_LIMIT,
          ),
        });
      }
    },
  });
};

export const useUpdateComment = () => {
  const constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  return useMutation((args) => updateComment(constants, args), {
    onSuccess: (_data, variables) => {
      if (variables?.p_media_id) {
        queryClient.invalidateQueries({
          queryKey: getCommentsQueryKey(
            variables.p_media_id,
            variables?.p_limit ?? DEFAULT_PAGE_LIMIT,
          ),
        });
      }
    },
  });
};

export const useDeleteComment = () => {
  const constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  return useMutation((args) => deleteComment(constants, args), {
    onSuccess: (_data, variables) => {
      if (variables?.p_media_id) {
        queryClient.invalidateQueries({
          queryKey: getCommentsQueryKey(
            variables.p_media_id,
            variables?.p_limit ?? DEFAULT_PAGE_LIMIT,
          ),
        });
      }
    },
  });
};

export const useToggleReaction = () => {
  const constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  return useMutation((args) => toggleReaction(constants, args), {
    onSuccess: (_data, variables) => {
      if (variables?.p_media_id) {
        queryClient.invalidateQueries(["media-asset", variables.p_media_id]);
      }
    },
  });
};

export const useTogglePinMedia = () => {
  const constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  return useMutation(
    ({ mediaId }) => {
      if (!mediaId) {
        throw new Error("mediaId is required for toggle_pin_media");
      }
      console.log("[useTogglePinMedia] mutate", { mediaId });
      // RPC returns an array with one row: [{ media_id, is_pinned }]
      return togglePinMedia(constants, { p_media_id: mediaId });
    },
    {
      onMutate: async ({ mediaId }) => {
        const queryKey = ["media-asset", mediaId, MEDIA_ASSET_DEFAULT_SELECT];

        // Cancel outgoing refetches
        await queryClient.cancelQueries(queryKey);

        // Snapshot the existing cache for rollback
        const previousData = queryClient.getQueryData(queryKey);

        // Optimistically flip is_pinned in the cache
        queryClient.setQueryData(queryKey, (current) => {
          if (!current?.asset) return current;
          return {
            ...current,
            asset: {
              ...current.asset,
              is_pinned: !Boolean(current.asset.is_pinned),
            },
          };
        });

        return { previousData, queryKey };
      },
      onSuccess: (response, { mediaId }) => {
        const queryKey = ["media-asset", mediaId, MEDIA_ASSET_DEFAULT_SELECT];

        // Unwrap the RPC response (returns array of rows)
        const row = Array.isArray(response) ? response[0] || null : response || null;

        // If we have a valid boolean is_pinned, write it back to the cache
        if (row && typeof row.is_pinned === "boolean") {
          queryClient.setQueryData(queryKey, (current) => {
            if (!current?.asset) return current;
            return {
              ...current,
              asset: {
                ...current.asset,
                is_pinned: row.is_pinned,
              },
            };
          });
        }

        // Invalidate album-media list queries to keep grids in sync
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            if (!Array.isArray(key)) return false;
            return key[0] === "album-media";
          },
        });
      },
      onError: (error, { mediaId }, context) => {
        // Roll back to previous data if available
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }

        console.error("[useTogglePinMedia] Failed to toggle pin", {
          mediaId,
          message: error?.message,
          payload: error?.payload,
        });
      },
    },
  );
};

export { normalizeReactionState, DEFAULT_PAGE_LIMIT, getCommentsQueryKey, normalizeComment };
