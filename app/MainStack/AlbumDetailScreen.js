import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TouchableWithoutFeedback,
  View,
  Vibration,
} from "react-native";
import {
  Button,
  ExpoImage,
  Icon,
  ScreenContainer,
  Spacer,
  Surface,
  TextField,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "react-query";
import * as GlobalStyles from "../../GlobalStyles.js";
import * as SupabaseDearBabyApi from "../../apis/SupabaseDearBabyApi.js";
import { useDeleteMediaPOST } from "../../apis/SupabaseDearBabyApi.js";
import useAlbum from "../../apis/useAlbum";
import useAlbumMediaQuery from "../../apis/useAlbumMediaQuery";
import useAlbumUpdateDetailedMemory from "../../apis/useAlbumUpdateDetailedMemory";
import useFinalizeUpload from "../../apis/useFinalizeUpload";
import useHeicToJpeg from "../../apis/useHeicToJpeg";
import useMintUpload from "../../apis/useMintUpload";
import useMintView from "../../apis/useMintView";
import useMediaPreview from "../../apis/useMediaPreview";
import { useToggleReaction, normalizeReactionState } from "../../apis/useMediaSocial";
import AlbumDescriptionEditor from "../../components/AlbumDescriptionEditor";
import useNavigation from "../../utils/useNavigation";
import useParams from "../../utils/useParams";
import useWindowDimensions from "../../utils/useWindowDimensions";
import * as StyleSheet from "../../utils/StyleSheet";
import openImagePickerUtil from "../../utils/openImagePicker";
import showToast from "../../utils/showToast";
import * as GlobalVariables from "../../config/GlobalVariableContext";
import put_to_signed_url_xplat from "../../global-functions/put_to_signed_url_xplat";
import { useRequireAuth } from "../../utils/useAuthState";
import { resolveStorageExpiresAt, resolveStorageUrl } from "../../utils/storageUrlHelpers";
import { formatDistanceToNow } from "../../utils/DateUtils";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const flattenPages = (data) => {
  if (!data?.pages?.length) {
    return [];
  }
  return data.pages.flatMap((page) => page?.items ?? []);
};

const PROGRESS_THROTTLE_MS = 120;
const STAGE_SEQUENCE = ["converting", "minting", "uploading", "finalizing"];
const STAGE_INFO = Object.freeze({
  queue: { label: "Waiting", percent: 0 },
  converting: { label: "Preparing photo", percent: 15 },
  minting: { label: "Minting upload URL", percent: 40 },
  uploading: { label: "Uploading photo (PUT)", percent: 75 },
  finalizing: { label: "Finalizing upload", percent: 90 },
  complete: { label: "Upload complete", percent: 100 },
  error: { label: "Needs retry", percent: 100 },
  cancelled: { label: "Cancelled", percent: 0 },
});
const PREVIEW_REFRESH_BUFFER_MS = 60 * 1000;
const MEDIA_REFRESH_THROTTLE_MS = 60 * 1000;
const MEDIA_PAGE_SIZE = 24;
const DETAILED_MEMORY_MAX_LEN = 16384;
const DETAILED_MEMORY_WARNING_THRESHOLD = Math.max(0, DETAILED_MEMORY_MAX_LEN - 256);
const PHOTO_PREP_ERROR_MESSAGE =
  "We couldn't prepare this photo. If you're uploading a HEIC image on web, please convert it to JPEG or PNG first, or use the mobile app.";

const resolveUploadUrl = (payload) =>
  payload?.uploadUrl ??
  payload?.upload_url ??
  payload?.signedUrl ??
  payload?.signed_url ??
  payload?.parUrl ??
  payload?.par_url ??
  payload?.putUrl ??
  payload?.put_url ??
  payload?.url ??
  payload?.data?.uploadUrl ??
  payload?.data?.upload_url ??
  payload?.data?.signedUrl ??
  payload?.data?.signed_url ??
  payload?.data?.parUrl ??
  payload?.data?.par_url ??
  payload?.data?.putUrl ??
  payload?.data?.put_url ??
  payload?.data?.url ??
  null;

const resolveObjectKey = (payload) =>
  payload?.objectKey ??
  payload?.object_key ??
  payload?.key ??
  payload?.data?.objectKey ??
  payload?.data?.object_key ??
  payload?.data?.key ??
  null;

const resolveMediaObjectKey = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }
  return (
    item.object_key ??
    item.storage_object_key ??
    item.media_object_key ??
    item.objectKey ??
    item.storageObjectKey ??
    item.key ??
    null
  );
};

const maskUrl = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= 90) {
    return value;
  }
  return `${value.slice(0, 60)}...${value.slice(-16)}`;
};

const sanitizeDisplayNameValue = (value, fallback) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && !trimmed.startsWith("data:image") && trimmed.length <= 256) {
      return trimmed;
    }
  }
  return fallback;
};

const buildShortLabel = (safeBase, fallbackName) => {
  const labelSource = safeBase || fallbackName || "photo";
  if (!labelSource) {
    return "photo";
  }
  return labelSource.length > 32 ? `${labelSource.slice(0, 28)}...` : labelSource;
};

const sanitizeAssetName = (asset, fallbackName) => {
  let rawName = asset?.fileName ?? asset?.filename ?? asset?.name ?? null;

  const uri = asset?.uri ?? "";

  if (!rawName) {
    if (typeof uri === "string" && (uri.startsWith("data:image") || uri.length > 256)) {
      rawName = fallbackName;
    } else if (uri) {
      try {
        const last = uri.split(/[\\/]/).pop();
        rawName = (last && last.length <= 256 ? last : null) || fallbackName;
      } catch {
        rawName = fallbackName;
      }
    } else {
      rawName = fallbackName;
    }
  }

  if (typeof rawName !== "string" || rawName.length > 256) {
    rawName = fallbackName;
  }

  const base = rawName.replace(/\.[^.]+$/, "") || fallbackName;
  const sanitizedBase = base.replace(/[^a-zA-Z0-9-_]+/g, "_");
  const safeBase = (sanitizedBase || fallbackName || "photo").slice(0, 80);

  return {
    rawName,
    safeFileName: `${safeBase || fallbackName}.jpg`,
    shortLabel: buildShortLabel(
      sanitizedBase ? sanitizedBase.slice(0, 80) : safeBase,
      (fallbackName || "photo").replace(/[^a-zA-Z0-9-_]+/g, "_"),
    ),
  };
};

const sanitizeErrorMessage = (message) => {
  if (typeof message !== "string") {
    return "Upload failed. Try again.";
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return "Upload failed. Try again.";
  }
  if (trimmed.startsWith("data:image")) {
    return "We couldn't prepare this photo. Please try again with a different image.";
  }
  if (trimmed.length > 160) {
    return "We couldn't prepare this photo. Please try again with a different image.";
  }
  return trimmed;
};

const extractErrorMessage = (error, fallbackMessage = "Upload failed. Try again.") => {
  if (!error) {
    return fallbackMessage;
  }
  if (typeof error === "string") {
    return error;
  }

  const payload = error?.payload;
  if (payload && typeof payload === "object") {
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  }

  const bodyText =
    typeof error?.body === "string" && error.body.trim()
      ? error.body.trim()
      : typeof error?.bodyText === "string" && error.bodyText.trim()
        ? error.bodyText.trim()
        : null;
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText);
      if (typeof parsed === "string" && parsed.trim()) {
        return parsed.trim();
      }
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.error === "string" && parsed.error.trim()) {
          return parsed.error.trim();
        }
        if (typeof parsed.message === "string" && parsed.message.trim()) {
          return parsed.message.trim();
        }
      }
    } catch (parseError) {
      console.warn("[AlbumDetailUpload] Failed to parse error body", {
        message: parseError?.message,
        body: bodyText,
      });
      return bodyText;
    }
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackMessage;
};

const parseExpiresAtToMs = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

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
  return null;
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
  return null;
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

const COVER_MEDIA_ID_CANDIDATES = Object.freeze([
  "cover_media_id",
  "cover_media_asset_id",
  "cover_media_asset_uuid",
  "cover_media_uuid",
  "album_cover_media_id",
]);

const COVER_MEDIA_OBJECT_KEY_CANDIDATES = Object.freeze([
  "cover_media_object_key",
  "cover_media_storage_key",
  "cover_media_storage_object_key",
  "cover_object_key",
  "cover_media_path",
]);

const normalizeColumnKey = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const uniqueNonEmpty = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }
  const filtered = values.filter((value) => typeof value === "string" && value.trim().length > 0);
  return [...new Set(filtered)];
};

const isCoverMediaIdColumnName = (value) => {
  const normalized = normalizeColumnKey(value);
  if (!normalized) {
    return false;
  }
  if (normalized === "cover_media_id") {
    return true;
  }
  if (normalized.endsWith("cover_media_id")) {
    return true;
  }
  return normalized.includes("cover") && normalized.endsWith("_id");
};

const isCoverMediaObjectKeyColumnName = (value) => {
  const normalized = normalizeColumnKey(value);
  if (!normalized) {
    return false;
  }
  if (normalized === "cover_media_object_key") {
    return true;
  }
  if (normalized.includes("cover") && normalized.includes("object") && normalized.includes("key")) {
    return true;
  }
  return normalized.includes("cover") && normalized.includes("key");
};

const deriveCoverFieldKeys = (record) => {
  if (!record || typeof record !== "object") {
    return {
      coverIdKey: null,
      coverObjectKey: null,
      coverIdCandidates: uniqueNonEmpty([...COVER_MEDIA_ID_CANDIDATES]),
      coverObjectKeyCandidates: uniqueNonEmpty([...COVER_MEDIA_OBJECT_KEY_CANDIDATES]),
    };
  }

  const keys = Object.keys(record);
  const lowerKeyMap = keys.reduce((acc, key) => {
    acc.set(normalizeColumnKey(key), key);
    return acc;
  }, new Map());

  const resolveFromCandidates = (candidates, predicate) => {
    for (const candidate of candidates) {
      const resolved = lowerKeyMap.get(normalizeColumnKey(candidate));
      if (resolved) {
        return resolved;
      }
    }
    return keys.find((key) => predicate(key)) ?? null;
  };

  const coverIdKey = resolveFromCandidates(COVER_MEDIA_ID_CANDIDATES, isCoverMediaIdColumnName);
  const coverObjectKey = resolveFromCandidates(
    COVER_MEDIA_OBJECT_KEY_CANDIDATES,
    isCoverMediaObjectKeyColumnName,
  );

  const extraCoverIdKeys = keys.filter((key) => isCoverMediaIdColumnName(key));
  const extraCoverObjectKeys = keys.filter((key) => isCoverMediaObjectKeyColumnName(key));

  const coverIdCandidates = uniqueNonEmpty([
    coverIdKey,
    ...extraCoverIdKeys,
    ...COVER_MEDIA_ID_CANDIDATES,
    "cover_media_id",
  ]);
  const coverObjectKeyCandidates = uniqueNonEmpty([
    coverObjectKey,
    ...extraCoverObjectKeys,
    ...COVER_MEDIA_OBJECT_KEY_CANDIDATES,
    "cover_media_object_key",
  ]);

  return { coverIdKey, coverObjectKey, coverIdCandidates, coverObjectKeyCandidates };
};

const buildCoverUpdatePayloads = ({
  mediaId,
  objectKey,
  coverIdCandidates,
  coverObjectKeyCandidates,
}) => {
  const idCandidates = uniqueNonEmpty(coverIdCandidates).slice(0, 5);
  const objectCandidates = uniqueNonEmpty(coverObjectKeyCandidates).slice(0, 5);
  const sanitizedObjectKey = objectKey ?? null;
  if (!idCandidates.length) {
    const fallbackPayload = { cover_media_id: mediaId };
    if (sanitizedObjectKey !== null) {
      fallbackPayload.cover_media_object_key = sanitizedObjectKey;
    }
    return [fallbackPayload];
  }

  const payloads = [];

  idCandidates.forEach((idKey) => {
    const base = { [idKey]: mediaId };
    payloads.push({ ...base });
    if (sanitizedObjectKey !== null && objectCandidates.length) {
      objectCandidates.forEach((objectKeyName) => {
        payloads.push({ ...base, [objectKeyName]: sanitizedObjectKey });
      });
    }
  });

  const defaultPayload = { cover_media_id: mediaId };
  if (sanitizedObjectKey !== null) {
    defaultPayload.cover_media_object_key = sanitizedObjectKey;
  }
  payloads.push(defaultPayload);

  const deduped = [];
  const seenSignatures = new Set();

  payloads.forEach((payload) => {
    const keys = Object.keys(payload).sort();
    const signature = keys.join("|");
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      deduped.push(payload);
    }
  });

  return deduped.slice(0, 6);
};

const parsePostgrestErrorMessage = (error) => {
  if (!error) {
    return "";
  }
  if (typeof error?.body === "string" && error.body.trim()) {
    try {
      const parsed = JSON.parse(error.body);
      if (parsed && typeof parsed.message === "string") {
        return parsed.message;
      }
      if (parsed && typeof parsed.error === "string") {
        return parsed.error;
      }
    } catch {
      return error.body;
    }
  }
  if (error?.payload && typeof error.payload === "object") {
    if (typeof error.payload.message === "string") {
      return error.payload.message;
    }
    if (typeof error.payload.error === "string") {
      return error.payload.error;
    }
  }
  if (typeof error?.message === "string") {
    return error.message;
  }
  return "";
};

const shouldRetryCoverUpdateWithNextPayload = (error) => {
  if (!error || error.status !== 400) {
    return false;
  }
  const message = parsePostgrestErrorMessage(error).toLowerCase();
  if (!message) {
    return false;
  }
  if (message.includes("cover_media_id") || message.includes("cover_media_object_key")) {
    return true;
  }
  return message.includes("cover") && message.includes("column");
};

const ensureDefaultCoverFields = (
  target,
  { coverIdKey, coverIdValue, coverObjectKey, coverObjectValue },
) => {
  if (!target || typeof target !== "object") {
    return target;
  }

  if (coverIdKey && coverIdValue !== undefined) {
    target[coverIdKey] = coverIdValue;
  }
  if (coverObjectKey && coverObjectValue !== undefined) {
    target[coverObjectKey] = coverObjectValue;
  }

  if (coverIdValue !== undefined && coverIdKey !== "cover_media_id") {
    target.cover_media_id = coverIdValue;
  }
  if (coverObjectValue !== undefined && coverObjectKey !== "cover_media_object_key") {
    target.cover_media_object_key = coverObjectValue;
  }

  return target;
};

const TILE_PLACEHOLDER_COLOR = "#0b0b0f";
const NOTES_OVERLAY_STYLES = Object.freeze({
  container: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  text: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

const MediaTile = React.memo(
  ({
    objectKey,
    onPress,
    onLongPress,
    onDeletePress,
    mediaItem,
    isMultiSelectMode,
    isSelected,
    onOpenDetail,
    onToggleHeart,
    onViewFullscreen,
  }) => {
    const { uri, loading, error, refetch } = useMediaPreview(objectKey);
    const [menuVisible, setMenuVisible] = React.useState(false);

    const showSpinner = loading && !uri;
    const hasError = !!error;

    // Extract reaction counts from media item
    const likeCount = React.useMemo(() => {
      if (!mediaItem) return 0;
      if (typeof mediaItem.like_count === "number") return mediaItem.like_count;
      if (mediaItem.reaction_summary?.heart_count) return mediaItem.reaction_summary.heart_count;
      if (mediaItem.reaction_summary?.["❤️"]) return mediaItem.reaction_summary["❤️"];
      return 0;
    }, [mediaItem]);

    const commentCount = React.useMemo(() => {
      if (!mediaItem) return 0;
      if (typeof mediaItem.comment_count === "number") return mediaItem.comment_count;
      if (typeof mediaItem.comments_count === "number") return mediaItem.comments_count;
      return 0;
    }, [mediaItem]);

    const isLiked = React.useMemo(() => {
      return Boolean(mediaItem?.viewer_has_liked);
    }, [mediaItem]);

    const handlePress = () => {
      if (hasError) {
        // retry loading the preview
        refetch?.();
        return;
      }
      onPress?.(uri);
    };

    const handleLongPress = () => {
      if (hasError) {
        return;
      }
      onLongPress?.();
    };

    const handleMenuPress = (e) => {
      e.stopPropagation();
      setMenuVisible(true);
    };

    const handleDeletePress = (e) => {
      e?.stopPropagation();
      setMenuVisible(false);
      onDeletePress?.(mediaItem);
    };

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={200}
        accessibilityRole="button"
        style={{
          flex: 1,
          aspectRatio: 1,
          margin: 2,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        {uri && !hasError && (
          <>
            <ExpoImage
              source={{ uri }}
              contentFit="cover"
              cachePolicy="disk"
              style={{ width: "100%", height: "100%" }}
            />

            {/* Selection overlay */}
            {isMultiSelectMode && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: isSelected ? "rgba(0,122,255,0.3)" : "transparent",
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: isSelected ? "#007AFF" : "transparent",
                  borderRadius: 16,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Pinned badge - visual only, show in top-left corner when pinned */}
            {!isMultiSelectMode && mediaItem?.is_pinned && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255,107,129,0.95)",
                }}
              >
                <Icon name="MaterialIcons/push-pin" size={14} color="#fff" />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  Pinned
                </Text>
              </View>
            )}

            {/* Selection indicator */}
            {isMultiSelectMode && isSelected && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "#007AFF",
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  pointerEvents: "none",
                }}
              >
                <Icon name="Feather/check" size={14} color="#FFFFFF" />
              </View>
            )}

            {/* 3-dot menu button - hide in multi-select mode */}
            {!isMultiSelectMode && (
              <Pressable
                onPress={handleMenuPress}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="Feather/more-vertical" size={14} color="#FFFFFF" />
              </Pressable>
            )}

            {/* Menu Modal */}
            {menuVisible && (
              <Modal
                transparent
                visible={menuVisible}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
              >
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => setMenuVisible(false)}
                >
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 8,
                      minWidth: 180,
                      boxShadow: "0px 8px 24px rgba(0,0,0,0.2)",
                    }}
                    onStartShouldSetResponder={() => true}
                  >
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation();
                        setMenuVisible(false);
                        onViewFullscreen?.(mediaItem);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: pressed ? "#F5F5F5" : "transparent",
                      })}
                    >
                      <Icon name="Feather/maximize" size={18} color="#424242" />
                      <Text
                        style={{
                          marginLeft: 12,
                          color: "#424242",
                          fontFamily: "Inter_500Medium",
                          fontSize: 15,
                        }}
                      >
                        View fullscreen
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDeletePress}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: pressed ? "#FFEBEE" : "transparent",
                      })}
                    >
                      <Icon name="Feather/trash-2" size={18} color="#E57373" />
                      <Text
                        style={{
                          marginLeft: 12,
                          color: "#E57373",
                          fontFamily: "Inter_500Medium",
                          fontSize: 15,
                        }}
                      >
                        Delete photo
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            )}

            {!isMultiSelectMode && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)",
                  backgroundColor: "rgba(0,0,0,0.35)",
                  pointerEvents: "box-none",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {/* Heart button */}
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation?.();
                      event.preventDefault?.();
                      onToggleHeart?.(mediaItem);
                    }}
                    hitSlop={8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      pointerEvents: "auto",
                    }}
                  >
                    <Icon
                      name={
                        isLiked
                          ? "MaterialCommunityIcons/heart"
                          : "MaterialCommunityIcons/heart-outline"
                      }
                      size={16}
                      color="#FFFFFF"
                    />
                    {likeCount > 0 && (
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 12,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        {likeCount}
                      </Text>
                    )}
                  </Pressable>

                  {/* Comment button */}
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation?.();
                      event.preventDefault?.();
                      if (onOpenDetail) {
                        onOpenDetail(uri, "comment");
                      }
                    }}
                    hitSlop={8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      pointerEvents: "auto",
                    }}
                  >
                    <Icon name="Feather/message-circle" size={16} color="#FFFFFF" />
                    {commentCount > 0 && (
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 12,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        {commentCount}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        {showSpinner && (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <ActivityIndicator color="rgba(255,255,255,0.9)" />
          </View>
        )}

        {hasError && (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(8,8,12,0.76)",
              alignItems: "center",
              pointerEvents: "none",
              justifyContent: "center",
              paddingHorizontal: 10,
            }}
          >
            <Icon name="Feather/alert-triangle" size={22} color="#FFFFFF" />
            <Text
              style={{
                marginTop: 6,
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Tap to retry
            </Text>
          </View>
        )}
      </Pressable>
    );
  },
);

MediaTile.displayName = "MediaTile";

const getInitials = (displayName = "") => {
  if (!displayName) {
    return "BB";
  }
  const parts = displayName.trim().split(/\s+/);
  if (!parts.length) {
    return displayName.slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const FullscreenViewer = ({
  visible,
  media,
  previewUri,
  onClose,
  onShare,
  onSetCover,
  onDelete,
  onToggleHeart,
  onOpenPhotoDetail,
}) => {
  const [overlayVisible, setOverlayVisible] = React.useState(true);

  const handleTap = React.useCallback(() => {
    setOverlayVisible((prev) => !prev);
  }, []);

  return (
    <Pressable
      onPress={handleTap}
      style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" }}
    >
      {/* Close button - always visible */}
      <Pressable
        style={{
          position: "absolute",
          top: 60,
          right: 24,
          zIndex: 100,
          padding: 8,
        }}
        onPress={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
      >
        <Icon name="AntDesign/close" size={28} color="#FFF" />
      </Pressable>

      {/* Photo */}
      {media ? (
        previewUri ? (
          <ExpoImage
            source={{ uri: previewUri }}
            style={{ width: "90%", height: "60%", alignSelf: "center" }}
            contentFit="contain"
          />
        ) : (
          <View
            style={{
              width: "90%",
              height: "60%",
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )
      ) : null}

      {/* Overlay with social buttons */}
      {overlayVisible && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: 48,
            paddingTop: 24,
            paddingHorizontal: 24,
            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
            backgroundColor: "rgba(0,0,0,0.7)",
          }}
        >
          {/* Big action buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginBottom: 24,
            }}
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleHeart?.(media);
              }}
              style={{ alignItems: "center", padding: 12 }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Icon name="MaterialCommunityIcons/heart" size={28} color="#FF6B81" />
              </View>
              <Text style={{ color: "#FFF", fontSize: 13, fontFamily: "Inter_500Medium" }}>
                Like
              </Text>
            </Pressable>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onOpenPhotoDetail?.();
              }}
              style={{ alignItems: "center", padding: 12 }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Icon name="Feather/message-circle" size={26} color="#FFF" />
              </View>
              <Text style={{ color: "#FFF", fontSize: 13, fontFamily: "Inter_500Medium" }}>
                Comment
              </Text>
            </Pressable>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onShare?.();
              }}
              style={{ alignItems: "center", padding: 12 }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Icon name="Feather/share-2" size={24} color="#FFF" />
              </View>
              <Text style={{ color: "#FFF", fontSize: 13, fontFamily: "Inter_500Medium" }}>
                Share
              </Text>
            </Pressable>
          </View>

          {/* "Open Hearts & Notes" button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onOpenPhotoDetail?.();
            }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "rgba(255,107,129,0.9)" : "#FF6B81",
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 16,
            })}
          >
            <Icon name="MaterialCommunityIcons/heart-outline" size={20} color="#FFF" />
            <Text
              style={{
                color: "#FFF",
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                marginLeft: 10,
              }}
            >
              Open Hearts & Notes
            </Text>
            <Icon name="AntDesign/arrowright" size={18} color="#FFF" style={{ marginLeft: 8 }} />
          </Pressable>

          {/* Secondary actions */}
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onSetCover?.();
              }}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Icon name="MaterialIcons/star-outline" size={22} color="rgba(255,255,255,0.8)" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12,
                  marginTop: 4,
                  fontFamily: "Inter_500Medium",
                }}
              >
                Set Cover
              </Text>
            </Pressable>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Icon name="Feather/trash-2" size={20} color="rgba(255,107,129,0.9)" />
              <Text
                style={{
                  color: "rgba(255,107,129,0.9)",
                  fontSize: 12,
                  marginTop: 4,
                  fontFamily: "Inter_500Medium",
                }}
              >
                Delete
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
};

const AlbumDetailScreen = ({ route, theme }) => {
  const navigation = useNavigation();
  const dimensions = useWindowDimensions();
  useRequireAuth();
  const Constants = GlobalVariables.useValues();
  const params = useParams();
  const routeParams = React.useMemo(() => route?.params ?? {}, [route?.params]);

  console.log("AlbumDetailScreen route.params = ", routeParams);

  const supabaseUrl = React.useMemo(() => {
    if (typeof Constants?.SUPABASE_URL === "string") {
      return Constants.SUPABASE_URL.trim();
    }
    return "";
  }, [Constants?.SUPABASE_URL]);

  const supabaseAuthorization = React.useMemo(() => {
    const header =
      typeof Constants?.AUTHORIZATION_HEADER === "string"
        ? Constants.AUTHORIZATION_HEADER.trim()
        : "";
    if (header) {
      return header.toLowerCase().startsWith("bearer ") ? header : `Bearer ${header}`;
    }
    const token = typeof Constants?.auth_token === "string" ? Constants.auth_token.trim() : "";
    if (token) {
      return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
    }
    return "";
  }, [Constants?.AUTHORIZATION_HEADER, Constants?.auth_token]);

  const supabaseApiKey = React.useMemo(() => {
    const anonKey =
      typeof Constants?.SUPABASE_ANON_KEY === "string" ? Constants.SUPABASE_ANON_KEY.trim() : "";
    if (anonKey) {
      return anonKey;
    }
    const apiKey = typeof Constants?.apiKey === "string" ? Constants.apiKey.trim() : "";
    return apiKey ?? "";
  }, [Constants?.SUPABASE_ANON_KEY, Constants?.apiKey]);

  const supabaseCredentialsReady = React.useMemo(
    () => Boolean(supabaseUrl && supabaseAuthorization && supabaseApiKey),
    [supabaseApiKey, supabaseAuthorization, supabaseUrl],
  );

  const albumId =
    routeParams?.albumId || routeParams?.album_id || params?.albumId || params?.album_id || null;
  console.log("ALBUM DETAIL → albumId param = ", albumId);
  const babyId =
    routeParams?.babyId || routeParams?.baby_id || params?.babyId || params?.baby_id || null;
  const initialAlbumTitle =
    routeParams?.albumTitle || routeParams?.title || params?.albumTitle || params?.title || null;
  const initialBabyName =
    routeParams?.babyName ||
    params?.babyName ||
    routeParams?.baby_name ||
    params?.baby_name ||
    null;

  const [bannerMessage, setBannerMessage] = React.useState(null);
  const [bannerError, setBannerError] = React.useState(null);
  const [renameVisible, setRenameVisible] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [selectedMedia, setSelectedMedia] = React.useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [mediaToDelete, setMediaToDelete] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = React.useState(new Set());
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = React.useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [isBulkDeleteIntent, setIsBulkDeleteIntent] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState({
    total: 0,
    completed: 0,
    currentFile: null,
    percent: 0,
    stage: null,
    stageLabel: null,
  });
  const [progressItems, setProgressItems] = React.useState([]);
  const [retryQueue, setRetryQueue] = React.useState([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = React.useState(false);
  const [babyAvatarUrl, setBabyAvatarUrl] = React.useState(null);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [detailedMemory, setDetailedMemory] = React.useState("");

  const babyQueryArgs = React.useMemo(() => {
    if (!babyId) {
      return null;
    }
    return {
      baby_id: babyId,
      select: "baby_id,name,avatar_object_key",
      limit: 1,
    };
  }, [babyId]);

  const babyQuery = SupabaseDearBabyApi.useGetBabyGET(babyQueryArgs ?? {}, {
    enabled: Boolean(babyId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const babyRecord = React.useMemo(() => {
    const raw = babyQuery.data?.json;
    if (Array.isArray(raw) && raw.length) {
      return raw[0];
    }
    return raw ?? null;
  }, [babyQuery.data]);

  const { mutateAsync: mintUploadAsync } = useMintUpload();
  const { mutateAsync: finalizeUploadAsync } = useFinalizeUpload();
  const { mutateAsync: saveDetailedMemory, isLoading: savingDetailedMemory } =
    useAlbumUpdateDetailedMemory();
  const { convertAsync: convertToJpegAsync } = useHeicToJpeg();
  const { mutateAsync: deleteMediaAsync } = useDeleteMediaPOST();
  const { mutateAsync: toggleReactionAsync } = useToggleReaction();

  const flatListRef = React.useRef(null);
  const [lastSavedAt, setLastSavedAt] = React.useState(null);

  const abortControllerRef = React.useRef(null);
  const progressItemsRef = React.useRef([]);
  const uploadStatusRef = React.useRef(uploadStatus);
  const statusUpdateTimeoutRef = React.useRef(null);
  const pendingStatusRef = React.useRef(null);
  const isMountedRef = React.useRef(true);
  const babyAvatarKeyRef = React.useRef(null);
  const babyAvatarPreviewRef = React.useRef(null);
  const manualRefreshingRef = React.useRef(false);

  const albumQuery = useAlbum(albumId);
  const queryClient = useQueryClient();
  const album = albumQuery.data ?? null;
  const albumRecord = album ?? null;
  const albumRefetch = albumQuery?.refetch;

  const coverFieldMetadata = React.useMemo(() => deriveCoverFieldKeys(albumRecord), [albumRecord]);
  const {
    coverIdKey: albumCoverIdKey,
    coverObjectKey: albumCoverObjectKey,
    coverIdCandidates,
    coverObjectKeyCandidates,
  } = coverFieldMetadata;

  console.log("AlbumDetailScreen album = ", album);

  React.useEffect(() => {
    if (album && typeof album.detailed_memory_md === "string") {
      setDetailedMemory(album.detailed_memory_md);
    } else if (album && album.detailed_memory_md == null) {
      setDetailedMemory("");
    }
  }, [album?.detailed_memory_md]);

  const albumDetailedMemory =
    typeof album?.detailed_memory_md === "string" ? album.detailed_memory_md : "";
  const displayedDetailedMemory = albumDetailedMemory.trim();
  const hasDetailedMemory = displayedDetailedMemory.length > 0;
  const isDetailedMemoryDirty = detailedMemory !== albumDetailedMemory;

  React.useEffect(() => {
    if (!albumRecord?.updated_at) {
      return;
    }
    const serverTimestamp = new Date(albumRecord.updated_at).getTime();
    if (!Number.isFinite(serverTimestamp)) {
      return;
    }
    setLastSavedAt((current) => {
      if (!current || serverTimestamp > current + 100) {
        return serverTimestamp;
      }
      return current;
    });
  }, [albumRecord?.updated_at]);

  const mediaQuery = useAlbumMediaQuery({ albumId, babyId, pageSize: MEDIA_PAGE_SIZE });
  const mediaQueryEnabled = React.useMemo(
    () => Boolean(albumId && babyId && supabaseCredentialsReady),
    [albumId, babyId, supabaseCredentialsReady],
  );
  const mediaItemsRaw = React.useMemo(() => flattenPages(mediaQuery.data), [mediaQuery.data]);
  const mediaItems = React.useMemo(
    () => mediaItemsRaw.filter((item) => !optimisticDeletedIds.has(item?.media_id)),
    [mediaItemsRaw, optimisticDeletedIds],
  );

  const mediaSequence = React.useMemo(() => {
    if (!mediaItems || mediaItems.length === 0) {
      return [];
    }
    const sequence = mediaItems.map((item) => ({
      media_id: item.media_id,
      object_key: item.object_key ?? item?.objectKey ?? null,
      preview_url: item?.preview_url ?? item?.signed_preview_url ?? null,
      title: albumRecord?.title ?? initialAlbumTitle ?? null,
      baby_name: babyRecord?.name ?? initialBabyName ?? null,
    }));
    console.log("[AlbumDetailScreen] Built mediaSequence:", {
      length: sequence.length,
      firstThreeIds: sequence.slice(0, 3).map((m) => m.media_id),
    });
    return sequence;
  }, [mediaItems, albumRecord?.title, initialAlbumTitle, babyRecord?.name, initialBabyName]);

  const refetchAlbumMedia = mediaQuery?.refetch;

  const { mutateAsync: mintViewAsync } = useMintView();
  const babyAvatarKey = babyRecord?.avatar_object_key ?? null;

  React.useEffect(() => {
    const objectKey = babyAvatarKey;
    if (!objectKey || !mintViewAsync) {
      babyAvatarKeyRef.current = null;
      babyAvatarPreviewRef.current = null;
      setBabyAvatarUrl((current) => (current === null ? current : null));
      return undefined;
    }

    const cachedPreview = babyAvatarPreviewRef.current;
    if (cachedPreview && cachedPreview.key === objectKey && cachedPreview.url) {
      babyAvatarKeyRef.current = objectKey;
      const cachedUrl = cachedPreview.url ?? null;
      setBabyAvatarUrl((current) => (current === cachedUrl ? current : cachedUrl));
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await mintViewAsync({ objectKey });
        if (cancelled) {
          return;
        }
        const previewUrl = resolveStorageUrl(response);
        babyAvatarPreviewRef.current = { key: objectKey, url: previewUrl };
        babyAvatarKeyRef.current = objectKey;
        setBabyAvatarUrl((current) => (current === previewUrl ? current : previewUrl));
      } catch (error) {
        console.error("Failed to mint baby avatar", {
          objectKey,
          message: error?.message,
          status: error?.status,
        });
        if (!cancelled) {
          babyAvatarPreviewRef.current = {
            key: objectKey,
            url: null,
            error: extractErrorMessage(error, "We couldn't load this avatar."),
          };
          setBabyAvatarUrl((current) => (current === null ? current : null));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [babyAvatarKey, mintViewAsync]);

  React.useEffect(() => {
    progressItemsRef.current = progressItems;
  }, [progressItems]);

  React.useEffect(() => {
    uploadStatusRef.current = uploadStatus;
  }, [uploadStatus]);

  React.useEffect(() => {
    if (!bannerMessage && !bannerError) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setBannerMessage(null);
      setBannerError(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [bannerError, bannerMessage]);

  const refreshAlbum = React.useCallback(async () => {
    if (manualRefreshingRef.current) {
      return;
    }
    const refetchPromises = [];
    if (albumQuery.refetch) {
      refetchPromises.push(albumQuery.refetch());
    }
    if (mediaQueryEnabled && mediaQuery.refetch) {
      refetchPromises.push(mediaQuery.refetch());
    }
    if (!refetchPromises.length) {
      return;
    }
    manualRefreshingRef.current = true;
    setManualRefreshing(true);
    try {
      await Promise.allSettled(refetchPromises);
    } finally {
      manualRefreshingRef.current = false;
      if (isMountedRef.current) {
        setManualRefreshing(false);
      }
    }
  }, [albumQuery.refetch, mediaQuery.refetch, mediaQueryEnabled]);

  useFocusEffect(
    React.useCallback(() => {
      if (albumId && supabaseCredentialsReady) {
        refreshAlbum();
      }
      return undefined;
    }, [albumId, refreshAlbum, supabaseCredentialsReady]),
  );

  const handleOpenDetailedMemoryEditor = React.useCallback(() => {
    if (!albumId) {
      return;
    }
    setDetailedMemory(albumDetailedMemory);
    setEditorOpen(true);
  }, [albumDetailedMemory, albumId]);

  const handleOpenDetailedMemory = React.useCallback(() => {
    if (!hasDetailedMemory) {
      handleOpenDetailedMemoryEditor();
      return;
    }

    Alert.alert("Detailed Memory", displayedDetailedMemory, [
      { text: "Close", style: "cancel" },
      {
        text: "Edit",
        onPress: handleOpenDetailedMemoryEditor,
      },
    ]);
  }, [displayedDetailedMemory, handleOpenDetailedMemoryEditor, hasDetailedMemory]);

  const handleCloseDetailedMemoryEditor = React.useCallback(() => {
    setEditorOpen(false);
    setDetailedMemory(albumDetailedMemory);
  }, [albumDetailedMemory]);

  const handleDetailedMemoryChange = React.useCallback((text) => {
    if (typeof text !== "string") {
      setDetailedMemory("");
      return;
    }
    if (text.length > DETAILED_MEMORY_MAX_LEN) {
      setDetailedMemory(text.slice(0, DETAILED_MEMORY_MAX_LEN));
      return;
    }
    setDetailedMemory(text);
  }, []);

  const handleSaveDetailedMemory = React.useCallback(async () => {
    if (!albumId || savingDetailedMemory) {
      return;
    }
    if (!supabaseCredentialsReady) {
      showToast("Still connecting to the server. Try again in a moment.");
      return;
    }
    const nextValue =
      typeof detailedMemory === "string" ? detailedMemory.slice(0, DETAILED_MEMORY_MAX_LEN) : "";
    try {
      await saveDetailedMemory({
        album_id: albumId,
        detailed_memory_md: nextValue,
      });
      setDetailedMemory(nextValue);
      setLastSavedAt(Date.now());
      setBannerError(null);
      setBannerMessage("Memory saved");
      setEditorOpen(false);
      showToast("Memory saved");
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate?.(8);
        }
      } else if (typeof Vibration?.vibrate === "function") {
        Vibration.vibrate(10);
      }
    } catch (error) {
      console.warn("Failed to save detailed memory", error);
      setBannerMessage(null);
      const message = "We couldn't save this memory. Please try again.";
      setBannerError(message);
      showToast(message);
    }
  }, [
    albumId,
    detailedMemory,
    saveDetailedMemory,
    savingDetailedMemory,
    setBannerError,
    setBannerMessage,
    supabaseCredentialsReady,
  ]);

  const stageInfo = React.useCallback((stage) => STAGE_INFO[stage] ?? STAGE_INFO.queue, []);

  const flushUploadStatus = React.useCallback(() => {
    if (!pendingStatusRef.current) {
      statusUpdateTimeoutRef.current = null;
      return;
    }
    setUploadStatus((prev) => {
      const next = { ...prev, ...pendingStatusRef.current };
      uploadStatusRef.current = next;
      return next;
    });
    pendingStatusRef.current = null;
    statusUpdateTimeoutRef.current = null;
  }, []);

  const updateUploadStatus = React.useCallback(
    (patch, { force = false } = {}) => {
      pendingStatusRef.current = {
        ...(pendingStatusRef.current ?? {}),
        ...patch,
      };
      if (force) {
        if (statusUpdateTimeoutRef.current) {
          clearTimeout(statusUpdateTimeoutRef.current);
          statusUpdateTimeoutRef.current = null;
        }
        flushUploadStatus();
        return;
      }
      if (!statusUpdateTimeoutRef.current) {
        statusUpdateTimeoutRef.current = setTimeout(flushUploadStatus, PROGRESS_THROTTLE_MS);
      }
    },
    [flushUploadStatus],
  );

  const initialiseProgress = React.useCallback(
    (tasks) => {
      setProgressItems(
        tasks.map((task) => {
          const info = stageInfo(task.nextStage ?? "queue");
          const label = task.displayLabel ?? task.displayName ?? task.fileName ?? "Photo";
          return {
            id: task.id,
            name: label,
            displayLabel: label,
            stage: task.nextStage ?? "queue",
            stageLabel: info.label,
            percent: info.percent,
            error: null,
          };
        }),
      );
      updateUploadStatus(
        {
          total: tasks.length,
          completed: 0,
          currentFile: tasks.length
            ? (tasks[0].displayLabel ?? tasks[0].displayName ?? tasks[0].fileName)
            : null,
          percent: tasks.length ? STAGE_INFO.queue.percent : 0,
          stage: tasks.length ? "queue" : null,
          stageLabel: tasks.length ? STAGE_INFO.queue.label : null,
        },
        { force: true },
      );
    },
    [stageInfo, updateUploadStatus],
  );

  const updateProgressItem = React.useCallback((taskId, patch) => {
    setProgressItems((prev) =>
      prev.map((item) => (item.id === taskId ? { ...item, ...patch } : item)),
    );
  }, []);

  const updateTaskStage = React.useCallback(
    (taskId, stage, extras = {}) => {
      const info = stageInfo(stage);
      updateProgressItem(taskId, {
        stage,
        stageLabel: info.label,
        percent: info.percent,
        ...extras,
      });
    },
    [stageInfo, updateProgressItem],
  );

  const determineResumeStage = React.useCallback((stage) => {
    switch (stage) {
      case "finalizing":
        return "finalizing";
      case "uploading":
      case "minting":
        return "minting";
      default:
        return "converting";
    }
  }, []);

  const startUploadFlow = React.useCallback(
    async (items) => {
      if (!albumId || !babyId || !items?.length) {
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isMountedRef.current = true;

      const timestamp = Date.now();
      const tasks = items.map((entry, index) => {
        const asset = entry?.asset ?? entry;
        const resumeStage = entry?.resumeStage ?? "converting";
        const id =
          entry?.id ?? asset?.assetId ?? asset?.id ?? asset?.uri ?? `${timestamp}-${index}`;
        const fallbackName = `photo-${timestamp}-${index + 1}`;
        const assetNameMeta = sanitizeAssetName(asset, fallbackName);
        const overrideNameMeta = entry?.fileName
          ? sanitizeAssetName({ fileName: entry.fileName }, fallbackName)
          : null;
        const rawName = assetNameMeta.rawName;
        const safeFileName = overrideNameMeta?.safeFileName ?? assetNameMeta.safeFileName;
        const shortLabel =
          typeof entry?.displayLabel === "string" && entry.displayLabel.length <= 64
            ? entry.displayLabel
            : (overrideNameMeta?.shortLabel ?? assetNameMeta.shortLabel);
        const displayName = sanitizeDisplayNameValue(entry?.displayName, rawName);
        return {
          id,
          asset,
          fileName: safeFileName,
          displayName,
          displayLabel:
            shortLabel || buildShortLabel(safeFileName.replace(/\.[^.]+$/, ""), fallbackName),
          fallbackName,
          nextStage: resumeStage,
          prepared: entry?.prepared ?? null,
          mintedData: entry?.mintedData ?? null,
          bytes: entry?.bytes ?? entry?.prepared?.bytes ?? null,
          width: entry?.width ?? entry?.prepared?.width ?? asset?.width ?? null,
          height: entry?.height ?? entry?.prepared?.height ?? asset?.height ?? null,
          exif: entry?.exif ?? asset?.exif ?? null,
        };
      });

      initialiseProgress(tasks);
      setBannerMessage(null);
      setBannerError(null);
      setRetryQueue([]);
      setIsUploading(true);

      const failures = [];
      let completed = 0;

      const ensureActive = () => {
        if (controller.signal.aborted || !isMountedRef.current) {
          throw new DOMException("Aborted", "AbortError");
        }
      };

      try {
        for (let index = 0; index < tasks.length; index += 1) {
          const task = tasks[index];
          if (controller.signal.aborted) {
            break;
          }

          let currentStage = task.nextStage ?? "converting";

          try {
            let startIdx = STAGE_SEQUENCE.indexOf(task.nextStage ?? "converting");
            if (startIdx < 0) {
              startIdx = 0;
            }

            for (let stageIdx = startIdx; stageIdx < STAGE_SEQUENCE.length; stageIdx += 1) {
              const stage = STAGE_SEQUENCE[stageIdx];
              currentStage = stage;
              ensureActive();

              const stagePercent = STAGE_INFO[stage]?.percent ?? 0;
              const overallPercent = tasks.length
                ? Math.min(100, Math.round(((completed + stagePercent / 100) / tasks.length) * 100))
                : stagePercent;

              switch (stage) {
                case "converting": {
                  updateTaskStage(task.id, "converting", { error: null });
                  const statusLabel = task.displayLabel ?? task.displayName ?? task.fileName;
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: statusLabel,
                    stage: "converting",
                    stageLabel: STAGE_INFO.converting.label,
                    percent: overallPercent,
                  });

                  // Only use convertToJpegAsync - it handles HEIC to JPG conversion properly
                  if (!task.prepared) {
                    try {
                      task.prepared = await convertToJpegAsync(task.asset, {
                        index,
                        quality: 0.9,
                        maxDimension: 4096,
                      });
                      console.log("[AlbumDetailUpload] Conversion success", {
                        fileName: task.fileName,
                        preparedUri: task.prepared?.uri,
                        bytes: task.prepared?.bytes,
                        width: task.prepared?.width,
                        height: task.prepared?.height,
                      });
                    } catch (conversionError) {
                      console.error("[AlbumDetailUpload] HEIC conversion failed", {
                        fileName: task.fileName,
                        errorMessage: conversionError?.message || String(conversionError),
                        errorName: conversionError?.name,
                        errorCode: conversionError?.code,
                        sourceUri: conversionError?.sourceUri,
                        isHeic: conversionError?.isHeic,
                        platform: conversionError?.platform,
                        errorString: String(conversionError),
                        stack: conversionError?.stack,
                      });

                      // Show user-friendly alert with specific message for HEIC on web
                      const alertMessage =
                        conversionError?.isHeic && Platform.OS === "web"
                          ? "HEIC images are not supported in web browsers. Please convert your image to JPEG or PNG format first, or use the mobile app to upload HEIC images."
                          : PHOTO_PREP_ERROR_MESSAGE;
                      Alert.alert("Upload issue", alertMessage);

                      // Create a new error with better context for upstream handling
                      const enhancedError = new Error(
                        conversionError?.message || "Image conversion failed",
                      );
                      enhancedError.originalError = conversionError;
                      enhancedError.fileName = task.fileName;
                      enhancedError.stage = "converting";
                      enhancedError.isHeic = conversionError?.isHeic;
                      enhancedError.platform = conversionError?.platform;
                      throw enhancedError;
                    }
                  }

                  if (!task.prepared?.bytes) {
                    throw new Error("Prepared image missing bytes.");
                  }
                  if (!task.prepared?.uri) {
                    throw new Error("Prepared image missing URI.");
                  }

                  task.bytes = task.prepared.bytes;
                  task.width = task.prepared?.width ?? task.asset?.width ?? null;
                  task.height = task.prepared?.height ?? task.asset?.height ?? null;

                  // Update task with converted asset info
                  task.asset = {
                    ...task.asset,
                    uri: task.prepared.uri,
                    mimeType: "image/jpeg",
                    width: task.width,
                    height: task.height,
                  };

                  if (task.prepared?.fileName) {
                    const preparedMeta = sanitizeAssetName(
                      { fileName: task.prepared.fileName },
                      task.fallbackName,
                    );
                    if (preparedMeta.safeFileName && preparedMeta.safeFileName !== task.fileName) {
                      task.fileName = preparedMeta.safeFileName;
                    }
                    const nextLabel = preparedMeta.shortLabel || task.displayLabel;
                    if (nextLabel && nextLabel !== task.displayLabel) {
                      task.displayLabel = nextLabel;
                      updateProgressItem(task.id, { name: nextLabel, displayLabel: nextLabel });
                    }
                  }
                  break;
                }
                case "minting": {
                  updateTaskStage(task.id, "minting", { error: null });
                  const statusLabel = task.displayLabel ?? task.displayName ?? task.fileName;
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: statusLabel,
                    stage: "minting",
                    stageLabel: STAGE_INFO.minting.label,
                    percent: overallPercent,
                  });
                  if (!task.bytes) {
                    throw new Error("File size missing for mint.");
                  }
                  console.log("[AlbumDetailUpload] Mint starting", {
                    albumId,
                    babyId,
                    fileName: task.fileName,
                    bytes: task.bytes,
                  });
                  task.mintedData = await mintUploadAsync(
                    {
                      target: "media",
                      babyId,
                      albumId,
                      mimeType: "image/jpeg",
                      bytes: task.bytes,
                      filename: task.fileName,
                    },
                    { signal: controller.signal },
                  );
                  console.log("[AlbumDetailUpload] Mint success", {
                    albumId,
                    babyId,
                    fileName: task.fileName,
                    objectKey: resolveObjectKey(task.mintedData),
                    uploadUrl: maskUrl(resolveUploadUrl(task.mintedData)),
                  });
                  break;
                }
                case "uploading": {
                  updateTaskStage(task.id, "uploading", { error: null });
                  const statusLabel = task.displayLabel ?? task.displayName ?? task.fileName;
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: statusLabel,
                    stage: "uploading",
                    stageLabel: STAGE_INFO.uploading.label,
                    percent: overallPercent,
                  });
                  const uploadUrl = resolveUploadUrl(task.mintedData);
                  if (!uploadUrl) {
                    throw new Error("Upload URL missing.");
                  }
                  console.log("[AlbumDetailUpload] PUT starting", {
                    albumId,
                    babyId,
                    fileName: task.fileName,
                    objectKey: resolveObjectKey(task.mintedData),
                    uploadUrl: maskUrl(uploadUrl),
                  });
                  await put_to_signed_url_xplat(uploadUrl, task.prepared.uri);
                  console.log("[AlbumDetailUpload] PUT upload complete", {
                    albumId,
                    objectKey: resolveObjectKey(task.mintedData),
                  });
                  ensureActive();
                  break;
                }
                case "finalizing": {
                  updateTaskStage(task.id, "finalizing", { error: null });
                  const statusLabel = task.displayLabel ?? task.displayName ?? task.fileName;
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: statusLabel,
                    stage: "finalizing",
                    stageLabel: STAGE_INFO.finalizing.label,
                    percent: overallPercent,
                  });
                  const objectKey = resolveObjectKey(task.mintedData);
                  if (!objectKey) {
                    throw new Error("Object key missing.");
                  }
                  console.log("[AlbumDetailUpload] Finalize starting", {
                    albumId,
                    babyId,
                    fileName: task.fileName,
                    objectKey,
                  });
                  const finalizeResponse = await finalizeUploadAsync(
                    {
                      babyId,
                      albumId,
                      objectKey,
                      originalFilename: task.fileName,
                      mimeType: "image/jpeg",
                      bytes: task.bytes,
                      width: task.width ?? null,
                      height: task.height ?? null,
                      exif: null,
                    },
                    { signal: controller.signal },
                  );
                  console.log("[AlbumDetailUpload] Finalize success", {
                    albumId,
                    objectKey,
                    finalizeResponse,
                  });

                  // Wait for database to commit the changes
                  await sleep(300);

                  // Invalidate and refetch album media to ensure new uploads appear
                  try {
                    // Invalidate ALL queries that might contain album or media data
                    queryClient.invalidateQueries({
                      predicate: (query) => {
                        const key = query.queryKey;
                        if (!Array.isArray(key)) return false;
                        // Invalidate album-media queries
                        if (key[0] === "album-media") return true;
                        // Also invalidate Get current users queries that might contain media/album data
                        if (key[0] === "Get current users") return true;
                        return false;
                      },
                    });

                    // Refetch with retries to ensure we get the latest data
                    let refetchSuccess = false;
                    for (let retryCount = 0; retryCount < 3; retryCount++) {
                      try {
                        await refetchAlbumMedia?.();
                        refetchSuccess = true;
                        console.log("[AlbumDetailUpload] Album media refetched successfully", {
                          objectKey,
                          retryCount,
                        });
                        break;
                      } catch (retryError) {
                        console.warn("[AlbumDetailUpload] Refetch attempt failed", {
                          objectKey,
                          retryCount,
                          error: retryError?.message,
                        });
                        if (retryCount < 2) {
                          await sleep(500); // Wait before retry
                        }
                      }
                    }

                    if (!refetchSuccess) {
                      console.error(
                        "[AlbumDetailUpload] Failed to refetch album media after all retries",
                        {
                          objectKey,
                        },
                      );
                    }
                  } catch (refetchError) {
                    console.error("[AlbumDetailUpload] Album media refetch failed", {
                      objectKey,
                      error: refetchError?.message,
                    });
                  }
                  break;
                }
                default:
                  break;
              }
            }

            completed += 1;
            updateTaskStage(task.id, "complete", {
              error: null,
              percent: STAGE_INFO.complete.percent,
            });
            updateUploadStatus(
              {
                total: tasks.length,
                completed,
                currentFile: task.displayLabel ?? task.displayName ?? task.fileName,
                percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 100,
                stage: "complete",
                stageLabel: STAGE_INFO.complete.label,
              },
              { force: true },
            );
          } catch (error) {
            if (error?.name === "AbortError") {
              updateTaskStage(task.id, "cancelled", {
                error: "Upload cancelled.",
                percent: STAGE_INFO.cancelled.percent,
              });
              throw error;
            }
            const displayError = extractErrorMessage(error);
            const friendlyError = sanitizeErrorMessage(displayError);
            const rawErrorSnippet =
              displayError && displayError !== friendlyError ? displayError.slice(0, 160) : null;
            console.error("Failed to upload media asset", {
              errorMessage: error?.message || String(error),
              errorName: error?.name,
              errorCode: error?.code,
              errorString: String(error),
              displayError: friendlyError,
              rawError: rawErrorSnippet,
              stage: currentStage,
              fileName: task.fileName,
              status: error?.status ?? null,
              body: error?.body ?? null,
              payload: error?.payload ?? null,
              sourceUri: error?.sourceUri,
              isHeic: error?.isHeic,
              stack: error?.stack?.slice(0, 500),
            });
            updateTaskStage(task.id, "error", {
              error: friendlyError,
              percent: STAGE_INFO.error.percent,
            });
            setBannerError(friendlyError);
            const resumeStage = determineResumeStage(currentStage);
            failures.push({
              asset: task.asset,
              fileName: task.fileName,
              displayName: task.displayName,
              displayLabel: task.displayLabel,
              fallbackName: task.fallbackName,
              resumeStage,
              prepared:
                resumeStage === "minting" || resumeStage === "finalizing" ? task.prepared : null,
              mintedData: resumeStage === "finalizing" ? task.mintedData : null,
              bytes: task.bytes ?? null,
              width: task.width ?? null,
              height: task.height ?? null,
              exif: null,
              errorMessage: friendlyError,
            });
          }
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("Upload flow failed", error);
        }
      } finally {
        abortControllerRef.current = null;
        setIsUploading(false);
      }

      if (controller.signal.aborted) {
        setProgressItems((prev) =>
          prev.map((item) =>
            item.stage === "complete"
              ? item
              : {
                  ...item,
                  stage: "cancelled",
                  stageLabel: STAGE_INFO.cancelled.label,
                  error: "Upload cancelled.",
                  percent: STAGE_INFO.cancelled.percent,
                },
          ),
        );
        const remaining = failures.length
          ? failures
          : tasks
              .filter((task) =>
                progressItemsRef.current.some(
                  (item) => item.id === task.id && item.stage !== "complete",
                ),
              )
              .map((task) => {
                const progress = progressItemsRef.current.find((item) => item.id === task.id);
                const resumeStage = determineResumeStage(progress?.stage ?? "converting");
                return {
                  asset: task.asset,
                  fileName: task.fileName,
                  displayName: task.displayName,
                  displayLabel: task.displayLabel,
                  fallbackName: task.fallbackName,
                  resumeStage,
                  prepared:
                    resumeStage === "minting" || resumeStage === "finalizing"
                      ? task.prepared
                      : null,
                  mintedData: resumeStage === "finalizing" ? task.mintedData : null,
                  bytes: task.bytes ?? null,
                  width: task.width ?? null,
                  height: task.height ?? null,
                  exif: null,
                };
              });
        if (remaining.length) {
          setRetryQueue(remaining);
        }
        setBannerError("Upload cancelled.");
        updateUploadStatus(
          {
            total: tasks.length,
            completed,
            stage: "cancelled",
            stageLabel: STAGE_INFO.cancelled.label,
            currentFile: null,
            percent:
              uploadStatusRef.current.percent ??
              (tasks.length ? Math.round((completed / tasks.length) * 100) : 0),
          },
          { force: true },
        );
        return;
      }

      if (completed) {
        const summary = `Uploaded ${completed} of ${tasks.length} photo${
          tasks.length === 1 ? "" : "s"
        }.`;
        setBannerMessage(summary);
        showToast(summary);
        await refreshAlbum();
      }

      if (failures.length) {
        setRetryQueue(failures);
        const failureMessages = failures
          .map((item) => item?.errorMessage)
          .filter((message, index, array) => message && array.indexOf(message) === index);
        const failureBanner =
          failureMessages.length === 0
            ? `${failures.length} photo${failures.length === 1 ? "" : "s"} failed. Retry to continue.`
            : `${failureMessages.join("\n")}${failures.length > 1 ? "\nRetry to continue." : ""}`;
        setBannerError(failureBanner);
        updateUploadStatus(
          {
            total: tasks.length,
            completed,
            stage: "error",
            stageLabel: STAGE_INFO.error.label,
            currentFile: null,
            percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
          },
          { force: true },
        );
      } else {
        setRetryQueue([]);
        updateUploadStatus(
          {
            total: tasks.length,
            completed: tasks.length,
            stage: "complete",
            stageLabel: STAGE_INFO.complete.label,
            currentFile: null,
            percent: 100,
          },
          { force: true },
        );
        // Clear progress items after successful upload completion
        setTimeout(() => {
          if (isMountedRef.current) {
            setProgressItems([]);
          }
        }, 2000);
      }
    },
    [
      albumId,
      babyId,
      convertToJpegAsync,
      determineResumeStage,
      finalizeUploadAsync,
      initialiseProgress,
      mintViewAsync,
      mintUploadAsync,
      refreshAlbum,
      refetchAlbumMedia,
      resolveObjectKey,
      resolveUploadUrl,
      updateProgressItem,
      updateTaskStage,
      updateUploadStatus,
    ],
  );

  const handleUpload = React.useCallback(async () => {
    if (isUploading) {
      return;
    }
    try {
      const selection = await openImagePickerUtil({
        mediaTypes: "images",
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 0,
        outputBase64: false,
        quality: 1,
      });
      const assets = Array.isArray(selection) ? selection : selection ? [selection] : [];
      if (!assets.length) {
        return;
      }
      await startUploadFlow(assets.map((asset) => ({ asset })));
    } catch (error) {
      console.error("Upload failed", error);
      setBannerError(error?.message ?? "We couldn't start the upload. Try again.");
    }
  }, [isUploading, startUploadFlow]);

  const handleCancelUploads = React.useCallback(() => {
    if (!isUploading) {
      return;
    }
    abortControllerRef.current?.abort();
  }, [isUploading]);

  const handleRetryUploads = React.useCallback(async () => {
    if (!retryQueue.length || isUploading) {
      return;
    }
    try {
      await startUploadFlow(retryQueue);
    } catch (error) {
      console.error("Retry failed", error);
      setBannerError("Retry failed. Please try again.");
    }
  }, [isUploading, retryQueue, startUploadFlow]);

  const updateAlbum = React.useCallback(
    async (payload) => {
      if (!albumId) {
        return null;
      }

      const supabaseUrl = trimSupabaseUrl(Constants?.SUPABASE_URL);
      const anonKey = resolveSupabaseAnonKey(Constants);
      const authorization = resolveSupabaseAuthorization(Constants);
      const contentProfile = resolveSupabaseProfile(Constants);

      if (!supabaseUrl || !anonKey || !authorization) {
        const error = new Error("Supabase credentials missing for album update.");
        error.status = 401;
        throw error;
      }

      const url = `${supabaseUrl}/rest/v1/albums?album_id=eq.${encodeURIComponent(albumId)}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authorization,
          "Accept-Profile": contentProfile,
          "Content-Profile": contentProfile,
          apikey: anonKey,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let json;
      if (responseText) {
        try {
          json = JSON.parse(responseText);
        } catch (parseError) {
          console.warn("Album update response parse failed", parseError);
        }
      }

      if (!response.ok) {
        const error = new Error(responseText || `Album update failed (${response.status})`);
        error.status = response.status;
        error.body = responseText;
        throw error;
      }

      return json ?? null;
    },
    [Constants, albumId],
  );

  const handleRenameAlbum = React.useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setBannerError("Album name cannot be empty.");
      return;
    }
    try {
      await updateAlbum({ title: trimmed });
      setRenameVisible(false);
      setBannerMessage("Album name updated.");
      await albumQuery.refetch?.();
    } catch (error) {
      console.error("Rename failed", error);
      setBannerError("We couldn't rename the album.");
    }
  }, [albumQuery, renameValue, updateAlbum]);

  const handleDeleteAlbum = React.useCallback(() => {
    if (!albumId) {
      return;
    }
    Alert.alert("Delete album", "This will remove the album and all related media. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsDeletingAlbum(true);
            const url = `${Constants.SUPABASE_URL}rest/v1/albums?album_id=eq.${albumId}`;
            const response = await fetch(url, {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                Authorization: Constants.AUTHORIZATION_HEADER,
                "Content-Profile": Constants["Content-Profile"] ?? "dearbaby",
                apikey: Constants.apiKey,
                auth_token: Constants.auth_token,
              },
            });
            if (!response.ok) {
              throw new Error(`Delete failed (${response.status})`);
            }
            setBannerMessage("Album deleted.");
            await sleep(200);
            navigation.goBack();
          } catch (error) {
            console.error("Delete album failed", error);
            setBannerError("We couldn't delete this album.");
          } finally {
            setIsDeletingAlbum(false);
          }
        },
      },
    ]);
  }, [Constants, albumId, navigation]);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      manualRefreshingRef.current = false;
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
        statusUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      abortControllerRef.current?.abort();
    });
    return unsubscribe;
  }, [navigation]);

  const handleSelectMedia = React.useCallback((media) => {
    setSelectedMedia(media);
    setViewerVisible(true);
  }, []);

  const handleOpenPhotoDetail = React.useCallback(
    (media, previewUri, objectKey, initialFocus, gridIndex) => {
      if (!media?.media_id) {
        return;
      }
      const resolvedAlbumTitle = albumRecord?.title ?? initialAlbumTitle ?? "Album";
      const resolvedBabyName = babyRecord?.name ?? initialBabyName ?? null;
      const previewCandidate =
        previewUri ?? media?.preview_url ?? media?.signed_preview_url ?? null;
      const objectKeyCandidate = objectKey ?? media?.object_key ?? media?.objectKey ?? null;

      // Use the grid index directly if provided, otherwise fall back to findIndex
      const initialIndex =
        typeof gridIndex === "number" && gridIndex >= 0
          ? gridIndex
          : mediaSequence.findIndex((m) => m.media_id === media.media_id);

      console.log("[AlbumDetailScreen] Opening photo detail:", {
        tappedMediaId: media.media_id,
        gridIndex,
        mediaSequenceLength: mediaSequence.length,
        finalInitialIndex: initialIndex,
      });

      const safeIndex = initialIndex >= 0 ? initialIndex : 0;

      navigation.navigate("MainStack/PhotoDetailScreen", {
        media_id: media.media_id,
        mediaId: media.media_id,
        albumId: albumId ?? media.album_id ?? null,
        babyId: babyId ?? media.baby_id ?? null,
        previewUrl: previewCandidate,
        preview_url: previewCandidate,
        objectKey: objectKeyCandidate,
        object_key: objectKeyCandidate,
        albumTitle: resolvedAlbumTitle,
        album_title: resolvedAlbumTitle,
        babyName: resolvedBabyName,
        baby_name: resolvedBabyName,
        initialFocus: initialFocus ?? null,

        // 🔑 FIX: Provide all expected index props
        mediaSequence,
        initialIndex: safeIndex,
        index: safeIndex,
        itemIndex: safeIndex,
      });
    },
    [
      albumId,
      albumRecord?.title,
      babyId,
      babyRecord?.name,
      initialAlbumTitle,
      initialBabyName,
      mediaSequence,
      navigation,
    ],
  );

  const handleToggleHeart = React.useCallback(
    async (media) => {
      if (!media?.media_id) {
        return;
      }
      console.log("[AlbumDetail] toggle heart", {
        mediaId: media.media_id,
      });
      try {
        await toggleReactionAsync({
          p_media_id: media.media_id,
          p_emoji: "❤️",
        });
        // Refetch to sync the latest reaction state
        setTimeout(() => {
          if (mediaQuery.refetch) {
            mediaQuery.refetch();
          }
        }, 300);
      } catch (error) {
        console.error("[AlbumDetail] toggle heart failed", {
          mediaId: media.media_id,
          error: error?.message,
        });
        showToast("We couldn't save your heart. Please try again 💖");
      }
    },
    [mediaQuery, toggleReactionAsync],
  );

  const handleSetCover = React.useCallback(async () => {
    const mediaId = selectedMedia?.media_id;
    if (!albumId || !mediaId) {
      return;
    }

    try {
      const objectKey = resolveMediaObjectKey(selectedMedia);
      const payloads = buildCoverUpdatePayloads({
        mediaId,
        objectKey,
        coverIdCandidates,
        coverObjectKeyCandidates,
      });

      let successfulPayload = null;
      let updateResponse = null;
      let lastError = null;

      for (const payload of payloads) {
        try {
          const response = await updateAlbum(payload);
          successfulPayload = payload;
          updateResponse = response;
          break;
        } catch (error) {
          if (shouldRetryCoverUpdateWithNextPayload(error)) {
            lastError = error;
            continue;
          }
          throw error;
        }
      }

      if (!successfulPayload) {
        throw lastError ?? new Error("Album cover update failed.");
      }

      const updatedAlbum = Array.isArray(updateResponse)
        ? (updateResponse[0] ?? null)
        : (updateResponse ?? null);
      const updatedAlbumId = updatedAlbum?.album_id ?? albumId;

      const payloadKeys = Object.keys(successfulPayload);
      const resolvedCoverIdKey =
        payloadKeys.find((key) => isCoverMediaIdColumnName(key)) ??
        (updatedAlbum ? deriveCoverFieldKeys(updatedAlbum).coverIdKey : null) ??
        albumCoverIdKey ??
        coverIdCandidates[0] ??
        "cover_media_id";
      const resolvedCoverObjectKey =
        payloadKeys.find((key) => isCoverMediaObjectKeyColumnName(key)) ??
        (updatedAlbum ? deriveCoverFieldKeys(updatedAlbum).coverObjectKey : null) ??
        (objectKey !== null ? (albumCoverObjectKey ?? coverObjectKeyCandidates[0]) : null);

      const coverMediaIdValue =
        (updatedAlbum && resolvedCoverIdKey && updatedAlbum[resolvedCoverIdKey]) ?? mediaId ?? null;
      const coverObjectKeyValue =
        resolvedCoverObjectKey != null
          ? updatedAlbum &&
            Object.prototype.hasOwnProperty.call(updatedAlbum, resolvedCoverObjectKey)
            ? updatedAlbum[resolvedCoverObjectKey]
            : (objectKey ?? null)
          : (objectKey ?? null);

      const coverFieldUpdate = {
        coverIdKey: resolvedCoverIdKey,
        coverIdValue: coverMediaIdValue,
        coverObjectKey: resolvedCoverObjectKey,
        coverObjectValue: coverObjectKeyValue,
      };

      if (updatedAlbum) {
        queryClient.setQueryData(["album", albumId], (current) => {
          const merged = current ? { ...current, ...updatedAlbum } : { ...updatedAlbum };
          return ensureDefaultCoverFields(merged, coverFieldUpdate);
        });
      } else {
        queryClient.setQueryData(["album", albumId], (current) => {
          if (!current) {
            return ensureDefaultCoverFields({}, coverFieldUpdate);
          }
          const next = { ...current };
          return ensureDefaultCoverFields(next, coverFieldUpdate);
        });
      }

      const relatedQueries = queryClient.getQueryCache().findAll({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "Get current users",
      });
      relatedQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (current) => {
          if (!current) {
            return current;
          }
          const currentJson = Array.isArray(current.json) ? current.json : [];
          const nextJson = currentJson.map((item) => {
            if (item?.album_id !== updatedAlbumId) {
              return item;
            }
            const nextItem = { ...item };
            ensureDefaultCoverFields(nextItem, coverFieldUpdate);
            return nextItem;
          });
          return { ...current, json: nextJson };
        });
      });

      setBannerError(null);
      setBannerMessage("Album cover updated.");

      if (typeof albumRefetch === "function") {
        try {
          await albumRefetch();
        } catch (refetchError) {
          console.error("Album refetch after cover update failed", refetchError);
        }
      }

      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "Get current users",
      });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "album-list",
      });
    } catch (error) {
      console.error("Set cover failed", error);
      setBannerMessage(null);
      setBannerError("We couldn't update the album cover.");
    }
  }, [
    albumCoverIdKey,
    albumCoverObjectKey,
    albumId,
    albumRefetch,
    coverIdCandidates,
    coverObjectKeyCandidates,
    queryClient,
    selectedMedia,
    updateAlbum,
  ]);

  const handleOpenDeleteConfirm = React.useCallback((mediaItem) => {
    if (!mediaItem) {
      return;
    }
    setMediaToDelete(mediaItem);
    setDeleteConfirmVisible(true);
  }, []);

  const handleCancelDelete = React.useCallback(() => {
    setDeleteConfirmVisible(false);
    setMediaToDelete(null);
    setIsBulkDeleteIntent(false);
  }, []);

  const handleConfirmDelete = React.useCallback(async () => {
    // Branch based on whether this is a bulk or single delete
    if (isBulkDeleteIntent && isMultiSelectMode) {
      // Handle bulk delete
      if (selectedMediaIds.length === 0 || isBulkDeleting) {
        return;
      }

      const idsToDelete = [...selectedMediaIds];
      const previousMediaItems = [...mediaItemsRaw];

      try {
        setIsBulkDeleting(true);
        setDeleteConfirmVisible(false);

        // Optimistically remove from UI
        setOptimisticDeletedIds((prev) => {
          const next = new Set(prev);
          idsToDelete.forEach((id) => next.add(id));
          return next;
        });

        // Call delete-media for each selected photo
        const results = await Promise.allSettled(
          idsToDelete.map((id) => deleteMediaAsync({ media_id: id })),
        );

        // Check for failures
        const failures = results.filter((r) => {
          if (r.status === "rejected") return true;
          if (r.status === "fulfilled") {
            return !r.value || r.value.data?.ok === false || r.value?.ok === false;
          }
          return false;
        });

        if (failures.length > 0) {
          // Restore failed items
          setOptimisticDeletedIds((prev) => {
            const next = new Set(prev);
            idsToDelete.forEach((id) => next.delete(id));
            return next;
          });

          const errorMessage =
            "Some photos stayed right where they are. Nothing was lost — please try again in a moment.";
          showToast(errorMessage);
          setBannerError(errorMessage);
        } else {
          const successMessage =
            idsToDelete.length === 1
              ? "One photo was gently removed from this album. The memory is still part of your story."
              : `${idsToDelete.length} photos were gently removed from this album. Their memories are still part of your story.`;
          showToast(successMessage);
          setBannerMessage(successMessage);
          setBannerError(null);
        }
      } catch (error) {
        console.error("[AlbumDetail] Bulk delete failed", {
          error: error?.message,
          status: error?.status,
        });

        // Restore all items on error
        setOptimisticDeletedIds((prev) => {
          const next = new Set(prev);
          idsToDelete.forEach((id) => next.delete(id));
          return next;
        });

        const errorMessage =
          "Something got in the way of tidying these photos. Everything is still safe — please try again in a little while.";
        showToast(errorMessage);
        setBannerError(errorMessage);
      } finally {
        setIsBulkDeleting(false);
        setIsBulkDeleteIntent(false);
        setIsMultiSelectMode(false);
        setSelectedMediaIds([]);

        // Refetch in background to sync state
        setTimeout(() => {
          if (mediaQuery.refetch) {
            mediaQuery.refetch();
          }
        }, 500);
      }
    } else {
      // Handle single delete
      if (!mediaToDelete?.media_id || isDeleting) {
        return;
      }

      const mediaId = mediaToDelete.media_id;

      try {
        setIsDeleting(true);

        // Optimistically remove from UI immediately
        setOptimisticDeletedIds((prev) => new Set(prev).add(mediaId));

        // Close the confirmation modal
        setDeleteConfirmVisible(false);

        // Call the delete-media edge function
        const response = await deleteMediaAsync({ media_id: mediaId });

        console.log("[AlbumDetail] Delete success", { mediaId, response });

        // Show success toast
        showToast(
          "This photo has been gently removed from the album. The memory is still part of your story.",
        );
        setBannerError(null);

        // Clear the selected media
        setMediaToDelete(null);

        // Refetch in background to sync state
        setTimeout(() => {
          if (mediaQuery.refetch) {
            mediaQuery.refetch();
          }
        }, 500);
      } catch (error) {
        console.error("[AlbumDetail] Delete failed", {
          mediaId,
          error: error?.message,
          status: error?.status,
        });

        // Restore the photo on error
        setOptimisticDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });

        // Show error toast with warm tone
        const errorMessage =
          error?.status === 401 || error?.status === 403
            ? "You don't have permission to delete this photo."
            : "We couldn't remove this photo just now. Your photo is still here, safe and sound — please try again in a moment.";

        showToast(errorMessage);
        setBannerError(errorMessage);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [
    deleteMediaAsync,
    isBulkDeleteIntent,
    isBulkDeleting,
    isDeleting,
    isMultiSelectMode,
    mediaItemsRaw,
    mediaQuery,
    mediaToDelete,
    selectedMediaIds,
  ]);

  const handleConfirmBulkDelete = React.useCallback(() => {
    if (!isMultiSelectMode || selectedMediaIds.length === 0) {
      return;
    }
    setIsBulkDeleteIntent(true);
    setDeleteConfirmVisible(true);
  }, [isMultiSelectMode, selectedMediaIds]);

  const handleDeleteMedia = React.useCallback(async () => {
    if (!selectedMedia?.media_id) {
      return;
    }
    try {
      const url = `${Constants.SUPABASE_URL}rest/v1/media_assets?media_id=eq.${selectedMedia.media_id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: Constants.AUTHORIZATION_HEADER,
          "Content-Profile": Constants["Content-Profile"] ?? "dearbaby",
          apikey: Constants.apiKey,
          auth_token: Constants.auth_token,
        },
      });
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`);
      }
      setBannerMessage("Photo deleted.");
      setViewerVisible(false);
      await mediaQuery.refetch?.();
    } catch (error) {
      console.error("Delete media failed", error);
      setBannerError("We couldn't delete that photo.");
    }
  }, [Constants, mediaQuery, selectedMedia]);

  const handleShareMedia = React.useCallback(async () => {
    const objectKey = resolveMediaObjectKey(selectedMedia);
    if (!objectKey) {
      return;
    }
    try {
      const response = await mintViewAsync({ objectKey });
      const signedUrl = resolveStorageUrl(response);
      if (signedUrl) {
        await Share.share({ url: signedUrl });
      }
    } catch (error) {
      const displayError = extractErrorMessage(error, "We couldn't share this photo.");
      console.error("Share failed", {
        error,
        displayError,
        status: error?.status ?? null,
        body: error?.body ?? null,
      });
      setBannerError(displayError);
    }
  }, [mintViewAsync, selectedMedia, setBannerError]);

  const columns = 3;

  const renderMediaItem = React.useCallback(
    ({ item, index }) => {
      const objectKey = resolveMediaObjectKey(item);
      if (!objectKey) return null;

      const isSelected = selectedMediaIds.includes(item.media_id);

      return (
        <MediaTile
          objectKey={objectKey}
          onPress={(previewUri) => {
            if (isMultiSelectMode) {
              // Toggle selection
              const id = item.media_id;
              setSelectedMediaIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              );
            } else {
              // Open PhotoDetailScreen with preview URI from the tile
              handleOpenPhotoDetail(item, previewUri, objectKey, null, index);
            }
          }}
          onLongPress={() => {
            const id = item.media_id;
            // Haptic feedback when entering multi-select mode
            if (!isMultiSelectMode) {
              if (Platform.OS === "web") {
                if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                  navigator.vibrate?.(50);
                }
              } else if (typeof Vibration?.vibrate === "function") {
                Vibration.vibrate(50);
              }
            }
            setIsMultiSelectMode(true);
            setSelectedMediaIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }}
          onDeletePress={handleOpenDeleteConfirm}
          onOpenDetail={(previewUri, initialFocus) =>
            handleOpenPhotoDetail(item, previewUri, objectKey, initialFocus, index)
          }
          onToggleHeart={handleToggleHeart}
          onViewFullscreen={handleSelectMedia}
          mediaItem={item}
          isMultiSelectMode={isMultiSelectMode}
          isSelected={isSelected}
        />
      );
    },
    [
      handleSelectMedia,
      handleOpenDeleteConfirm,
      handleOpenPhotoDetail,
      handleToggleHeart,
      isMultiSelectMode,
      selectedMediaIds,
    ],
  );

  const keyExtractor = React.useCallback((item, index) => {
    const objectKey = resolveMediaObjectKey(item);
    return item?.media_id ?? objectKey ?? `media-${index}`;
  }, []);

  const albumTitle = albumRecord?.title ?? initialAlbumTitle ?? "Album";
  const handleOpenOptionsSheet = React.useCallback(() => {
    if (!albumId) {
      return;
    }
    setRenameValue(typeof albumTitle === "string" ? albumTitle : "");
    setRenameVisible(true);
  }, [albumId, albumTitle, setRenameValue, setRenameVisible]);
  const createdAt = albumRecord?.created_at ? new Date(albumRecord.created_at) : null;
  const createdAtLabel = React.useMemo(() => {
    if (!createdAt) {
      return null;
    }
    try {
      return createdAt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return createdAt.toLocaleDateString();
    }
  }, [createdAt]);
  const shortDescription = React.useMemo(() => {
    const raw =
      typeof albumRecord?.description_md === "string" ? albumRecord.description_md.trim() : "";
    return raw.length ? raw : null;
  }, [albumRecord?.description_md]);
  const albumCoverMediaId = React.useMemo(() => {
    if (!albumCoverIdKey || !albumRecord) {
      return null;
    }
    return albumRecord?.[albumCoverIdKey] ?? null;
  }, [albumCoverIdKey, albumRecord]);

  const heroMedia = React.useMemo(() => {
    if (!mediaItems.length) {
      return null;
    }
    if (albumCoverMediaId) {
      const found = mediaItems.find((item) => item?.media_id === albumCoverMediaId);
      if (found) {
        return found;
      }
    }
    return mediaItems[0];
  }, [albumCoverMediaId, mediaItems]);
  const heroObjectKey = resolveMediaObjectKey(heroMedia);
  const { uri: heroPreviewUri, error: heroPreviewError } = useMediaPreview(heroObjectKey);
  const lastUpdatedLabel = React.useMemo(() => {
    if (!lastSavedAt) {
      return null;
    }
    try {
      const distance = formatDistanceToNow(lastSavedAt);
      if (!distance) {
        return null;
      }
      const normalized = distance.replace(/^about\s+/i, "");
      return `Last updated by you • ${normalized} ago`;
    } catch (_error) {
      return null;
    }
  }, [lastSavedAt]);
  const hasBabyContext = Boolean(babyId || babyRecord || initialBabyName);
  const babyDisplayName =
    (typeof babyRecord?.name === "string" && babyRecord.name.trim()) ||
    (typeof initialBabyName === "string" && initialBabyName.trim()) ||
    "Baby";
  const babyInitials = React.useMemo(() => getInitials(babyDisplayName), [babyDisplayName]);
  const babyAvatarIsLoading = Boolean(babyQuery.isFetching && babyAvatarKey && !babyAvatarUrl);
  const selectedObjectKey = resolveMediaObjectKey(selectedMedia);
  const { uri: viewerUri } = useMediaPreview(selectedObjectKey);
  const listRefreshing =
    manualRefreshing || Boolean(albumQuery.isRefetching) || Boolean(mediaQuery.isRefetching);

  const columnWrapperStyle = React.useMemo(
    () => ({
      paddingHorizontal: 12,
      marginBottom: 6,
    }),
    [],
  );

  const contentContainerStyle = React.useMemo(
    () => ({
      paddingTop: 24,
      paddingBottom: 48,
    }),
    [],
  );

  const listHeaderComponent = React.useMemo(() => {
    return (
      <View style={{ paddingBottom: 24, paddingHorizontal: 16 }}>
        <Surface
          elevation={2}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 28,
            padding: 20,
            boxShadow:
              Platform.OS === "web"
                ? "0px 16px 28px rgba(17,17,17,0.10)"
                : "0px 16px 28px rgba(17,17,17,0.18)",
          }}
        >
          <View
            style={{
              width: "100%",
              aspectRatio: 3 / 2,
              borderRadius: 20,
              backgroundColor: "#F2F2F7",
              overflow: "hidden",
            }}
          >
            {heroPreviewUri ? (
              <ExpoImage
                source={{ uri: heroPreviewUri }}
                cachePolicy="disk"
                contentFit="cover"
                style={{ width: "100%", height: "100%" }}
              />
            ) : heroMedia ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 24,
                }}
              >
                <Icon
                  name={heroPreviewError ? "Feather/alert-circle" : "Feather/image"}
                  size={28}
                  color="rgba(0,0,0,0.32)"
                />
                <Text
                  accessible={true}
                  selectable={false}
                  style={StyleSheet.compose(theme.typography.caption, {
                    color: "rgba(0,0,0,0.45)",
                    marginTop: 12,
                    textAlign: "center",
                  })}
                >
                  {heroPreviewError
                    ? heroPreviewError
                    : "Cover photo is still syncing. Pull down to refresh if it doesn't appear."}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 24,
                }}
              >
                <Icon name="Feather/image" size={36} color="rgba(0,0,0,0.28)" />
                <Text
                  accessible={true}
                  selectable={false}
                  style={StyleSheet.compose(theme.typography.caption, {
                    color: "rgba(0,0,0,0.45)",
                    marginTop: 12,
                    textAlign: "center",
                  })}
                >
                  Add a cover image to set the mood of this memory.
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 20 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                accessible={true}
                selectable={false}
                style={{
                  color: "#111111",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 28,
                  lineHeight: 32,
                }}
              >
                {albumTitle}
              </Text>
              {lastUpdatedLabel ? (
                <Text
                  accessible={true}
                  selectable={false}
                  style={{
                    color: "rgba(0,0,0,0.45)",
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    marginTop: 6,
                  }}
                >
                  {lastUpdatedLabel}
                </Text>
              ) : null}
              {shortDescription ? (
                <Text
                  accessible={true}
                  selectable={false}
                  numberOfLines={3}
                  style={{
                    color: "rgba(0,0,0,0.55)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    lineHeight: 22,
                    marginTop: 12,
                  }}
                >
                  {shortDescription}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", marginTop: 16 }}>
                <Touchable
                  onPress={handleOpenDetailedMemory}
                  style={{
                    alignItems: "center",
                    backgroundColor: theme.colors.branding.primary,
                    borderRadius: 12,
                    flexDirection: "row",
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                  }}
                >
                  <Icon name="Feather/book-open" size={16} color="#FFFFFF" />
                  <Text
                    accessible={true}
                    selectable={false}
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      marginLeft: 8,
                    }}
                  >
                    Memory
                  </Text>
                </Touchable>
                <Touchable
                  onPress={handleOpenOptionsSheet}
                  style={{
                    alignItems: "center",
                    backgroundColor: "rgba(17,17,17,0.08)",
                    borderRadius: 12,
                    flexDirection: "row",
                    marginLeft: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Icon name="Feather/settings" size={16} color="rgba(17,17,17,0.55)" />
                  <Text
                    accessible={true}
                    selectable={false}
                    style={{
                      color: "rgba(17,17,17,0.55)",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      marginLeft: 8,
                    }}
                  >
                    Manage
                  </Text>
                </Touchable>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Touchable
                onPress={() => {
                  setRenameValue(albumTitle);
                  setRenameVisible(true);
                }}
                accessibilityLabel="Album options"
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#E6E6E6",
                  height: 36,
                  width: 36,
                  boxShadow: "0px 4px 8px rgba(0,0,0,0.16)",
                }}
              >
                <Icon name="Feather/more-horizontal" size={20} color="rgba(0,0,0,0.55)" />
              </Touchable>
              {hasBabyContext ? (
                <Surface
                  elevation={0}
                  style={{
                    alignItems: "center",
                    backgroundColor: "#F0F3F7",
                    borderRadius: 26,
                    height: 52,
                    justifyContent: "center",
                    marginTop: 14,
                    overflow: "hidden",
                    width: 52,
                  }}
                >
                  {babyAvatarUrl ? (
                    <ExpoImage
                      source={{ uri: babyAvatarUrl }}
                      contentFit="cover"
                      cachePolicy="disk"
                      style={{ height: "100%", width: "100%" }}
                    />
                  ) : babyAvatarIsLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.branding.primary} />
                  ) : (
                    <Text
                      accessible={true}
                      selectable={false}
                      style={{
                        color: "rgba(0,0,0,0.55)",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                      }}
                    >
                      {babyInitials}
                    </Text>
                  )}
                </Surface>
              ) : null}
            </View>
          </View>

          <View
            style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 16 }}
          >
            {createdAtLabel ? (
              <Text
                accessible={true}
                selectable={false}
                style={{
                  color: "rgba(0,0,0,0.4)",
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                Captured {createdAtLabel}
              </Text>
            ) : null}
            {createdAtLabel && hasBabyContext ? (
              <Text style={{ color: "rgba(0,0,0,0.24)", marginHorizontal: 8 }}>•</Text>
            ) : null}
            {hasBabyContext ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: "rgba(17,17,17,0.08)",
                    borderRadius: 16,
                    height: 32,
                    justifyContent: "center",
                    marginRight: 8,
                    overflow: "hidden",
                    width: 32,
                  }}
                >
                  {babyAvatarUrl ? (
                    <ExpoImage
                      source={{ uri: babyAvatarUrl }}
                      contentFit="cover"
                      cachePolicy="disk"
                      style={{ height: "100%", width: "100%" }}
                    />
                  ) : babyAvatarIsLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.branding.primary} />
                  ) : (
                    <Text
                      accessible={true}
                      selectable={false}
                      style={{
                        color: "rgba(17,17,17,0.55)",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                      }}
                    >
                      {babyInitials}
                    </Text>
                  )}
                </View>
                <Text
                  accessible={true}
                  selectable={false}
                  style={{
                    color: "rgba(0,0,0,0.55)",
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                  }}
                >
                  {babyDisplayName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={{ position: "relative" }}>
              <Button
                title="Upload Photo"
                icon="MaterialIcons/add-photo-alternate"
                onPress={handleUpload}
                disabled={isUploading || !albumId}
                style={{
                  backgroundColor: theme.colors.branding.primary,
                  borderRadius: 16,
                  paddingVertical: 12,
                }}
                textStyle={{
                  color: theme.colors.background.base,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                }}
              />
              {isUploading ? (
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.15)",
                    borderRadius: 16,
                    bottom: 0,
                    justifyContent: "center",
                    left: 0,
                    pointerEvents: "none",
                    position: "absolute",
                    right: 0,
                    top: 0,
                  }}
                >
                  <ActivityIndicator size="small" color={theme.colors.background.base} />
                </View>
              ) : null}
            </View>

            {isUploading && uploadStatus.total > 0 ? (
              <View
                style={{
                  marginTop: 12,
                  padding: 16,
                  backgroundColor: "#E3F2FD",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#90CAF9",
                }}
              >
                <Text
                  style={{
                    color: "#1976D2",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {uploadStatus.stageLabel || "Processing"}
                </Text>
                <Text
                  style={{
                    color: "#424242",
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                  }}
                >
                  {uploadStatus.completed} of {uploadStatus.total} photos
                  {uploadStatus.currentFile ? ` • ${uploadStatus.currentFile}` : ""}
                </Text>
                <Text
                  style={{
                    color: "#616161",
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {uploadStatus.percent}% complete
                </Text>
              </View>
            ) : null}

            {isUploading ? (
              <Button
                title="Cancel Upload"
                onPress={handleCancelUploads}
                style={{
                  marginTop: 12,
                  borderRadius: 16,
                  paddingVertical: 12,
                  backgroundColor: theme.colors.background.error,
                }}
                textStyle={{
                  color: theme.colors.background.base,
                  fontFamily: "Inter_600SemiBold",
                }}
              />
            ) : null}
          </View>

          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.08)",
              height: 1,
              marginTop: 24,
              borderRadius: 2,
            }}
          />

          <View style={{ marginTop: 24 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                selectable={false}
                style={StyleSheet.compose(GlobalStyles.TextStyles(theme)["Text 2"].style, {
                  color: theme.colors.text.strong,
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                })}
              >
                Detailed Memory
              </Text>
              <Pressable
                onPress={handleOpenDetailedMemoryEditor}
                disabled={!albumId}
                accessibilityLabel="Edit detailed memory"
                accessibilityRole="button"
                accessibilityState={{ disabled: !albumId }}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                style={({ pressed }) => ({
                  opacity: !albumId ? 0.4 : pressed ? 0.7 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                })}
              >
                <Text
                  selectable={false}
                  style={{
                    color: "#0A84FF",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  Edit
                </Text>
              </Pressable>
            </View>
            {lastUpdatedLabel ? (
              <Text
                selectable={false}
                style={{
                  color: "rgba(0,0,0,0.45)",
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                {lastUpdatedLabel}
              </Text>
            ) : null}
            <View
              style={{
                marginTop: 12,
                borderRadius: 16,
                padding: 16,
                backgroundColor: "#FAFAFA",
                borderWidth: 1,
                borderColor: "#E5E5E5",
              }}
            >
              {hasDetailedMemory ? (
                <Text
                  selectable
                  style={{
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {displayedDetailedMemory}
                </Text>
              ) : (
                <Text
                  selectable={false}
                  style={{
                    color: "rgba(0,0,0,0.5)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  No detailed memory yet. Tap Edit to add the full story behind this album.
                </Text>
              )}
            </View>
          </View>
        </Surface>
      </View>
    );
  }, [
    albumTitle,
    albumId,
    babyDisplayName,
    babyInitials,
    babyAvatarIsLoading,
    babyAvatarUrl,
    createdAtLabel,
    displayedDetailedMemory,
    handleCancelUploads,
    handleOpenDetailedMemory,
    handleOpenDetailedMemoryEditor,
    handleOpenOptionsSheet,
    handleUpload,
    hasBabyContext,
    hasDetailedMemory,
    heroMedia,
    heroPreviewError,
    heroPreviewUri,
    isUploading,
    lastUpdatedLabel,
    setRenameValue,
    setRenameVisible,
    shortDescription,
    theme,
  ]);

  return (
    <ScreenContainer hasSafeArea scrollable={false}>
      {bannerMessage ? (
        <Surface
          elevation={1}
          style={StyleSheet.applyWidth(
            {
              backgroundColor: theme.colors.background.brand,
              marginHorizontal: 20,
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
            },
            dimensions.width,
          )}
        >
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              StyleSheet.compose(
                GlobalStyles.TextStyles(theme)["Text 2"].style,
                theme.typography.body2,
                { color: theme.colors.text.strong },
              ),
              dimensions.width,
            )}
          >
            {bannerMessage}
          </Text>
        </Surface>
      ) : null}
      {bannerError ? (
        <Surface
          elevation={1}
          style={StyleSheet.applyWidth(
            {
              backgroundColor: theme.colors.background.error,
              marginHorizontal: 20,
              marginTop: bannerMessage ? 8 : 16,
              padding: 12,
              borderRadius: 12,
            },
            dimensions.width,
          )}
        >
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              StyleSheet.compose(
                GlobalStyles.TextStyles(theme)["Text 2"].style,
                theme.typography.body2,
                { color: theme.colors.text.light },
              ),
              dimensions.width,
            )}
          >
            {bannerError}
          </Text>
          {retryQueue.length ? (
            <Button
              title={isUploading ? "Retrying..." : "Retry"}
              onPress={handleRetryUploads}
              disabled={isUploading}
              style={StyleSheet.applyWidth(
                {
                  marginTop: 12,
                  alignSelf: "flex-start",
                  borderRadius: 10,
                  backgroundColor: theme.colors.background.base,
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                },
                dimensions.width,
              )}
              textStyle={{
                color: theme.colors.branding.primary,
                fontFamily: "Inter_600SemiBold",
              }}
            />
          ) : null}
        </Surface>
      ) : null}
      <FlatList
        ref={flatListRef}
        data={mediaItems}
        keyExtractor={keyExtractor}
        numColumns={columns}
        columnWrapperStyle={columnWrapperStyle}
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={listHeaderComponent}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={60}
        removeClippedSubviews={Platform.OS !== "web"}
        ListFooterComponentStyle={{ paddingTop: 32 }}
        renderItem={renderMediaItem}
        onEndReached={() => {
          if (mediaQuery.hasNextPage && !mediaQuery.isFetchingNextPage) {
            mediaQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() =>
          mediaQuery.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.branding.primary} />
          ) : (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Icon name="Feather/image" size={40} color={theme.colors.text.medium} />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  StyleSheet.compose(
                    GlobalStyles.TextStyles(theme)["Text 2"].style,
                    theme.typography.body1,
                    {
                      color: theme.colors.text.medium,
                      marginTop: 12,
                      textAlign: "center",
                    },
                  ),
                  dimensions.width,
                )}
              >
                No photos yet
              </Text>
              <Button
                title="Upload"
                onPress={handleUpload}
                disabled={isUploading || !albumId}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: theme.colors.branding.primary,
                }}
                textStyle={{ color: theme.colors.background.base, fontFamily: "Inter_600SemiBold" }}
              />
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={listRefreshing}
            onRefresh={refreshAlbum}
            tintColor={theme.colors.branding.primary}
          />
        }
        ListFooterComponent={null}
      />
      <Modal
        animationType="slide"
        transparent
        visible={editorOpen}
        onRequestClose={handleCloseDetailedMemoryEditor}
      >
        <TouchableWithoutFeedback
          onPress={savingDetailedMemory ? undefined : handleCloseDetailedMemoryEditor}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={StyleSheet.applyWidth(
                    {
                      backgroundColor: theme.colors.background.base,
                      borderTopLeftRadius: 32,
                      borderTopRightRadius: 32,
                      paddingHorizontal: 24,
                      paddingTop: 22,
                      paddingBottom: 36 + (Platform.OS === "ios" ? 12 : 0),
                    },
                    dimensions.width,
                  )}
                >
                  <View
                    style={{
                      alignSelf: "center",
                      height: 4,
                      width: 48,
                      borderRadius: 2,
                      backgroundColor: "rgba(0,0,0,0.12)",
                      marginBottom: 20,
                    }}
                  />
                  <Text
                    style={{
                      color: theme.colors.text.strong,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 18,
                    }}
                  >
                    Edit Detailed Memory
                  </Text>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  >
                    {albumTitle}
                  </Text>
                  <AlbumDescriptionEditor
                    value={detailedMemory}
                    onChangeText={handleDetailedMemoryChange}
                    onSave={handleSaveDetailedMemory}
                    saving={savingDetailedMemory}
                    disabled={!isDetailedMemoryDirty || savingDetailedMemory}
                    maxLen={DETAILED_MEMORY_MAX_LEN}
                    counterWarningThreshold={DETAILED_MEMORY_WARNING_THRESHOLD}
                    helperText="You can use Markdown for headings, emphasis, and lists."
                    placeholder="Add the full story behind this album."
                    label="Detailed Memory (Markdown)"
                    inputAccessibilityLabel="Detailed memory editor"
                    inputTestID="album-detailed-memory-editor"
                    style={{ marginTop: 18 }}
                    textInputStyle={{ minHeight: 220 }}
                  />
                  <Pressable
                    onPress={handleCloseDetailedMemoryEditor}
                    disabled={savingDetailedMemory}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      marginTop: 14,
                      opacity: savingDetailedMemory ? 0.6 : pressed ? 0.7 : 1,
                      paddingVertical: 10,
                    })}
                  >
                    <Text
                      style={{
                        color: "rgba(0,0,0,0.4)",
                        fontFamily: "Inter_500Medium",
                        fontSize: 14,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={renameVisible}
        onRequestClose={() => setRenameVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={() => setRenameVisible(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={{
              backgroundColor: theme.colors.background.base,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.compose(
                  GlobalStyles.TextStyles(theme)["Text 2"].style,
                  theme.typography.headline6,
                  { color: theme.colors.text.strong },
                )}
              >
                Rename album
              </Text>
              <Touchable onPress={() => setRenameVisible(false)}>
                <Icon name="AntDesign/close" size={20} color={theme.colors.text.medium} />
              </Touchable>
            </View>
            <TextField
              value={renameValue}
              onChangeText={setRenameValue}
              autoCapitalize="words"
              maxLength={80}
              style={{
                borderColor: theme.colors.border.base,
                borderRadius: 12,
                borderWidth: 1,
                marginTop: 16,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            <Button
              title="Save"
              onPress={handleRenameAlbum}
              style={{
                backgroundColor: theme.colors.branding.primary,
                borderRadius: 14,
                marginTop: 20,
                paddingVertical: 12,
              }}
              textStyle={{ color: theme.colors.background.base, fontFamily: "Inter_600SemiBold" }}
            />
            <Touchable
              onPress={handleDeleteAlbum}
              disabled={isDeletingAlbum}
              style={{ marginTop: 16 }}
            >
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.compose(
                  GlobalStyles.TextStyles(theme)["Text 2"].style,
                  theme.typography.body2,
                  { color: theme.colors.text.warning, textAlign: "center" },
                )}
              >
                {isDeletingAlbum ? "Deleting..." : "Delete album"}
              </Text>
            </Touchable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      >
        <FullscreenViewer
          visible={viewerVisible}
          media={selectedMedia}
          previewUri={viewerUri}
          onClose={() => setViewerVisible(false)}
          onShare={handleShareMedia}
          onSetCover={handleSetCover}
          onDelete={() => {
            if (!selectedMedia?.media_id) {
              return;
            }
            setViewerVisible(false);
            setMediaToDelete(selectedMedia);
            setIsBulkDeleteIntent(false);
            setDeleteConfirmVisible(true);
          }}
          onToggleHeart={handleToggleHeart}
          onOpenPhotoDetail={() => {
            if (!selectedMedia) {
              return;
            }
            setViewerVisible(false);
            handleOpenPhotoDetail(selectedMedia, viewerUri, selectedObjectKey);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={deleteConfirmVisible}
        onRequestClose={handleCancelDelete}
      >
        <TouchableWithoutFeedback onPress={isDeleting ? undefined : handleCancelDelete}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={StyleSheet.applyWidth(
                  {
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 32,
                    borderTopRightRadius: 32,
                    paddingHorizontal: 24,
                    paddingTop: 22,
                    paddingBottom: 36 + (Platform.OS === "ios" ? 12 : 0),
                  },
                  dimensions.width,
                )}
              >
                {/* Handle Bar */}
                <View
                  style={{
                    alignSelf: "center",
                    height: 4,
                    width: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(0,0,0,0.12)",
                    marginBottom: 20,
                  }}
                />

                {/* Title */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 22,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  {isBulkDeleteIntent && isMultiSelectMode
                    ? selectedMediaIds.length === 1
                      ? "Remove this memory from the album?"
                      : `Remove these ${selectedMediaIds.length} memories from the album?`
                    : "Remove this memory from the album?"}
                </Text>

                {/* Emotional Subtext */}
                <Text
                  style={{
                    color: "rgba(0,0,0,0.6)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    lineHeight: 22,
                    textAlign: "center",
                    marginBottom: 28,
                    paddingHorizontal: 8,
                  }}
                >
                  {isBulkDeleteIntent && isMultiSelectMode
                    ? "These photos will disappear from this DearBaby album.\nThe stories behind them are still yours forever, and you can always add new memories when you're ready."
                    : "This photo will disappear from this DearBaby album.\nThe moment you captured is still part of your family's story, even if it's no longer shown here."}
                </Text>

                {/* Delete Button (Primary/Destructive) */}
                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={isDeleting || isBulkDeleting}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor:
                          isDeleting || isBulkDeleting
                            ? "rgba(255,107,129,0.6)"
                            : pressed
                              ? "#E57373"
                              : "#FF6B81",
                        borderRadius: 16,
                        paddingVertical: 14,
                        marginBottom: 12,
                        boxShadow:
                          isDeleting || isBulkDeleting
                            ? undefined
                            : "0px 8px 16px rgba(255,107,129,0.3)",
                      },
                      dimensions.width,
                    )
                  }
                >
                  {isDeleting || isBulkDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                      }}
                    >
                      {isBulkDeleteIntent && isMultiSelectMode
                        ? selectedMediaIds.length === 1
                          ? "Remove from album"
                          : "Remove photos from album"
                        : "Remove from album"}
                    </Text>
                  )}
                </Pressable>

                {/* Cancel Button (Secondary) */}
                <Pressable
                  onPress={handleCancelDelete}
                  disabled={isDeleting || isBulkDeleting}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    paddingVertical: 12,
                    opacity: isDeleting || isBulkDeleting ? 0.6 : pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    {"Keep these memories"}
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Multi-select bottom bar */}
      {isMultiSelectMode && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: Platform.OS === "ios" ? 32 : 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(20,20,20,0.96)",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" }}>
            {selectedMediaIds.length === 0
              ? "No photos selected"
              : selectedMediaIds.length === 1
                ? "1 photo selected"
                : `${selectedMediaIds.length} photos selected`}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedMediaIds([]);
              }}
              disabled={isBulkDeleting}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: pressed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                opacity: isBulkDeleting ? 0.5 : 1,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmBulkDelete}
              disabled={isBulkDeleting || selectedMediaIds.length === 0}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor:
                  isBulkDeleting || selectedMediaIds.length === 0
                    ? "rgba(255,107,129,0.4)"
                    : pressed
                      ? "#E57373"
                      : "#FF6B81",
                opacity: isBulkDeleting || selectedMediaIds.length === 0 ? 0.5 : 1,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                {isBulkDeleting ? "Deleting…" : "Delete selected"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
};

export default withTheme(AlbumDetailScreen);
