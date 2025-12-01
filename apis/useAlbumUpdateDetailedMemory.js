import * as React from "react";
import { useMutation, useQueryClient } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";
import {
  albumUpdateDetailedMemory,
  setSupabaseDearBabyAlbumConstants,
} from "./SupabaseDearBabyAlbum";

const isRetryableStatus = (status) =>
  status === 429 || (typeof status === "number" && status >= 500 && status < 600);

const toMutationError = (result) => {
  const message =
    (typeof result?.error === "string" && result.error.trim()) ||
    "album_update_detailed_memory_failed";
  const error = new Error(message);
  if (typeof result?.status === "number") {
    error.status = result.status;
  }
  return error;
};

export const useAlbumUpdateDetailedMemory = () => {
  const Constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setSupabaseDearBabyAlbumConstants(Constants);
  }, [Constants]);

  return useMutation(
    async (variables) => {
      const outcome = await albumUpdateDetailedMemory({ ...variables, constants: Constants });
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
        const albumId = variables.album_id;
        queryClient.invalidateQueries(["album", albumId]);
      },
      onError: (error) => {
        if (!(error instanceof Error)) {
          return;
        }
        error.message = error.message || "album_update_detailed_memory_failed";
      },
    },
  );
};

export default useAlbumUpdateDetailedMemory;
