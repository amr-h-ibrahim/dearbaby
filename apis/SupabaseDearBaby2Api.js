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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        "Content-Profile": Constants["Content-Profile"],
        apikey: deriveApiKey(Constants),
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

export const getBabiesGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "*";
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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

export const useGetBabiesGET = (
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
    () => getBabiesGET(Constants, args, handlers, timeout),
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

export const FetchGetBabiesGET = ({
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
  } = useGetBabiesGET(
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
  return children({ loading, data, error, refetchGetBabies: refetch });
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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

export const getProfile$me$GET = async (Constants, { user_id }, handlers, timeout) => {
  const paramsDict = {};
  if (user_id !== undefined) {
    paramsDict["select"] =
      `uid,display_name,bio,timezone,avatar_object_key,Phone&uid=eq.${renderParam(user_id)}`;
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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

export const useGetProfile$me$GET = (
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
    () => getProfile$me$GET(Constants, args, handlers, timeout),
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

export const FetchGetProfile$me$GET = ({
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
  } = useGetProfile$me$GET(
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
  return children({ loading, data, error, refetchGetProfile$me$: refetch });
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
    console.log("Supabase login request (v2)", {
      hasAnonKey: Boolean(anonKey),
      anonKeyLength: anonKey.length,
      anonKeyPrefix: anonKey ? anonKey.substring(0, 6) : "",
      emailProvided: Boolean(email),
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
    console.log("Supabase login headers (v2)", Object.keys(headers));
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
    ["supabaseDearBaby2LoginPOST", args],
    () => loginPOST(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["supabaseDearBaby2LoginPOSTS"]),
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

    const resolvedMimeType = mimeType ?? contentType ?? content_type ?? "image/jpeg";
    const resolvedBytes = typeof bytes === "number" ? bytes : (size ?? 0);
    const resolvedFilename =
      fileName ??
      file_name ??
      (extension ? `upload-${Date.now()}.${extension.replace(/^\./, "")}` : undefined) ??
      `upload-${Date.now()}.jpg`;

    const payload = Object.fromEntries(
      Object.entries({
        target: target ?? "media",
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
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
  { bio, display_name, object_key, timezone, user_id },
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
    const res = await fetch(url, {
      body: JSON.stringify({
        display_name: display_name,
        bio: bio,
        timezone: timezone,
        avatar_object_key: object_key,
      }),
      headers: cleanHeaders({
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": "dearbaby",
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
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
    ["supabaseDearBaby2RefreshTokenPOST", args],
    () => refreshTokenPOST(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["supabaseDearBaby2RefreshTokenPOSTS"]),
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
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
    ["supabaseDearBaby2SignUpPOST", args],
    () => signUpPOST(Constants, args, handlers, timeout),
    {
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnMount,
      refetchOnReconnect,
      retry,
      staleTime,
      onSuccess: () => queryClient.invalidateQueries(["supabaseDearBaby2SignUpPOSTS"]),
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
        Authorization: deriveAuthorization(Constants),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation",
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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

export const albumsGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "*";
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/albums${renderQueryString(
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
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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
  return children({ loading, data, error, refetchAlbums: refetch });
};

export const mediaAssetsGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "*";
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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
  return children({ loading, data, error, refetchMediaAssets: refetch });
};

export const parentBabyGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "*";
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
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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
  return children({ loading, data, error, refetchParentBaby: refetch });
};

export const timelineEntriesGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["select"] = "*";
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
        Accept: "application/json",
        "Accept-Profile": Constants["Content-Profile"],
        Authorization: deriveAuthorization(Constants),
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: deriveApiKey(Constants),
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
  return children({ loading, data, error, refetchTimelineEntries: refetch });
};
