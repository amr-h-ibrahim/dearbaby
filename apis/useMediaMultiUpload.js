import * as React from "react";
import * as GlobalVariables from "../config/GlobalVariableContext";
import prepare_jpeg_and_size from "../global-functions/prepare_jpeg_and_size";
import put_to_signed_url_xplat from "../global-functions/put_to_signed_url_xplat";
import useFinalizeUpload from "./useFinalizeUpload";
import useMintUpload from "./useMintUpload";

const MIME_TYPE = "image/jpeg";
const TARGET_MEDIA = "media";

const normaliseAssetName = (asset, index) => {
  const fallback = `photo-${Date.now()}-${index + 1}`;
  const raw = asset?.fileName || asset?.filename || asset?.name || fallback;
  const base = raw.replace(/\.[^.]+$/, "") || fallback;
  return `${base.replace(/[^a-zA-Z0-9-_]+/g, "_")}.jpg`;
};

const useMediaMultiUpload = ({ albumId, babyId } = {}, { onProgress } = {}) => {
  const Constants = GlobalVariables.useValues();
  const { mutateAsync: mintUploadAsync } = useMintUpload();
  const { mutateAsync: finalizeUploadAsync } = useFinalizeUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const lastEmitRef = React.useRef(0);

  const emitProgress = React.useCallback(
    (payload) => {
      if (typeof onProgress !== "function") {
        return;
      }
      const now = Date.now();
      if (now - lastEmitRef.current > 90 || payload.completed === payload.total) {
        lastEmitRef.current = now;
        onProgress(payload);
      }
    },
    [onProgress],
  );

  const uploadAsync = React.useCallback(
    async (assets = []) => {
      if (!albumId || !babyId) {
        throw new Error("Album and baby must be selected before uploading.");
      }
      if (!Constants?.user_id) {
        throw new Error("Sign in before uploading.");
      }
      if (!Constants?.auth_token) {
        throw new Error("Missing auth token. Sign in before uploading.");
      }
      if (!Array.isArray(assets) || assets.length === 0) {
        return { uploaded: 0, failed: 0, errors: [] };
      }

      setIsUploading(true);
      const errors = [];
      let uploaded = 0;

      try {
        for (let index = 0; index < assets.length; index += 1) {
          const asset = assets[index];
          try {
            const prepared = await prepare_jpeg_and_size(asset, 2048, 0.85);
            if (!prepared?.uri || !prepared?.bytes) {
              throw new Error("Failed to optimise image");
            }

            const fileName = normaliseAssetName(asset, index);
            const ticket = await mintUploadAsync({
              target: TARGET_MEDIA,
              babyId,
              albumId,
              mimeType: MIME_TYPE,
              bytes: prepared.bytes,
              filename: fileName,
            });

            console.log("[useMediaMultiUpload] mint response", {
              albumId,
              babyId,
              fileName,
              ticket,
            });

            const uploadUrl = ticket?.uploadUrl ?? ticket?.upload_url;
            const objectKey = ticket?.objectKey ?? ticket?.object_key;
            if (!uploadUrl || !objectKey) {
              throw new Error("Upload ticket malformed");
            }

            await put_to_signed_url_xplat(uploadUrl, prepared.uri);

            await finalizeUploadAsync({
              babyId,
              albumId,
              objectKey,
              originalFilename: fileName,
              mimeType: MIME_TYPE,
              bytes: prepared.bytes,
              width: prepared?.width ?? asset?.width ?? null,
              height: prepared?.height ?? asset?.height ?? null,
              exif: null,
            });

            uploaded += 1;
            emitProgress({
              total: assets.length,
              completed: uploaded,
              currentFile: fileName,
              percent: Math.round((uploaded / assets.length) * 100),
            });
          } catch (error) {
            console.error("upload failed", error);
            errors.push({ asset, error });
            emitProgress({
              total: assets.length,
              completed: uploaded,
              currentFile: asset?.fileName || asset?.uri || `item-${index}`,
              percent: Math.round((uploaded / assets.length) * 100),
              error,
            });
          }
        }
      } finally {
        setIsUploading(false);
      }

      return {
        uploaded,
        failed: errors.length,
        errors,
        total: assets.length,
      };
    },
    [Constants, albumId, babyId, emitProgress, finalizeUploadAsync, mintUploadAsync],
  );

  return {
    uploadAsync,
    isUploading,
  };
};

export default useMediaMultiUpload;
