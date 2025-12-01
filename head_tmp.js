import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  View,
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
import * as GlobalStyles from "../../GlobalStyles.js";
import * as SupabaseDearBabyApi from "../../apis/SupabaseDearBabyApi.js";
import useAlbumMediaQuery from "../../apis/useAlbumMediaQuery";
import useFinalizeUpload from "../../apis/useFinalizeUpload";
import useHeicToJpeg from "../../apis/useHeicToJpeg";
import useMintUpload from "../../apis/useMintUpload";
import useMintView from "../../apis/useMintView";
import useNavigation from "../../utils/useNavigation";
import useParams from "../../utils/useParams";
import useWindowDimensions from "../../utils/useWindowDimensions";
import * as StyleSheet from "../../utils/StyleSheet";
import openImagePickerUtil from "../../utils/openImagePicker";
import showToast from "../../utils/showToast";
import * as GlobalVariables from "../../config/GlobalVariableContext";
import put_to_signed_url_xplat from "../../global-functions/put_to_signed_url_xplat";

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
  queue: { label: "Queued", percent: 0 },
  converting: { label: "Converting to JPEG", percent: 12 },
  minting: { label: "Minting upload URL", percent: 32 },
  uploading: { label: "Uploading media", percent: 68 },
  finalizing: { label: "Finalizing media", percent: 90 },
  complete: { label: "Complete", percent: 100 },
  error: { label: "Needs retry", percent: 0 },
  cancelled: { label: "Cancelled", percent: 0 },
});

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

const normalizeHeaders = (input) => {
  if (!input) {
    return undefined;
  }
  if (Array.isArray(input)) {
    return input.reduce((acc, entry) => {
      if (!entry) {
        return acc;
      }
      if (Array.isArray(entry) && entry.length >= 2) {
        acc[entry[0]] = entry[1];
        return acc;
      }
      if (typeof entry === "object") {
        const key = entry.key ?? entry.name ?? entry.header ?? entry[0];
        const value = entry.value ?? entry.val ?? entry.v ?? entry[1];
        if (key != null && value != null) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  }
  if (typeof input === "object") {
    return { ...input };
  }
  return undefined;
};

const resolveUploadHeaders = (payload) =>
  normalizeHeaders(
    payload?.uploadHeaders ??
      payload?.upload_headers ??
      payload?.headers ??
      payload?.parHeaders ??
      payload?.par_headers ??
      payload?.data?.uploadHeaders ??
      payload?.data?.upload_headers ??
      payload?.data?.parHeaders ??
      payload?.data?.par_headers ??
      payload?.data?.headers ??
      null,
  );

const resolveObjectKey = (payload) =>
  payload?.objectKey ??
  payload?.object_key ??
  payload?.key ??
  payload?.data?.objectKey ??
  payload?.data?.object_key ??
  payload?.data?.key ??
  null;

const AlbumDetailScreen = ({ theme }) => {
  const params = useParams();
  const navigation = useNavigation();
  const dimensions = useWindowDimensions();
  const Constants = GlobalVariables.useValues();

  const albumId = params?.album_id ?? params?.albumId ?? null;
  const babyId = params?.baby_id ?? params?.babyId ?? null;

  const [bannerMessage, setBannerMessage] = React.useState(null);
  const [bannerError, setBannerError] = React.useState(null);
  const [renameVisible, setRenameVisible] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [selectedMedia, setSelectedMedia] = React.useState(null);
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

  const { convertAsync: convertToJpegAsync } = useHeicToJpeg();
  const { mutateAsync: mintUploadAsync } = useMintUpload();
  const { mutateAsync: finalizeUploadAsync } = useFinalizeUpload();

  const abortControllerRef = React.useRef(null);
  const progressItemsRef = React.useRef([]);
  const uploadStatusRef = React.useRef(uploadStatus);
  const statusUpdateTimeoutRef = React.useRef(null);
  const pendingStatusRef = React.useRef(null);
  const isMountedRef = React.useRef(true);

  const albumQuery = SupabaseDearBabyApi.useAlbumsGET(
    { album_id: albumId, select: "album_id,baby_id,title,description,created_at,cover_media_id" },
    {
      enabled: Boolean(albumId),
      staleTime: 30000,
    },
  );

  const albumRecord = React.useMemo(() => {
    const raw = albumQuery.data?.json;
    if (Array.isArray(raw) && raw.length) {
      return raw[0];
    }
    return raw ?? null;
  }, [albumQuery.data]);

  const mediaQuery = useAlbumMediaQuery({ albumId, babyId, pageSize: 24 });
  const mediaItems = React.useMemo(() => flattenPages(mediaQuery.data), [mediaQuery.data]);

  const { mutateAsync: mintViewAsync } = useMintView();
  const [mediaPreviewMap, setMediaPreviewMap] = React.useState({});

  React.useEffect(() => {
    if (!mintViewAsync) {
      return undefined;
    }
    const missingKeys = mediaItems
      .map((item) => item?.object_key)
      .filter((key) => key && !mediaPreviewMap[key]);
    if (!missingKeys.length) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      for (const objectKey of missingKeys) {
        try {
          const response = await mintViewAsync({ objectKey });
          const url = response?.signedUrl ?? response?.url ?? null;
          if (!cancelled && url) {
            setMediaPreviewMap((prev) => ({ ...prev, [objectKey]: url }));
          }
        } catch (error) {
          console.error("Failed to mint media preview", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaItems, mediaPreviewMap, mintViewAsync]);

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
    await Promise.allSettled([albumQuery.refetch?.(), mediaQuery.refetch?.()]);
  }, [albumQuery, mediaQuery]);

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
          return {
            id: task.id,
            name: task.displayName,
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
          currentFile: tasks.length ? (tasks[0].displayName ?? tasks[0].fileName) : null,
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
        const rawName =
          entry?.fileName ??
          asset?.fileName ??
          asset?.filename ??
          asset?.name ??
          asset?.uri ??
          fallbackName;
        const base = rawName.replace(/\.[^.]+$/, "") || fallbackName;
        const fileName = `${base.replace(/[^a-zA-Z0-9-_]+/g, "_")}.jpg`;
        const displayName = entry?.displayName ?? rawName;
        return {
          id,
          asset,
          fileName,
          displayName,
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
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: task.fileName,
                    stage: "converting",
                    stageLabel: STAGE_INFO.converting.label,
                    percent: overallPercent,
                  });
                  if (!task.prepared) {
                    task.prepared = await convertToJpegAsync(task.asset, {
                      index,
                      quality: 0.9,
                      maxDimension: 4096,
                    });
                  }
                  if (!task.prepared?.bytes) {
                    throw new Error("Prepared image missing bytes.");
                  }
                  task.bytes = task.prepared.bytes;
                  task.width = task.prepared?.width ?? task.asset?.width ?? null;
                  task.height = task.prepared?.height ?? task.asset?.height ?? null;
                  if (task.prepared?.fileName) {
                    const sanitized = `${(task.prepared.fileName.replace(/\.[^.]+$/, "") || task.fileName).replace(/[^a-zA-Z0-9-_]+/g, "_")}.jpg`;
                    if (sanitized && sanitized !== task.fileName) {
                      task.fileName = sanitized;
                      updateProgressItem(task.id, { name: sanitized });
                    }
                  }
                  break;
                }
                case "minting": {
                  updateTaskStage(task.id, "minting", { error: null });
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: task.fileName,
                    stage: "minting",
                    stageLabel: STAGE_INFO.minting.label,
                    percent: overallPercent,
                  });
                  if (!task.bytes) {
                    throw new Error("File size missing for mint.");
                  }
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
                  break;
                }
                case "uploading": {
                  updateTaskStage(task.id, "uploading", { error: null });
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: task.fileName,
                    stage: "uploading",
                    stageLabel: STAGE_INFO.uploading.label,
                    percent: overallPercent,
                  });
                  const uploadUrl = resolveUploadUrl(task.mintedData);
                  if (!uploadUrl) {
                    throw new Error("Upload URL missing.");
                  }
                  const uploadHeaders = resolveUploadHeaders(task.mintedData);
                  await put_to_signed_url_xplat(
                    uploadUrl,
                    task.prepared.uri,
                    uploadHeaders ?? undefined,
                  );
                  ensureActive();
                  break;
                }
                case "finalizing": {
                  updateTaskStage(task.id, "finalizing", { error: null });
                  updateUploadStatus({
                    total: tasks.length,
                    completed,
                    currentFile: task.fileName,
                    stage: "finalizing",
                    stageLabel: STAGE_INFO.finalizing.label,
                    percent: overallPercent,
                  });
                  const objectKey = resolveObjectKey(task.mintedData);
                  if (!objectKey) {
                    throw new Error("Object key missing.");
                  }
                  await finalizeUploadAsync(
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
                currentFile: task.fileName,
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
            console.error("Failed to upload media asset", error);
            updateTaskStage(task.id, "error", {
              error: error?.message ?? "Upload failed. Try again.",
              percent: STAGE_INFO.error.percent,
            });
            const resumeStage = determineResumeStage(currentStage);
            failures.push({
              asset: task.asset,
              fileName: task.fileName,
              displayName: task.displayName,
              resumeStage,
              prepared:
                resumeStage === "minting" || resumeStage === "finalizing" ? task.prepared : null,
              mintedData: resumeStage === "finalizing" ? task.mintedData : null,
              bytes: task.bytes ?? null,
              width: task.width ?? null,
              height: task.height ?? null,
              exif: null,
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
        setBannerError(
          `${failures.length} photo${failures.length === 1 ? "" : "s"} failed. Retry to continue.`,
        );
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
      }
    },
    [
      albumId,
      babyId,
      convertToJpegAsync,
      determineResumeStage,
      finalizeUploadAsync,
      initialiseProgress,
      mintUploadAsync,
      refreshAlbum,
      resolveObjectKey,
      resolveUploadHeaders,
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
        return;
      }
      const url = `${Constants.SUPABASE_URL}rest/v1/albums?album_id=eq.${albumId}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: Constants.AUTHORIZATION_HEADER,
          "Content-Profile": Constants["Content-Profile"] ?? "dearbaby",
          apikey: Constants.apiKey,
          auth_token: Constants.auth_token,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        const error = new Error(text || `Album update failed (${response.status})`);
        error.status = response.status;
        error.body = text;
        throw error;
      }
      return response.json();
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

  const handleSetCover = React.useCallback(async () => {
    if (!selectedMedia?.media_id) {
      return;
    }
    try {
      await updateAlbum({ cover_media_id: selectedMedia.media_id });
      setBannerMessage("Album cover updated.");
      await albumQuery.refetch?.();
    } catch (error) {
      console.error("Set cover failed", error);
      setBannerError("We couldn't update the cover.");
    }
  }, [albumQuery, selectedMedia, updateAlbum]);

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
    if (!selectedMedia?.object_key) {
      return;
    }
    try {
      const response = await mintViewMutation.mutateAsync({ object_key: selectedMedia.object_key });
      const url = response?.json?.url ?? response?.url ?? null;
      if (url) {
        await Share.share({ url });
      }
    } catch (error) {
      console.error("Share failed", error);
      setBannerError("We couldn't share this photo.");
    }
  }, [mintViewMutation, selectedMedia]);

  const gridGap = 12;
  const columns = 3;
  const contentPadding = 20;
  const itemSize = React.useMemo(() => {
    const totalGap = gridGap * (columns - 1) + contentPadding * 2;
    return Math.floor((dimensions.width - totalGap) / columns);
  }, [dimensions.width, gridGap, columns, contentPadding]);

  const renderMediaItem = React.useCallback(
    ({ item }) => {
      const previewUri = item?.object_key ? mediaPreviewMap[item.object_key] : null;
      return (
        <Touchable
          onPress={() => handleSelectMedia(item)}
          style={StyleSheet.applyWidth(
            {
              backgroundColor: theme.colors.background.brand,
              borderRadius: 12,
              height: itemSize,
              marginBottom: gridGap,
              marginRight: gridGap,
              overflow: "hidden",
              width: itemSize,
            },
            dimensions.width,
          )}
        >
          {previewUri ? (
            <ExpoImage
              cachePolicy="disk"
              source={{ uri: previewUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color={theme.colors.branding.primary} />
            </View>
          )}
        </Touchable>
      );
    },
    [
      dimensions.width,
      gridGap,
      handleSelectMedia,
      itemSize,
      mediaPreviewMap,
      theme.colors.background.brand,
      theme.colors.branding.primary,
    ],
  );

  const keyExtractor = React.useCallback(
    (item) => item?.media_id ?? item?.object_key ?? Math.random().toString(),
    [],
  );

  const albumTitle = albumRecord?.title ?? "Album";
  const albumDescription = albumRecord?.description_md ?? "";
  const createdAt = albumRecord?.created_at ? new Date(albumRecord.created_at) : null;

  const renderProgressRow = React.useCallback(
    (item) => (
      <View key={item.id} style={{ marginTop: 6 }}>
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            StyleSheet.compose(
              GlobalStyles.TextStyles(theme)["Text 2"].style,
              theme.typography.caption,
              { color: theme.colors.text.medium },
            ),
            dimensions.width,
          )}
        >
          {item.name}
        </Text>
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            StyleSheet.compose(
              GlobalStyles.TextStyles(theme)["Text 2"].style,
              theme.typography.caption,
              {
                color: item.error ? theme.colors.text.warning : theme.colors.text.light,
                marginTop: 2,
              },
            ),
            dimensions.width,
          )}
        >
          {item.error
            ? `${item.stageLabel}: ${item.error}`
            : item.percent != null && item.percent !== 0
              ? `${item.stageLabel} • ${item.percent}%`
              : item.stageLabel}
        </Text>
      </View>
    ),
    [dimensions.width, theme],
  );

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
        data={mediaItems}
        keyExtractor={keyExtractor}
        numColumns={columns}
        columnWrapperStyle={{ marginLeft: 20 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, paddingRight: 20 }}
        ListHeaderComponent={() => (
          <Surface
            elevation={1}
            style={StyleSheet.applyWidth(
              {
                backgroundColor: theme.colors.background.base,
                borderRadius: 20,
                marginBottom: 20,
                marginHorizontal: 20,
                padding: 20,
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
                  theme.typography.headline5,
                  { color: theme.colors.text.strong },
                ),
                dimensions.width,
              )}
            >
              {albumTitle}
            </Text>
            {albumDescription ? (
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  StyleSheet.compose(
                    GlobalStyles.TextStyles(theme)["Text 2"].style,
                    theme.typography.body2,
                    {
                      color: theme.colors.text.medium,
                      marginTop: 6,
                    },
                  ),
                  dimensions.width,
                )}
              >
                {albumDescription}
              </Text>
            ) : null}
            {createdAt ? (
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  StyleSheet.compose(
                    GlobalStyles.TextStyles(theme)["Text 2"].style,
                    theme.typography.caption,
                    {
                      color: theme.colors.text.medium,
                      marginTop: 4,
                    },
                  ),
                  dimensions.width,
                )}
              >
                {`Created ${createdAt.toLocaleDateString()}`}
              </Text>
            ) : null}
            <Spacer top={16} right={0} bottom={0} left={0} />
            <View
              style={StyleSheet.applyWidth(
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
                dimensions.width,
              )}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Button
                  title={isUploading ? "Uploading..." : "Upload"}
                  onPress={handleUpload}
                  disabled={isUploading || !albumId}
                  style={StyleSheet.applyWidth(
                    {
                      backgroundColor: theme.colors.branding.primary,
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                    },
                    dimensions.width,
                  )}
                  textStyle={{
                    color: theme.colors.background.base,
                    fontFamily: "Inter_600SemiBold",
                  }}
                />
                {isUploading ? (
                  <Button
                    title="Cancel"
                    onPress={handleCancelUploads}
                    style={StyleSheet.applyWidth(
                      {
                        marginLeft: 12,
                        borderRadius: 14,
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        backgroundColor: theme.colors.background.error,
                      },
                      dimensions.width,
                    )}
                    textStyle={{
                      color: theme.colors.background.base,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  />
                ) : null}
              </View>
              <Touchable
                onPress={() => {
                  setRenameValue(albumTitle);
                  setRenameVisible(true);
                }}
                style={{ padding: 8 }}
              >
                <Icon name="Feather/more-vertical" size={22} color={theme.colors.text.medium} />
              </Touchable>
            </View>
            {progressItems.length ? (
              <View style={{ marginTop: 16 }}>
                <Text
                  accessible={true}
                  selectable={false}
                  style={StyleSheet.applyWidth(
                    StyleSheet.compose(
                      GlobalStyles.TextStyles(theme)["Text 2"].style,
                      theme.typography.caption,
                      { color: theme.colors.text.medium },
                    ),
                    dimensions.width,
                  )}
                >
                  {uploadStatus.total
                    ? `${uploadStatus.completed} of ${uploadStatus.total} complete${
                        uploadStatus.percent ? ` (${uploadStatus.percent}%)` : ""
                      }`
                    : "Preparing uploads..."}
                </Text>
                <Text
                  accessible={true}
                  selectable={false}
                  style={StyleSheet.applyWidth(
                    StyleSheet.compose(
                      GlobalStyles.TextStyles(theme)["Text 2"].style,
                      theme.typography.caption,
                      { color: theme.colors.text.medium, marginTop: 2 },
                    ),
                    dimensions.width,
                  )}
                >
                  {uploadStatus.stageLabel
                    ? uploadStatus.currentFile
                      ? `${uploadStatus.stageLabel} • ${uploadStatus.currentFile}`
                      : uploadStatus.stageLabel
                    : null}
                </Text>
                {progressItems.map((item) => renderProgressRow(item))}
              </View>
            ) : null}
          </Surface>
        )}
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
            refreshing={albumQuery.isFetching || mediaQuery.isFetching}
            onRefresh={refreshAlbum}
          />
        }
        ListFooterComponent={
          mediaQuery.isFetchingNextPage ? (
            <ActivityIndicator
              style={{ marginVertical: 16 }}
              color={theme.colors.branding.primary}
            />
          ) : null
        }
      />

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
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center" }}>
          <Touchable
            style={{ position: "absolute", top: 60, right: 24 }}
            onPress={() => setViewerVisible(false)}
          >
            <Icon name="AntDesign/close" size={28} color="#FFF" />
          </Touchable>
          {selectedMedia ? (
            <ExpoImage
              source={{ uri: mediaPreviewMap[selectedMedia.object_key] }}
              style={{ width: "90%", height: "60%", alignSelf: "center" }}
              contentFit="contain"
            />
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 24 }}>
            <Touchable onPress={handleShareMedia} style={{ alignItems: "center" }}>
              <Icon name="Feather/share-2" size={24} color="#FFF" />
              <Text style={{ color: "#FFF", marginTop: 6 }}>Share</Text>
            </Touchable>
            <Touchable onPress={handleSetCover} style={{ alignItems: "center" }}>
              <Icon name="MaterialIcons/star" size={24} color="#FFF" />
              <Text style={{ color: "#FFF", marginTop: 6 }}>Set Cover</Text>
            </Touchable>
            <Touchable onPress={handleDeleteMedia} style={{ alignItems: "center" }}>
              <Icon name="Feather/trash" size={24} color="#FFF" />
              <Text style={{ color: "#FFF", marginTop: 6 }}>Delete</Text>
            </Touchable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

export default withTheme(AlbumDetailScreen);
