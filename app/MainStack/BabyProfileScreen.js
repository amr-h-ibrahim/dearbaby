import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Button,
  Divider,
  ExpoImage,
  Icon,
  ScreenContainer,
  SimpleStyleScrollView,
  Spacer,
  Surface,
  TextField,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import { useQueryClient } from "react-query";
import * as GlobalStyles from "../../GlobalStyles.js";
import * as SupabaseDearBabyApi from "../../apis/SupabaseDearBabyApi.js";
import * as SupabaseDearBaby2Api from "../../apis/SupabaseDearBaby2Api.js";
import useAlbumUpdateDescription from "../../apis/useAlbumUpdateDescription";
import useFinalizeUpload from "../../apis/useFinalizeUpload";
import useMintUpload from "../../apis/useMintUpload";
import useMintView from "../../apis/useMintView";
import * as GlobalVariables from "../../config/GlobalVariableContext";
import useParams from "../../utils/useParams";
import useWindowDimensions from "../../utils/useWindowDimensions";
import * as DateUtils from "../../utils/DateUtils";
import * as StyleSheet from "../../utils/StyleSheet";
import openImagePickerUtil from "../../utils/openImagePicker";
import useNavigation from "../../utils/useNavigation";
import prepare_jpeg_and_size from "../../global-functions/prepare_jpeg_and_size";
import put_to_signed_url_xplat from "../../global-functions/put_to_signed_url_xplat";
import prewarm_media_pipeline from "../../global-functions/prewarm_media_pipeline";
import showToast from "../../utils/showToast";
import { useRequireAuth } from "../../utils/useAuthState";
import { resolveStorageUrl } from "../../utils/storageUrlHelpers";

const MEDIA_UPLOAD_TARGET = "media";
const UNASSIGNED_ALBUM_KEY = "__unassigned_album__";
const ALBUM_PREVIEW_LIMIT = 8;
const SHORT_DESCRIPTION_MAX_LEN = 512;
const UPLOAD_STATUS_LABELS = Object.freeze({
  minting: "Minting upload URL",
  putting: "Uploading photo",
  finalizing: "Finalizing upload",
  done: "Done",
  error: "Finalize failed",
});

const UPLOAD_STATUS_ICONS = Object.freeze({
  minting: "MaterialCommunityIcons/link-variant",
  putting: "MaterialCommunityIcons/cloud-upload",
  finalizing: "MaterialCommunityIcons/clock-outline",
  done: "MaterialCommunityIcons/check-circle",
  error: "MaterialCommunityIcons/alert-circle",
});

const hasResponseError = (response) => {
  return response?.status != null && (response.status < 200 || response.status >= 300);
};

const PHOTO_PREP_ERROR_MESSAGE =
  "We couldn't prepare this photo. Please try again or choose a different image.";

const formatDate = (value, formatString) => {
  if (!value) {
    return null;
  }
  try {
    return DateUtils.format(value, formatString);
  } catch (error) {
    console.error("Failed to format date", error);
    return null;
  }
};

// Format date as DD/MM/YYYY (British format)
const formatDateBritish = (dateString) => {
  if (!dateString) {
    return "";
  }
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Failed to format date to British format", error);
    return dateString;
  }
};

const formatDistance = (value) => {
  if (!value) {
    return null;
  }
  try {
    return DateUtils.formatDistanceToNow(value);
  } catch (error) {
    console.error("Failed to compute distance to now", error);
    return null;
  }
};

const getInitials = (displayName = "") => {
  if (!displayName) {
    return "CG";
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

const extractServerErrorMessage = (error, fallbackMessage = "Something went wrong.") => {
  if (!error) {
    return fallbackMessage;
  }

  const payload = error?.payload;
  if (payload && typeof payload === "object") {
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  }

  const bodyText = typeof error?.body === "string" && error.body.trim() ? error.body.trim() : null;
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
      console.warn("[AlbumUpload] Failed to parse error body", {
        message: parseError?.message,
        body: bodyText,
      });
      return bodyText;
    }
  }

  const message =
    typeof error?.message === "string" && error.message.trim() ? error.message.trim() : null;
  if (message) {
    return message;
  }

  return fallbackMessage;
};

const resolveSignedUrl = (response) => resolveStorageUrl(response);

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

const BabyProfileScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const isCompactActionLayout = dimensions.width < 480;
  useRequireAuth();
  const params = useParams();
  const navigation = useNavigation();
  const Constants = GlobalVariables.useValues();
  const currentUserId = Constants?.user_id ?? null;
  const queryClient = useQueryClient();

  const babyIdFromParams = params?.babyId ?? params?.baby_id ?? undefined;

  const babyQueryArgs = React.useMemo(() => {
    if (babyIdFromParams) {
      return {
        baby_id: babyIdFromParams,
        limit: 1,
        select: "baby_id,name,date_of_birth,gender,created_at,avatar_object_key",
      };
    }
    return {
      select: "baby_id,name,date_of_birth,gender,created_at,avatar_object_key",
      limit: 1,
      order: "created_at.desc",
    };
  }, [babyIdFromParams]);

  const caregiverArgs = React.useMemo(() => {
    if (!babyIdFromParams) {
      return {};
    }
    return {
      baby_id: babyIdFromParams,
      select: "uid,role,relationship,profiles:uid(display_name,avatar_object_key)",
    };
  }, [babyIdFromParams]);

  const albumArgs = React.useMemo(() => {
    if (!babyIdFromParams) {
      return {};
    }
    return {
      baby_id: babyIdFromParams,
      order: "created_at.desc",
      select:
        "album_id,title,description_md,created_at,baby_id,created_by,cover_media_id,media_assets(count)",
      "media_assets.status": "eq.uploaded",
      "media_assets.deleted_at": "is.null",
    };
  }, [babyIdFromParams]);
  const albumsQueryKey = React.useMemo(() => ["Get current users", albumArgs], [albumArgs]);

  const timelineArgs = React.useMemo(() => {
    if (!babyIdFromParams) {
      return {};
    }
    return {
      baby_id: babyIdFromParams,
      order: "event_at.desc",
      limit: 6,
      select: "entry_id,entry_type,body,event_at,created_at",
    };
  }, [babyIdFromParams]);

  const mediaArgs = React.useMemo(() => {
    if (!babyIdFromParams) {
      return {};
    }
    return {
      baby_id: babyIdFromParams,
      order: "created_at.desc",
      limit: 6,
      select: "media_id,object_key,mime_type,created_at,album_id",
    };
  }, [babyIdFromParams]);

  const mediaCountArgs = React.useMemo(() => {
    if (!babyIdFromParams) {
      return {};
    }
    return {
      baby_id: babyIdFromParams,
      status: "eq.uploaded",
      deleted_at: "is.null",
      select: "media_id",
    };
  }, [babyIdFromParams]);

  const remindersArgs = React.useMemo(() => {
    if (!babyIdFromParams) {
      return {};
    }
    return {
      baby_id: babyIdFromParams,
      order: "due_at.asc",
      select: "reminder_id,title,due_at,is_done",
      limit: 6,
    };
  }, [babyIdFromParams]);

  const {
    data: babyData,
    isLoading: isBabyLoading,
    error: babyError,
    refetch: refetchBaby,
  } = SupabaseDearBabyApi.useGetBabyGET(babyQueryArgs, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const {
    data: caregiverData,
    isLoading: isCaregiverLoading,
    error: caregiverError,
    refetch: refetchCaregivers,
  } = SupabaseDearBabyApi.useParentBabyGET(caregiverArgs, {
    enabled: !!babyIdFromParams,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = SupabaseDearBabyApi.useTimelineEntriesGET(timelineArgs, {
    enabled: !!babyIdFromParams,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  const {
    data: mediaData,
    isLoading: isMediaLoading,
    error: mediaError,
    refetch: refetchMedia,
  } = SupabaseDearBabyApi.useMediaAssetsGET(mediaArgs, {
    enabled: !!babyIdFromParams,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  const {
    data: mediaCountData,
    isLoading: isMediaCountLoading,
    error: mediaCountError,
    refetch: refetchMediaCount,
  } = SupabaseDearBabyApi.useMediaAssetsGET(mediaCountArgs, {
    enabled: !!babyIdFromParams,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  const {
    data: albumsData,
    isLoading: isAlbumsLoading,
    error: albumsError,
    refetch: refetchAlbums,
  } = SupabaseDearBabyApi.useAlbumsGET(albumArgs, {
    enabled: !!babyIdFromParams,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const {
    data: remindersData,
    isLoading: isRemindersLoading,
    error: remindersError,
    refetch: refetchReminders,
  } = SupabaseDearBabyApi.useRemindersGET(remindersArgs, {
    enabled: !!babyIdFromParams,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const babyJson = babyData?.json;
  const babyRecord = React.useMemo(() => {
    if (!babyJson) {
      return null;
    }
    if (Array.isArray(babyJson)) {
      return babyJson[0] ?? null;
    }
    return babyJson;
  }, [babyJson]);

  const derivedBabyId = React.useMemo(() => {
    if (babyIdFromParams) {
      return babyIdFromParams;
    }
    return babyRecord?.baby_id ?? null;
  }, [babyIdFromParams, babyRecord?.baby_id]);

  const caregivers = React.useMemo(() => {
    const raw = caregiverData?.json;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry) => {
        const profileRaw = entry?.profiles;
        const profile = Array.isArray(profileRaw) ? (profileRaw[0] ?? null) : (profileRaw ?? null);
        return {
          uid: entry?.uid,
          role: entry?.role,
          relationship: entry?.relationship,
          displayName: profile?.display_name ?? null,
          avatarKey: profile?.avatar_object_key ?? null,
        };
      })
      .filter(Boolean);
  }, [caregiverData?.json]);

  const timelineEntries = React.useMemo(() => {
    const raw = timelineData?.json;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw;
  }, [timelineData?.json]);

  const mediaItems = React.useMemo(() => {
    const raw = mediaData?.json;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw;
  }, [mediaData?.json]);

  const totalMediaCount = React.useMemo(() => {
    const raw = mediaCountData?.json;
    if (!Array.isArray(raw)) {
      return 0;
    }
    return raw.length;
  }, [mediaCountData?.json]);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [albumTitle, setAlbumTitle] = React.useState("");
  const [albumFormError, setAlbumFormError] = React.useState("");
  const [albumFeedback, setAlbumFeedback] = React.useState("");
  const [isCreatingAlbum, setIsCreatingAlbum] = React.useState(false);
  const [showAlbumComposer, setShowAlbumComposer] = React.useState(false);
  const [hasAutoOpenedComposer, setHasAutoOpenedComposer] = React.useState(false);
  const [albumUploadState, setAlbumUploadState] = React.useState({});
  const [albumUploadErrors, setAlbumUploadErrors] = React.useState({});
  const [albumUploadItems, setAlbumUploadItems] = React.useState({});
  const [editingAlbum, setEditingAlbum] = React.useState(null);
  const [descriptionDraft, setDescriptionDraft] = React.useState("");
  const [isDescriptionDirty, setIsDescriptionDirty] = React.useState(false);
  const [isDescriptionModalVisible, setDescriptionModalVisible] = React.useState(false);
  const [optionsSheetAlbum, setOptionsSheetAlbum] = React.useState(null);
  const [isOptionsSheetVisible, setOptionsSheetVisible] = React.useState(false);
  const serverDescriptionRef = React.useRef("");
  const [isDescriptionFocused, setIsDescriptionFocused] = React.useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState("");
  const [isDeletingBaby, setIsDeletingBaby] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");
  const [isBabyOptionsSheetVisible, setBabyOptionsSheetVisible] = React.useState(false);
  const [showEditBabyModal, setShowEditBabyModal] = React.useState(false);
  const [editBabyName, setEditBabyName] = React.useState("");
  const [editBabyDateOfBirth, setEditBabyDateOfBirth] = React.useState("");
  const [editBabyGender, setEditBabyGender] = React.useState("");
  const [isUpdatingBaby, setIsUpdatingBaby] = React.useState(false);
  const [editBabyError, setEditBabyError] = React.useState("");
  const [dobDay, setDobDay] = React.useState("");
  const [dobMonth, setDobMonth] = React.useState("");
  const [dobYear, setDobYear] = React.useState("");
  const [dobError, setDobError] = React.useState("");
  const [activeDobPicker, setActiveDobPicker] = React.useState(null);

  // Family & Access - Invite state
  const [isInviteModalVisible, setInviteModalVisible] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("editor");
  const [inviteError, setInviteError] = React.useState("");
  const [isSendingInvite, setIsSendingInvite] = React.useState(false);
  const albumUploadProgress = React.useMemo(() => {
    const progress = {};
    Object.entries(albumUploadItems).forEach(([albumId, items]) => {
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }
      const completed = items.filter((item) => item?.status === "done").length;
      progress[albumId] = { total: items.length, completed };
    });
    return progress;
  }, [albumUploadItems]);
  const [mediaPreviewMap, setMediaPreviewMap] = React.useState({});
  const mediaPreviewInFlight = React.useRef(new Set());
  const applyMediaPreviewEntry = React.useCallback(({ objectKey, entry }) => {
    if (!objectKey || !entry) {
      return;
    }
    setMediaPreviewMap((prev) => {
      const prevEntry = prev[objectKey];
      if (
        prevEntry &&
        prevEntry.url === entry.url &&
        prevEntry.error === entry.error &&
        prevEntry.expiresAt === entry.expiresAt
      ) {
        return prev;
      }
      return { ...prev, [objectKey]: entry };
    });
  }, []);
  React.useEffect(() => {
    setMediaPreviewMap({});
    mediaPreviewInFlight.current.clear();
  }, [babyIdFromParams]);
  const albums = React.useMemo(() => {
    const raw = albumsData?.json;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw;
  }, [albumsData?.json]);

  const albumMediaMap = React.useMemo(() => {
    const grouped = {};
    mediaItems.forEach((item) => {
      const key = item?.album_id ?? UNASSIGNED_ALBUM_KEY;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    return grouped;
  }, [mediaItems]);

  const reminders = React.useMemo(() => {
    const raw = remindersData?.json;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw;
  }, [remindersData?.json]);

  const dobLabel = formatDate(babyRecord?.date_of_birth, "MMMM D, YYYY");
  const ageLabel = formatDistance(babyRecord?.date_of_birth);
  const createdAtLabel = formatDate(babyRecord?.created_at, "MMMM D, YYYY");

  const stats = React.useMemo(
    () => [
      { label: "Albums", value: albums.length },
      { label: "Memories", value: totalMediaCount },
      { label: "Timeline", value: timelineEntries.length },
      { label: "Reminders", value: reminders.length },
    ],
    [albums.length, totalMediaCount, timelineEntries.length, reminders.length],
  );
  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const avatarKeyRef = React.useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [avatarUploadError, setAvatarUploadError] = React.useState(null);
  const editingAlbumId = editingAlbum?.album_id ?? null;
  const editingAlbumTitle = editingAlbum?.title?.trim() || "Untitled Folder";
  const descriptionLength = descriptionDraft.length;
  const isDeleteButtonEnabled =
    deleteConfirmationText.trim() === babyRecord?.name?.trim() && !isDeletingBaby;
  const withCacheBust = React.useCallback((url) => {
    if (!url) {
      return null;
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}cb=${Date.now()}`;
  }, []);
  const showInlineMessage = React.useCallback(
    (message) => {
      if (!message) {
        return;
      }
      if (!showToast(message)) {
        setAlbumFeedback(message);
      }
    },
    [setAlbumFeedback],
  );

  const logDescriptionEvent = React.useCallback((status, albumId, length) => {
    if (!albumId) {
      return;
    }
    console.log("analytics", {
      event: "album.short_description.update",
      album_id: albumId,
      status,
      length,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const resolveDescriptionErrorMessage = React.useCallback((error) => {
    const status = typeof error?.status === "number" ? error.status : undefined;
    const code = typeof error?.message === "string" ? error.message : "";
    if (code === "description_too_long" || code === "short_description_too_long") {
      return `Short description must be ${SHORT_DESCRIPTION_MAX_LEN} characters or less.`;
    }
    if (code === "not_authorized" || code === "http_403" || status === 403) {
      return "You don't have permission to edit this album.";
    }
    if (status === 401 || code === "missing_auth_token") {
      return "You don't have permission to edit this album.";
    }
    return "Couldn't save changes. Please try again.";
  }, []);

  const albumUpdateMutation = useAlbumUpdateDescription();
  const isSaveButtonDisabled = !isDescriptionDirty || albumUpdateMutation.isLoading;

  const { mutateAsync: mintViewAsync } = useMintView();
  const supabaseBabyUpdatePATCH = SupabaseDearBabyApi.useBabiesUpdatePATCH();
  const supabaseAlbumsInsertPOST = SupabaseDearBabyApi.useAlbumsInsertPOST();
  const supabaseMintAvatarUpload$EdgeFunction$POST =
    SupabaseDearBaby2Api.useMintAvatarUpload$EdgeFunction$POST();
  const { mutateAsync: finalizeUploadAsync } = useFinalizeUpload();
  const { mutateAsync: mintUploadAsync } = useMintUpload();

  // Family & Access - Invite mutations
  const { mutateAsync: createBabyInviteAsync } = SupabaseDearBabyApi.useCreateBabyInviteRPC();
  const { mutateAsync: sendBabyInviteEmailAsync } =
    SupabaseDearBabyApi.useSendBabyInviteEmailPOST();

  const handleOpenOptionsSheet = React.useCallback((album) => {
    if (!album?.album_id) {
      return;
    }
    setOptionsSheetAlbum(album);
    setOptionsSheetVisible(true);
  }, []);

  const handleCloseOptionsSheet = React.useCallback(() => {
    setOptionsSheetVisible(false);
    setOptionsSheetAlbum(null);
  }, []);

  const handleOpenDescriptionEditor = React.useCallback((album) => {
    if (!album?.album_id) {
      return;
    }
    const initialValue = typeof album?.description_md === "string" ? album.description_md : "";
    serverDescriptionRef.current = initialValue;
    setDescriptionDraft(initialValue);
    setIsDescriptionDirty(false);
    setEditingAlbum(album);
    setDescriptionModalVisible(true);
    setOptionsSheetVisible(false);
    setOptionsSheetAlbum(null);
    setIsDescriptionFocused(false);
  }, []);

  const handleCloseDescriptionEditor = React.useCallback(() => {
    setDescriptionModalVisible(false);
    setEditingAlbum(null);
    setDescriptionDraft("");
    setIsDescriptionDirty(false);
    setIsDescriptionFocused(false);
    serverDescriptionRef.current = "";
  }, []);

  const handleOpenDeleteModal = React.useCallback(() => {
    setDeleteModalVisible(true);
    setDeleteConfirmationText("");
    setDeleteError("");
  }, []);

  const handleCloseDeleteModal = React.useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteConfirmationText("");
    setDeleteError("");
  }, []);

  const handleOpenBabyOptionsSheet = React.useCallback(() => {
    setBabyOptionsSheetVisible(true);
  }, []);

  const handleCloseBabyOptionsSheet = React.useCallback(() => {
    setBabyOptionsSheetVisible(false);
  }, []);

  // Family & Access - Invite handlers
  const handleOpenInviteModal = React.useCallback(() => {
    setInviteEmail("");
    setInviteRole("editor");
    setInviteError("");
    setInviteModalVisible(true);
  }, []);

  const handleCloseInviteModal = React.useCallback(() => {
    setInviteModalVisible(false);
    setInviteEmail("");
    setInviteRole("editor");
    setInviteError("");
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvite = React.useCallback(async () => {
    const trimmedEmail = inviteEmail.trim();

    // Validation
    if (!trimmedEmail) {
      setInviteError("Please enter an email address");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setInviteError("Please enter a valid email address");
      return;
    }

    if (!derivedBabyId) {
      setInviteError("No baby selected");
      return;
    }

    setIsSendingInvite(true);
    setInviteError("");

    try {
      // Step 1: Create the invite
      console.log("[InvitePartner] Creating invite with params:", {
        baby_id: derivedBabyId,
        invited_email: trimmedEmail,
        role: inviteRole || "editor",
      });

      const inviteResult = await createBabyInviteAsync({
        baby_id: derivedBabyId,
        invited_email: trimmedEmail,
        role: inviteRole || "editor",
      });

      console.log("[InvitePartner] RPC result:", {
        inviteResult,
        hasError: hasResponseError(inviteResult),
        status: inviteResult?.status,
        json: inviteResult?.json,
        error: inviteResult?.error,
      });

      if (!inviteResult || hasResponseError(inviteResult)) {
        const errorMsg = extractServerErrorMessage(
          inviteResult?.error || inviteResult,
          "We couldn't create the invite. Please try again.",
        );
        console.error("[InvitePartner] RPC failed:", errorMsg);
        setInviteError(errorMsg);
        setIsSendingInvite(false);
        return;
      }

      const inviteData = inviteResult?.json;
      let invite = null;

      console.log("[InvitePartner] Parsing invite data:", {
        inviteData,
        isArray: Array.isArray(inviteData),
        isObject: typeof inviteData === "object",
      });

      if (Array.isArray(inviteData) && inviteData.length > 0) {
        invite = inviteData[0];
      } else if (inviteData && typeof inviteData === "object") {
        invite = inviteData;
      }

      console.log("[InvitePartner] Parsed invite:", invite);

      if (!invite || !invite.invite_id) {
        console.error("[InvitePartner] No invite_id found in response");
        setInviteError("We couldn't create the invite. Please try again.");
        setIsSendingInvite(false);
        return;
      }

      // Step 2: Send the email
      try {
        console.log("[InvitePartner] Sending email for invite_id:", invite.invite_id);
        const emailResult = await sendBabyInviteEmailAsync({
          invite_id: invite.invite_id,
        });

        console.log("[InvitePartner] Email result:", {
          emailResult,
          hasError: hasResponseError(emailResult),
          status: emailResult?.status,
        });

        if (hasResponseError(emailResult)) {
          console.error("[InvitePartner] send-baby-invite-email error", emailResult);
          setInviteError("We created the invite, but couldn't send the email. Please try again.");
          setIsSendingInvite(false);
          return;
        }
      } catch (emailError) {
        console.error("[InvitePartner] send-baby-invite-email exception", emailError);
        setInviteError("We created the invite, but couldn't send the email. Please try again.");
        setIsSendingInvite(false);
        return;
      }

      // Success!
      console.log("[InvitePartner] Success! Invite created and email sent.");
      setIsSendingInvite(false);
      handleCloseInviteModal();

      // Refetch caregivers to show the updated list
      refetchCaregivers();

      // Show success toast
      showToast({
        title: "Invite sent ✨",
        message: `We've sent a private invite to ${trimmedEmail}. Once they join, you'll see them here.`,
        preset: "done",
      });
    } catch (error) {
      console.error("Error sending invite:", error);
      const errorMsg = extractServerErrorMessage(error, "Something went wrong. Please try again.");
      setInviteError(errorMsg);
      setIsSendingInvite(false);
    }
  }, [
    inviteEmail,
    inviteRole,
    derivedBabyId,
    createBabyInviteAsync,
    sendBabyInviteEmailAsync,
    handleCloseInviteModal,
    refetchCaregivers,
  ]);

  const handleOpenEditBabyModal = React.useCallback(() => {
    if (!babyRecord) {
      return;
    }
    setEditBabyName(babyRecord.name ?? "");
    setEditBabyDateOfBirth(babyRecord.date_of_birth ?? "");
    setEditBabyGender(babyRecord.gender ?? "");
    setEditBabyError("");
    setDobError("");

    // Parse existing DOB into day/month/year
    if (babyRecord.date_of_birth) {
      try {
        const date = new Date(babyRecord.date_of_birth);
        setDobDay(String(date.getDate()));
        setDobMonth(String(date.getMonth() + 1));
        setDobYear(String(date.getFullYear()));
      } catch (error) {
        console.error("Failed to parse date of birth", error);
        setDobDay("");
        setDobMonth("");
        setDobYear("");
      }
    } else {
      setDobDay("");
      setDobMonth("");
      setDobYear("");
    }

    setBabyOptionsSheetVisible(false);
    setShowEditBabyModal(true);
  }, [babyRecord]);

  const handleCloseEditBabyModal = React.useCallback(() => {
    setShowEditBabyModal(false);
    setEditBabyName("");
    setEditBabyDateOfBirth("");
    setEditBabyGender("");
    setEditBabyError("");
    setDobDay("");
    setDobMonth("");
    setDobYear("");
    setDobError("");
    setActiveDobPicker(null);
  }, []);

  const handleUpdateBaby = React.useCallback(async () => {
    const trimmedName = editBabyName.trim();
    if (!trimmedName) {
      setEditBabyError("Baby name is required.");
      return;
    }
    if (!derivedBabyId) {
      setEditBabyError("Unable to identify baby for update.");
      return;
    }

    // Validate and build DOB if all parts are provided
    let dobIso = undefined;
    if (dobDay || dobMonth || dobYear) {
      // If any part is provided, all parts must be provided
      if (!dobDay || !dobMonth || !dobYear) {
        setDobError("Please select a valid date of birth.");
        return;
      }

      // Validate the date
      const dayNum = parseInt(dobDay, 10);
      const monthNum = parseInt(dobMonth, 10);
      const yearNum = parseInt(dobYear, 10);

      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        setDobError("Please select a valid day (1-31).");
        return;
      }
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        setDobError("Please select a valid month (1-12).");
        return;
      }
      if (isNaN(yearNum)) {
        setDobError("Please select a valid year.");
        return;
      }

      // Build ISO date string
      const paddedMonth = String(monthNum).padStart(2, "0");
      const paddedDay = String(dayNum).padStart(2, "0");
      dobIso = `${yearNum}-${paddedMonth}-${paddedDay}`;

      // Validate the date is real (e.g., not Feb 30)
      try {
        const testDate = new Date(dobIso);
        if (
          testDate.getDate() !== dayNum ||
          testDate.getMonth() + 1 !== monthNum ||
          testDate.getFullYear() !== yearNum
        ) {
          setDobError("Please select a valid date.");
          return;
        }
      } catch (error) {
        setDobError("Please select a valid date.");
        return;
      }
    }

    setEditBabyError("");
    setDobError("");
    setIsUpdatingBaby(true);
    try {
      await supabaseBabyUpdatePATCH.mutateAsync({
        baby_id: derivedBabyId,
        name: trimmedName,
        date_of_birth: dobIso,
        gender: editBabyGender || undefined,
      });

      // Refetch baby data
      await refetchBaby?.();

      // Close modal
      handleCloseEditBabyModal();

      // Show success message
      showToast("Baby profile updated successfully!");
    } catch (error) {
      console.error("Failed to update baby", error);
      setEditBabyError(error?.message ?? "We couldn't update this baby profile. Try again.");
    } finally {
      setIsUpdatingBaby(false);
    }
  }, [
    editBabyName,
    dobDay,
    dobMonth,
    dobYear,
    editBabyGender,
    derivedBabyId,
    supabaseBabyUpdatePATCH,
    refetchBaby,
    handleCloseEditBabyModal,
  ]);

  const handleDeleteBaby = React.useCallback(async () => {
    if (!derivedBabyId || !babyRecord?.name) {
      setDeleteError("Unable to identify baby for deletion.");
      return;
    }

    const trimmedInput = deleteConfirmationText.trim();
    const babyName = babyRecord.name.trim();

    if (trimmedInput !== babyName) {
      setDeleteError(`Name doesn't match. Please type "${babyName}" exactly.`);
      return;
    }

    setDeleteError("");
    setIsDeletingBaby(true);

    try {
      // Delete the baby using the API
      await supabaseBabyUpdatePATCH.mutateAsync({
        baby_id: derivedBabyId,
        deleted_at: new Date().toISOString(),
      });

      // Clear all cached data
      queryClient.invalidateQueries();

      // Show success message
      showToast("Baby profile and all associated data have been deleted.");

      // Navigate away to the home screen (BottomTabNavigator > index)
      navigation.navigate("BottomTabNavigator", { screen: "index" });
    } catch (error) {
      console.error("Failed to delete baby", error);
      setDeleteError(error?.message ?? "We couldn't delete this profile. Please try again.");
    } finally {
      setIsDeletingBaby(false);
    }
  }, [
    derivedBabyId,
    babyRecord?.name,
    deleteConfirmationText,
    supabaseBabyUpdatePATCH,
    queryClient,
    navigation,
  ]);

  const handleDescriptionChange = React.useCallback((text) => {
    let nextValue = typeof text === "string" ? text : "";
    if (nextValue.length > SHORT_DESCRIPTION_MAX_LEN) {
      nextValue = nextValue.slice(0, SHORT_DESCRIPTION_MAX_LEN);
    }
    setDescriptionDraft(nextValue);
    setIsDescriptionDirty(nextValue !== (serverDescriptionRef.current ?? ""));
  }, []);

  const handleSaveDescription = React.useCallback(() => {
    if (!editingAlbumId || albumUpdateMutation.isLoading) {
      return;
    }
    const draftValue = typeof descriptionDraft === "string" ? descriptionDraft : "";
    const trimmedValue = draftValue.trim();
    if (trimmedValue.length > SHORT_DESCRIPTION_MAX_LEN) {
      const message = `Short description must be ${SHORT_DESCRIPTION_MAX_LEN} characters or less.`;
      showInlineMessage(message);
      return;
    }
    albumUpdateMutation.mutate(
      { album_id: editingAlbumId, description_md: trimmedValue },
      {
        onMutate: async (variables) => {
          const nextDescription =
            typeof variables?.description_md === "string" ? variables.description_md : "";
          await queryClient.cancelQueries(albumsQueryKey);
          const previousAlbums = queryClient.getQueryData(albumsQueryKey);
          const previousServerDescription = serverDescriptionRef.current ?? "";
          serverDescriptionRef.current = nextDescription;
          queryClient.setQueryData(albumsQueryKey, (current) => {
            if (!current) {
              return current;
            }
            const currentJson = Array.isArray(current.json) ? current.json : [];
            const nextJson = currentJson.map((item) =>
              item?.album_id === editingAlbumId
                ? { ...item, description_md: nextDescription }
                : item,
            );
            return { ...current, json: nextJson };
          });
          setDescriptionDraft(nextDescription);
          setIsDescriptionDirty(false);
          logDescriptionEvent("pending", editingAlbumId, nextDescription.length);
          return {
            previousAlbums,
            previousServerDescription,
            attemptedLength: nextDescription.length,
          };
        },
        onSuccess: (data, variables) => {
          const updatedDescription =
            typeof data?.description_md === "string"
              ? data.description_md
              : typeof data?.description === "string"
                ? data.description
                : typeof variables?.description_md === "string"
                  ? variables.description_md
                  : "";
          serverDescriptionRef.current = updatedDescription;
          queryClient.setQueryData(albumsQueryKey, (current) => {
            if (!current) {
              return current;
            }
            const currentJson = Array.isArray(current.json) ? current.json : [];
            const nextJson = currentJson.map((item) =>
              item?.album_id === editingAlbumId
                ? { ...item, description_md: updatedDescription }
                : item,
            );
            return { ...current, json: nextJson };
          });
          setDescriptionDraft(updatedDescription);
          setIsDescriptionDirty(false);
          setDescriptionModalVisible(false);
          setEditingAlbum(null);
          showInlineMessage("Saved");
          logDescriptionEvent("success", editingAlbumId, updatedDescription.length);
        },
        onError: (error, _variables, context) => {
          const previousDescription = context?.previousServerDescription ?? "";
          serverDescriptionRef.current = previousDescription;
          setDescriptionDraft(previousDescription);
          setIsDescriptionDirty(false);
          if (context?.previousAlbums) {
            queryClient.setQueryData(albumsQueryKey, context.previousAlbums);
          }
          const message = resolveDescriptionErrorMessage(error);
          showInlineMessage(message);
          logDescriptionEvent(
            "error",
            editingAlbumId,
            context?.attemptedLength ?? trimmedValue.length,
          );
        },
        onSettled: () => {
          queryClient.invalidateQueries(albumsQueryKey);
        },
      },
    );
  }, [
    albumUpdateMutation,
    albumsQueryKey,
    descriptionDraft,
    editingAlbumId,
    logDescriptionEvent,
    queryClient,
    resolveDescriptionErrorMessage,
    showInlineMessage,
  ]);
  const upsertAlbumUploadItem = React.useCallback((albumId, uploadId, updater) => {
    if (!albumId || !uploadId) {
      return;
    }
    setAlbumUploadItems((prev) => {
      const currentItems = prev[albumId] ?? [];
      const existingIndex = currentItems.findIndex((item) => item?.id === uploadId);
      let nextItems;
      if (existingIndex === -1) {
        const baseValue = typeof updater === "function" ? updater(null) : updater;
        const newItem = { id: uploadId, ...(baseValue ?? {}) };
        nextItems = [...currentItems, newItem];
      } else {
        const existing = currentItems[existingIndex];
        const updateValue = typeof updater === "function" ? updater(existing) : updater;
        nextItems = currentItems.slice();
        nextItems[existingIndex] = { ...existing, ...(updateValue ?? {}) };
      }
      return { ...prev, [albumId]: nextItems };
    });
  }, []);

  const clearAlbumUploadItems = React.useCallback((albumId) => {
    if (!albumId) {
      return;
    }
    setAlbumUploadItems((prev) => {
      if (!prev[albumId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[albumId];
      return next;
    });
  }, []);

  const canCreateAlbum = React.useMemo(() => albumTitle.trim().length > 0, [albumTitle]);

  React.useEffect(() => {
    const prepare = async () => {
      try {
        await prewarm_media_pipeline();
      } catch (error) {
        console.error("Failed to prewarm media pipeline", error);
      }
    };
    prepare();
  }, []);

  React.useEffect(() => {
    const objectKey = babyRecord?.avatar_object_key;
    if (!objectKey || !mintViewAsync) {
      avatarKeyRef.current = null;
      setAvatarUrl(null);
      return;
    }
    if (avatarKeyRef.current === objectKey) {
      return;
    }
    let isMounted = true;
    const mintAvatar = async () => {
      try {
        const response = await mintViewAsync({ objectKey });
        if (!isMounted) {
          return;
        }
        const url = resolveSignedUrl(response);
        avatarKeyRef.current = objectKey;
        setAvatarUrl(withCacheBust(url));
      } catch (error) {
        console.error("Failed to mint avatar view URL", error);
        if (isMounted) {
          setAvatarUrl(null);
        }
      }
    };
    mintAvatar();
    return () => {
      isMounted = false;
    };
  }, [babyRecord?.avatar_object_key, mintViewAsync, withCacheBust]);

  React.useEffect(() => {
    if (!albumFeedback) {
      return undefined;
    }
    const timer = setTimeout(() => setAlbumFeedback(""), 3200);
    return () => clearTimeout(timer);
  }, [albumFeedback]);

  React.useEffect(() => {
    if (hasAutoOpenedComposer || showAlbumComposer) {
      return undefined;
    }
    if (isAlbumsLoading) {
      return undefined;
    }
    const albumsErrored = hasResponseError(albumsData) || !!albumsError;
    if (!albumsErrored && albums.length === 0) {
      setShowAlbumComposer(true);
      setHasAutoOpenedComposer(true);
    }
    return undefined;
  }, [
    albums.length,
    albumsData,
    albumsError,
    hasAutoOpenedComposer,
    isAlbumsLoading,
    showAlbumComposer,
  ]);

  React.useEffect(() => {
    if (!mintViewAsync) {
      return undefined;
    }

    const keysToFetch = mediaItems
      .map((item) => resolveMediaObjectKey(item))
      .filter(Boolean)
      .filter((key) => !mediaPreviewMap[key] && !mediaPreviewInFlight.current.has(key));

    if (!keysToFetch.length) {
      return undefined;
    }

    let isActive = true;

    const fetchPreviews = async () => {
      for (const key of keysToFetch) {
        mediaPreviewInFlight.current.add(key);
        try {
          const response = await mintViewAsync({ objectKey: key });
          if (!isActive) {
            return;
          }
          const url = resolveSignedUrl(response);
          if (url) {
            applyMediaPreviewEntry({
              objectKey: key,
              entry: {
                url,
                error: null,
                fetchedAt: Date.now(),
                expiresAt: null,
              },
            });
          }
        } catch (previewError) {
          console.error("Failed to mint media view URL", previewError);
        } finally {
          mediaPreviewInFlight.current.delete(key);
        }
      }
    };

    fetchPreviews();

    return () => {
      isActive = false;
    };
  }, [applyMediaPreviewEntry, mediaItems, mediaPreviewMap, mintViewAsync]);

  const handleAvatarPress = React.useCallback(async () => {
    if (!derivedBabyId || isUploadingAvatar) {
      return;
    }

    setAvatarUploadError(null);
    setIsUploadingAvatar(true);
    try {
      const picker = await openImagePickerUtil({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 1,
        allowsMultipleSelection: false,
        selectionLimit: 0,
        outputBase64: true,
      });

      if (!picker) {
        return;
      }

      const prep = await prepare_jpeg_and_size(picker, 512, 0.82);
      if (!prep?.uri || !prep?.bytes) {
        throw new Error("Failed to prepare image");
      }

      const mintResp = (
        await supabaseMintAvatarUpload$EdgeFunction$POST.mutateAsync({
          bytes: prep.bytes,
          content_type: "image/jpeg",
          mimeType: "image/jpeg",
          target: "avatar",
        })
      )?.json;

      const uploadUrl = mintResp?.data?.uploadUrl;
      const objectKey = mintResp?.data?.objectKey;

      if (!uploadUrl || !objectKey) {
        throw new Error("Upload URL not returned");
      }

      await put_to_signed_url_xplat(uploadUrl, prep.uri);

      await supabaseBabyUpdatePATCH.mutateAsync({
        baby_id: derivedBabyId,
        avatar_object_key: objectKey,
      });

      if (mintViewAsync) {
        try {
          const viewResp = await mintViewAsync({ objectKey });
          const mintedUrl = resolveSignedUrl(viewResp);
          setAvatarUrl(withCacheBust(mintedUrl));
          avatarKeyRef.current = objectKey;
        } catch (error) {
          console.error("Failed to mint updated baby avatar", error);
        }
      }
      await refetchBaby?.();
    } catch (error) {
      console.error("Failed to update baby avatar", error);
      setAvatarUploadError("We couldn't update this photo. Try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [
    derivedBabyId,
    isUploadingAvatar,
    mintViewAsync,
    refetchBaby,
    supabaseBabyUpdatePATCH,
    supabaseMintAvatarUpload$EdgeFunction$POST,
    withCacheBust,
  ]);

  const handleCreateAlbum = React.useCallback(async () => {
    const trimmedName = albumTitle.trim();
    if (!trimmedName) {
      setAlbumFormError("Folder name is required.");
      return;
    }
    if (!derivedBabyId) {
      setAlbumFormError("Link a baby before creating folders.");
      return;
    }
    if (!currentUserId) {
      setAlbumFormError("Sign in to create folders.");
      return;
    }

    setAlbumFormError("");
    setIsCreatingAlbum(true);
    try {
      await supabaseAlbumsInsertPOST.mutateAsync({
        baby_id: derivedBabyId,
        title: trimmedName,
        created_by: currentUserId,
      });
      setShowAlbumComposer(false);
      setAlbumTitle("");
      setAlbumFeedback("Folder created successfully.");
      await refetchAlbums?.();
    } catch (error) {
      console.error("Failed to create album", error);
      setAlbumFormError(error?.message ?? "We couldn't create that folder. Try again.");
    } finally {
      setIsCreatingAlbum(false);
    }
  }, [albumTitle, currentUserId, derivedBabyId, refetchAlbums, supabaseAlbumsInsertPOST]);

  const getJpegFileName = React.useCallback((asset, index) => {
    const timestamp = Date.now();
    const rawName = asset?.fileName || asset?.name || "";
    const base = rawName.replace(/\.[^/.]+$/, "") || `photo-${timestamp}-${index}`;
    const safeBase = base.replace(/[^a-zA-Z0-9-_]+/g, "_") || `photo-${timestamp}-${index}`;
    return `${safeBase}.jpg`;
  }, []);

  const mintAlbumUpload = React.useCallback(
    async ({ albumId, babyId, bytes, fileName }) => {
      const payload = {
        target: MEDIA_UPLOAD_TARGET,
        babyId,
        albumId,
        mimeType: "image/jpeg",
        bytes,
        filename: fileName,
      };

      const data = await mintUploadAsync(payload);
      console.log("[AlbumUpload] Mint parsed payload", data);
      return data ?? {};
    },
    [mintUploadAsync],
  );

  const handleAddPhotosToAlbum = React.useCallback(
    async (album) => {
      const albumId = album?.album_id;
      if (!albumId) {
        return;
      }
      const albumName = album?.title?.trim() || "this folder";
      if (!derivedBabyId) {
        setAlbumUploadErrors((prev) => ({
          ...prev,
          [albumId]: "Link a baby before uploading.",
        }));
        return;
      }
      if (!currentUserId) {
        setAlbumUploadErrors((prev) => ({
          ...prev,
          [albumId]: "Sign in before uploading.",
        }));
        return;
      }

      let lastMintResponse = null;
      let lastFinalizeResponse = null;
      const uploadJobs = [];
      let successfulFinalizations = 0;
      let hadFinalizeErrors = false;

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
          setAlbumFeedback(`No photos were selected for ${albumName}.`);
          return;
        }

        setAlbumUploadErrors((prev) => {
          const next = { ...prev };
          delete next[albumId];
          return next;
        });

        clearAlbumUploadItems(albumId);

        assets.forEach((asset, index) => {
          const fileName = getJpegFileName(asset, index);
          const uploadId = `${albumId}-${Date.now()}-${index}-${Math.random().toString(36).slice(-4)}`;
          uploadJobs.push({ asset, index, uploadId, fileName });
          upsertAlbumUploadItem(albumId, uploadId, {
            fileName,
            status: "minting",
            objectKey: null,
            errorMessage: null,
            finalizePayload: null,
          });
        });

        if (!uploadJobs.length) {
          return;
        }

        setAlbumUploadState((prev) => ({ ...prev, [albumId]: true }));

        for (const job of uploadJobs) {
          const uploadId = job.uploadId;
          const uploadAsset = job.asset;
          let fileName = job.fileName;

          // Prepare the image - this handles HEIC to JPG conversion, resizing, and sizing
          let prepared;
          try {
            prepared = await prepare_jpeg_and_size(uploadAsset, 2048, 0.85);
            console.log("[BabyProfile] Image preparation success", {
              fileName,
              preparedUri: prepared?.uri,
              bytes: prepared?.bytes,
              width: prepared?.width,
              height: prepared?.height,
            });

            // Update fileName if needed (e.g., HEIC -> JPG)
            if (fileName && fileName.match(/\.heic$/i)) {
              fileName = fileName.replace(/\.heic$/i, ".jpg");
              job.fileName = fileName;
              upsertAlbumUploadItem(albumId, uploadId, (current) => ({
                ...current,
                fileName,
              }));
            }
          } catch (prepError) {
            console.error("[BabyProfile] Image preparation failed", {
              fileName,
              error: prepError,
              message: prepError?.message,
            });
            const errorMessage = prepError?.message ?? PHOTO_PREP_ERROR_MESSAGE;
            upsertAlbumUploadItem(albumId, uploadId, (current) => ({
              ...current,
              status: "error",
              errorMessage,
            }));
            Alert.alert("Upload issue", errorMessage);
            throw prepError;
          }

          const fileUri = prepared?.uri;
          const bytes = prepared?.bytes ?? 0;
          if (!fileUri || !bytes) {
            const processingError = new Error("Image processing failed.");
            upsertAlbumUploadItem(albumId, uploadId, (current) => ({
              ...current,
              status: "error",
              errorMessage: processingError.message,
            }));
            throw processingError;
          }

          upsertAlbumUploadItem(albumId, uploadId, (current) => ({
            ...current,
            status: "minting",
            bytes,
            width: prepared?.width ?? uploadAsset?.width ?? null,
            height: prepared?.height ?? uploadAsset?.height ?? null,
            errorMessage: null,
          }));

          console.log("[AlbumUpload] Mint request", {
            albumId,
            babyId: derivedBabyId,
            target: MEDIA_UPLOAD_TARGET,
            fileName,
            bytes,
          });

          const mintData = await mintAlbumUpload({
            albumId,
            babyId: derivedBabyId,
            bytes,
            fileName,
          });
          lastMintResponse = mintData;

          console.log("[AlbumUpload] Mint response", mintData);

          const uploadUrl =
            mintData?.uploadUrl ??
            mintData?.upload_url ??
            mintData?.parUrl ??
            mintData?.par_url ??
            mintData?.signedUrl ??
            mintData?.signed_url;
          const objectKey =
            mintData?.objectKey ??
            mintData?.object_key ??
            mintData?.key ??
            mintData?.objectKey ??
            null;

          if (!uploadUrl || !objectKey) {
            console.error("[AlbumUpload] Mint payload missing credentials", {
              albumId,
              babyId: derivedBabyId,
              response: mintData,
            });
            upsertAlbumUploadItem(albumId, uploadId, (current) => ({
              ...current,
              status: "error",
              errorMessage: "Upload credentials were not returned.",
            }));
            throw new Error("Upload credentials were not returned.");
          }

          upsertAlbumUploadItem(albumId, uploadId, (current) => ({
            ...current,
            status: "putting",
            objectKey,
            errorMessage: null,
          }));

          await put_to_signed_url_xplat(uploadUrl, fileUri);
          console.log("[AlbumUpload] PUT upload success", {
            albumId,
            uploadId,
            objectKey,
          });

          const finalizePayload = {
            babyId: derivedBabyId,
            albumId,
            objectKey,
            originalFilename: fileName,
            mimeType: "image/jpeg",
            bytes,
            width: prepared?.width ?? uploadAsset?.width ?? null,
            height: prepared?.height ?? uploadAsset?.height ?? null,
            exif: null,
          };

          upsertAlbumUploadItem(albumId, uploadId, (current) => ({
            ...current,
            status: "finalizing",
            finalizePayload,
            errorMessage: null,
          }));

          try {
            console.log("[AlbumUpload] Finalize request", {
              albumId,
              uploadId,
              objectKey,
            });
            const finalizeResponse = await finalizeUploadAsync(finalizePayload);
            lastFinalizeResponse = finalizeResponse;
            successfulFinalizations += 1;

            console.log("[AlbumUpload] Finalize response", finalizeResponse);

            // Wait a moment for the database to fully commit the changes
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Invalidate ALL queries that might contain album or media data
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                if (!Array.isArray(key)) return false;
                // Invalidate any query that includes "Get current users" (for albums/media)
                if (key[0] === "Get current users") return true;
                // Also invalidate specific media/album queries
                if (key.includes("media_assets") || key.includes("albums")) return true;
                return false;
              },
            });

            // Force refetch with multiple retries to ensure we get updated data
            const refetchWithRetry = async (refetchFn, name) => {
              for (let retry = 0; retry < 3; retry++) {
                try {
                  const result = await refetchFn();
                  console.log(`[AlbumUpload] ${name} refetch success (attempt ${retry + 1})`, {
                    albumId,
                    uploadId,
                    objectKey,
                  });
                  return result;
                } catch (error) {
                  console.warn(`[AlbumUpload] ${name} refetch failed (attempt ${retry + 1})`, {
                    albumId,
                    uploadId,
                    objectKey,
                    message: error?.message,
                  });
                  if (retry < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 200));
                  }
                }
              }
            };

            const refetchPromises = [];
            if (typeof refetchMedia === "function") {
              refetchPromises.push(refetchWithRetry(refetchMedia, "Media"));
            }
            if (typeof refetchAlbums === "function") {
              refetchPromises.push(refetchWithRetry(refetchAlbums, "Albums"));
            }
            if (refetchPromises.length) {
              await Promise.allSettled(refetchPromises);
            }

            if (mintViewAsync) {
              try {
                const previewResponse = await mintViewAsync({ objectKey });
                const mintedUrl = resolveSignedUrl(previewResponse);
                if (mintedUrl) {
                  applyMediaPreviewEntry({
                    objectKey,
                    entry: {
                      url: mintedUrl,
                      error: null,
                      fetchedAt: Date.now(),
                      expiresAt: null,
                    },
                  });
                }
              } catch (previewError) {
                console.error("[AlbumUpload] Mint view after finalize failed", {
                  albumId,
                  uploadId,
                  objectKey,
                  message: previewError?.message,
                });
              }
            }

            upsertAlbumUploadItem(albumId, uploadId, (current) => ({
              ...current,
              status: "done",
              finalizePayload,
              errorMessage: null,
              finalizedAt: new Date().toISOString(),
            }));
          } catch (finalizeError) {
            hadFinalizeErrors = true;
            console.error("[AlbumUpload] Finalize failed", {
              albumId,
              uploadId,
              objectKey,
              message: finalizeError?.message,
              status: finalizeError?.status,
              body: finalizeError?.body,
              payload: finalizeError?.payload ?? null,
            });
            const serverMessage = extractServerErrorMessage(
              finalizeError,
              "Finalize failed. Tap retry.",
            );
            upsertAlbumUploadItem(albumId, uploadId, (current) => ({
              ...current,
              status: "error",
              errorMessage: serverMessage,
              finalizePayload,
              objectKey,
            }));
            setAlbumUploadErrors((prev) => ({
              ...prev,
              [albumId]: serverMessage,
            }));
            continue;
          }
        }
      } catch (error) {
        console.error("Failed to upload album media", {
          albumId,
          babyId: derivedBabyId,
          message: error?.message,
          status: error?.status,
          body: error?.body,
          stack: error?.stack,
          lastMintResponse,
          lastFinalizeResponse,
        });
        if (uploadJobs.length) {
          const serverMessage = extractServerErrorMessage(error, "Upload failed. Try again.");
          setAlbumUploadErrors((prev) => ({
            ...prev,
            [albumId]: serverMessage,
          }));
        }
      } finally {
        setAlbumUploadState((prev) => {
          const next = { ...prev };
          delete next[albumId];
          return next;
        });

        if (uploadJobs.length) {
          const toastMessage = `Uploaded ${successfulFinalizations} of ${uploadJobs.length}.`;
          showToast(toastMessage);
          if (hadFinalizeErrors) {
            setAlbumFeedback("Some photos still need attention. Tap Retry to finalize.");
          } else if (successfulFinalizations > 0) {
            setAlbumFeedback(`${toastMessage} Added to ${albumName}.`);
          } else {
            setAlbumFeedback(`No uploads were finalized for ${albumName}.`);
          }
        }

        if (!hadFinalizeErrors) {
          clearAlbumUploadItems(albumId);
          setAlbumUploadErrors((prev) => {
            const next = { ...prev };
            delete next[albumId];
            return next;
          });
        }
      }
    },
    [
      albumArgs,
      applyMediaPreviewEntry,
      clearAlbumUploadItems,
      currentUserId,
      derivedBabyId,
      finalizeUploadAsync,
      getJpegFileName,
      mediaArgs,
      mintAlbumUpload,
      mintViewAsync,
      queryClient,
      refetchAlbums,
      refetchMedia,
      upsertAlbumUploadItem,
    ],
  );

  const handleOpenAlbum = React.useCallback(
    (album) => {
      const targetAlbumId = album?.album_id ?? null;
      if (!targetAlbumId) {
        showInlineMessage("This folder is still getting ready. Try again soon.");
        return;
      }
      if (!derivedBabyId) {
        showInlineMessage("Link a baby before viewing folder photos.");
        return;
      }
      navigation.navigate("MainStack", {
        screen: "AlbumDetailScreen",
        params: {
          albumId: targetAlbumId,
          babyId: album?.baby_id ?? derivedBabyId,
          albumTitle: album?.title ?? null,
          babyName: babyRecord?.name ?? null,
        },
      });
    },
    [babyRecord?.name, derivedBabyId, navigation, showInlineMessage],
  );

  const handleRetryFinalizeItem = React.useCallback(
    async (albumId, uploadId) => {
      if (!albumId || !uploadId) {
        return;
      }
      const items = albumUploadItems[albumId] ?? [];
      const target = items.find((item) => item?.id === uploadId);
      const finalizePayload = target?.finalizePayload;
      if (!finalizePayload) {
        console.warn("[AlbumUpload] No finalize payload available for retry", {
          albumId,
          uploadId,
        });
        return;
      }

      upsertAlbumUploadItem(albumId, uploadId, (current) => ({
        ...current,
        status: "finalizing",
        errorMessage: null,
      }));

      try {
        console.log("[AlbumUpload] Finalize retry request", {
          albumId,
          uploadId,
          objectKey: finalizePayload?.objectKey,
        });
        const finalizeResponse = await finalizeUploadAsync(finalizePayload);
        console.log("[AlbumUpload] Finalize retry response", finalizeResponse);

        const objectKey = finalizePayload?.objectKey ?? finalizePayload?.object_key ?? null;

        if (objectKey && mintViewAsync) {
          try {
            const previewResponse = await mintViewAsync({ objectKey });
            const mintedUrl = resolveSignedUrl(previewResponse);
            if (mintedUrl) {
              applyMediaPreviewEntry({
                objectKey,
                entry: {
                  url: mintedUrl,
                  error: null,
                  fetchedAt: Date.now(),
                  expiresAt: null,
                },
              });
            }
          } catch (previewError) {
            console.error("[AlbumUpload] Mint view retry failed", {
              albumId,
              uploadId,
              objectKey,
              message: previewError?.message,
            });
          }
        }

        let hasErrorsRemaining = false;
        let allDone = false;
        setAlbumUploadItems((prev) => {
          const currentItems = prev[albumId] ?? [];
          const nextItems = currentItems.map((item) =>
            item.id === uploadId
              ? {
                  ...item,
                  status: "done",
                  errorMessage: null,
                  finalizedAt: new Date().toISOString(),
                }
              : item,
          );
          hasErrorsRemaining = nextItems.some((item) => item.status === "error");
          allDone = nextItems.length > 0 && nextItems.every((item) => item.status === "done");
          return { ...prev, [albumId]: nextItems };
        });

        if (!hasErrorsRemaining) {
          setAlbumUploadErrors((prev) => {
            const next = { ...prev };
            delete next[albumId];
            return next;
          });
        }

        if (allDone) {
          clearAlbumUploadItems(albumId);
        }

        // Wait for database to commit changes
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Invalidate ALL queries that might contain album or media data
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            if (!Array.isArray(key)) return false;
            if (key[0] === "Get current users") return true;
            if (key.includes("media_assets") || key.includes("albums")) return true;
            return false;
          },
        });

        // Refetch with retries
        const refetchPromises = [];
        if (typeof refetchMedia === "function") {
          refetchPromises.push(
            (async () => {
              for (let i = 0; i < 3; i++) {
                try {
                  await refetchMedia();
                  break;
                } catch (err) {
                  if (i < 2) await new Promise((r) => setTimeout(r, 200));
                }
              }
            })(),
          );
        }
        if (typeof refetchAlbums === "function") {
          refetchPromises.push(
            (async () => {
              for (let i = 0; i < 3; i++) {
                try {
                  await refetchAlbums();
                  break;
                } catch (err) {
                  if (i < 2) await new Promise((r) => setTimeout(r, 200));
                }
              }
            })(),
          );
        }
        await Promise.allSettled(refetchPromises);
        showToast("Finalize complete.");
      } catch (error) {
        console.error("[AlbumUpload] Finalize retry failed", {
          albumId,
          uploadId,
          message: error?.message,
          status: error?.status,
          body: error?.body,
          payload: error?.payload ?? null,
        });
        const serverMessage = extractServerErrorMessage(error, "Finalize failed. Try again.");
        upsertAlbumUploadItem(albumId, uploadId, (current) => ({
          ...current,
          status: "error",
          errorMessage: serverMessage,
        }));
        setAlbumUploadErrors((prev) => ({
          ...prev,
          [albumId]: serverMessage,
        }));
      }
    },
    [
      albumArgs,
      applyMediaPreviewEntry,
      albumUploadItems,
      clearAlbumUploadItems,
      finalizeUploadAsync,
      mediaArgs,
      mintViewAsync,
      queryClient,
      refetchAlbums,
      refetchMedia,
      upsertAlbumUploadItem,
    ],
  );

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        refetchBaby?.(),
        derivedBabyId ? refetchCaregivers?.() : Promise.resolve(),
        derivedBabyId ? refetchTimeline?.() : Promise.resolve(),
        derivedBabyId ? refetchMedia?.() : Promise.resolve(),
        derivedBabyId ? refetchMediaCount?.() : Promise.resolve(),
        derivedBabyId ? refetchAlbums?.() : Promise.resolve(),
        derivedBabyId ? refetchReminders?.() : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    derivedBabyId,
    refetchAlbums,
    refetchBaby,
    refetchCaregivers,
    refetchMedia,
    refetchMediaCount,
    refetchReminders,
    refetchTimeline,
  ]);

  const surfaceBaseStyle = StyleSheet.compose(GlobalStyles.SurfaceStyles(theme)["Surface"].style, {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    marginHorizontal: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  });

  const headlineStyle = StyleSheet.compose(GlobalStyles.TextStyles(theme)["Text 2"].style, {
    ...theme.typography.headline6,
    color: "#2C2C2C",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  });

  const bodyStyle = StyleSheet.compose(GlobalStyles.TextStyles(theme)["Text 2"].style, {
    ...theme.typography.body1,
    color: "#2C2C2C",
  });

  const secondaryTextStyle = StyleSheet.compose(GlobalStyles.TextStyles(theme)["Text 2"].style, {
    ...theme.typography.caption,
    color: "#7A7A7A",
  });

  const errorTextStyle = StyleSheet.compose(bodyStyle, {
    color: theme.colors.text.warning,
  });

  const renderLoadingState = (isLoading) =>
    isLoading ? (
      <ActivityIndicator
        color={theme.colors.branding.primary}
        size="small"
        style={StyleSheet.applyWidth({ marginVertical: 12 }, dimensions.width)}
      />
    ) : null;

  const babyHasError = hasResponseError(babyData) || !!babyError;
  const caregiversHasError = hasResponseError(caregiverData) || !!caregiverError;
  const timelineHasError = hasResponseError(timelineData) || !!timelineError;
  const mediaHasError = hasResponseError(mediaData) || !!mediaError;
  const albumsHasError = hasResponseError(albumsData) || !!albumsError;
  const remindersHasError = hasResponseError(remindersData) || !!remindersError;

  return (
    <ScreenContainer hasSafeArea scrollable={false} style={{ backgroundColor: "#FFF7F8" }}>
      <SimpleStyleScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === "web" ? undefined : (
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          )
        }
        style={StyleSheet.applyWidth(
          { paddingBottom: 32, backgroundColor: "#FFF7F8" },
          dimensions.width,
        )}
      >
        <Spacer top={24} right={0} bottom={0} left={0} />
        <Surface elevation={1} style={StyleSheet.applyWidth(surfaceBaseStyle, dimensions.width)}>
          {isBabyLoading ? (
            <ActivityIndicator
              color={theme.colors.branding.primary}
              size="small"
              style={StyleSheet.applyWidth({ marginVertical: 12 }, dimensions.width)}
            />
          ) : babyHasError ? (
            <Text
              accessibilityRole="text"
              style={StyleSheet.applyWidth(errorTextStyle, dimensions.width)}
            >
              We could not load this baby profile. Pull to refresh or navigate back.
            </Text>
          ) : !babyRecord ? (
            <Text style={StyleSheet.applyWidth(bodyStyle, dimensions.width)}>
              No baby selected yet. Link a baby from your profile to see details here.
            </Text>
          ) : (
            <>
              <View
                style={StyleSheet.applyWidth(
                  {
                    position: "relative",
                    minHeight: 40,
                    width: "100%",
                  },
                  dimensions.width,
                )}
              >
                {derivedBabyId && babyRecord ? (
                  <Pressable
                    onPress={handleOpenBabyOptionsSheet}
                    accessibilityRole="button"
                    accessibilityLabel="Baby profile options"
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    style={({ pressed }) =>
                      StyleSheet.applyWidth(
                        {
                          alignItems: "center",
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E2E2E2",
                          borderRadius: 16,
                          borderWidth: 1,
                          height: 32,
                          justifyContent: "center",
                          opacity: pressed ? 0.8 : 1,
                          position: "absolute",
                          right: 0,
                          top: 0,
                          width: 32,
                          zIndex: 10,
                          boxShadow:
                            Platform.OS === "web"
                              ? "0px 6px 10px rgba(0,0,0,0.14)"
                              : "0px 6px 10px rgba(0,0,0,0.2)",
                          pointerEvents: "auto",
                        },
                        dimensions.width,
                      )
                    }
                  >
                    <Text
                      style={{
                        color: "rgba(0,0,0,0.45)",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        letterSpacing: 2,
                        marginTop: Platform.OS === "ios" ? -2 : 0,
                      }}
                    >
                      •••
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View
                style={StyleSheet.applyWidth(
                  {
                    alignItems: "center",
                    marginBottom: 24,
                  },
                  dimensions.width,
                )}
              >
                <Touchable
                  onPress={handleAvatarPress}
                  disabled={!derivedBabyId || isUploadingAvatar}
                  accessibilityRole="button"
                  accessibilityHint={"Updates the baby's avatar"}
                >
                  <Surface
                    style={StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: "#C7CEEA",
                        borderRadius: 75,
                        height: 150,
                        justifyContent: "center",
                        overflow: "hidden",
                        width: 150,
                        borderWidth: 5,
                        borderColor: "#FFFFFF",
                        shadowColor: "#C7CEEA",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.4,
                        shadowRadius: 20,
                        elevation: 6,
                      },
                      dimensions.width,
                    )}
                  >
                    {avatarUrl ? (
                      <ExpoImage
                        cachePolicy="disk"
                        contentPosition="center"
                        contentFit="cover"
                        source={{ uri: avatarUrl }}
                        style={StyleSheet.applyWidth(
                          {
                            height: 150,
                            width: 150,
                          },
                          dimensions.width,
                        )}
                      />
                    ) : (
                      <Icon
                        name="MaterialCommunityIcons/baby-face-outline"
                        color={"#FFFFFF"}
                        size={70}
                      />
                    )}
                    {isUploadingAvatar ? (
                      <View
                        style={StyleSheet.applyWidth(
                          {
                            ...StyleSheet.absoluteFillObject,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(0,0,0,0.25)",
                          },
                          dimensions.width,
                        )}
                      >
                        <ActivityIndicator color="#ffffff" size="small" />
                      </View>
                    ) : null}
                  </Surface>
                </Touchable>
                {avatarUploadError ? (
                  <Text
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(errorTextStyle, { marginTop: 8 }),
                      dimensions.width,
                    )}
                  >
                    {avatarUploadError}
                  </Text>
                ) : null}
                <Spacer top={12} right={0} bottom={0} left={0} />
                <Text
                  style={StyleSheet.applyWidth(
                    StyleSheet.compose(
                      GlobalStyles.TextStyles(theme)["Text 2"].style,
                      theme.typography.headline5,
                      {
                        color: theme.colors.text.strong,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ),
                    dimensions.width,
                  )}
                >
                  {babyRecord?.name ?? "Baby"}
                </Text>
                {(ageLabel || dobLabel) && (
                  <Text
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(secondaryTextStyle, {
                        marginTop: 6,
                        textAlign: "center",
                      }),
                      dimensions.width,
                    )}
                  >
                    {[ageLabel ? `${ageLabel} old` : null, dobLabel ? `Born ${dobLabel}` : null]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                )}
                {babyRecord?.gender ? (
                  <Text
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(secondaryTextStyle, { marginTop: 4 }),
                      dimensions.width,
                    )}
                  >
                    Gender: {babyRecord.gender}
                  </Text>
                ) : null}
                {createdAtLabel ? (
                  <Text
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(secondaryTextStyle, { marginTop: 2 }),
                      dimensions.width,
                    )}
                  >
                    Profile created {createdAtLabel}
                  </Text>
                ) : null}
              </View>
              <Divider
                {...GlobalStyles.DividerStyles(theme)["Divider"].props}
                color={theme.colors.border.base}
                style={StyleSheet.applyWidth(
                  StyleSheet.compose(GlobalStyles.DividerStyles(theme)["Divider"].style, {
                    marginBottom: 20,
                  }),
                  dimensions.width,
                )}
              />
              <View
                style={StyleSheet.applyWidth(
                  {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  },
                  dimensions.width,
                )}
              >
                {stats.map((item) => (
                  <View
                    key={item.label}
                    style={StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        flexBasis: "48%",
                        marginBottom: 12,
                      },
                      dimensions.width,
                    )}
                  >
                    <Text
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(GlobalStyles.TextStyles(theme)["Text 2"].style, {
                          ...theme.typography.headline5,
                          color: "#0A84FF",
                          fontSize: 28,
                          fontFamily: "Inter_600SemiBold",
                        }),
                        dimensions.width,
                      )}
                    >
                      {item.value}
                    </Text>
                    <Text style={StyleSheet.applyWidth(secondaryTextStyle, dimensions.width)}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Surface>

        {/* Family & Access Section */}
        {babyRecord && derivedBabyId && !babyHasError ? (
          <>
            <Spacer top={16} right={0} bottom={0} left={0} />
            <Surface
              elevation={1}
              style={StyleSheet.applyWidth(surfaceBaseStyle, dimensions.width)}
            >
              <Text
                style={StyleSheet.applyWidth(
                  {
                    ...headlineStyle,
                    fontSize: 18,
                    fontWeight: "700",
                    marginBottom: 8,
                  },
                  dimensions.width,
                )}
              >
                Family & access
              </Text>
              <Text
                style={StyleSheet.applyWidth(
                  {
                    ...secondaryTextStyle,
                    fontSize: 14,
                    marginBottom: 16,
                    lineHeight: 20,
                  },
                  dimensions.width,
                )}
              >
                Share this magical little world with your loved ones.
              </Text>

              {/* Members List */}
              {isCaregiverLoading ? (
                <ActivityIndicator
                  color={theme.colors.branding.primary}
                  size="small"
                  style={StyleSheet.applyWidth({ marginVertical: 12 }, dimensions.width)}
                />
              ) : caregiversHasError ? (
                <Text
                  style={StyleSheet.applyWidth(
                    { ...secondaryTextStyle, color: theme.colors.text.medium },
                    dimensions.width,
                  )}
                >
                  We couldn't load family access right now.
                </Text>
              ) : caregivers && caregivers.length > 0 ? (
                <View style={StyleSheet.applyWidth({ marginBottom: 16 }, dimensions.width)}>
                  {caregivers.map((member, index) => {
                    const displayName = member.displayName || "Unknown";
                    const role = member.role || "viewer";
                    const initials = getInitials(displayName);

                    // Role badge colors
                    let roleBgColor = "#C7CEEA"; // Lavender for viewer
                    let roleTextColor = "#374151";
                    if (role === "owner") {
                      roleBgColor = "#0A84FF"; // Primary Blue
                      roleTextColor = "#FFFFFF";
                    } else if (role === "editor") {
                      roleBgColor = "#B5EAD7"; // Mint
                      roleTextColor = "#374151";
                    }

                    return (
                      <View
                        key={`${member.uid}-${index}`}
                        style={StyleSheet.applyWidth(
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 10,
                            borderBottomWidth: index < caregivers.length - 1 ? 1 : 0,
                            borderBottomColor: "#F3F4F6",
                          },
                          dimensions.width,
                        )}
                      >
                        {/* Avatar Circle */}
                        <View
                          style={StyleSheet.applyWidth(
                            {
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: "#E5E7EB",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            },
                            dimensions.width,
                          )}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#6B7280",
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            {initials}
                          </Text>
                        </View>

                        {/* Name */}
                        <Text
                          style={StyleSheet.applyWidth(
                            {
                              flex: 1,
                              fontSize: 15,
                              color: theme.colors.text.strong,
                              fontFamily: "Inter_500Medium",
                            },
                            dimensions.width,
                          )}
                        >
                          {displayName}
                        </Text>

                        {/* Role Badge */}
                        <View
                          style={StyleSheet.applyWidth(
                            {
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 12,
                              backgroundColor: roleBgColor,
                            },
                            dimensions.width,
                          )}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: roleTextColor,
                              fontFamily: "Inter_600SemiBold",
                              textTransform: "capitalize",
                            }}
                          >
                            {role}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Invite Button */}
              <Button
                onPress={handleOpenInviteModal}
                style={StyleSheet.applyWidth(
                  {
                    backgroundColor: "#0A84FF",
                    borderRadius: 99,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    height: 56,
                    textAlign: "center",
                  },
                  dimensions.width,
                )}
                title="Invite your partner"
              />
            </Surface>
          </>
        ) : null}

        <Spacer top={16} right={0} bottom={0} left={0} />

        <Surface elevation={1} style={StyleSheet.applyWidth(surfaceBaseStyle, dimensions.width)}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "space-between",
              },
              dimensions.width,
            )}
          >
            <Text style={StyleSheet.applyWidth(headlineStyle, dimensions.width)}>Folders</Text>
            <Pressable
              onPress={() => {
                if (showAlbumComposer) {
                  setShowAlbumComposer(false);
                  setAlbumTitle("");
                  setAlbumFormError("");
                } else {
                  setShowAlbumComposer(true);
                  setHasAutoOpenedComposer(true);
                }
              }}
              disabled={isCreatingAlbum && !showAlbumComposer}
              accessibilityRole="button"
              accessibilityState={{ disabled: isCreatingAlbum && !showAlbumComposer }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={({ pressed, hovered }) =>
                StyleSheet.applyWidth(
                  {
                    alignItems: "center",
                    alignSelf: "flex-end",
                    backgroundColor: showAlbumComposer
                      ? pressed || hovered
                        ? "#F0F0F0"
                        : "#FAFAFA"
                      : pressed || hovered
                        ? "#0066CC"
                        : "#0A84FF",
                    borderRadius: 99,
                    flexDirection: "row",
                    justifyContent: "center",
                    minHeight: 40,
                    maxHeight: 40,
                    opacity: isCreatingAlbum && !showAlbumComposer ? 0.5 : 1,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    shadowColor: showAlbumComposer ? "transparent" : "#0A84FF",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: showAlbumComposer ? 0 : 2,
                  },
                  dimensions.width,
                )
              }
            >
              <Icon
                name={
                  showAlbumComposer
                    ? "MaterialCommunityIcons/close"
                    : "MaterialCommunityIcons/folder-plus"
                }
                size={16}
                color={showAlbumComposer ? "#666666" : "#FFFFFF"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={StyleSheet.applyWidth(
                  {
                    color: showAlbumComposer ? "#666666" : "#FFFFFF",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  },
                  dimensions.width,
                )}
              >
                {showAlbumComposer ? "Cancel" : "New Folder"}
              </Text>
            </Pressable>
          </View>
          {albumFeedback ? (
            <Text
              style={StyleSheet.applyWidth(
                StyleSheet.compose(secondaryTextStyle, {
                  color: theme.colors.branding.primary,
                  marginTop: 12,
                  marginBottom: showAlbumComposer ? 0 : 12,
                }),
                dimensions.width,
              )}
            >
              {albumFeedback}
            </Text>
          ) : null}
          {showAlbumComposer ? (
            <>
              <Spacer top={12} right={0} bottom={0} left={0} />
              <TextField
                placeholder="Folder name"
                value={albumTitle}
                onChangeText={(value) => {
                  setAlbumFormError("");
                  setAlbumTitle(value);
                }}
                onSubmitEditing={() => {
                  if (canCreateAlbum && !isCreatingAlbum) {
                    handleCreateAlbum();
                  }
                }}
                returnKeyType="done"
                autoFocus
                style={StyleSheet.applyWidth(
                  {
                    borderColor: theme.colors.border.base,
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  },
                  dimensions.width,
                )}
              />
              <View
                style={StyleSheet.applyWidth(
                  {
                    flexDirection: "row",
                    marginBottom: 4,
                  },
                  dimensions.width,
                )}
              >
                <Button
                  title={isCreatingAlbum ? "Creating..." : "Create Folder"}
                  disabled={!canCreateAlbum || isCreatingAlbum}
                  icon="MaterialCommunityIcons/folder"
                  onPress={handleCreateAlbum}
                  style={StyleSheet.applyWidth(
                    {
                      backgroundColor: theme.colors.branding.primary,
                      borderRadius: 12,
                      marginRight: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                    },
                    dimensions.width,
                  )}
                  textStyle={{
                    color: theme.colors.background.base,
                    fontFamily: "Inter_600SemiBold",
                  }}
                />
                <Button
                  title="Cancel"
                  disabled={isCreatingAlbum}
                  onPress={() => {
                    setShowAlbumComposer(false);
                    setAlbumTitle("");
                    setAlbumFormError("");
                  }}
                  style={StyleSheet.applyWidth(
                    {
                      backgroundColor: theme.colors.background.base,
                      borderColor: theme.colors.border.base,
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                    },
                    dimensions.width,
                  )}
                  textStyle={{
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_600SemiBold",
                  }}
                />
              </View>
              <Text
                style={StyleSheet.applyWidth(
                  StyleSheet.compose(secondaryTextStyle, { marginTop: 8 }),
                  dimensions.width,
                )}
              >
                Create a folder name above, then use "Add Photos" to upload multiple images at once.
              </Text>
              {albumFormError ? (
                <Text
                  style={StyleSheet.applyWidth(
                    StyleSheet.compose(errorTextStyle, { marginTop: 12 }),
                    dimensions.width,
                  )}
                >
                  {albumFormError}
                </Text>
              ) : null}
            </>
          ) : (
            <Text
              style={StyleSheet.applyWidth(
                StyleSheet.compose(secondaryTextStyle, { marginTop: 12 }),
                dimensions.width,
              )}
            >
              Tap "New Folder" to create a space for the next set of photos.
            </Text>
          )}
          {renderLoadingState(isAlbumsLoading)}
          {albumsHasError ? (
            <Text style={StyleSheet.applyWidth(errorTextStyle, dimensions.width)}>
              We ran into a problem loading this section. Pull to refresh to try again.
            </Text>
          ) : null}
          {!isAlbumsLoading && !albumsHasError && !albums.length ? (
            <Text style={StyleSheet.applyWidth(bodyStyle, dimensions.width)}>
              Create a folder to organise milestones, photo shoots, or special events.
            </Text>
          ) : null}
          {!albumsHasError &&
            albums.map((album) => {
              const albumId = album?.album_id ?? UNASSIGNED_ALBUM_KEY;
              const albumDate = formatDate(album?.created_at, "MMM D, YYYY");
              const albumTitleValue = album?.title?.trim() || "Untitled Folder";
              const albumMedia = albumMediaMap[albumId] ?? [];
              const albumDescriptionText =
                typeof album?.description_md === "string" ? album.description_md.trim() : "";
              const albumDescriptionPreview =
                albumDescriptionText.length > 90
                  ? `${albumDescriptionText.slice(0, 87).trimEnd()}…`
                  : albumDescriptionText;
              const isUploading = Boolean(albumUploadState[albumId]);
              const uploadError = albumUploadErrors[albumId];
              const uploadItems = albumUploadItems[albumId] ?? [];
              const uploadProgress = albumUploadProgress[albumId];
              const isProcessing = uploadItems.some((item) =>
                ["minting", "putting", "finalizing"].includes(item?.status),
              );
              const showUploadItems = uploadItems.length > 0;
              const previewItems = albumMedia.slice(0, ALBUM_PREVIEW_LIMIT);
              const extraCount = Math.max(albumMedia.length - previewItems.length, 0);

              // Get album cover media
              const albumCoverMediaId = album?.cover_media_id ?? null;
              const coverMedia = albumCoverMediaId
                ? albumMedia.find((item) => item?.media_id === albumCoverMediaId)
                : (albumMedia[0] ?? null);
              const coverObjectKey = resolveMediaObjectKey(coverMedia);
              const coverPreviewEntry = coverObjectKey
                ? (mediaPreviewMap[coverObjectKey] ?? null)
                : null;
              const coverPreviewUri = coverPreviewEntry?.url ?? null;
              return (
                <View
                  key={albumId}
                  style={StyleSheet.applyWidth(
                    {
                      marginTop: 16,
                    },
                    dimensions.width,
                  )}
                >
                  <View
                    style={StyleSheet.applyWidth(
                      {
                        alignItems: isCompactActionLayout ? "stretch" : "center",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "flex-start",
                        marginBottom: 12,
                      },
                      dimensions.width,
                    )}
                  >
                    <View
                      style={StyleSheet.applyWidth(
                        {
                          flexGrow: 1,
                          flexShrink: 1,
                          marginRight: isCompactActionLayout ? 0 : 16,
                          minWidth: 0,
                          position: "relative",
                          pointerEvents: "box-none",
                        },
                        dimensions.width,
                      )}
                    >
                      <Touchable
                        onPress={() => handleOpenAlbum(album)}
                        disabled={!album?.album_id || !derivedBabyId}
                        accessibilityRole="button"
                        accessibilityHint="Open this folder to view all photos"
                        accessibilityState={{ disabled: !album?.album_id || !derivedBabyId }}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={StyleSheet.applyWidth(
                          {
                            backgroundColor: theme.colors.background.base,
                            borderRadius: 20,
                            paddingVertical: 6,
                            paddingRight: 48,
                          },
                          dimensions.width,
                        )}
                      >
                        <View
                          style={StyleSheet.applyWidth(
                            {
                              alignItems: "center",
                              flexDirection: "row",
                            },
                            dimensions.width,
                          )}
                        >
                          <View
                            style={StyleSheet.applyWidth(
                              {
                                alignItems: "center",
                                backgroundColor: theme.colors.branding.secondary,
                                borderRadius: 16,
                                height: 48,
                                justifyContent: "center",
                                marginRight: 16,
                                width: 48,
                                overflow: "hidden",
                              },
                              dimensions.width,
                            )}
                          >
                            {coverPreviewUri ? (
                              <ExpoImage
                                cachePolicy="disk"
                                contentFit="cover"
                                source={{ uri: coverPreviewUri }}
                                style={{ height: "100%", width: "100%" }}
                              />
                            ) : (
                              <Icon
                                name="MaterialCommunityIcons/folder"
                                size={24}
                                color={theme.colors.text.light}
                              />
                            )}
                          </View>
                          <View style={StyleSheet.applyWidth({ flex: 1 }, dimensions.width)}>
                            <Text
                              numberOfLines={1}
                              style={StyleSheet.applyWidth(
                                StyleSheet.compose(
                                  GlobalStyles.TextStyles(theme)["Text 2"].style,
                                  theme.typography.body1,
                                  {
                                    color: theme.colors.text.strong,
                                  },
                                ),
                                dimensions.width,
                              )}
                            >
                              {albumTitleValue}
                            </Text>
                            {albumDate ? (
                              <Text
                                style={StyleSheet.applyWidth(
                                  StyleSheet.compose(secondaryTextStyle, { marginTop: 2 }),
                                  dimensions.width,
                                )}
                              >
                                Created {albumDate}
                              </Text>
                            ) : null}
                            <Text
                              style={StyleSheet.applyWidth(
                                StyleSheet.compose(secondaryTextStyle, { marginTop: 2 }),
                                dimensions.width,
                              )}
                            >
                              {(() => {
                                // Use the count from the database query
                                const mediaCount =
                                  Array.isArray(album?.media_assets) &&
                                  album.media_assets.length > 0
                                    ? album.media_assets[0].count
                                    : 0;
                                return mediaCount > 0
                                  ? `${mediaCount} ${mediaCount === 1 ? "moment" : "moments"}`
                                  : "No moments yet";
                              })()}
                            </Text>
                            {albumDescriptionPreview ? (
                              <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={StyleSheet.applyWidth(
                                  {
                                    color: "rgba(0,0,0,0.55)",
                                    fontFamily: "Inter_400Regular",
                                    fontSize: 13,
                                    marginTop: 6,
                                  },
                                  dimensions.width,
                                )}
                              >
                                {albumDescriptionPreview}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </Touchable>
                      <Pressable
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          handleOpenOptionsSheet(album);
                        }}
                        disabled={!album?.album_id}
                        accessibilityRole="button"
                        accessibilityLabel="Album options"
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        style={({ pressed }) =>
                          StyleSheet.applyWidth(
                            {
                              alignItems: "center",
                              backgroundColor: "#FFFFFF",
                              borderColor: "#E2E2E2",
                              borderRadius: 16,
                              borderWidth: 1,
                              height: 32,
                              justifyContent: "center",
                              opacity: !album?.album_id ? 0.4 : pressed ? 0.8 : 1,
                              position: "absolute",
                              right: 6,
                              top: 6,
                              width: 32,
                              zIndex: 10,
                              boxShadow:
                                Platform.OS === "web"
                                  ? "0px 6px 10px rgba(0,0,0,0.14)"
                                  : "0px 6px 10px rgba(0,0,0,0.2)",
                            },
                            dimensions.width,
                          )
                        }
                      >
                        <Text
                          style={{
                            color: "rgba(0,0,0,0.45)",
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 16,
                            letterSpacing: 2,
                            marginTop: Platform.OS === "ios" ? -2 : 0,
                          }}
                        >
                          •••
                        </Text>
                      </Pressable>
                    </View>
                    <View
                      style={StyleSheet.applyWidth(
                        {
                          alignItems: "center",
                          flexDirection: "row",
                          flexShrink: 0,
                          justifyContent: isCompactActionLayout ? "flex-start" : "flex-end",
                          marginLeft: isCompactActionLayout ? 0 : "auto",
                          marginTop: isCompactActionLayout ? 12 : 0,
                          width: isCompactActionLayout ? "100%" : undefined,
                        },
                        dimensions.width,
                      )}
                    >
                      <Pressable
                        onPress={() => handleAddPhotosToAlbum(album)}
                        disabled={isUploading}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isUploading }}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={({ pressed, hovered }) =>
                          StyleSheet.applyWidth(
                            {
                              alignItems: "center",
                              backgroundColor:
                                pressed || hovered ? "#EAF3FF" : theme.colors.background.base,
                              borderColor: "#E5E5EA",
                              borderRadius: 12,
                              borderWidth: 1,
                              flexDirection: "row",
                              height: 36,
                              justifyContent: "center",
                              opacity: isUploading ? 0.5 : 1,
                              overflow: "hidden",
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                            },
                            dimensions.width,
                          )
                        }
                      >
                        <Icon
                          name="Feather/camera"
                          size={16}
                          color="#0A84FF"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={StyleSheet.applyWidth(
                            {
                              color: "#0A84FF",
                              fontFamily: "Inter_500Medium",
                              fontSize: 14,
                              fontWeight: "500",
                            },
                            dimensions.width,
                          )}
                        >
                          {isUploading ? "Uploading..." : "Add Photos"}
                        </Text>
                      </Pressable>
                      {isUploading ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.branding.primary}
                          style={StyleSheet.applyWidth(
                            {
                              marginLeft: 12,
                            },
                            dimensions.width,
                          )}
                        />
                      ) : null}
                    </View>
                  </View>
                  {uploadError ? (
                    <Text
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(errorTextStyle, { marginTop: 8 }),
                        dimensions.width,
                      )}
                    >
                      {uploadError}
                    </Text>
                  ) : null}
                  {uploadProgress && uploadProgress.total > 0 ? (
                    <Text
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(secondaryTextStyle, { marginTop: 6 }),
                        dimensions.width,
                      )}
                    >
                      {uploadProgress.completed === uploadProgress.total && !isProcessing
                        ? `Uploaded ${uploadProgress.completed} of ${uploadProgress.total}.`
                        : `Processing ${uploadProgress.completed} of ${uploadProgress.total}...`}
                    </Text>
                  ) : null}
                  {showUploadItems ? (
                    <View
                      style={StyleSheet.applyWidth(
                        {
                          marginLeft: 60,
                          marginTop: 6,
                        },
                        dimensions.width,
                      )}
                    >
                      {uploadItems.map((item) => {
                        const statusKey = item?.status ?? "";
                        const statusLabel = UPLOAD_STATUS_LABELS[statusKey] ?? statusKey;
                        const statusIcon =
                          UPLOAD_STATUS_ICONS[statusKey] ?? "MaterialCommunityIcons/progress-clock";
                        const statusColor =
                          statusKey === "done"
                            ? (theme.colors.success ?? theme.colors.branding.primary)
                            : statusKey === "error"
                              ? theme.colors.text.warning
                              : theme.colors.text.medium;
                        const isRetryable = statusKey === "error" && item?.finalizePayload;
                        return (
                          <Surface
                            key={item?.id}
                            style={StyleSheet.applyWidth(
                              {
                                alignItems: "center",
                                backgroundColor: theme.colors.background.tertiary,
                                borderRadius: 12,
                                flexDirection: "row",
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                              },
                              dimensions.width,
                            )}
                          >
                            <Icon
                              name={statusIcon}
                              size={18}
                              color={statusColor}
                              style={{ marginRight: 8 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                numberOfLines={1}
                                style={StyleSheet.applyWidth(
                                  StyleSheet.compose(
                                    GlobalStyles.TextStyles(theme)["Text 2"].style,
                                    theme.typography.body2,
                                    {
                                      color: theme.colors.text.strong,
                                    },
                                  ),
                                  dimensions.width,
                                )}
                              >
                                {item?.fileName || "Photo"}
                              </Text>
                              <Text
                                style={StyleSheet.applyWidth(
                                  StyleSheet.compose(secondaryTextStyle, {
                                    color: statusColor,
                                    marginTop: 2,
                                  }),
                                  dimensions.width,
                                )}
                              >
                                {statusLabel}
                              </Text>
                              {item?.errorMessage ? (
                                <Text
                                  style={StyleSheet.applyWidth(
                                    StyleSheet.compose(errorTextStyle, { marginTop: 4 }),
                                    dimensions.width,
                                  )}
                                >
                                  {item.errorMessage}
                                </Text>
                              ) : null}
                            </View>
                            {["minting", "putting", "finalizing"].includes(statusKey) ? (
                              <ActivityIndicator
                                size="small"
                                color={theme.colors.branding.primary}
                                style={StyleSheet.applyWidth({ marginRight: 8 }, dimensions.width)}
                              />
                            ) : null}
                            {isRetryable ? (
                              <Button
                                title="Retry"
                                disabled={isUploading}
                                onPress={() => handleRetryFinalizeItem(albumId, item?.id)}
                                style={StyleSheet.applyWidth(
                                  {
                                    backgroundColor: theme.colors.branding.primary,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                  },
                                  dimensions.width,
                                )}
                                textStyle={{
                                  color: theme.colors.background.base,
                                  fontSize: 12,
                                  fontFamily: "Inter_600SemiBold",
                                }}
                              />
                            ) : null}
                          </Surface>
                        );
                      })}
                    </View>
                  ) : null}
                  {albumMedia.length ? (
                    <View
                      style={StyleSheet.applyWidth(
                        {
                          marginLeft: 60,
                          marginTop: 12,
                        },
                        dimensions.width,
                      )}
                    >
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={StyleSheet.applyWidth({ marginBottom: 6 }, dimensions.width)}
                        contentContainerStyle={{ alignItems: "center", paddingRight: 12 }}
                      >
                        {previewItems.map((item, index) => {
                          const objectKey = resolveMediaObjectKey(item);
                          const previewEntry = objectKey
                            ? (mediaPreviewMap[objectKey] ?? null)
                            : null;
                          const previewUri = previewEntry?.url ?? null;
                          const isVideoPreview = item?.mime_type?.startsWith("video");
                          return (
                            <Surface
                              key={item?.media_id ?? `${albumId}-${index}`}
                              style={StyleSheet.applyWidth(
                                {
                                  alignItems: "center",
                                  backgroundColor: theme.colors.background.tertiary,
                                  borderRadius: 12,
                                  height: 72,
                                  justifyContent: "center",
                                  marginRight: 12,
                                  overflow: "hidden",
                                  width: 72,
                                },
                                dimensions.width,
                              )}
                            >
                              {previewUri ? (
                                <ExpoImage
                                  cachePolicy="disk"
                                  contentFit="cover"
                                  source={{ uri: previewUri }}
                                  style={{ height: "100%", width: "100%" }}
                                />
                              ) : (
                                <Icon
                                  name={
                                    isVideoPreview
                                      ? "MaterialIcons/videocam"
                                      : "MaterialIcons/photo"
                                  }
                                  size={24}
                                  color={theme.colors.text.medium}
                                />
                              )}
                            </Surface>
                          );
                        })}
                        {extraCount > 0 ? (
                          <Surface
                            style={StyleSheet.applyWidth(
                              {
                                alignItems: "center",
                                backgroundColor: theme.colors.branding.secondary,
                                borderRadius: 12,
                                height: 72,
                                justifyContent: "center",
                                width: 72,
                              },
                              dimensions.width,
                            )}
                          >
                            <Text
                              style={StyleSheet.applyWidth(
                                StyleSheet.compose(GlobalStyles.TextStyles(theme)["Text 2"].style, {
                                  color: theme.colors.text.light,
                                }),
                                dimensions.width,
                              )}
                            >
                              +{extraCount}
                            </Text>
                          </Surface>
                        ) : null}
                      </ScrollView>
                      <Text
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(secondaryTextStyle, { marginTop: 4 }),
                          dimensions.width,
                        )}
                      >
                        Keep adding memories — you can upload multiple photos in one go.
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(secondaryTextStyle, { marginLeft: 60, marginTop: 12 }),
                        dimensions.width,
                      )}
                    >
                      No photos yet. Tap Add Photos to upload multiple images together.
                    </Text>
                  )}
                  <Divider
                    {...GlobalStyles.DividerStyles(theme)["Divider"].props}
                    color={theme.colors.border.base}
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(GlobalStyles.DividerStyles(theme)["Divider"].style, {
                        marginTop: 16,
                      }),
                      dimensions.width,
                    )}
                  />
                </View>
              );
            })}
        </Surface>

        <Spacer top={16} right={0} bottom={0} left={0} />

        <Surface elevation={1} style={StyleSheet.applyWidth(surfaceBaseStyle, dimensions.width)}>
          <Text style={StyleSheet.applyWidth(headlineStyle, dimensions.width)}>Media Library</Text>
          <Spacer top={12} right={0} bottom={0} left={0} />
          {renderLoadingState(isMediaLoading)}
          {mediaHasError ? (
            <Text style={StyleSheet.applyWidth(errorTextStyle, dimensions.width)}>
              We ran into a problem loading this section. Pull to refresh to try again.
            </Text>
          ) : null}
          {!isMediaLoading && !mediaHasError && !mediaItems.length ? (
            <Text style={StyleSheet.applyWidth(bodyStyle, dimensions.width)}>
              Upload photos or videos to start the baby's media collection.
            </Text>
          ) : null}
          {!mediaHasError &&
            mediaItems.map((item) => {
              const createdLabel = formatDate(item?.created_at, "MMM D, YYYY");
              const fileKey = resolveMediaObjectKey(item) ?? "";
              const fileName = fileKey.split("/")?.pop() || "Media";
              const isVideo = item?.mime_type?.startsWith("video");
              return (
                <View
                  key={item?.media_id}
                  style={StyleSheet.applyWidth(
                    {
                      alignItems: "center",
                      flexDirection: "row",
                      marginBottom: 12,
                    },
                    dimensions.width,
                  )}
                >
                  <View
                    style={StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: theme.colors.background.brand,
                        borderRadius: 16,
                        height: 48,
                        justifyContent: "center",
                        marginRight: 12,
                        width: 48,
                      },
                      dimensions.width,
                    )}
                  >
                    <Icon
                      name={isVideo ? "MaterialIcons/videocam" : "MaterialIcons/photo-camera"}
                      color={theme.colors.text.light}
                      size={24}
                    />
                  </View>
                  <View style={StyleSheet.applyWidth({ flex: 1 }, dimensions.width)}>
                    <Text
                      numberOfLines={1}
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(
                          GlobalStyles.TextStyles(theme)["Text 2"].style,
                          theme.typography.body1,
                          {
                            color: theme.colors.text.strong,
                          },
                        ),
                        dimensions.width,
                      )}
                    >
                      {fileName}
                    </Text>
                    <Text
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(secondaryTextStyle, { marginTop: 2 }),
                        dimensions.width,
                      )}
                    >
                      {isVideo ? "Video" : "Image"}
                      {createdLabel ? ` • ${createdLabel}` : ""}
                    </Text>
                  </View>
                </View>
              );
            })}
        </Surface>

        <Spacer top={16} right={0} bottom={0} left={0} />

        <Surface elevation={1} style={StyleSheet.applyWidth(surfaceBaseStyle, dimensions.width)}>
          <Text style={StyleSheet.applyWidth(headlineStyle, dimensions.width)}>Latest Moments</Text>
          <Spacer top={12} right={0} bottom={0} left={0} />
          {renderLoadingState(isTimelineLoading)}
          {timelineHasError ? (
            <Text style={StyleSheet.applyWidth(errorTextStyle, dimensions.width)}>
              We ran into a problem loading this section. Pull to refresh to try again.
            </Text>
          ) : null}
          {!isTimelineLoading && !timelineHasError && !timelineEntries.length ? (
            <Text style={StyleSheet.applyWidth(bodyStyle, dimensions.width)}>
              Add a milestone or note to build the baby's timeline.
            </Text>
          ) : null}
          {!timelineHasError &&
            timelineEntries.map((entry) => {
              const entryDate = formatDate(entry?.event_at ?? entry?.created_at, "MMMM D, YYYY");
              return (
                <View
                  key={entry?.entry_id}
                  style={StyleSheet.applyWidth(
                    {
                      borderBottomColor: theme.colors.border.base,
                      borderBottomWidth: 1,
                      marginBottom: 12,
                      paddingBottom: 12,
                    },
                    dimensions.width,
                  )}
                >
                  <Text
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(
                        GlobalStyles.TextStyles(theme)["Text 2"].style,
                        theme.typography.body1,
                        {
                          color: theme.colors.text.strong,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ),
                      dimensions.width,
                    )}
                  >
                    {entry?.entry_type ? entry.entry_type.replace(/_/g, " ") : "Entry"}
                  </Text>
                  {entryDate ? (
                    <Text
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(secondaryTextStyle, { marginTop: 2 }),
                        dimensions.width,
                      )}
                    >
                      {entryDate}
                    </Text>
                  ) : null}
                  {entry?.body ? (
                    <Text
                      numberOfLines={4}
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(bodyStyle, { marginTop: 8 }),
                        dimensions.width,
                      )}
                    >
                      {entry.body}
                    </Text>
                  ) : null}
                </View>
              );
            })}
        </Surface>

        <Spacer top={16} right={0} bottom={0} left={0} />

        <Surface elevation={1} style={StyleSheet.applyWidth(surfaceBaseStyle, dimensions.width)}>
          <Text style={StyleSheet.applyWidth(headlineStyle, dimensions.width)}>
            Upcoming Reminders
          </Text>
          <Spacer top={12} right={0} bottom={0} left={0} />
          {renderLoadingState(isRemindersLoading)}
          {remindersHasError ? (
            <Text style={StyleSheet.applyWidth(errorTextStyle, dimensions.width)}>
              We ran into a problem loading this section. Pull to refresh to try again.
            </Text>
          ) : null}
          {!isRemindersLoading && !remindersHasError && !reminders.length ? (
            <Text style={StyleSheet.applyWidth(bodyStyle, dimensions.width)}>
              Stay on track by creating a reminder for wellness checks, vaccines, or personal notes.
            </Text>
          ) : null}
          {!remindersHasError &&
            reminders.map((reminder) => {
              const reminderKey =
                reminder?.reminder_id ??
                `${reminder?.title ?? "reminder"}-${reminder?.due_at ?? ""}`;
              const dueLabel = formatDate(reminder?.due_at, "MMMM D, YYYY h:mm A");
              const distanceLabel = formatDistance(reminder?.due_at);
              const isDone = Boolean(reminder?.is_done);
              return (
                <View
                  key={reminderKey}
                  style={StyleSheet.applyWidth(
                    {
                      alignItems: "center",
                      borderBottomColor: theme.colors.border.base,
                      borderBottomWidth: 1,
                      flexDirection: "row",
                      paddingVertical: 12,
                    },
                    dimensions.width,
                  )}
                >
                  <View
                    style={StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: isDone
                          ? theme.colors.branding.secondary
                          : theme.colors.branding.primary,
                        borderRadius: 18,
                        height: 36,
                        justifyContent: "center",
                        marginRight: 12,
                        width: 36,
                      },
                      dimensions.width,
                    )}
                  >
                    <Icon
                      name={
                        isDone
                          ? "MaterialCommunityIcons/check-circle"
                          : "MaterialCommunityIcons/bell-outline"
                      }
                      color={theme.colors.text.light}
                      size={22}
                    />
                  </View>
                  <View style={StyleSheet.applyWidth({ flex: 1 }, dimensions.width)}>
                    <Text
                      numberOfLines={2}
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(
                          GlobalStyles.TextStyles(theme)["Text 2"].style,
                          theme.typography.body1,
                          {
                            color: theme.colors.text.strong,
                            fontFamily: "Inter_600SemiBold",
                          },
                        ),
                        dimensions.width,
                      )}
                    >
                      {reminder?.title?.trim() || "Reminder"}
                    </Text>
                    {(dueLabel || distanceLabel) && (
                      <Text
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(secondaryTextStyle, { marginTop: 4 }),
                          dimensions.width,
                        )}
                      >
                        {dueLabel ? `Due ${dueLabel}` : "No due date"}
                        {distanceLabel ? ` • ${distanceLabel}` : ""}
                      </Text>
                    )}
                    {isDone ? (
                      <Text
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(secondaryTextStyle, {
                            color: theme.colors.success ?? theme.colors.branding.primary,
                            marginTop: 4,
                          }),
                          dimensions.width,
                        )}
                      >
                        Completed
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
        </Surface>

        <Spacer top={32} right={0} bottom={32} left={0} />
      </SimpleStyleScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={isOptionsSheetVisible}
        onRequestClose={handleCloseOptionsSheet}
      >
        <TouchableWithoutFeedback onPress={handleCloseOptionsSheet}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={StyleSheet.applyWidth(
                  {
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 24,
                    paddingTop: 18,
                    paddingBottom: 28 + (Platform.OS === "ios" ? 10 : 0),
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
                    backgroundColor: "rgba(0,0,0,0.14)",
                    marginBottom: 18,
                  }}
                />
                <Pressable
                  onPress={() => {
                    const targetAlbum = optionsSheetAlbum;
                    if (!targetAlbum?.album_id) {
                      return;
                    }
                    handleCloseOptionsSheet();
                    handleOpenAlbum(targetAlbum);
                  }}
                  disabled={!optionsSheetAlbum?.album_id}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: pressed ? "rgba(181,234,215,0.28)" : "#F7F8FB",
                        borderRadius: 18,
                        marginBottom: 12,
                        opacity: !optionsSheetAlbum?.album_id ? 0.4 : 1,
                        paddingVertical: 14,
                      },
                      dimensions.width,
                    )
                  }
                >
                  <Text
                    style={{
                      color: "#0A84FF",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    Open Album
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const targetAlbum = optionsSheetAlbum;
                    if (!targetAlbum?.album_id) {
                      handleCloseOptionsSheet();
                      return;
                    }
                    handleOpenDescriptionEditor(targetAlbum);
                  }}
                  disabled={!optionsSheetAlbum?.album_id}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: pressed ? "rgba(255,154,162,0.24)" : "#FFF5F6",
                        borderRadius: 18,
                        marginBottom: 12,
                        opacity: !optionsSheetAlbum?.album_id ? 0.4 : 1,
                        paddingVertical: 14,
                      },
                      dimensions.width,
                    )
                  }
                >
                  <Text
                    style={{
                      color: "#FF9AA2",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    Edit Short Description
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCloseOptionsSheet}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: pressed ? "rgba(0,0,0,0.06)" : "#FFFFFF",
                        borderRadius: 16,
                        paddingVertical: 12,
                      },
                      dimensions.width,
                    )
                  }
                >
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={isBabyOptionsSheetVisible}
        onRequestClose={handleCloseBabyOptionsSheet}
      >
        <TouchableWithoutFeedback onPress={handleCloseBabyOptionsSheet}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={StyleSheet.applyWidth(
                  {
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 24,
                    paddingTop: 18,
                    paddingBottom: 28 + (Platform.OS === "ios" ? 10 : 0),
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
                    backgroundColor: "rgba(0,0,0,0.14)",
                    marginBottom: 18,
                  }}
                />
                <Pressable
                  onPress={handleOpenEditBabyModal}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: pressed ? "rgba(181,234,215,0.28)" : "#F7F8FB",
                        borderRadius: 18,
                        marginBottom: 12,
                        paddingVertical: 14,
                      },
                      dimensions.width,
                    )
                  }
                >
                  <Text
                    style={{
                      color: "#0A84FF",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    Edit Baby Profile
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    handleCloseBabyOptionsSheet();
                    handleOpenDeleteModal();
                  }}
                  disabled={isDeletingBaby}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: pressed ? "#FFE5E8" : "#FFF5F6",
                        borderRadius: 18,
                        marginBottom: 12,
                        opacity: isDeletingBaby ? 0.4 : 1,
                        paddingVertical: 14,
                      },
                      dimensions.width,
                    )
                  }
                >
                  <Text
                    style={{
                      color: "#FF3B30",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    Delete Baby Profile
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCloseBabyOptionsSheet}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: pressed ? "rgba(0,0,0,0.06)" : "#FFFFFF",
                        borderRadius: 16,
                        paddingVertical: 12,
                      },
                      dimensions.width,
                    )
                  }
                >
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={isDescriptionModalVisible}
        onRequestClose={handleCloseDescriptionEditor}
      >
        <TouchableWithoutFeedback onPress={handleCloseDescriptionEditor}>
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
                      color: "#111111",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 18,
                    }}
                  >
                    Edit Short Description
                  </Text>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.45)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  >
                    {editingAlbumTitle}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#FAFAFA",
                      borderColor: isDescriptionFocused ? "#D8EDFF" : "#E2E2E2",
                      borderRadius: 20,
                      borderWidth: 1,
                      marginTop: 18,
                      padding: 4,
                    }}
                  >
                    <TextInput
                      multiline
                      value={descriptionDraft}
                      onChangeText={handleDescriptionChange}
                      onFocus={() => setIsDescriptionFocused(true)}
                      onBlur={() => setIsDescriptionFocused(false)}
                      placeholder="Add a sweet one-liner to describe this album."
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      textAlignVertical="top"
                      maxLength={SHORT_DESCRIPTION_MAX_LEN}
                      style={{
                        color: "rgba(0,0,0,0.78)",
                        fontFamily: "Inter_400Regular",
                        fontSize: 15,
                        lineHeight: 22,
                        minHeight: 140,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      color:
                        descriptionLength >= SHORT_DESCRIPTION_MAX_LEN
                          ? "#FF9AA2"
                          : "rgba(0,0,0,0.45)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      marginTop: 10,
                      textAlign: "right",
                    }}
                  >
                    {`${descriptionLength}/${SHORT_DESCRIPTION_MAX_LEN}`}
                  </Text>
                  <Pressable
                    onPress={handleSaveDescription}
                    disabled={isSaveButtonDisabled}
                    style={({ pressed }) =>
                      StyleSheet.applyWidth(
                        {
                          alignItems: "center",
                          backgroundColor: isSaveButtonDisabled
                            ? "rgba(181,234,215,0.45)"
                            : pressed
                              ? "#A0DCC3"
                              : "#B5EAD7",
                          borderRadius: 20,
                          marginTop: 18,
                          paddingVertical: 14,
                          boxShadow: isSaveButtonDisabled
                            ? undefined
                            : "0px 10px 14px rgba(0,0,0,0.18)",
                        },
                        dimensions.width,
                      )
                    }
                  >
                    {albumUpdateMutation.isLoading ? (
                      <ActivityIndicator color="#2F4858" size="small" />
                    ) : (
                      <Text
                        style={{
                          color: "#2F4858",
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 16,
                        }}
                      >
                        Save
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleCloseDescriptionEditor}
                    disabled={albumUpdateMutation.isLoading}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      marginTop: 14,
                      opacity: albumUpdateMutation.isLoading ? 0.6 : pressed ? 0.7 : 1,
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
        visible={isDeleteModalVisible}
        onRequestClose={handleCloseDeleteModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseDeleteModal}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.4)",
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
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: "#FFE5E8",
                      borderRadius: 60,
                      height: 60,
                      justifyContent: "center",
                      marginBottom: 20,
                      alignSelf: "center",
                      width: 60,
                    }}
                  >
                    <Icon
                      name="MaterialCommunityIcons/alert-circle-outline"
                      size={32}
                      color="#FF3B30"
                    />
                  </View>
                  <Text
                    style={{
                      color: "#FF3B30",
                      fontFamily: "Inter_700Bold",
                      fontSize: 20,
                      textAlign: "center",
                      marginBottom: 12,
                    }}
                  >
                    Delete Baby Profile?
                  </Text>
                  <Text
                    style={{
                      color: "#FF3B30",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ This action cannot be undone
                  </Text>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.65)",
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      lineHeight: 20,
                      textAlign: "center",
                      marginBottom: 24,
                    }}
                  >
                    Deleting this baby profile will permanently remove:
                    {"\n"}• All photos and videos
                    {"\n"}• All folders and albums
                    {"\n"}• Timeline entries and milestones
                    {"\n"}• Reminders and notes
                    {"\n\n"}This data cannot be recovered.
                  </Text>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.8)",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      marginBottom: 10,
                    }}
                  >
                    To confirm, type the baby's name:
                  </Text>
                  <Text
                    style={{
                      color: "#FF3B30",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                      marginBottom: 12,
                      textAlign: "center",
                      backgroundColor: "#FFF5F6",
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                    }}
                  >
                    {babyRecord?.name ?? ""}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#FAFAFA",
                      borderColor: deleteError ? "#FF3B30" : "#E2E2E2",
                      borderRadius: 16,
                      borderWidth: 1.5,
                      marginBottom: deleteError ? 8 : 18,
                      padding: 4,
                    }}
                  >
                    <TextInput
                      value={deleteConfirmationText}
                      onChangeText={(text) => {
                        setDeleteConfirmationText(text);
                        setDeleteError("");
                      }}
                      placeholder="Type baby name here"
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      autoCorrect={false}
                      autoCapitalize="words"
                      style={{
                        color: "rgba(0,0,0,0.85)",
                        fontFamily: "Inter_500Medium",
                        fontSize: 15,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    />
                  </View>
                  {deleteError ? (
                    <Text
                      style={{
                        color: "#FF3B30",
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                        marginBottom: 12,
                        textAlign: "center",
                      }}
                    >
                      {deleteError}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={handleDeleteBaby}
                    disabled={!isDeleteButtonEnabled}
                    style={({ pressed }) =>
                      StyleSheet.applyWidth(
                        {
                          alignItems: "center",
                          backgroundColor: !isDeleteButtonEnabled
                            ? "rgba(255,59,48,0.3)"
                            : pressed
                              ? "#E63329"
                              : "#FF3B30",
                          borderRadius: 20,
                          marginBottom: 14,
                          paddingVertical: 14,
                          opacity: !isDeleteButtonEnabled ? 0.6 : 1,
                        },
                        dimensions.width,
                      )
                    }
                  >
                    {isDeletingBaby ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontFamily: "Inter_700Bold",
                          fontSize: 16,
                        }}
                      >
                        Delete Permanently
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleCloseDeleteModal}
                    disabled={isDeletingBaby}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: pressed ? "#F0F0F0" : "#FAFAFA",
                      borderRadius: 16,
                      opacity: isDeletingBaby ? 0.6 : 1,
                      paddingVertical: 12,
                    })}
                  >
                    <Text
                      style={{
                        color: "rgba(0,0,0,0.6)",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
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
      {/* Edit Baby Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showEditBabyModal}
        onRequestClose={handleCloseEditBabyModal}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        >
          <TouchableWithoutFeedback onPress={handleCloseEditBabyModal}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
            style={{ zIndex: 1 }}
          >
            <View
              style={StyleSheet.applyWidth(
                {
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingHorizontal: 24,
                  paddingTop: 22,
                  paddingBottom: 36 + (Platform.OS === "ios" ? 12 : 0),
                  position: "relative",
                  zIndex: 1,
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
                  color: "#111111",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 18,
                  marginBottom: 6,
                }}
              >
                {"Edit Baby Profile"}
              </Text>
              <Text
                style={{
                  color: "rgba(0,0,0,0.45)",
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                {"Update the baby's information below."}
              </Text>

              {/* Baby Name Input */}
              <Text
                style={{
                  color: "#111111",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {"Name *"}
              </Text>
              <TextInput
                placeholder="Enter baby's name"
                value={editBabyName}
                onChangeText={(value) => {
                  setEditBabyError("");
                  setEditBabyName(value);
                }}
                placeholderTextColor="rgba(0,0,0,0.35)"
                style={{
                  backgroundColor: "#FAFAFA",
                  borderColor: "#E2E2E2",
                  borderRadius: 12,
                  borderWidth: 1,
                  color: "rgba(0,0,0,0.78)",
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  marginBottom: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              />

              {/* Date of Birth Input - Custom 3-Part Selector */}
              <Text
                style={{
                  color: "#111111",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {"Date of Birth"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: dobError ? 8 : 16,
                }}
              >
                {/* Day Selector */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      marginBottom: 6,
                      textAlign: "center",
                    }}
                  >
                    Day
                  </Text>
                  <Pressable
                    onPress={() => {
                      setActiveDobPicker("day");
                      setDobError("");
                    }}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor:
                        activeDobPicker === "day"
                          ? "#A0DCC3"
                          : dobDay
                            ? "#B5EAD7"
                            : pressed
                              ? "#F0F0F0"
                              : "#FAFAFA",
                      borderColor:
                        activeDobPicker === "day" ? "#78C9A8" : dobDay ? "#B5EAD7" : "#E2E2E2",
                      borderRadius: 14,
                      borderWidth: activeDobPicker === "day" ? 2 : 1.5,
                      justifyContent: "center",
                      minHeight: 56,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      shadowColor: dobDay || activeDobPicker === "day" ? "#000" : "transparent",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      elevation: dobDay || activeDobPicker === "day" ? 3 : 0,
                      transform:
                        activeDobPicker === "day"
                          ? [{ scale: 1.02 }]
                          : [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color: dobDay || activeDobPicker === "day" ? "#2F4858" : "rgba(0,0,0,0.35)",
                        fontFamily:
                          dobDay || activeDobPicker === "day"
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                        fontSize: 17,
                      }}
                    >
                      {dobDay || "DD"}
                    </Text>
                  </Pressable>
                </View>

                {/* Month Selector */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      marginBottom: 6,
                      textAlign: "center",
                    }}
                  >
                    Month
                  </Text>
                  <Pressable
                    onPress={() => {
                      setActiveDobPicker("month");
                      setDobError("");
                    }}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor:
                        activeDobPicker === "month"
                          ? "#A0DCC3"
                          : dobMonth
                            ? "#B5EAD7"
                            : pressed
                              ? "#F0F0F0"
                              : "#FAFAFA",
                      borderColor:
                        activeDobPicker === "month" ? "#78C9A8" : dobMonth ? "#B5EAD7" : "#E2E2E2",
                      borderRadius: 14,
                      borderWidth: activeDobPicker === "month" ? 2 : 1.5,
                      justifyContent: "center",
                      minHeight: 56,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      shadowColor: dobMonth || activeDobPicker === "month" ? "#000" : "transparent",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      elevation: dobMonth || activeDobPicker === "month" ? 3 : 0,
                      transform:
                        activeDobPicker === "month"
                          ? [{ scale: 1.02 }]
                          : [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color:
                          dobMonth || activeDobPicker === "month" ? "#2F4858" : "rgba(0,0,0,0.35)",
                        fontFamily:
                          dobMonth || activeDobPicker === "month"
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                        fontSize: 17,
                      }}
                    >
                      {dobMonth
                        ? [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ][parseInt(dobMonth, 10) - 1]
                        : "MM"}
                    </Text>
                  </Pressable>
                </View>

                {/* Year Selector */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      marginBottom: 6,
                      textAlign: "center",
                    }}
                  >
                    Year
                  </Text>
                  <Pressable
                    onPress={() => {
                      setActiveDobPicker("year");
                      setDobError("");
                    }}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor:
                        activeDobPicker === "year"
                          ? "#A0DCC3"
                          : dobYear
                            ? "#B5EAD7"
                            : pressed
                              ? "#F0F0F0"
                              : "#FAFAFA",
                      borderColor:
                        activeDobPicker === "year" ? "#78C9A8" : dobYear ? "#B5EAD7" : "#E2E2E2",
                      borderRadius: 14,
                      borderWidth: activeDobPicker === "year" ? 2 : 1.5,
                      justifyContent: "center",
                      minHeight: 56,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      shadowColor: dobYear || activeDobPicker === "year" ? "#000" : "transparent",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      elevation: dobYear || activeDobPicker === "year" ? 3 : 0,
                      transform:
                        activeDobPicker === "year"
                          ? [{ scale: 1.02 }]
                          : [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color:
                          dobYear || activeDobPicker === "year" ? "#2F4858" : "rgba(0,0,0,0.35)",
                        fontFamily:
                          dobYear || activeDobPicker === "year"
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                        fontSize: 17,
                      }}
                    >
                      {dobYear || "YYYY"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* DOB Error Message */}
              {dobError ? (
                <Text
                  style={{
                    color: "#FF9AA2",
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginBottom: 12,
                    marginTop: -4,
                  }}
                >
                  {dobError}
                </Text>
              ) : null}

              {/* Gender Input */}
              <Text
                style={{
                  color: "#111111",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {"Gender"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 16,
                }}
              >
                {["Boy", "Girl"].map((gender) => (
                  <Pressable
                    key={gender}
                    onPress={() => {
                      setEditBabyError("");
                      setEditBabyGender(editBabyGender === gender ? "" : gender);
                    }}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor:
                        editBabyGender === gender ? "#B5EAD7" : pressed ? "#F0F0F0" : "#FAFAFA",
                      borderColor: editBabyGender === gender ? "#B5EAD7" : "#E2E2E2",
                      borderRadius: 10,
                      borderWidth: 1,
                      flex: 1,
                      marginRight: gender !== "Girl" ? 8 : 0,
                      paddingVertical: 10,
                    })}
                  >
                    <Text
                      style={{
                        color: editBabyGender === gender ? "#2F4858" : "rgba(0,0,0,0.6)",
                        fontFamily: "Inter_500Medium",
                        fontSize: 14,
                      }}
                    >
                      {gender}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Error Message */}
              {editBabyError ? (
                <Text
                  style={{
                    color: "#FF9AA2",
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {editBabyError}
                </Text>
              ) : null}

              {/* Update Button */}
              <Pressable
                onPress={handleUpdateBaby}
                disabled={isUpdatingBaby || !editBabyName.trim()}
                style={({ pressed }) =>
                  StyleSheet.applyWidth(
                    {
                      alignItems: "center",
                      backgroundColor:
                        isUpdatingBaby || !editBabyName.trim()
                          ? "rgba(181,234,215,0.45)"
                          : pressed
                            ? "#A0DCC3"
                            : "#B5EAD7",
                      borderRadius: 16,
                      marginTop: 8,
                      paddingVertical: 14,
                      boxShadow:
                        isUpdatingBaby || !editBabyName.trim()
                          ? undefined
                          : "0px 10px 14px rgba(0,0,0,0.18)",
                    },
                    dimensions.width,
                  )
                }
              >
                {isUpdatingBaby ? (
                  <ActivityIndicator color="#2F4858" size="small" />
                ) : (
                  <Text
                    style={{
                      color: "#2F4858",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                    }}
                  >
                    {"Update Baby Profile"}
                  </Text>
                )}
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                onPress={handleCloseEditBabyModal}
                disabled={isUpdatingBaby}
                style={({ pressed }) => ({
                  alignItems: "center",
                  marginTop: 12,
                  opacity: isUpdatingBaby ? 0.6 : pressed ? 0.7 : 1,
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
                  {"Cancel"}
                </Text>
              </Pressable>

              {/* DOB Picker Sheet - Appears when a chip is tapped */}
              {activeDobPicker && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "flex-end",
                    zIndex: 1000,
                  }}
                >
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setActiveDobPicker(null);
                    }}
                  >
                    <View style={{ flex: 1 }} />
                  </TouchableWithoutFeedback>

                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderTopLeftRadius: 28,
                      borderTopRightRadius: 28,
                      paddingHorizontal: 20,
                      paddingTop: 16,
                      paddingBottom: 24 + (Platform.OS === "ios" ? 20 : 0),
                      maxHeight: 380,
                    }}
                  >
                    {/* Handle Bar */}
                    <View
                      style={{
                        alignSelf: "center",
                        height: 4,
                        width: 48,
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.14)",
                        marginBottom: 16,
                      }}
                    />

                    {/* Sheet Title */}
                    <Text
                      style={{
                        color: "#111111",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        marginBottom: 12,
                        textAlign: "center",
                      }}
                    >
                      {activeDobPicker === "day"
                        ? "Select Day"
                        : activeDobPicker === "month"
                          ? "Select Month"
                          : "Select Year"}
                    </Text>

                    {/* Scrollable List */}
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      style={{ maxHeight: 260 }}
                      contentContainerStyle={{ paddingBottom: 8 }}
                    >
                      {activeDobPicker === "day" &&
                        Array.from({ length: 31 }, (_, i) => {
                          const day = String(i + 1);
                          return (
                            <Pressable
                              key={day}
                              onPress={() => {
                                setDobDay(day);
                                setDobError("");
                                setActiveDobPicker(null);
                              }}
                              style={({ pressed }) => ({
                                alignItems: "center",
                                backgroundColor:
                                  dobDay === day
                                    ? "#B5EAD7"
                                    : pressed
                                      ? "rgba(181,234,215,0.25)"
                                      : "#FFFFFF",
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: dobDay === day ? "#B5EAD7" : "rgba(0,0,0,0.08)",
                                marginBottom: 8,
                                paddingVertical: 14,
                              })}
                            >
                              <Text
                                style={{
                                  color: dobDay === day ? "#2F4858" : "rgba(0,0,0,0.75)",
                                  fontFamily:
                                    dobDay === day ? "Inter_600SemiBold" : "Inter_500Medium",
                                  fontSize: 16,
                                }}
                              >
                                {day}
                              </Text>
                            </Pressable>
                          );
                        })}

                      {activeDobPicker === "month" &&
                        [
                          { label: "January", short: "Jan", value: "1" },
                          { label: "February", short: "Feb", value: "2" },
                          { label: "March", short: "Mar", value: "3" },
                          { label: "April", short: "Apr", value: "4" },
                          { label: "May", short: "May", value: "5" },
                          { label: "June", short: "Jun", value: "6" },
                          { label: "July", short: "Jul", value: "7" },
                          { label: "August", short: "Aug", value: "8" },
                          { label: "September", short: "Sep", value: "9" },
                          { label: "October", short: "Oct", value: "10" },
                          { label: "November", short: "Nov", value: "11" },
                          { label: "December", short: "Dec", value: "12" },
                        ].map((month) => (
                          <Pressable
                            key={month.value}
                            onPress={() => {
                              setDobMonth(month.value);
                              setDobError("");
                              setActiveDobPicker(null);
                            }}
                            style={({ pressed }) => ({
                              alignItems: "center",
                              backgroundColor:
                                dobMonth === month.value
                                  ? "#B5EAD7"
                                  : pressed
                                    ? "rgba(181,234,215,0.25)"
                                    : "#FFFFFF",
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor:
                                dobMonth === month.value ? "#B5EAD7" : "rgba(0,0,0,0.08)",
                              marginBottom: 8,
                              paddingVertical: 14,
                            })}
                          >
                            <Text
                              style={{
                                color: dobMonth === month.value ? "#2F4858" : "rgba(0,0,0,0.75)",
                                fontFamily:
                                  dobMonth === month.value
                                    ? "Inter_600SemiBold"
                                    : "Inter_500Medium",
                                fontSize: 16,
                              }}
                            >
                              {month.label}
                            </Text>
                          </Pressable>
                        ))}

                      {activeDobPicker === "year" &&
                        Array.from({ length: 11 }, (_, i) => {
                          const year = String(new Date().getFullYear() - i);
                          return (
                            <Pressable
                              key={year}
                              onPress={() => {
                                setDobYear(year);
                                setDobError("");
                                setActiveDobPicker(null);
                              }}
                              style={({ pressed }) => ({
                                alignItems: "center",
                                backgroundColor:
                                  dobYear === year
                                    ? "#B5EAD7"
                                    : pressed
                                      ? "rgba(181,234,215,0.25)"
                                      : "#FFFFFF",
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: dobYear === year ? "#B5EAD7" : "rgba(0,0,0,0.08)",
                                marginBottom: 8,
                                paddingVertical: 14,
                              })}
                            >
                              <Text
                                style={{
                                  color: dobYear === year ? "#2F4858" : "rgba(0,0,0,0.75)",
                                  fontFamily:
                                    dobYear === year ? "Inter_600SemiBold" : "Inter_500Medium",
                                  fontSize: 16,
                                }}
                              >
                                {year}
                              </Text>
                            </Pressable>
                          );
                        })}
                    </ScrollView>

                    {/* Cancel Button */}
                    <Pressable
                      onPress={() => {
                        setActiveDobPicker(null);
                      }}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor: pressed ? "#F0F0F0" : "#FAFAFA",
                        borderRadius: 14,
                        marginTop: 12,
                        paddingVertical: 12,
                      })}
                    >
                      <Text
                        style={{
                          color: "rgba(0,0,0,0.5)",
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 14,
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Invite Partner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInviteModalVisible}
        onRequestClose={handleCloseInviteModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={handleCloseInviteModal}>
            <View
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingTop: 24,
                    paddingBottom: Platform.OS === "ios" ? 40 : 24,
                    paddingHorizontal: 20,
                    maxHeight: "85%",
                  }}
                >
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Header */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "700",
                          color: theme.colors.text.strong,
                          fontFamily: "Poppins_600SemiBold",
                        }}
                      >
                        Invite your partner
                      </Text>
                      <Pressable
                        onPress={handleCloseInviteModal}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Icon name="AntDesign/close" size={24} color={theme.colors.text.medium} />
                      </Pressable>
                    </View>

                    {/* Body Copy */}
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: theme.colors.text.medium,
                        marginBottom: 24,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      Share this little memory world with someone who loves your baby as much as you
                      do. They'll be able to add photos, stories, and little notes for the future.
                    </Text>

                    {/* Email Input */}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: theme.colors.text.strong,
                        marginBottom: 8,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      Partner's email
                    </Text>
                    <TextInput
                      value={inviteEmail}
                      onChangeText={(text) => {
                        setInviteEmail(text);
                        if (inviteError) {
                          setInviteError("");
                        }
                      }}
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSendingInvite}
                      style={{
                        borderWidth: 1,
                        borderColor: inviteError ? "#EF4444" : "#E5E7EB",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 15,
                        color: theme.colors.text.strong,
                        backgroundColor: isSendingInvite ? "#F9FAFB" : "#FFFFFF",
                        fontFamily: "Inter_400Regular",
                        marginBottom: 4,
                      }}
                    />
                    {inviteError ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#EF4444",
                          marginBottom: 16,
                          fontFamily: "Inter_500Medium",
                        }}
                      >
                        {inviteError}
                      </Text>
                    ) : (
                      <View style={{ marginBottom: 16 }} />
                    )}

                    {/* Role Selector */}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: theme.colors.text.strong,
                        marginBottom: 12,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      Access level
                    </Text>
                    <View style={{ marginBottom: 24 }}>
                      {[
                        {
                          value: "owner",
                          label: "Owner",
                          description: "Full control",
                        },
                        {
                          value: "editor",
                          label: "Editor",
                          description: "Can add and edit memories",
                        },
                        {
                          value: "viewer",
                          label: "Viewer",
                          description: "Can only look",
                        },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            if (!isSendingInvite) {
                              setInviteRole(option.value);
                            }
                          }}
                          disabled={isSendingInvite}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderWidth: 1,
                            borderColor: inviteRole === option.value ? "#0A84FF" : "#E5E7EB",
                            borderRadius: 12,
                            marginBottom: 8,
                            backgroundColor:
                              inviteRole === option.value
                                ? "#EBF5FF"
                                : pressed
                                  ? "#F9FAFB"
                                  : "#FFFFFF",
                          })}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: inviteRole === option.value ? "#0A84FF" : "#D1D5DB",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            {inviteRole === option.value && (
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: "#0A84FF",
                                }}
                              />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: "600",
                                color: theme.colors.text.strong,
                                fontFamily: "Inter_600SemiBold",
                                marginBottom: 2,
                              }}
                            >
                              {option.label}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: theme.colors.text.medium,
                                fontFamily: "Inter_400Regular",
                              }}
                            >
                              {option.description}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>

                    {/* Buttons */}
                    <Button
                      onPress={handleSendInvite}
                      disabled={isSendingInvite}
                      loading={isSendingInvite}
                      style={{
                        backgroundColor: "#0A84FF",
                        borderRadius: 24,
                        height: 52,
                        marginBottom: 12,
                      }}
                      title={isSendingInvite ? "Sending..." : "Send invite"}
                    />
                    <Pressable
                      onPress={handleCloseInviteModal}
                      disabled={isSendingInvite}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        paddingVertical: 14,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: theme.colors.text.medium,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
};

export default withTheme(BabyProfileScreen);
