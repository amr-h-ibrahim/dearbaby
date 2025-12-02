import * as React from "react";
import { useQuery, useMutation, useIsFetching, useQueryClient } from "react-query";
import useFetch from "react-fetch-hook";
import useIsFocused from "../utils/useIsFocused";
import { handleResponse, isOkStatus } from "../utils/handleRestApiResponse";
import usePrevious from "../utils/usePrevious";
import { encodeQueryParam, renderParam, renderQueryString } from "../utils/encodeQueryParam";
import * as GlobalVariables from "../config/GlobalVariableContext";

const cleanHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers).filter(([_, value]) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === "string" && value.trim() === "") {
        return false;
      }
      return true;
    }),
  );

const deriveApiKey = (Constants) => {
  if (typeof Constants?.SUPABASE_ANON_KEY === "string" && Constants.SUPABASE_ANON_KEY.trim()) {
    return Constants.SUPABASE_ANON_KEY.trim();
  }
  if (typeof Constants?.apiKey === "string" && Constants.apiKey.trim()) {
    return Constants.apiKey.trim();
  }
  return undefined;
};

const deriveAuthorization = (Constants) => {
  if (
    typeof Constants?.AUTHORIZATION_HEADER === "string" &&
    Constants.AUTHORIZATION_HEADER.trim()
  ) {
    return Constants.AUTHORIZATION_HEADER.trim();
  }
  if (typeof Constants?.auth_token === "string" && Constants.auth_token.trim()) {
    return `Bearer ${Constants.auth_token.trim()}`;
  }
  return undefined;
};

export const babiesCreatePOST = async (
  Constants,
  { created_by, date_of_birth, gender, name },
  handlers,
  timeout,
) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/babies`;
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
    const res = await fetch(url, {
      body: JSON.stringify({
        name: name,
        date_of_birth: date_of_birth,
        gender: gender,
        created_by: created_by,
      }),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Accept-Profile": Constants["Content-Profile"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

export const useBabiesCreatePOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation((args) => babiesCreatePOST(Constants, { ...initialArgs, ...args }, handlers), {
    onError: (err, variables, { previousValue }) => {
      if (previousValue) {
        return queryClient.setQueryData("List of Babies", previousValue);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries("List of Baby");
      queryClient.invalidateQueries("List of Babies");
    },
  });
};

export const FetchBabiesCreatePOST = ({
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
  created_by,
  date_of_birth,
  gender,
  name,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useBabiesCreatePOST(
    { created_by, date_of_birth, gender, name },
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
  return children({ loading, data, error, refetchBabiesCreate: refetch });
};

export const babiesUpdatePATCH = async (
  Constants,
  { baby_id, name, date_of_birth, gender, avatar_object_key },
  handlers,
  timeout,
) => {
  if (!baby_id) {
    throw new Error("babiesUpdatePATCH requires a baby_id");
  }

  const paramsDict = {
    baby_id: `eq.${renderParam(baby_id)}`,
  };

  const payload = {};
  if (name !== undefined) {
    payload.name = name;
  }
  if (date_of_birth !== undefined) {
    payload.date_of_birth = date_of_birth;
  }
  if (gender !== undefined) {
    payload.gender = gender;
  }
  if (avatar_object_key !== undefined) {
    payload.avatar_object_key = avatar_object_key;
  }

  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/babies${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      body: JSON.stringify(payload),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Accept-Profile": Constants["Content-Profile"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
      method: "PATCH",
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

export const useBabiesUpdatePATCH = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => babiesUpdatePATCH(Constants, { ...initialArgs, ...args }, handlers),
    {
      onSettled: () => {
        queryClient.invalidateQueries("Get current users");
        queryClient.invalidateQueries("BabiesBatch");
        queryClient.invalidateQueries("List of Baby");
        queryClient.invalidateQueries("List of Babies");
      },
    },
  );
};

export const babiesListGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "baby_id,name,date_of_birth";
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/babies${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Accept-Profile": Constants["Content-Profile"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useBabiesListGET = (
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
  return useQuery(["List of Baby", args], () => babiesListGET(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
    onSuccess: () => queryClient.invalidateQueries(["List of Babies"]),
  });
};

export const FetchBabiesListGET = ({
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
  } = useBabiesListGET(
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
  return children({ loading, data, error, refetchBabiesList: refetch });
};

export const getLinkedBabiesGET = async (Constants, { uid } = {}, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "baby_id,uid,role,added_at";
  if (uid !== undefined) {
    paramsDict["uid"] = `eq.${renderParam(uid)}`;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/parent_baby${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Accept-Profile": Constants["Content-Profile"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useGetLinkedBabiesGET = (
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
  return useQuery(
    ["Linked_Babies", args],
    () => getLinkedBabiesGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
    },
  );
};

export const FetchGetLinkedBabiesGET = ({
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
  uid,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useGetLinkedBabiesGET(
    { uid },
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
  return children({ loading, data, error, refetchGetLinkedBabies: refetch });
};

export const getBabiesBatchGET = async (
  Constants,
  { baby_ids, select } = {},
  handlers,
  timeout,
) => {
  const validIds = Array.isArray(baby_ids)
    ? baby_ids.map((id) => (typeof id === "string" ? id.trim() : "")).filter((id) => id.length > 0)
    : [];

  if (!validIds.length) {
    const emptyResponse = {
      status: 200,
      statusText: "OK",
      text: "[]",
      json: [],
    };
    handlers?.onData?.([]);
    return emptyResponse;
  }

  const paramsDict = {};
  paramsDict["select"] = select ?? "baby_id,name,date_of_birth,avatar_object_key";
  paramsDict["baby_id"] = `in.(${validIds.map((id) => `"${id.replace(/\"/g, "")}"`).join(",")})`;

  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/babies${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Accept-Profile": Constants["Content-Profile"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useGetBabiesBatchGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["BabiesBatch", args],
    () => getBabiesBatchGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

export const FetchGetBabiesBatchGET = ({
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
  baby_ids,
  select,
  enabled,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useGetBabiesBatchGET(
    { baby_ids, select },
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      timeout,
      handlers: { onData, ...handlers },
      enabled,
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
  return children({ loading, data, error, refetchGetBabiesBatch: refetch });
};

export const getCurrentUserGET = async (Constants, _args, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/user`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useGetCurrentUserGET = (
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
  return useQuery(
    ["Get current user", args],
    () => getCurrentUserGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["Get current users"]),
    },
  );
};

export const FetchGetCurrentUserGET = ({
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
  } = useGetCurrentUserGET(
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
  return children({ loading, data, error, refetchGetCurrentUser: refetch });
};

export const loginPOST = async (Constants, { email, password }, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["grant_type"] = "password";
  const rawAnonKey = Constants?.SUPABASE_ANON_KEY ?? Constants?.apiKey ?? "";
  const anonKey = typeof rawAnonKey === "string" ? rawAnonKey.trim() : "";
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/token${renderQueryString(
    paramsDict,
  )}`;
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
    console.log("Supabase login request", {
      hasAnonKey: Boolean(anonKey),
      anonKeyLength: anonKey.length,
      anonKeyPrefix: anonKey ? anonKey.substring(0, 6) : "",
      emailProvided: Boolean(email),
      url,
    });
    if (!anonKey) {
      throw new Error("Supabase anon key is not configured.");
    }
    const headers = cleanHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    });
    console.log("Supabase login headers", Object.keys(headers));
    const res = await fetch(url, {
      body: JSON.stringify({ email: email, password: password }),
      headers,
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

export const useLoginPOST = (
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
  return useQuery(
    ["supabaseDearBabyLoginPOST", args],
    () => loginPOST(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["supabaseDearBabyLoginPOSTS"]),
    },
  );
};

export const FetchLoginPOST = ({
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
  email,
  password,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useLoginPOST(
    { email, password },
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
  return children({ loading, data, error, refetchLogin: refetch });
};
export const mintAvatarUpload$EdgeFunction$POST = async (
  Constants,
  {
    bytes,
    content_type,
    contentType,
    mimeType,
    target,
    album_id,
    albumId,
    baby_id,
    babyId,
    file_name,
    fileName,
    extension,
    size,
    finalize,
  } = {},
  handlers,
  timeout,
) => {
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

    // 🔒 SAFER RESOLVERS
    const resolvedMimeType = mimeType ?? contentType ?? content_type ?? "image/jpeg";

    const resolvedBytes =
      typeof bytes === "number" && bytes > 0
        ? bytes
        : typeof size === "number" && size > 0
          ? size
          : 0;

    // ✅ NEVER send empty target, default to "media"
    const resolvedTarget =
      typeof target === "string" && target.trim().length > 0 ? target.trim() : "media";

    if (!resolvedBytes || resolvedBytes <= 0) {
      throw new Error(
        `mint-upload: invalid bytes passed from client (got: ${resolvedBytes}). ` +
          `Make sure you pass fileSize/size from the picked image.`,
      );
    }

    const resolvedFilename =
      fileName ??
      file_name ??
      (extension ? `upload-${Date.now()}.${extension.replace(/^\./, "")}` : undefined) ??
      `upload-${Date.now()}.jpg`;

    const payload = Object.fromEntries(
      Object.entries({
        target: resolvedTarget,
        babyId: babyId ?? baby_id ?? undefined,
        albumId: albumId ?? album_id ?? undefined,
        mimeType: resolvedMimeType,
        bytes: resolvedBytes,
        filename: resolvedFilename,
        finalize,
      }).filter(([, value]) => value != null),
    );

    const res = await fetch(url, {
      body: JSON.stringify(payload),
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

export const useMintAvatarUpload$EdgeFunction$POST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => mintAvatarUpload$EdgeFunction$POST(Constants, { ...initialArgs, ...args }, handlers),
    {
      onError: (err, variables, { previousValue }) => {
        if (previousValue) {
          return queryClient.setQueryData("User_Profile", previousValue);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries("User_Profile");
        queryClient.invalidateQueries("User_Profiles");
      },
    },
  );
};

export const FetchMintAvatarUpload$EdgeFunction$POST = ({
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
  bytes,
  content_type,
  mimeType,
  target,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useMintAvatarUpload$EdgeFunction$POST(
    { bytes, content_type, mimeType, target },
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
  return children({
    loading,
    data,
    error,
    refetchMintAvatarUpload$EdgeFunction$: refetch,
  });
};

export const mintAvatarView$EdgeFunction$POST = async (
  Constants,
  { user_id },
  handlers,
  timeout,
) => {
  const paramsDict = {};
  if (user_id !== undefined) {
    paramsDict["uid"] = renderParam(user_id);
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/mint-avatar-view${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      body: JSON.stringify({ extension: "jpg" }),
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

export const useMintAvatarView$EdgeFunction$POST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => mintAvatarView$EdgeFunction$POST(Constants, { ...initialArgs, ...args }, handlers),
    {
      onError: (err, variables, { previousValue }) => {
        if (previousValue) {
          return queryClient.setQueryData("User_Profile", previousValue);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries("User_Profile");
        queryClient.invalidateQueries("User_Profiles");
      },
    },
  );
};

export const FetchMintAvatarView$EdgeFunction$POST = ({
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
  user_id,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useMintAvatarView$EdgeFunction$POST(
    { user_id },
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
  return children({
    loading,
    data,
    error,
    refetchMintAvatarView$EdgeFunction$: refetch,
  });
};

export const pATCHProfilePATCH = async (
  Constants,
  { bio, display_name, object_key, Phone, timezone, country, city, user_id },
  handlers,
  timeout,
) => {
  const paramsDict = {};
  if (user_id !== undefined) {
    paramsDict["uid"] = `eq.${renderParam(user_id)}`;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/profiles${renderQueryString(
    paramsDict,
  )}`;
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
    // Build request body with only defined values
    const bodyObj = {};
    if (display_name !== undefined) bodyObj.display_name = display_name;
    if (bio !== undefined) bodyObj.bio = bio;
    if (timezone !== undefined) bodyObj.timezone = timezone;
    if (object_key !== undefined) bodyObj.avatar_object_key = object_key;
    if (Phone !== undefined) bodyObj.Phone = Phone;
    if (country !== undefined) bodyObj.country = country;
    if (city !== undefined) bodyObj.city = city;

    const res = await fetch(url, {
      body: JSON.stringify(bodyObj),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": "dearbaby",
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
      method: "PATCH",
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

export const usePATCHProfilePATCH = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => pATCHProfilePATCH(Constants, { ...initialArgs, ...args }, handlers),
    {
      onError: (err, variables, { previousValue }) => {
        if (previousValue) {
          return queryClient.setQueryData("User_Profile", previousValue);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries("User_Profile");
        queryClient.invalidateQueries("User_Profiles");
      },
    },
  );
};

export const parentBabyCreatePOST = async (Constants, _args, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/parent_baby`;
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
    const res = await fetch(url, {
      body: JSON.stringify({
        uid: "{{appVars.user_id}}",
        baby_id: "{{state.new_baby_id}}",
        role: "owner",
      }),
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

export const useParentBabyCreatePOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => parentBabyCreatePOST(Constants, { ...initialArgs, ...args }, handlers),
    {
      onError: (err, variables, { previousValue }) => {
        if (previousValue) {
          return queryClient.setQueryData("List of Babies", previousValue);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries("List of Baby");
        queryClient.invalidateQueries("List of Babies");
      },
    },
  );
};

export const FetchParentBabyCreatePOST = ({
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
    mutate: refetch,
  } = useParentBabyCreatePOST(
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
  return children({ loading, data, error, refetchParentBabyCreate: refetch });
};

export const refreshTokenPOST = async (Constants, { refresh_token }, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["grant_type"] = "refresh_token";
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/token${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      body: JSON.stringify({ refresh_token: refresh_token }),
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

export const useRefreshTokenPOST = (
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
  return useQuery(
    ["supabaseDearBabyRefreshTokenPOST", args],
    () => refreshTokenPOST(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["supabaseDearBabyRefreshTokenPOSTS"]),
    },
  );
};

export const FetchRefreshTokenPOST = ({
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
  refresh_token,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useRefreshTokenPOST(
    { refresh_token },
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
  return children({ loading, data, error, refetchRefreshToken: refetch });
};

export const signUpPOST = async (Constants, { email, password }, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/signup`;
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
    const res = await fetch(url, {
      body: JSON.stringify({ email: email, password: password }),
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

// TASK 1: SupabaseAuthSignup - Email/Password signup with full_name support
// Uses ONLY the anon key (no service role key)
// Handles both cases: immediate session (email confirmation OFF) or user-only (email confirmation ON)
export const supabaseAuthSignupPOST = async (
  Constants,
  { email, password, full_name },
  handlers,
  timeout,
) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/signup`;
  const rawAnonKey = Constants?.SUPABASE_ANON_KEY ?? Constants?.apiKey ?? "";
  const anonKey = typeof rawAnonKey === "string" ? rawAnonKey.trim() : "";
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
    console.log("Supabase signup request", {
      hasAnonKey: Boolean(anonKey),
      emailProvided: Boolean(email),
      fullNameProvided: Boolean(full_name),
    });
    if (!anonKey) {
      throw new Error("Supabase anon key is not configured.");
    }

    const requestBody = {
      email: email,
      password: password,
      data: {},
    };

    // Add full_name to user metadata if provided
    if (full_name && full_name.trim()) {
      requestBody.data.full_name = full_name.trim();
    }

    const headers = cleanHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      apikey: anonKey,
    });

    const res = await fetch(url, {
      body: JSON.stringify(requestBody),
      headers,
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

export const useSupabaseAuthSignupPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => supabaseAuthSignupPOST(Constants, { ...initialArgs, ...args }, handlers),
    {
      onSettled: () => {
        queryClient.invalidateQueries("supabaseAuthSignup");
      },
    },
  );
};

export const useSignUpPOST = (
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
  return useQuery(
    ["supabaseDearBabySignUpPOST", args],
    () => signUpPOST(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["supabaseDearBabySignUpPOSTS"]),
    },
  );
};

export const FetchSignUpPOST = ({
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
  email,
  password,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useSignUpPOST(
    { email, password },
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
  return children({ loading, data, error, refetchSignUp: refetch });
};

export const uPSERTProfilePOST = async (Constants, { user_id }, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["on_conflict"] = "uid";
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/profiles${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      body: JSON.stringify({ uid: user_id }),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

export const useUPSERTProfilePOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => uPSERTProfilePOST(Constants, { ...initialArgs, ...args }, handlers),
    {
      onError: (err, variables, { previousValue }) => {
        if (previousValue) {
          return queryClient.setQueryData("User_Profile", previousValue);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries("User_Profile");
        queryClient.invalidateQueries("User_Profiles");
      },
    },
  );
};

export const FetchUPSERTProfilePOST = ({
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
  user_id,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useUPSERTProfilePOST(
    { user_id },
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
  return children({ loading, data, error, refetchUPSERTProfile: refetch });
};

export const albumSharesGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "*";
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/album_shares${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useAlbumSharesGET = (
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
  return useQuery(
    ["Get current users", args],
    () => albumSharesGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
    },
  );
};

export const FetchAlbumSharesGET = ({
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
  } = useAlbumSharesGET(
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
  return children({ loading, data, error, refetchAlbumShares: refetch });
};

export const albumsInsertPOST = async (
  Constants,
  { baby_id, title, created_by } = {},
  handlers,
  timeout,
) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/albums`;
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
    const res = await fetch(url, {
      body: JSON.stringify({
        baby_id: baby_id,
        title: title,
        created_by: created_by ?? Constants["user_id"],
      }),
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
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

export const useAlbumsInsertPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation((args) => albumsInsertPOST(Constants, { ...initialArgs, ...args }, handlers), {
    onSettled: () => {
      queryClient.invalidateQueries("Get current users");
      queryClient.invalidateQueries("Albums_insert");
    },
  });
};

export const albumsGET = async (
  Constants,
  { album_id, baby_id, created_by, select, limit, order, ...additionalParams } = {},
  handlers,
  timeout,
) => {
  const paramsDict = {};
  paramsDict["select"] = select ?? "*";
  if (album_id !== undefined && album_id !== null && `${album_id}` !== "") {
    paramsDict["album_id"] = `eq.${renderParam(album_id)}`;
  }
  if (baby_id !== undefined && baby_id !== null && `${baby_id}` !== "") {
    paramsDict["baby_id"] = `eq.${renderParam(baby_id)}`;
  }
  if (created_by !== undefined && created_by !== null && `${created_by}` !== "") {
    paramsDict["created_by"] = `eq.${renderParam(created_by)}`;
  }
  if (limit !== undefined && limit !== null && !Number.isNaN(limit)) {
    paramsDict["limit"] = `${limit}`;
  }
  if (order) {
    paramsDict["order"] = order;
  }
  // Add any additional query parameters (like media_assets.status, media_assets.deleted_at)
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== "") {
      paramsDict[key] = `${value}`;
    }
  });
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/albums${renderQueryString(
    paramsDict,
  )}`;
  const contentProfile =
    typeof Constants?.["Content-Profile"] === "string" && Constants["Content-Profile"].trim()
      ? Constants["Content-Profile"].trim()
      : "dearbaby";
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": contentProfile,
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": contentProfile,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useAlbumsGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["Get current users", args],
    () => albumsGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

export const FetchAlbumsGET = ({
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
  baby_id,
  created_by,
  select,
  limit,
  order,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useAlbumsGET(
    { baby_id, created_by, select, limit, order },
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
  return children({ loading, data, error, refetchAlbums: refetch });
};

export const getBabyGET = async (
  Constants,
  { baby_id, select, limit, order } = {},
  handlers,
  timeout,
) => {
  const paramsDict = {};
  paramsDict["select"] = select ?? "*";
  if (baby_id !== undefined && baby_id !== null && `${baby_id}` !== "") {
    paramsDict["baby_id"] = `eq.${renderParam(baby_id)}`;
  }
  if (limit !== undefined && limit !== null && !Number.isNaN(limit)) {
    paramsDict["limit"] = `${limit}`;
  }
  if (order) {
    paramsDict["order"] = order;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/babies${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useGetBabyGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["Get current users", args],
    () => getBabyGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

export const FetchGetBabyGET = ({
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
  baby_id,
  select,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useGetBabyGET(
    { baby_id, select },
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
  return children({ loading, data, error, refetchGetBaby: refetch });
};

export const getProfileGET = async (Constants, { user_id }, handlers, timeout) => {
  const paramsDict = {};
  if (user_id !== undefined) {
    paramsDict["select"] =
      `uid,display_name,bio,timezone,avatar_object_key,Phone,email,country,city&uid=eq.${renderParam(user_id)}`;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/profiles${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useGetProfileGET = (
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
  return useQuery(
    ["User_Profiles", args],
    () => getProfileGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
    },
  );
};

export const FetchGetProfileGET = ({
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
  user_id,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useGetProfileGET(
    { user_id },
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
  return children({ loading, data, error, refetchGetProfile: refetch });
};

export const mediaAssetsGET = async (
  Constants,
  { baby_id, album_id, select, limit, order, status, deleted_at } = {},
  handlers,
  timeout,
) => {
  const paramsDict = {};
  paramsDict["select"] = select ?? "*";
  if (baby_id !== undefined && baby_id !== null && `${baby_id}` !== "") {
    paramsDict["baby_id"] = `eq.${renderParam(baby_id)}`;
  }
  if (album_id !== undefined && album_id !== null && `${album_id}` !== "") {
    paramsDict["album_id"] = `eq.${renderParam(album_id)}`;
  }
  if (status !== undefined && status !== null && `${status}` !== "") {
    paramsDict["status"] = `${status}`;
  }
  if (deleted_at !== undefined && deleted_at !== null && `${deleted_at}` !== "") {
    paramsDict["deleted_at"] = `${deleted_at}`;
  }
  if (limit !== undefined && limit !== null && !Number.isNaN(limit)) {
    paramsDict["limit"] = `${limit}`;
  }
  if (order) {
    paramsDict["order"] = order;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/media_assets${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useMediaAssetsGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["Get current users", args],
    () => mediaAssetsGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

export const FetchMediaAssetsGET = ({
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
  baby_id,
  album_id,
  select,
  limit,
  order,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useMediaAssetsGET(
    { baby_id, album_id, select, limit, order },
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
  return children({ loading, data, error, refetchMediaAssets: refetch });
};

export const mintViewPOST = async (Constants, { object_key }, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/mint-view`;
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
    const res = await fetch(url, {
      body: JSON.stringify({
        object_key: object_key,
        kind: "avatar",
        expiresInSeconds: 600,
      }),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
        expiresInSeconds: "600",
        kind: "avatar",
        object_key:
          '"avatars/d051eea3-e42e-4cf9-9fb7-6db65aaf5e32/d5198a89-6e78-4725-ac59-c2ca71034eb9.jpg"',
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

export const useMintViewPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation((args) => mintViewPOST(Constants, { ...initialArgs, ...args }, handlers), {
    onError: (err, variables, { previousValue }) => {
      if (previousValue) {
        return queryClient.setQueryData("User_Profile", previousValue);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries("User_Profile");
      queryClient.invalidateQueries("User_Profiles");
    },
  });
};

export const FetchMintViewPOST = ({
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
  object_key,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    mutate: refetch,
  } = useMintViewPOST(
    { object_key },
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
  return children({ loading, data, error, refetchMintView: refetch });
};

export const parentBabyGET = async (
  Constants,
  { baby_id, uid, select, limit } = {},
  handlers,
  timeout,
) => {
  const paramsDict = {};
  paramsDict["select"] = select ?? "*";
  if (baby_id !== undefined && baby_id !== null && `${baby_id}` !== "") {
    paramsDict["baby_id"] = `eq.${renderParam(baby_id)}`;
  }
  if (uid !== undefined && uid !== null && `${uid}` !== "") {
    paramsDict["uid"] = `eq.${renderParam(uid)}`;
  }
  if (limit !== undefined && limit !== null && !Number.isNaN(limit)) {
    paramsDict["limit"] = `${limit}`;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/parent_baby${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useParentBabyGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["Get current users", args],
    () => parentBabyGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

export const FetchParentBabyGET = ({
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
  baby_id,
  uid,
  select,
  limit,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useParentBabyGET(
    { baby_id, uid, select, limit },
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
  return children({ loading, data, error, refetchParentBaby: refetch });
};

export const timelineEntriesGET = async (
  Constants,
  { baby_id, select, limit, order } = {},
  handlers,
  timeout,
) => {
  const paramsDict = {};
  paramsDict["select"] = select ?? "*";
  if (baby_id !== undefined && baby_id !== null && `${baby_id}` !== "") {
    paramsDict["baby_id"] = `eq.${renderParam(baby_id)}`;
  }
  if (limit !== undefined && limit !== null && !Number.isNaN(limit)) {
    paramsDict["limit"] = `${limit}`;
  }
  if (order) {
    paramsDict["order"] = order;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/timeline_entries${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useTimelineEntriesGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["Get current users", args],
    () => timelineEntriesGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

export const FetchTimelineEntriesGET = ({
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
  baby_id,
  select,
  limit,
  order,
}) => {
  const Constants = GlobalVariables.useValues();
  const isFocused = useIsFocused();
  const prevIsFocused = usePrevious(isFocused);

  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = useTimelineEntriesGET(
    { baby_id, select, limit, order },
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
  return children({ loading, data, error, refetchTimelineEntries: refetch });
};

export const remindersGET = async (
  Constants,
  { baby_id, select, limit, order, is_done } = {},
  handlers,
  timeout,
) => {
  const paramsDict = {};
  paramsDict["select"] = select ?? "*";
  if (baby_id !== undefined && baby_id !== null && `${baby_id}` !== "") {
    paramsDict["baby_id"] = `eq.${renderParam(baby_id)}`;
  }
  if (is_done !== undefined && is_done !== null) {
    paramsDict["is_done"] = `eq.${renderParam(is_done)}`;
  }
  if (limit !== undefined && limit !== null && !Number.isNaN(limit)) {
    paramsDict["limit"] = `${limit}`;
  }
  if (order) {
    paramsDict["order"] = order;
  }
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/reminders${renderQueryString(
    paramsDict,
  )}`;
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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: " */*",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
        auth_token: Constants["auth_token"],
      }),
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

export const useRemindersGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(["Reminders", args], () => remindersGET(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
    enabled,
  });
};

export const deleteMediaPOST = async (Constants, { media_id }, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/delete-media`;
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
    const res = await fetch(url, {
      body: JSON.stringify({ media_id }),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        apikey: deriveApiKey(Constants),
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

export const useDeleteMediaPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation((args) => deleteMediaPOST(Constants, { ...initialArgs, ...args }, handlers), {
    onSettled: () => {
      queryClient.invalidateQueries("album-media");
      queryClient.invalidateQueries("Get current users");
    },
  });
};

// Send welcome email Edge Function
// This is a fire-and-forget call that sends a welcome email to the newly authenticated user
// The function derives the user's email and name from the Supabase session
export const sendWelcomeEmailPOST = async (Constants, _args = {}, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.functions.supabase.co/send-welcome-email`;
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
    const res = await fetch(url, {
      body: JSON.stringify({}),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        apikey: deriveApiKey(Constants),
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

export const useSendWelcomeEmailPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => sendWelcomeEmailPOST(Constants, { ...initialArgs, ...args }, handlers),
    {
      // No query invalidation needed - this is fire-and-forget
    },
  );
};

// Get Current Profile with welcome_email_sent flag
// Fetches the profile for the logged-in user to check if welcome email was sent
export const getCurrentProfileGET = async (Constants, { user_id } = {}, handlers, timeout) => {
  if (!user_id) {
    throw new Error("getCurrentProfileGET requires a user_id");
  }

  const paramsDict = {};
  paramsDict["select"] = "uid,welcome_email_sent";
  paramsDict["uid"] = `eq.${renderParam(user_id)}`;

  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/profiles${renderQueryString(
    paramsDict,
  )}`;

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
    const res = await fetch(url, {
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        apikey: deriveApiKey(Constants),
      }),
      method: "GET",
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

export const useGetCurrentProfileGET = (
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
    enabled = true,
  } = {},
) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(
    ["CurrentProfile", args],
    () => getCurrentProfileGET(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      enabled,
    },
  );
};

// Create baby invite RPC
// Calls the create_baby_invite RPC to generate an invite for a baby
export const createBabyInviteRPC = async (
  Constants,
  { baby_id, invited_email, role } = {},
  handlers,
  timeout,
) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/rpc/create_baby_invite`;
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
    const payload = {
      p_baby_id: baby_id,
      p_invited_email: invited_email,
      p_role: role || "editor",
    };

    const authorization = deriveAuthorization(Constants);
    const apikey = deriveApiKey(Constants);

    console.log("[createBabyInviteRPC] Request details:", {
      url,
      payload,
      hasAuth: !!authorization,
      hasApiKey: !!apikey,
      profile: Constants["Content-Profile"] || "dearbaby",
    });

    const res = await fetch(url, {
      body: JSON.stringify(payload),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: authorization,
        "Content-Type": "application/json",
        "Accept-Profile": Constants["Content-Profile"] || "dearbaby",
        "Content-Profile": Constants["Content-Profile"] || "dearbaby",
        Prefer: "return=representation",
        apikey: apikey,
      }),
      method: "POST",
      signal: controller.signal,
    });

    console.log("[createBabyInviteRPC] Response status:", res.status);

    timeoutObj && clearTimeout(timeoutObj);
    const result = await handleResponse(res, handlers);

    console.log("[createBabyInviteRPC] Parsed result:", result);

    return result;
  } catch (e) {
    console.error("[createBabyInviteRPC] Exception:", e);
    if (e.__type === "TIMEOUT") {
      handlers.onTimeout?.();
    } else if (timeoutObj) {
      clearTimeout(timeoutObj);
    }
    throw e;
  }
};

export const useCreateBabyInviteRPC = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => createBabyInviteRPC(Constants, { ...initialArgs, ...args }, handlers),
    {
      onSettled: () => {
        queryClient.invalidateQueries("baby_invites");
      },
    },
  );
};

// Accept baby invite RPC
// Calls the accept_baby_invite RPC to accept an invitation and join a baby's family
export const acceptBabyInviteRPC = async (Constants, { token } = {}, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/rpc/accept_baby_invite`;
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
    const res = await fetch(url, {
      body: JSON.stringify({
        p_token: token,
      }),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        "Accept-Profile": Constants["Content-Profile"] || "dearbaby",
        "Content-Profile": Constants["Content-Profile"] || "dearbaby",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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

export const useAcceptBabyInviteRPC = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => acceptBabyInviteRPC(Constants, { ...initialArgs, ...args }, handlers),
    {
      onSettled: () => {
        queryClient.invalidateQueries("baby_invites");
        queryClient.invalidateQueries("Get current users");
      },
    },
  );
};

// Send baby invite email Edge Function
// Calls the send-baby-invite-email edge function to send an invite email
export const sendBabyInviteEmailPOST = async (Constants, { invite_id } = {}, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/send-baby-invite-email`;
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
    const res = await fetch(url, {
      body: JSON.stringify({ invite_id }),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        apikey: deriveApiKey(Constants),
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

export const useSendBabyInviteEmailPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => sendBabyInviteEmailPOST(Constants, { ...initialArgs, ...args }, handlers),
    {
      // No query invalidation needed - this is fire-and-forget
    },
  );
};

// Get my pending baby invites RPC
// Calls the get_my_pending_baby_invites RPC to fetch invites for the current user
export const getMyPendingBabyInvitesRPC = async (Constants, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/rpc/get_my_pending_baby_invites`;
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
    console.log("[getMyPendingBabyInvitesRPC] Fetching pending invites");

    const res = await fetch(url, {
      body: JSON.stringify({}),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        "Accept-Profile": Constants["Content-Profile"] || "dearbaby",
        "Content-Profile": Constants["Content-Profile"] || "dearbaby",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
      }),
      method: "POST",
      signal: controller.signal,
    });

    console.log("[getMyPendingBabyInvitesRPC] Response status:", res.status);

    timeoutObj && clearTimeout(timeoutObj);
    const result = await handleResponse(res, handlers);

    console.log("[getMyPendingBabyInvitesRPC] Result:", result);

    return result;
  } catch (e) {
    console.error("[getMyPendingBabyInvitesRPC] Exception:", e);
    if (e.__type === "TIMEOUT") {
      handlers.onTimeout?.();
    } else if (timeoutObj) {
      clearTimeout(timeoutObj);
    }
    throw e;
  }
};

export const useGetMyPendingBabyInvitesRPC = (initialArgs = {}, { handlers = {} } = {}) => {
  const Constants = GlobalVariables.useValues();
  return useQuery(["pending_baby_invites"], () => getMyPendingBabyInvitesRPC(Constants, handlers), {
    enabled: Boolean(Constants?.auth_token),
    refetchOnWindowFocus: true,
  });
};

// Accept baby invite by ID RPC
// Calls the accept_baby_invite_by_id RPC to accept a specific invite
export const acceptBabyInviteByIdRPC = async (Constants, { invite_id } = {}, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/rpc/accept_baby_invite_by_id`;
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
    const payload = {
      p_invite_id: invite_id,
    };

    console.log("[acceptBabyInviteByIdRPC] Accepting invite:", payload);

    const res = await fetch(url, {
      body: JSON.stringify(payload),
      headers: cleanHeaders({
        Accept: "application/json",
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        "Accept-Profile": Constants["Content-Profile"] || "dearbaby",
        "Content-Profile": Constants["Content-Profile"] || "dearbaby",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
      }),
      method: "POST",
      signal: controller.signal,
    });

    console.log("[acceptBabyInviteByIdRPC] Response status:", res.status);
    console.log("[acceptBabyInviteByIdRPC] Response ok:", res.ok);
    console.log("[acceptBabyInviteByIdRPC] Response statusText:", res.statusText);

    // Log the raw response text before parsing
    const responseText = await res.text();
    console.log("[acceptBabyInviteByIdRPC] Raw response text:", responseText);

    timeoutObj && clearTimeout(timeoutObj);

    // Now we need to handle the response manually since we already read the text
    let result;

    // Check if response is ok first (before parsing)
    if (!res.ok) {
      console.error("[acceptBabyInviteByIdRPC] Non-OK HTTP status:", res.status, res.statusText);
      let json = null;
      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        // Ignore parse errors for error responses
      }
      result = { ok: res.ok, status: res.status, json };
      console.error("[acceptBabyInviteByIdRPC] Error response:", result);
      const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
      error.response = result;
      throw error;
    }

    // Response is OK, try to parse JSON (but don't fail if empty or invalid)
    let json = null;
    if (responseText && responseText.trim()) {
      try {
        json = JSON.parse(responseText);
        console.log("[acceptBabyInviteByIdRPC] Parsed JSON:", json);
      } catch (parseError) {
        console.warn(
          "[acceptBabyInviteByIdRPC] Could not parse JSON, but HTTP was successful:",
          parseError.message,
        );
        console.warn("[acceptBabyInviteByIdRPC] Response text:", responseText);
        // Don't throw - just use null json
      }
    } else {
      console.log("[acceptBabyInviteByIdRPC] Empty response body (probably 204 No Content)");
    }

    result = { ok: res.ok, status: res.status, json };
    console.log("[acceptBabyInviteByIdRPC] Final result:", result);
    return result;
  } catch (e) {
    console.error("[acceptBabyInviteByIdRPC] Exception caught:");
    console.error("[acceptBabyInviteByIdRPC] Error message:", e?.message);
    console.error("[acceptBabyInviteByIdRPC] Error stack:", e?.stack);
    console.error(
      "[acceptBabyInviteByIdRPC] Full error:",
      JSON.stringify(e, Object.getOwnPropertyNames(e), 2),
    );

    if (e.__type === "TIMEOUT") {
      handlers.onTimeout?.();
    } else if (timeoutObj) {
      clearTimeout(timeoutObj);
    }
    throw e;
  }
};

export const useAcceptBabyInviteByIdRPC = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => acceptBabyInviteByIdRPC(Constants, { ...initialArgs, ...args }, handlers),
    {
      onSuccess: () => {
        console.log("[useAcceptBabyInviteByIdRPC] Success! Invalidating queries...");
        // Invalidate pending invites to remove the accepted invite from the list
        queryClient.invalidateQueries("pending_baby_invites");
        // Invalidate babies list to show the newly accepted baby
        queryClient.invalidateQueries("BabiesBatch");
        // Invalidate current user data
        queryClient.invalidateQueries("Get current users");
      },
    },
  );
};
