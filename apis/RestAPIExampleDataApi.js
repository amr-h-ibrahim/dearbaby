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

export const $todoLists$Limit$10GET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["_limit"] = "10";
  const url = `https://example-data.draftbit.com/todo_lists${renderQueryString(paramsDict)}`;
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
        "Content-Type": "application/json",
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

export const use$todoLists$Limit$10GET = (
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
    ["Lists", args],
    () => $todoLists$Limit$10GET(Constants, args, handlers, timeout),
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

export const Fetch$todoLists$Limit$10GET = ({
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
  } = use$todoLists$Limit$10GET(
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
  return children({
    loading,
    data,
    error,
    refetch$todoLists$Limit$10: refetch,
  });
};

export const articlesGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["_limit"] = "10";
  const url = `https://example-data.draftbit.com/articles${renderQueryString(paramsDict)}`;
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
        "Content-Type": "application/json",
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

export const useArticlesGET = (
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
  return useQuery(["articles", args], () => articlesGET(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
  });
};

export const FetchArticlesGET = ({
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
  } = useArticlesGET(
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
  return children({ loading, data, error, refetchArticles: refetch });
};

export const peopleGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["_limit"] = "10";
  const url = `https://example-data.draftbit.com/people${renderQueryString(paramsDict)}`;
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
        "Content-Type": "application/json",
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

export const usePeopleGET = (
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
  return useQuery(["Teams", args], () => peopleGET(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
  });
};

export const FetchPeopleGET = ({
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
  } = usePeopleGET(
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
  return children({ loading, data, error, refetchPeople: refetch });
};

export const teamsGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["_limit"] = "10";
  const url = `https://example-data.draftbit.com/teams${renderQueryString(paramsDict)}`;
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
        "Content-Type": "application/json",
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

export const useTeamsGET = (
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
  return useQuery(["teams", args], () => teamsGET(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
  });
};

export const FetchTeamsGET = ({
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
  } = useTeamsGET(
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
  return children({ loading, data, error, refetchTeams: refetch });
};

export const todosGET = async (Constants, _args, handlers, timeout) => {
  const paramsDict = {};
  paramsDict["_limit"] = "10";
  const url = `https://example-data.draftbit.com/todos${renderQueryString(paramsDict)}`;
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
        "Content-Type": "application/json",
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

export const useTodosGET = (
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
  return useQuery(["todos", args], () => todosGET(Constants, args, handlers, timeout), {
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    retry,
    staleTime,
  });
};

export const FetchTodosGET = ({
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
  } = useTodosGET(
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
  return children({ loading, data, error, refetchTodos: refetch });
};
