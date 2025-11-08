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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
      body: JSON.stringify({ email: email, password: password }),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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

export const mediaAssetsInsertPOST = async (Constants, _args, handlers, timeout) => {
  const url = `https://qiekucvzrkfhamhjrxtk.supabase.co/rest/v1/rpc/media_assets_insert`;
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
        p_baby_id: "",
        p_original_filename: "",
        p_mime_type: "image/jpeg",
        p_bytes: 0,
        p_album_id: null,
      }),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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

export const useMediaAssetsInsertPOST = (initialArgs = {}, { handlers = {} } = {}) => {
  const queryClient = useQueryClient();
  const Constants = GlobalVariables.useValues();
  return useMutation(
    (args) => mediaAssetsInsertPOST(Constants, { ...initialArgs, ...args }, handlers),
    {
      onError: (err, variables, { previousValue }) => {
        if (previousValue) {
          return queryClient.setQueryData("Media_assets_insert", previousValue);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries("Media_assets_insert");
        queryClient.invalidateQueries("Media_assets_inserts");
      },
    },
  );
};

export const FetchMediaAssetsInsertPOST = ({
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
  } = useMediaAssetsInsertPOST(
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
  return children({ loading, data, error, refetchMediaAssetsInsert: refetch });
};

export const mintAvatarUpload$EdgeFunction$POST = async (
  Constants,
  { bytes, content_type, mimeType, target },
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
    const res = await fetch(url, {
      body: JSON.stringify({
        target: target,
        mimeType: mimeType,
        content_type: content_type,
        bytes: bytes,
      }),
      headers: cleanHeaders({
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": "dearbaby",
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates, return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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

export const getBabyGET = async (Constants, _args, handlers, timeout) => {
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
  return children({ loading, data, error, refetchGetBaby: refetch });
};

export const getProfileGET = async (Constants, { user_id }, handlers, timeout) => {
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
        Accept: " */*",
        Authorization: Constants["AUTHORIZATION_HEADER"],
        "Content-Profile": Constants["Content-Profile"],
        "Content-Type": "application/json",
        Prefer: "return=representation",
        apikey: Constants["apiKey"],
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
