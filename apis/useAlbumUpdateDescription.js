import * as React from "react";
import { useMutation, useQueryClient } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";
import { albumUpdateDescription, setSupabaseDearBabyAlbumConstants } from "./SupabaseDearBabyAlbum";

const isRetryableStatus = (status) =>
  status === 429 || (typeof status === "number" && status >= 500 && status < 600);

const resolveAlbumId = (variables, data) => {
  if (variables?.album_id) {
    return variables.album_id;
  }
  if (variables?.albumId) {
    return variables.albumId;
  }
  if (Array.isArray(data) && data[0]?.album_id) {
    return data[0].album_id;
  }
  if (data?.album_id) {
    return data.album_id;
  }
  return undefined;
};

const toMutationError = (result) => {
  const message =
    (typeof result?.error === "string" && result.error.trim()) || "album_update_failed";
  const error = new Error(message);
  if (typeof result?.status === "number") {
    error.status = result.status;
  }
  return error;
};

export const useAlbumUpdateDescription = () => {
  const Constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setSupabaseDearBabyAlbumConstants(Constants);
  }, [Constants]);

  return useMutation(
    async (variables) => {
      const outcome = await albumUpdateDescription({ ...variables, constants: Constants });
      if (!outcome?.ok) {
        throw toMutationError(outcome);
      }
      return outcome.data;
    },
    {
      retry: (failureCount, error) => {
        if (failureCount >= 1) {
          return false;
        }
        const status = error?.status;
        return isRetryableStatus(status);
      },
      onSuccess: (data, variables) => {
        const albumId = resolveAlbumId(variables, data);
        if (!albumId) {
          return;
        }
        const albumQueryKey = ["album", albumId];
        if (queryClient.getQueryState(albumQueryKey)) {
          queryClient.invalidateQueries(albumQueryKey);
        }
      },
      onError: (error) => {
        if (!(error instanceof Error)) {
          return;
        }
        // Ensure callers receive a normalized error message string.
        error.message = error.message || "album_update_failed";
      },
    },
  );
};

export default useAlbumUpdateDescription;
