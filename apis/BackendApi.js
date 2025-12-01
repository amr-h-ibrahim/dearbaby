import * as React from "react";
import { useQuery, useMutation, useIsFetching, useQueryClient } from "react-query";
import useFetch from "react-fetch-hook";
import useIsFocused from "../utils/useIsFocused";
import { handleResponse, isOkStatus } from "../utils/handleRestApiResponse";
import usePrevious from "../utils/usePrevious";
import { encodeQueryParam, renderParam, renderQueryString } from "../utils/encodeQueryParam";
import * as GlobalVariables from "../config/GlobalVariableContext";

const cleanHeaders = (headers) =>
  Object.fromEntries(Object.entries(headers).filter((kv) => kv[1] != null));

export const mintUploadPOST = async (Constants, _args, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/mint-upload`;
  const controller = new AbortController();
  let timeoutObj;
  if (timeout) {
    timeoutObj = setTimeout(() => {
      const err = new Error(`Timeout after ${timeout}ms`);
      err.__type = "TIMEOUT";
      controller.abort(err);
    }, timeout);
  }
  try {
    if (!Constants?.auth_token) {
      throw new Error("Missing auth token for mint-upload");
    }
    const res = await fetch(url, {
      body: JSON.stringify({
        target: "media",
        babyId: null,
        albumId: null,
        mimeType: "image/jpeg",
        bytes: 0,
        filename: `upload-${Date.now()}.jpg`,
      }),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: `Bearer ${Constants["auth_token"]}`,
        "Content-Type": "application/json",
      }),
      method: "POST",
      signal: controller.signal,
    });
    timeoutObj && clearTimeout(timeoutObj);
    return handleResponse(res, handlers);
  } catch (e) {
    if (e.__type === "TIMEOUT") {
      handlers.onTimeout?.();
    } else if (timeoutObj) {
      clearTimeout(timeoutObj);
    }
    throw e;
  }
};

export const useMintUploadPOST = (
  args = {},
  {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
    timeout,
    handlers = {},
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();
  return useQuery(["Mint Upload", args], () => mintUploadPOST(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
    onSuccess: () => queryClient.invalidateQueries(["Mint Uploads"]),
  });
};

export const FetchMintUploadPOST = ({
  children,
  onData = () => {},
  handlers = {},
  refetchInterval,
  refetchOnWindowFocus,
  refetchOnMount,
  refetchOnReconnect,
  retry,
  staleTime,
  timeout,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useMintUploadPOST(
    {},
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      timeout,
      handlers: { onData, ...handlers },
    },
  );

  React.useEffect(() => {
    if (!prevIsFocused && isFocused && refetchOnWindowFocus !== false) {
      refetch();
    }
  }, [isFocused, prevIsFocused, refetchOnWindowFocus]);

  React.useEffect(() => {
    if (error) {
      console.error(error);
      if (error.status) {
        console.error("Fetch error: " + error.status + " " + error.statusText);
      }
    }
  }, [error]);
  return children({ loading, data, error, refetchMintUpload: refetch });
};
