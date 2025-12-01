import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  PanResponder,
} from "react-native";
import {
  Button,
  ExpoImage,
  Icon,
  ScreenContainer,
  Spacer,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import dayjs from "dayjs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as GlobalVariables from "../../config/GlobalVariableContext";
import useNavigation from "../../utils/useNavigation";
import useParams from "../../utils/useParams";
import { useRequireAuth } from "../../utils/useAuthState";
import useMintView from "../../apis/useMintView";
import useMediaAsset, { MEDIA_ASSET_DEFAULT_SELECT } from "../../apis/useMediaAsset";
import { useQueryClient } from "react-query";
import {
  DEFAULT_PAGE_LIMIT,
  normalizeComment,
  normalizeReactionState,
  useCreateComment,
  useDeleteComment,
  useListCommentsForMedia,
  useToggleReaction,
  useTogglePinMedia,
  useUpdateComment,
} from "../../apis/useMediaSocial";
import * as SupabaseDearBabyApi from "../../apis/SupabaseDearBabyApi";
import { useDeleteMediaPOST } from "../../apis/SupabaseDearBabyApi";
import { resolveStorageUrl } from "../../utils/storageUrlHelpers";
import showToast from "../../utils/showToast";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HEART_EMOJI = "❤️";
const PLACEHOLDER_DELETED_TEXT = "[This little moment was deleted 💫]";
const SWIPE_THRESHOLD = 40; // Minimum horizontal distance to trigger swipe navigation

const formatRelativeTime = (value) => {
  if (!value) {
    return "";
  }
  const target = dayjs(value);
  if (!target.isValid()) {
    return "";
  }
  const now = dayjs();
  const diffSeconds = Math.max(0, now.diff(target, "second"));
  if (diffSeconds < 60) {
    return `${diffSeconds || 0}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return target.format("MMM D");
};

const extractFirstRecord = (payload) => {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload) && payload.length > 0) {
    return payload[0];
  }
  if (Array.isArray(payload?.data) && payload.data.length > 0) {
    return payload.data[0];
  }
  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
};

const buildRenderableComments = (comments) => {
  if (!Array.isArray(comments)) {
    return [];
  }

  const map = new Map();
  comments.forEach((comment) => {
    if (!comment || !comment.comment_id) {
      return;
    }
    map.set(comment.comment_id, comment);
  });

  const topLevel = [];
  const repliesByParent = new Map();

  map.forEach((comment) => {
    if (comment.parent_comment_id) {
      const list = repliesByParent.get(comment.parent_comment_id) ?? [];
      list.push(comment);
      repliesByParent.set(comment.parent_comment_id, list);
    } else {
      topLevel.push(comment);
    }
  });

  topLevel.sort((a, b) => {
    if (a?.is_pinned && !b?.is_pinned) {
      return -1;
    }
    if (!a?.is_pinned && b?.is_pinned) {
      return 1;
    }
    const aDate = dayjs(a.created_at ?? 0).valueOf();
    const bDate = dayjs(b.created_at ?? 0).valueOf();
    return bDate - aDate;
  });

  const result = [];
  topLevel.forEach((comment) => {
    result.push({ comment, depth: 0 });
    const replies = repliesByParent.get(comment.comment_id) ?? [];
    replies.sort((a, b) => {
      const aDate = dayjs(a.created_at ?? 0).valueOf();
      const bDate = dayjs(b.created_at ?? 0).valueOf();
      return aDate - bDate;
    });
    replies.forEach((reply) => {
      result.push({ comment: reply, depth: 1 });
    });
  });

  return result;
};

const sumHearts = (value) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object") {
    if (typeof value.count === "number") {
      return value.count;
    }
    if (typeof value.value === "number") {
      return value.value;
    }
  }
  return 0;
};

const fallbackInitials = (name = "") => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "BB";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const PhotoDetailScreen = ({ route, theme }) => {
  const navigation = useNavigation();
  const params = useParams();
  const insets = useSafeAreaInsets();
  useRequireAuth();
  const { user_id: currentUserId } = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  const routeParams = route?.params ?? {};

  // Debug logging as requested
  console.log("[PhotoDetailScreen] routeParams", routeParams);
  console.log("[PhotoDetailScreen] params from hook", params);

  // Get mediaSequence and initialIndex from route params
  const mediaSequence = routeParams?.mediaSequence ?? params?.mediaSequence ?? [];

  // initialIndex can come as number OR string from navigation / Draftbit
  const rawInitialIndex =
    routeParams?.initialIndex ??
    routeParams?.index ??
    params?.initialIndex ??
    params?.index ??
    null;

  console.log("[PhotoDetailScreen] mediaSequence length", mediaSequence?.length);
  console.log("[PhotoDetailScreen] rawInitialIndex", rawInitialIndex);

  // Try to normalise to number
  let parsedInitialIndex =
    typeof rawInitialIndex === "number"
      ? rawInitialIndex
      : typeof rawInitialIndex === "string"
        ? parseInt(rawInitialIndex, 10)
        : NaN;

  // Fallback: derive index from mediaId if index is missing/invalid
  const fallbackMediaIdForIndex =
    routeParams?.mediaId ?? routeParams?.media_id ?? params?.mediaId ?? params?.media_id ?? null;

  if (
    (Number.isNaN(parsedInitialIndex) ||
      parsedInitialIndex < 0 ||
      parsedInitialIndex >= mediaSequence.length) &&
    mediaSequence.length > 0 &&
    fallbackMediaIdForIndex
  ) {
    const foundIndex = mediaSequence.findIndex(
      (item) => item?.media_id === fallbackMediaIdForIndex,
    );
    if (foundIndex >= 0) {
      parsedInitialIndex = foundIndex;
    }
  }

  const safeInitialIndex =
    !Number.isNaN(parsedInitialIndex) &&
    parsedInitialIndex >= 0 &&
    parsedInitialIndex < mediaSequence.length
      ? parsedInitialIndex
      : 0;

  console.log("[PhotoDetailScreen] safeInitialIndex", safeInitialIndex);

  const [currentIndex, setCurrentIndex] = React.useState(safeInitialIndex);
  const currentMedia = mediaSequence.length > 0 ? mediaSequence[currentIndex] : null;

  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Delete modal animation
  const deleteModalScale = React.useRef(new Animated.Value(0)).current;
  const deleteModalOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isDeleteModalVisible) {
      Animated.parallel([
        Animated.spring(deleteModalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(deleteModalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      deleteModalScale.setValue(0);
      deleteModalOpacity.setValue(0);
    }
  }, [isDeleteModalVisible, deleteModalScale, deleteModalOpacity]);

  console.log("[PhotoDetailScreen] currentIndex", currentIndex);
  console.log("[PhotoDetailScreen] currentMedia", currentMedia ? "found" : "null");
  if (currentMedia) {
    console.log("[PhotoDetailScreen] currentMedia.media_id", currentMedia.media_id);
    console.log(
      "[PhotoDetailScreen] currentMedia.preview_url",
      currentMedia.preview_url ? "has URL" : "null",
    );
  }

  // Fallback values for deep links or direct navigation without sequence
  const fallbackMediaId =
    routeParams?.mediaId ?? routeParams?.media_id ?? params?.mediaId ?? params?.media_id ?? null;

  const mediaId = currentMedia?.media_id ?? fallbackMediaId ?? null;

  console.log("[PhotoDetailScreen] mediaId", mediaId);
  const initialPreviewUrl = currentMedia?.preview_url ?? null;
  const passedObjectKey =
    currentMedia?.object_key ??
    routeParams?.objectKey ??
    routeParams?.object_key ??
    params?.objectKey ??
    params?.object_key ??
    null;

  console.log("[PhotoDetailScreen] initialPreviewUrl", initialPreviewUrl);
  console.log("[PhotoDetailScreen] passedObjectKey", passedObjectKey);
  const albumTitle =
    currentMedia?.title ??
    routeParams?.albumTitle ??
    params?.albumTitle ??
    routeParams?.album_title ??
    null;
  const babyName =
    currentMedia?.baby_name ??
    routeParams?.babyName ??
    params?.babyName ??
    routeParams?.baby_name ??
    params?.baby_name ??
    null;
  const initialFocus = routeParams?.initialFocus ?? params?.initialFocus ?? null;
  const albumId =
    routeParams?.albumId ?? routeParams?.album_id ?? params?.albumId ?? params?.album_id ?? null;
  const babyId =
    routeParams?.babyId ?? routeParams?.baby_id ?? params?.babyId ?? params?.baby_id ?? null;

  const {
    asset,
    previewUrl: assetPreviewUrl,
    isLoading: assetLoading,
    isFetching: assetFetching,
    error: assetError,
    refetch: refetchAsset,
  } = useMediaAsset({
    mediaId,
    enabled: Boolean(mediaId),
  });

  const mediaObjectKey = currentMedia?.object_key ?? asset?.object_key ?? passedObjectKey ?? null;

  // Navigation state for swipe through album
  const hasPrevious = currentIndex > 0;
  const hasNext = mediaSequence.length > 0 && currentIndex < mediaSequence.length - 1;

  const goToPrevious = React.useCallback(() => {
    console.log("[PhotoDetailScreen] goToPrevious called", { currentIndex, hasPrevious });
    if (!hasPrevious) return;
    setCurrentIndex((idx) => {
      const newIdx = Math.max(0, idx - 1);
      console.log("[PhotoDetailScreen] Moving to previous", { from: idx, to: newIdx });
      return newIdx;
    });
  }, [hasPrevious, currentIndex]);

  const goToNext = React.useCallback(() => {
    console.log("[PhotoDetailScreen] goToNext called", { currentIndex, hasNext });
    if (!hasNext) return;
    setCurrentIndex((idx) => {
      const newIdx = mediaSequence.length > 0 ? Math.min(mediaSequence.length - 1, idx + 1) : idx;
      console.log("[PhotoDetailScreen] Moving to next", { from: idx, to: newIdx });
      return newIdx;
    });
  }, [hasNext, mediaSequence.length, currentIndex]);

  // Swipe gesture handler
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Only respond to horizontal swipes
          const shouldRespond =
            Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          if (shouldRespond) {
            console.log("[PhotoDetailScreen] Swipe detected", {
              dx: gestureState.dx,
              dy: gestureState.dy,
            });
          }
          return shouldRespond;
        },
        onPanResponderRelease: (evt, gestureState) => {
          console.log("[PhotoDetailScreen] Swipe released", {
            dx: gestureState.dx,
            threshold: SWIPE_THRESHOLD,
          });
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            // Swipe left - go to next
            console.log("[PhotoDetailScreen] Swipe left detected, going to next");
            goToNext();
          } else if (gestureState.dx > SWIPE_THRESHOLD) {
            // Swipe right - go to previous
            console.log("[PhotoDetailScreen] Swipe right detected, going to previous");
            goToPrevious();
          }
        },
      }),
    [goToNext, goToPrevious],
  );
  const { mutateAsync: mintViewAsync } = useMintView();

  const [mintedPreviewUrl, setMintedPreviewUrl] = React.useState(initialPreviewUrl ?? null);
  const [mintError, setMintError] = React.useState(null);
  const [isMintingPreview, setIsMintingPreview] = React.useState(false);

  // Track when currentIndex changes
  React.useEffect(() => {
    console.log("[PhotoDetailScreen] currentIndex changed to", currentIndex);
    console.log("[PhotoDetailScreen] mediaSequence.length", mediaSequence.length);
    if (mediaSequence.length > 0 && currentIndex < mediaSequence.length) {
      const newMedia = mediaSequence[currentIndex];
      console.log("[PhotoDetailScreen] Switching to photo", {
        index: currentIndex,
        media_id: newMedia?.media_id,
        has_preview: !!newMedia?.preview_url,
      });
    }
  }, [currentIndex, mediaSequence]);

  // Recompute preview every time currentMedia changes
  React.useEffect(() => {
    if (!currentMedia) return;

    // Check if the new media already has a cached preview URL
    const cachedPreview = currentMedia.preview_url ?? currentMedia.preview_signed_url ?? null;

    if (cachedPreview) {
      // Use the cached URL directly - no need to mint
      setMintedPreviewUrl(cachedPreview);
      setMintError(null);
    } else {
      // No cached URL - reset and let the minting useEffect handle it
      setMintedPreviewUrl(null);
      setMintError(null);
    }
  }, [currentMedia]);

  // Only mint as a fallback when no cached URL exists
  React.useEffect(() => {
    // Check if we already have a cached preview URL
    const hasCachedPreview = currentMedia?.preview_url ?? currentMedia?.preview_signed_url ?? null;

    // Don't mint if we already have a cached URL
    if (hasCachedPreview) {
      return;
    }

    // Don't mint if we don't have the required data
    if (!mediaObjectKey) {
      return;
    }

    // Don't mint if we already have a minted URL
    if (mintedPreviewUrl) {
      return;
    }

    // Don't mint if we're already minting
    if (isMintingPreview) {
      return;
    }

    // Don't mint if we already have the asset preview URL
    if (assetPreviewUrl || asset?.preview_url) {
      return;
    }

    // All checks passed - mint the preview URL
    const doMint = async () => {
      try {
        setIsMintingPreview(true);
        const response = await mintViewAsync({
          objectKey: mediaObjectKey,
          mediaId: mediaId,
        });
        const resolved = resolveStorageUrl(response);
        setMintedPreviewUrl(resolved ?? null);
      } catch (err) {
        setMintError(err);
      } finally {
        setIsMintingPreview(false);
      }
    };

    doMint();
  }, [
    mediaObjectKey,
    mediaId,
    currentMedia,
    mintedPreviewUrl,
    assetPreviewUrl,
    asset?.preview_url,
    isMintingPreview,
    mintViewAsync,
  ]);

  // Prioritize cached preview URLs from the backend
  const heroUrl =
    currentMedia?.preview_url ??
    currentMedia?.preview_signed_url ??
    mintedPreviewUrl ??
    assetPreviewUrl ??
    asset?.preview_url ??
    null;

  const heroIsLoading = (assetLoading || isMintingPreview) && !heroUrl;

  const heroHasError = !heroIsLoading && !heroUrl && (Boolean(assetError) || Boolean(mintError));

  // Consider preview_* as "stable cached preview" coming from backend
  const hasStablePreview = Boolean(
    currentMedia?.preview_signed_url || currentMedia?.preview_url || asset?.preview_url,
  );

  // Only show overlay if:
  // - We don't have a stable cached preview yet
  // - We *are* in the middle of minting
  // - And we already have some heroUrl to show
  const heroShowOverlay = !hasStablePreview && isMintingPreview && Boolean(heroUrl);

  console.log("[PhotoDetailScreen] heroUrl", heroUrl);
  console.log("[PhotoDetailScreen] heroIsLoading", heroIsLoading);
  console.log("[PhotoDetailScreen] heroHasError", heroHasError);
  console.log("[PhotoDetailScreen] hasStablePreview", hasStablePreview);
  console.log("[PhotoDetailScreen] heroShowOverlay", heroShowOverlay);

  const reactionInitial = React.useMemo(() => {
    if (!asset) {
      return { likeCount: 0, isLiked: false };
    }
    const normalized = normalizeReactionState({
      reaction_summary: asset?.reaction_summary,
      like_count: asset?.like_count,
      viewer_has_liked: asset?.viewer_has_liked,
      viewer_reaction: asset?.viewer_reaction,
    });
    return {
      likeCount: normalized.likeCount ?? sumHearts(asset?.like_count) ?? 0,
      isLiked: normalized.isLiked ?? Boolean(asset?.viewer_has_liked),
    };
  }, [asset?.reaction_summary, asset?.like_count, asset?.viewer_has_liked, asset?.viewer_reaction]);

  // Derive values directly from reactionInitial (source of truth is React Query cache)
  const likeCount = reactionInitial.likeCount;
  const isLiked = reactionInitial.isLiked;

  const heroAspectRatio = React.useMemo(() => {
    const width = Number(asset?.width);
    const height = Number(asset?.height);
    if (width > 0 && height > 0) {
      const ratio = width / height;
      return ratio > 0 ? ratio : 3 / 4;
    }
    return 3 / 4;
  }, [asset?.width, asset?.height]);

  const heartScale = React.useRef(new Animated.Value(1)).current;
  const runHeartAnimation = React.useCallback(
    (liked) => {
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: liked ? 1.15 : 0.95,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [heartScale],
  );

  const commentsQuery = useListCommentsForMedia({
    mediaId,
    limit: DEFAULT_PAGE_LIMIT,
  });
  const serverComments = commentsQuery.comments ?? [];

  const [optimisticComments, setOptimisticComments] = React.useState([]);
  const pushOptimisticComment = React.useCallback((comment) => {
    if (!comment) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOptimisticComments((prev) => {
      const filtered = prev.filter((entry) => entry?.comment_id !== comment.comment_id);
      return [comment, ...filtered];
    });
  }, []);

  React.useEffect(() => {
    if (!serverComments.length) {
      return;
    }
    setOptimisticComments((prev) => {
      if (!prev.some((item) => item?._persistUntilServer)) {
        return prev;
      }
      const serverMap = new Map(
        serverComments.filter((item) => item?.comment_id).map((item) => [item.comment_id, item]),
      );
      let changed = false;
      const filtered = prev.filter((item) => {
        if (!item?._persistUntilServer || !item?.comment_id) {
          return true;
        }
        const serverMatch = serverMap.get(item.comment_id);
        if (!serverMatch) {
          return true;
        }
        const check = item?._syncCheck;
        if (!check) {
          changed = true;
          return false;
        }
        const matchesBody =
          typeof check.body === "string"
            ? (serverMatch.body ?? "").trim() === check.body.trim()
            : true;
        const matchesDeleted = check.deleted_at === true ? Boolean(serverMatch.deleted_at) : true;
        if (matchesBody && matchesDeleted) {
          changed = true;
          return false;
        }
        return true;
      });
      return changed ? filtered : prev;
    });
  }, [serverComments]);

  const combinedComments = React.useMemo(() => {
    if (!optimisticComments.length) {
      return serverComments;
    }
    const map = new Map();
    serverComments.forEach((comment) => {
      if (comment?.comment_id) {
        map.set(comment.comment_id, comment);
      }
    });
    optimisticComments.forEach((comment) => {
      if (comment?.comment_id) {
        map.set(comment.comment_id, comment);
      }
    });
    return Array.from(map.values());
  }, [optimisticComments, serverComments]);

  const renderableComments = React.useMemo(
    () => buildRenderableComments(combinedComments),
    [combinedComments],
  );

  const [commentValue, setCommentValue] = React.useState("");
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [menuComment, setMenuComment] = React.useState(null);
  const [editingComment, setEditingComment] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState("");
  const [showEditModal, setShowEditModal] = React.useState(false);
  const composerPlaceholder = React.useMemo(
    () =>
      replyTarget
        ? `Replying to ${replyTarget?.author_display_name ?? "a note"}…`
        : "Write a little note you'll love to read again in a few years…",
    [replyTarget],
  );

  const flatListRef = React.useRef(null);
  const commentInputRef = React.useRef(null);

  const { mutateAsync: createCommentAsync, isLoading: isCreatingComment } = useCreateComment();
  const { mutateAsync: updateCommentAsync, isLoading: isUpdatingComment } = useUpdateComment();
  const { mutateAsync: deleteCommentAsync } = useDeleteComment();
  const { mutateAsync: toggleReactionAsync, isLoading: isTogglingReaction } = useToggleReaction();
  const { mutateAsync: togglePinMediaAsync, isLoading: isTogglingPin } = useTogglePinMedia();
  const { mutateAsync: deleteMediaAsync } = useDeleteMediaPOST();

  const profileQuery = SupabaseDearBabyApi.useGetProfileGET(
    { user_id: currentUserId },
    { enabled: Boolean(currentUserId) },
  );
  const profileRecord =
    Array.isArray(profileQuery?.data?.json) && profileQuery.data.json.length
      ? profileQuery.data.json[0]
      : (profileQuery?.data?.json ?? null);

  const currentDisplayName = profileRecord?.display_name ?? profileRecord?.uid ?? "You";
  const currentAvatarUrl = profileRecord?.avatar_url ?? null;

  // Auto-focus comment input when opened from comment icon
  React.useEffect(() => {
    if (initialFocus === "comment" && commentInputRef.current) {
      const timeout = setTimeout(() => {
        commentInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [initialFocus]);

  // Pin state – local, initialised from currentMedia / asset and then driven by React Query
  const [localPinned, setLocalPinned] = React.useState(() => {
    if (typeof asset?.is_pinned === "boolean") {
      return Boolean(asset.is_pinned);
    }
    if (typeof currentMedia?.is_pinned === "boolean") {
      return Boolean(currentMedia.is_pinned);
    }
    return false;
  });

  // When mediaId changes or the React Query asset gains a definitive is_pinned value,
  // sync local state from the asset. We deliberately do NOT depend on currentMedia.is_pinned
  // alone to avoid clobbering optimistic updates for new pins.
  React.useEffect(() => {
    if (!mediaId) {
      setLocalPinned(false);
      return;
    }
    if (typeof asset?.is_pinned === "boolean") {
      setLocalPinned(Boolean(asset.is_pinned));
    } else if (typeof currentMedia?.is_pinned === "boolean") {
      // Only use currentMedia as a fallback when there is no asset yet
      setLocalPinned(Boolean(currentMedia.is_pinned));
    } else {
      // Default to false if neither has a definitive value
      setLocalPinned(false);
    }
  }, [mediaId, asset?.is_pinned]);

  const isPinned = localPinned;

  const handleSendComment = React.useCallback(async () => {
    if (!mediaId || isCreatingComment) {
      return;
    }
    const trimmed = commentValue.trim();
    if (!trimmed) {
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      comment_id: tempId,
      media_id: mediaId,
      parent_comment_id: replyTarget?.comment_id ?? null,
      body: trimmed,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
      is_pinned: false,
      author_display_name: currentDisplayName ?? "You",
      author_avatar_url: currentAvatarUrl ?? null,
      created_by: currentUserId,
      _optimistic: true,
      _temp: true,
    };
    pushOptimisticComment(optimistic);
    setCommentValue("");
    setReplyTarget(null);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    try {
      const response = await createCommentAsync({
        p_media_id: mediaId,
        p_body: trimmed,
        p_parent_comment_id: replyTarget?.comment_id ?? null,
      });
      const normalized = normalizeComment(extractFirstRecord(response));
      setOptimisticComments((prev) => prev.filter((entry) => entry?.comment_id !== tempId));
      if (normalized) {
        pushOptimisticComment({
          ...normalized,
          _persistUntilServer: true,
          _syncCheck: null,
        });
      }
      commentsQuery.refetch();
    } catch (error) {
      console.error("[PhotoDetail] create comment failed", error?.message);
      setOptimisticComments((prev) => prev.filter((entry) => entry?.comment_id !== tempId));
      setCommentValue(trimmed);
      showToast("We couldn’t save this little note right now. Please try again in a moment ✨");
    }
  }, [
    commentValue,
    commentsQuery,
    createCommentAsync,
    currentAvatarUrl,
    currentDisplayName,
    currentUserId,
    isCreatingComment,
    mediaId,
    pushOptimisticComment,
    replyTarget,
  ]);

  const handleToggleHeart = React.useCallback(async () => {
    if (!mediaId || isTogglingReaction) {
      return;
    }

    const queryKey = ["media-asset", mediaId, MEDIA_ASSET_DEFAULT_SELECT];

    // 1) Snapshot current cache for rollback
    const previousData = queryClient.getQueryData(queryKey);
    const previousAsset = previousData?.asset;

    if (!previousAsset) {
      return;
    }

    const previousLikeCount = sumHearts(previousAsset.like_count);
    const previousIsLiked = Boolean(previousAsset.viewer_has_liked);

    const optimisticIsLiked = !previousIsLiked;
    const optimisticLikeCount = Math.max(0, previousLikeCount + (previousIsLiked ? -1 : 1));

    // 2) Optimistic update: patch the cached asset
    queryClient.setQueryData(queryKey, (current) => {
      if (!current?.asset) {
        return current;
      }
      return {
        ...current,
        asset: {
          ...current.asset,
          like_count: optimisticLikeCount,
          viewer_has_liked: optimisticIsLiked,
          viewer_reaction: optimisticIsLiked ? HEART_EMOJI : null,
        },
      };
    });

    // 3) Run the heart animation
    runHeartAnimation(optimisticIsLiked);

    try {
      // 4) Call Supabase RPC
      const response = await toggleReactionAsync({
        p_media_id: mediaId,
        p_emoji: HEART_EMOJI,
      });

      const normalized = normalizeReactionState(response);

      const finalLikeCount =
        typeof normalized.likeCount === "number" ? normalized.likeCount : optimisticLikeCount;
      const finalIsLiked =
        typeof normalized.isLiked === "boolean" ? normalized.isLiked : optimisticIsLiked;

      // 5) Apply canonical values from backend to cache
      queryClient.setQueryData(queryKey, (current) => {
        if (!current?.asset) {
          return current;
        }
        return {
          ...current,
          asset: {
            ...current.asset,
            like_count: finalLikeCount,
            viewer_has_liked: finalIsLiked,
            viewer_reaction: finalIsLiked ? HEART_EMOJI : null,
          },
        };
      });

      // Optional: extra refetch to be 100% aligned with DB
      refetchAsset?.();
    } catch (error) {
      console.error("[PhotoDetail] toggle heart failed", error?.message);

      // 6) Roll back on error
      queryClient.setQueryData(queryKey, previousData);
      showToast("We couldn't save your heart this time. Please try again 💖");
    }
  }, [
    mediaId,
    isTogglingReaction,
    queryClient,
    runHeartAnimation,
    toggleReactionAsync,
    refetchAsset,
  ]);

  const handleTogglePin = React.useCallback(async () => {
    if (!mediaId || isTogglingPin) {
      return;
    }

    const previousPinned = Boolean(localPinned);
    const optimisticPinned = !previousPinned;

    console.log("[PhotoDetail] handleTogglePin pressed", {
      mediaId,
      previousPinned,
      optimisticPinned,
    });

    const queryKey = ["media-asset", mediaId, MEDIA_ASSET_DEFAULT_SELECT];

    // 1) Snapshot current cache for rollback
    const previousData = queryClient.getQueryData(queryKey);

    // 2) Optimistic update – cache (always update, even if asset not loaded yet)
    queryClient.setQueryData(queryKey, (current) => {
      if (!current?.asset) return current;
      return {
        ...current,
        asset: {
          ...current.asset,
          is_pinned: optimisticPinned,
        },
      };
    });

    // 3) Optimistic update – local state for the chip
    setLocalPinned(optimisticPinned);

    try {
      // 4) Call Supabase RPC
      const response = await togglePinMediaAsync({ mediaId });

      // The RPC returns [{ media_id, is_pinned }] – apply canonical value if present
      const row = Array.isArray(response) ? response[0] || null : response || null;
      if (row && typeof row.is_pinned === "boolean") {
        const canonicalPinned = Boolean(row.is_pinned);
        setLocalPinned(canonicalPinned);

        // Update cache with canonical value from backend
        queryClient.setQueryData(queryKey, (current) => {
          if (!current?.asset) return current;
          return {
            ...current,
            asset: {
              ...current.asset,
              is_pinned: canonicalPinned,
            },
          };
        });
      }

      // 5) Extra safety: re-sync asset from backend
      await refetchAsset?.();
    } catch (error) {
      console.error("[PhotoDetail] toggle pin failed", error?.message);

      // 6) Roll back on error
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      setLocalPinned(previousPinned);

      showToast("We couldn't update this little star. Please try again in a moment ✨");
    }
  }, [mediaId, isTogglingPin, localPinned, queryClient, togglePinMediaAsync, refetchAsset]);

  const handleStartEdit = React.useCallback((comment) => {
    if (!comment) {
      return;
    }
    setEditingComment(comment);
    setEditDraft(comment?.body ?? "");
    setShowEditModal(true);
    setMenuComment(null);
  }, []);

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingComment || !mediaId || isUpdatingComment) {
      return;
    }
    const trimmed = editDraft.trim();
    if (!trimmed) {
      showToast("Notes cannot be empty.");
      return;
    }
    setShowEditModal(false);
    const optimistic = {
      ...editingComment,
      body: trimmed,
      updated_at: new Date().toISOString(),
      _persistUntilServer: true,
      _syncCheck: { body: trimmed },
    };
    pushOptimisticComment(optimistic);
    try {
      await updateCommentAsync({
        p_comment_id: editingComment.comment_id,
        p_body: trimmed,
        p_media_id: mediaId,
      });
      commentsQuery.refetch();
    } catch (error) {
      console.error("[PhotoDetail] update comment failed", error?.message);
      showToast("We couldn’t update that note. Please try again.");
      setOptimisticComments((prev) =>
        prev.filter((entry) => entry?.comment_id !== editingComment.comment_id),
      );
    } finally {
      setEditingComment(null);
      setEditDraft("");
    }
  }, [
    commentsQuery,
    editDraft,
    editingComment,
    isUpdatingComment,
    mediaId,
    pushOptimisticComment,
    updateCommentAsync,
  ]);

  const handleDeleteComment = React.useCallback(
    async (comment) => {
      if (!comment || !mediaId) {
        return;
      }
      const optimistic = {
        ...comment,
        body: PLACEHOLDER_DELETED_TEXT,
        deleted_at: new Date().toISOString(),
        _persistUntilServer: true,
        _syncCheck: { deleted_at: true },
      };
      pushOptimisticComment(optimistic);
      try {
        await deleteCommentAsync({
          p_comment_id: comment.comment_id,
          p_media_id: mediaId,
        });
        commentsQuery.refetch();
      } catch (error) {
        console.error("[PhotoDetail] delete comment failed", error?.message);
        showToast("We couldn’t delete that note. Please try again.");
        setOptimisticComments((prev) =>
          prev.filter((entry) => entry?.comment_id !== comment.comment_id),
        );
      }
    },
    [commentsQuery, deleteCommentAsync, mediaId, pushOptimisticComment],
  );

  const confirmDeleteComment = React.useCallback(
    (comment) => {
      Alert.alert("Remove this message?", "Jude will no longer see it in this memory.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => handleDeleteComment(comment),
        },
      ]);
    },
    [handleDeleteComment],
  );

  const handleSharePhoto = React.useCallback(async () => {
    if (!mediaObjectKey) {
      return;
    }
    try {
      const response = await mintViewAsync({ objectKey: mediaObjectKey });
      const resolved = resolveStorageUrl(response);
      if (resolved) {
        await Share.share({ url: resolved });
      }
    } catch (error) {
      console.error("[PhotoDetail] share failed", error?.message);
      showToast("We couldn't share this moment. Try again soon.");
    }
  }, [mediaObjectKey, mintViewAsync]);

  const handleDeleteCurrentMedia = React.useCallback(async () => {
    if (!mediaId) return;

    try {
      setIsDeleting(true);

      // Reuse existing working delete flow:
      // If your existing delete function expects an array, pass [mediaId].
      await deleteMediaAsync({
        media_id: mediaId,
      });

      // Refresh album media query so album screen updates
      if (albumId) {
        queryClient.invalidateQueries(["album-media", albumId]);
      }

      showToast("This little memory has been gently removed from the album 💫");

      setIsDeleteModalVisible(false);

      // Navigate back to the album screen
      navigation.goBack();
    } catch (error) {
      console.error("[PhotoDetailScreen] single delete error", error);
      showToast("We couldn't remove this memory right now. Please try again in a moment ✨");
    } finally {
      setIsDeleting(false);
    }
  }, [mediaId, albumId, navigation, queryClient, deleteMediaAsync]);

  // Double-tap to like handler
  const lastTapRef = React.useRef(0);
  const handlePhotoPress = React.useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      handleToggleHeart();
    }
    lastTapRef.current = now;
  }, [handleToggleHeart]);

  const pastelBackground = "rgba(255, 248, 244, 1)";
  const accentColor = theme.colors.branding?.primary ?? "#ff6b81";

  const listHeader = (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.background?.base ?? "#fff",
          borderRadius: 28,
        },
      ]}
    >
      <View {...panResponder.panHandlers}>
        <Pressable onPress={handlePhotoPress} style={styles.photoWrapper}>
          {heroUrl ? (
            <ExpoImage
              source={{ uri: heroUrl }}
              style={[styles.heroImage, { aspectRatio: heroAspectRatio }]}
              contentFit="cover"
              transitionDuration={300}
            />
          ) : heroIsLoading ? (
            <View style={[styles.heroPlaceholder, { aspectRatio: heroAspectRatio }]}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={styles.heroPlaceholderText}>We're getting this memory ready…</Text>
            </View>
          ) : (
            <View style={[styles.heroPlaceholder, { aspectRatio: heroAspectRatio }]}>
              <Text style={styles.heroPlaceholderText}>
                {heroHasError
                  ? "We couldn't load this memory yet. Please try again."
                  : "This memory is taking a little longer to appear. Pull to refresh or try again."}
              </Text>
              {heroHasError ? (
                <Button
                  onPress={() => refetchAsset?.()}
                  title="Try again"
                  style={styles.retryButton}
                  textStyle={styles.retryButtonText}
                />
              ) : null}
            </View>
          )}
          {heroShowOverlay && (
            <View style={styles.heroOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}

          {/* Previous/Next navigation arrows */}
          {hasPrevious && (
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                e?.preventDefault?.();
                console.log("[PhotoDetailScreen] Left arrow pressed");
                goToPrevious();
              }}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: [{ translateY: -20 }],
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <Icon name="AntDesign/left" size={20} color="#FFF" />
            </Pressable>
          )}
          {hasNext && (
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                e?.preventDefault?.();
                console.log("[PhotoDetailScreen] Right arrow pressed");
                goToNext();
              }}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: [{ translateY: -20 }],
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <Icon name="AntDesign/right" size={20} color="#FFF" />
            </Pressable>
          )}
        </Pressable>
      </View>
      <View style={styles.socialRow}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Pressable
            onPress={handleToggleHeart}
            style={[
              styles.heartButton,
              {
                backgroundColor: isLiked ? accentColor : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <Icon
              name={
                isLiked ? "MaterialCommunityIcons/heart" : "MaterialCommunityIcons/heart-outline"
              }
              color={isLiked ? "#fff" : accentColor}
              size={24}
            />
          </Pressable>
        </Animated.View>
        <Text style={styles.likeCountText}>
          {likeCount} {HEART_EMOJI}
        </Text>
        <View style={{ flex: 1 }} />
        <Touchable onPress={handleSharePhoto}>
          <Icon name="Feather/share-2" color={accentColor} size={20} />
        </Touchable>
      </View>
      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaPrimary}>{albumTitle ?? "Shared memory"}</Text>
          <Text style={styles.metaSecondary}>{babyName ? `for ${babyName}` : null}</Text>
          <Text style={styles.metaTimestamp}>{formatRelativeTime(asset?.created_at)}</Text>
        </View>

        <Pressable
          onPress={handleTogglePin}
          disabled={isTogglingPin}
          style={({ pressed }) => [
            styles.pinChip,
            isPinned ? styles.pinChipActive : styles.pinChipInactive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon
            name="MaterialIcons/push-pin"
            size={16}
            color={isPinned ? "#fff" : "rgba(0,0,0,0.7)"}
          />
          <Text
            style={[
              styles.pinChipText,
              isPinned ? styles.pinChipTextActive : styles.pinChipTextInactive,
            ]}
          >
            {isPinned ? "Pinned memory" : "Pin this memory"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCommentItem = React.useCallback(
    ({ item }) => {
      const comment = item?.comment;
      if (!comment) {
        return null;
      }
      const depth = item?.depth ?? 0;
      const isCurrentUser = Boolean(
        comment.created_by && currentUserId && comment.created_by === currentUserId,
      );
      const disabled = Boolean(comment.deleted_at);
      const replyLabel =
        depth > 0 && comment.parent_comment_id
          ? (combinedComments.find((entry) => entry?.comment_id === comment.parent_comment_id)
              ?.author_display_name ?? null)
          : null;
      return (
        <CommentCard
          comment={comment}
          depth={depth}
          disabled={disabled}
          replyLabel={replyLabel}
          isCurrentUser={isCurrentUser}
          onReply={() => {
            if (disabled) {
              return;
            }
            setReplyTarget({
              comment_id: comment.comment_id,
              author_display_name: comment.author_display_name ?? currentDisplayName,
            });
          }}
          onOpenMenu={isCurrentUser && !disabled ? () => setMenuComment(comment) : undefined}
        />
      );
    },
    [combinedComments, currentDisplayName, currentUserId],
  );

  const listEmptyComponent = (
    <View style={styles.emptyState}>
      <Icon name="Feather/message-circle" size={28} color="rgba(0,0,0,0.3)" />
      <Spacer top={12} />
      <Text style={styles.emptyStateText}>
        Write a little message for this moment. Hearts & notes live here.
      </Text>
    </View>
  );

  const handleLoadMore = () => {
    if (commentsQuery.hasNextPage && !commentsQuery.isFetchingNextPage) {
      commentsQuery.fetchNextPage();
    }
  };

  return (
    <ScreenContainer
      hasSafeArea={true}
      scrollable={false}
      style={[styles.container, { backgroundColor: pastelBackground, paddingTop: insets.top + 8 }]}
    >
      <View style={styles.headerRow}>
        <Touchable onPress={() => navigation.goBack()}>
          <Icon name="AntDesign/arrowleft" size={22} color="#1b1b1f" />
        </Touchable>
        <Text style={styles.headerTitle}>Hearts & Notes</Text>
        {mediaId ? (
          <Touchable onPress={() => setIsDeleteModalVisible(true)}>
            <Icon name="Feather/trash-2" size={20} color="#c62828" />
          </Touchable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      {!mediaId ? (
        <View style={styles.missingState}>
          <Text style={styles.missingText}>
            We couldn’t find that little memory. Try opening it again.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={renderableComments}
            keyExtractor={(item, index) =>
              item?.comment?.comment_id
                ? `${item.comment.comment_id}-${item.depth}`
                : `comment-${index}`
            }
            renderItem={renderCommentItem}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 120,
              gap: 16,
            }}
            ListHeaderComponent={listHeader}
            ListFooterComponent={
              commentsQuery.hasNextPage ? (
                <Touchable
                  disabled={commentsQuery.isFetchingNextPage}
                  onPress={handleLoadMore}
                  style={styles.loadMoreButton}
                >
                  {commentsQuery.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load older notes</Text>
                  )}
                </Touchable>
              ) : renderableComments.length ? (
                <Text style={styles.endOfListText}>That’s every note on this moment.</Text>
              ) : null
            }
            ListEmptyComponent={commentsQuery.isLoading ? null : listEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={commentsQuery.isRefetching || false}
                onRefresh={() => {
                  refetchAsset?.();
                  commentsQuery.refetch();
                }}
                tintColor={accentColor}
              />
            }
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          >
            {replyTarget && (
              <View style={styles.replyBanner}>
                <Text style={styles.replyBannerText}>
                  Replying to {replyTarget?.author_display_name ?? "a note"}
                </Text>
                <Touchable onPress={() => setReplyTarget(null)}>
                  <Icon name="AntDesign/close" size={16} color="#555" />
                </Touchable>
              </View>
            )}
            <View
              style={[
                styles.inputBar,
                {
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <TextInput
                ref={commentInputRef}
                value={commentValue}
                onChangeText={setCommentValue}
                placeholder={composerPlaceholder}
                placeholderTextColor="rgba(0,0,0,0.35)"
                multiline
                style={styles.textInput}
              />
              <Pressable
                onPress={handleSendComment}
                disabled={!commentValue.trim().length || isCreatingComment}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    opacity:
                      !commentValue.trim().length || isCreatingComment ? 0.4 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                {isCreatingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="MaterialIcons/send" size={20} color="#fff" />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      <Modal visible={Boolean(menuComment)} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuComment(null)}>
          <View style={styles.menuSheet}>
            <Pressable style={styles.menuItem} onPress={() => handleStartEdit(menuComment)}>
              <Icon name="Feather/edit-3" size={18} color="#1b1b1f" />
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuComment(null);
                confirmDeleteComment(menuComment);
              }}
            >
              <Icon name="Feather/trash-2" size={18} color="#c62828" />
              <Text style={[styles.menuItemText, { color: "#c62828" }]}>Delete</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, { justifyContent: "center" }]}
              onPress={() => setMenuComment(null)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Edit note</Text>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              style={styles.editModalInput}
              autoFocus
            />
            <View style={styles.editModalActions}>
              <Touchable
                onPress={() => {
                  setShowEditModal(false);
                  setEditingComment(null);
                  setEditDraft("");
                }}
              >
                <Text style={styles.editModalCancel}>Cancel</Text>
              </Touchable>
              <Touchable onPress={handleSaveEdit}>
                <Text style={styles.editModalSave}>Save</Text>
              </Touchable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isDeleteModalVisible} transparent animationType="none">
        <Animated.View style={[styles.menuOverlay, { opacity: deleteModalOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !isDeleting && setIsDeleteModalVisible(false)}
          />
          <Animated.View
            style={[
              styles.deleteSheet,
              {
                transform: [{ scale: deleteModalScale }],
                opacity: deleteModalOpacity,
              },
            ]}
          >
            <Text style={styles.deleteEmoji}>💫</Text>

            <Text style={styles.deleteTitle}>Remove this memory from the album?</Text>

            <Text style={styles.deleteBody}>
              This photo will disappear from this DearBaby album.{"\n"}
              The story behind it is still yours, and you can always add new memories when you're
              ready.
            </Text>

            <Touchable
              disabled={isDeleting}
              onPress={handleDeleteCurrentMedia}
              style={[styles.deletePrimaryButton, isDeleting && { opacity: 0.7 }]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deletePrimaryText}>Remove photo from album</Text>
              )}
            </Touchable>

            <Touchable
              disabled={isDeleting}
              onPress={() => setIsDeleteModalVisible(false)}
              style={styles.deleteSecondaryButton}
            >
              <Text style={styles.deleteSecondaryText}>Keep this memory</Text>
            </Touchable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </ScreenContainer>
  );
};

const CommentCard = ({
  comment,
  depth,
  replyLabel,
  disabled,
  isCurrentUser,
  onReply,
  onOpenMenu,
}) => {
  const initials = fallbackInitials(comment?.author_display_name);
  const timestamp = formatRelativeTime(comment?.created_at);
  return (
    <View
      style={[styles.commentCard, depth > 0 && { marginLeft: 32 }, disabled && { opacity: 0.7 }]}
    >
      <View style={styles.commentHeader}>
        <View style={styles.avatarWrapper}>
          {comment?.author_avatar_url ? (
            <ExpoImage
              source={{ uri: comment.author_avatar_url }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.commentAuthor}>{comment?.author_display_name ?? "Someone"}</Text>
          <Text style={styles.commentTimestamp}>{timestamp}</Text>
        </View>
        {isCurrentUser && onOpenMenu ? (
          <Touchable onPress={onOpenMenu}>
            <Icon name="Feather/more-horizontal" size={18} color="#707070" />
          </Touchable>
        ) : null}
      </View>
      <View style={styles.commentBody}>
        {replyLabel ? <Text style={styles.replyLabel}>Replying to {replyLabel}</Text> : null}
        <Text
          style={[
            styles.commentText,
            disabled && { fontStyle: "italic", color: "rgba(0,0,0,0.4)" },
          ]}
        >
          {comment?.body ?? ""}
        </Text>
        <View style={styles.commentBadges}>
          {comment?.is_pinned ? (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedBadgeText}>Pinned 🌟</Text>
            </View>
          ) : null}
        </View>
      </View>
      {!disabled && depth === 0 ? (
        <View style={styles.commentActions}>
          <Touchable onPress={onReply}>
            <Text style={styles.replyButtonText}>Reply</Text>
          </Touchable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#1b1b1f",
  },
  surface: {
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  photoWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    minHeight: 260,
  },
  heroImage: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  heroPlaceholder: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  heroPlaceholderText: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(0,0,0,0.6)",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 999,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 24,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heartButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  likeCountText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1b1b1f",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  metaPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b1f",
  },
  metaSecondary: {
    fontSize: 14,
    color: "rgba(0,0,0,0.55)",
  },
  metaTimestamp: {
    fontSize: 12,
    color: "rgba(0,0,0,0.45)",
  },
  pinChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  pinChipInactive: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  pinChipActive: {
    backgroundColor: "#ff6b81",
  },
  pinChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pinChipTextInactive: {
    color: "rgba(0,0,0,0.7)",
  },
  pinChipTextActive: {
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    textAlign: "center",
    color: "rgba(0,0,0,0.5)",
    fontSize: 15,
    lineHeight: 22,
  },
  loadMoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  loadMoreText: {
    fontWeight: "600",
    color: "#1b1b1f",
  },
  endOfListText: {
    textAlign: "center",
    color: "rgba(0,0,0,0.35)",
    marginTop: 16,
  },
  replyBanner: {
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyBannerText: {
    color: "#4a4a4a",
    fontSize: 13,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ff6b81",
    alignItems: "center",
    justifyContent: "center",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  menuSheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    color: "#1b1b1f",
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1b1b1f",
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  editModalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1b1b1f",
  },
  editModalInput: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  editModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
  },
  editModalCancel: {
    color: "rgba(0,0,0,0.6)",
    fontSize: 15,
  },
  editModalSave: {
    color: "#ff6b81",
    fontSize: 15,
    fontWeight: "600",
  },
  commentCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontWeight: "600",
    color: "#555",
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1b1b1f",
  },
  commentTimestamp: {
    fontSize: 12,
    color: "rgba(0,0,0,0.45)",
  },
  commentBody: {
    marginTop: 10,
    gap: 6,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1b1b1f",
  },
  commentBadges: {
    flexDirection: "row",
    gap: 8,
  },
  pinnedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 214, 115, 0.25)",
  },
  pinnedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b8860b",
  },
  commentActions: {
    marginTop: 6,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ff6b81",
  },
  replyLabel: {
    fontSize: 12,
    color: "rgba(0,0,0,0.5)",
  },
  missingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingText: {
    color: "rgba(0,0,0,0.6)",
    textAlign: "center",
    lineHeight: 22,
  },
  deleteSheet: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 32,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
    alignItems: "center",
  },
  deleteEmoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 8,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1b1b1f",
    textAlign: "center",
  },
  deleteBody: {
    fontSize: 14,
    color: "rgba(0,0,0,0.6)",
    lineHeight: 20,
    textAlign: "center",
  },
  deletePrimaryButton: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "#ff6b81",
    width: "100%",
    shadowColor: "#ff6b81",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  deletePrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteSecondaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  deleteSecondaryText: {
    fontSize: 15,
    color: "rgba(0,0,0,0.6)",
    fontWeight: "500",
  },
});

export default withTheme(PhotoDetailScreen);
