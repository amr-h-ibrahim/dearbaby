import React from "react";
import { View, ActivityIndicator } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const DeviceVariables = {
  "db.exp": "",
  "db.refresh": "",
  "db.session": "",
  __env__: "Production",
};
export const AppVariables = {
  API_BASE_URL: "https://qiekucvzrkfhamhjrxtk.supabase.co/functions/v1/",
  apiKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWt1Y3Z6cmtmaGFtaGpyeHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTE4NzAsImV4cCI6MjA3MDMyNzg3MH0.W4Ao53pY4sobecaG5kcfDgkn2BZ_Mr8ALs_1rgd4nsc",
  AUTHORIZATION_HEADER:
    "Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IitIbjByQ2RmQWwvLzFlZmEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FpZWt1Y3Z6cmtmaGFtaGpyeHRrLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkMDUxZWVhMy1lNDJlLTRjZjktOWZiNy02ZGI2NWFhZjVlMzIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYyNTExODAwLCJpYXQiOjE3NjI1MDgyMDAsImVtYWlsIjoiYW1yLmguaWJyYWhpbUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MjUwODIwMH1dLCJzZXNzaW9uX2lkIjoiODU4ZjZmZjAtMDVlNC00NWZmLWFjYjctN2Q3YWZhZmM3OWVhIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.fGUAcL31nWR1IuuRL5hjIkSP_Qm-HHH8NQnZNZU5LIc",
  auth_token:
    "eyJhbGciOiJIUzI1NiIsImtpZCI6IitIbjByQ2RmQWwvLzFlZmEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FpZWt1Y3Z6cmtmaGFtaGpyeHRrLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkMDUxZWVhMy1lNDJlLTRjZjktOWZiNy02ZGI2NWFhZjVlMzIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYyNDY4OTU0LCJpYXQiOjE3NjI0NjUzNTQsImVtYWlsIjoiYW1yLmguaWJyYWhpbUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MjQ2NTM1NH1dLCJzZXNzaW9uX2lkIjoiMmE4NjdkNDItMzIwNC00ZDNlLWIxYjgtMTRhYmZiZDFjZmE2IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.D4vPdGFI_D8xXRJdOfoCCaQgZ0GCG_RbQ5c1G_QqQGI",
  BUILD_VERSION: "0.0.1",
  "Content-Profile": "dearbaby",
  refresh_token: "",
  SENTRY_DSN: "",
  session_exp: 0,
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWt1Y3Z6cmtmaGFtaGpyeHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTE4NzAsImV4cCI6MjA3MDMyNzg3MH0.W4Ao53pY4sobecaG5kcfDgkn2BZ_Mr8ALs_1rgd4nsc",
  SUPABASE_URL: "https://qiekucvzrkfhamhjrxtk.supabase.co/",
  user_id: "d051eea3-e42e-4cf9-9fb7-6db65aaf5e32",
};
const GlobalVariableContext = React.createContext();
const GlobalVariableUpdater = React.createContext();
const keySuffix = "";

// Attempt to parse a string as JSON. If the parse fails, return the string as-is.
// This is necessary to account for variables which are already present in local
// storage, but were not stored in JSON syntax (e.g. 'hello' instead of '"hello"').
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

class GlobalVariable {
  /**
   *  Filters an object of key-value pairs for those that should be
   *  persisted to storage, and persists them.
   *
   *  @param values Record<string, string>
   */
  static async syncToLocalStorage(values) {
    const update = Object.entries(values)
      .filter(([key]) => key in DeviceVariables)
      .map(([key, value]) => [key + keySuffix, JSON.stringify(value)]);

    if (update.length > 0) {
      await AsyncStorage.multiSet(update);
    }

    return update;
  }

  static async loadLocalStorage() {
    const keys = Object.keys(DeviceVariables);
    const entries = await AsyncStorage.multiGet(keySuffix ? keys.map((k) => k + keySuffix) : keys);

    // If values isn't set, use the default. These will be written back to
    // storage on the next render.
    const withDefaults = entries.map(([key_, value]) => {
      // Keys only have the suffix appended in storage; strip the key
      // after they are retrieved
      const key = keySuffix ? key_.replace(keySuffix, "") : key_;
      return [key, value ? tryParseJson(value) : DeviceVariables[key]];
    });

    return Object.fromEntries(withDefaults);
  }
}

class State {
  static defaultValues = {
    ...AppVariables,
    ...DeviceVariables,
  };

  static reducer(state, { type, payload }) {
    switch (type) {
      case "RESET":
        return { values: State.defaultValues, __loaded: true };
      case "LOAD_FROM_ASYNC_STORAGE":
        return { values: { ...state.values, ...payload }, __loaded: true };
      case "UPDATE":
        return state.__loaded
          ? {
              ...state,
              values: {
                ...state.values,
                [payload.key]: payload.value,
              },
            }
          : state;
      case "ADD_CALLBACK":
        payload();
        return state;
      default:
        return state;
    }
  }

  static initialState = {
    __loaded: false,
    values: State.defaultValues,
  };
}

export function GlobalVariableProvider({ children }) {
  const [state, dispatch] = React.useReducer(State.reducer, State.initialState);

  React.useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
    }

    prepare();
  }, []);

  // This effect runs on mount to overwrite the default value of any
  // key that has a local value.
  React.useEffect(() => {
    async function initialStorageLoader() {
      try {
        const payload = await GlobalVariable.loadLocalStorage();
        if (
          payload?.__env__ &&
          DeviceVariables.__env__ &&
          payload.__env__ !== DeviceVariables.__env__
        ) {
          console.log(
            `Publication Environment changed from ${payload.__env__} to ${DeviceVariables.__env__}. Refreshing variables`,
          );
          dispatch({
            type: "LOAD_FROM_ASYNC_STORAGE",
            payload: DeviceVariables,
          });
        } else {
          dispatch({ type: "LOAD_FROM_ASYNC_STORAGE", payload });
        }
      } catch (err) {
        console.error(err);
      }
    }
    initialStorageLoader();
  }, []);

  // This effect runs on every state update after the initial load. Gives us
  // best of both worlds: React state updates sync, but current state made
  // durable next async tick.
  React.useEffect(() => {
    async function syncToAsyncStorage() {
      try {
        await GlobalVariable.syncToLocalStorage(state.values);
      } catch (err) {
        console.error(err);
      }
    }
    if (state.__loaded) {
      syncToAsyncStorage();
    }
  }, [state]);

  const onLayoutRootView = React.useCallback(async () => {
    if (state.__loaded) {
      await SplashScreen.hideAsync();
    }
  }, [state.__loaded]);

  // We won't want an app to read a default state when there might be one
  // incoming from storage.
  if (!state.__loaded) {
    return null;
  }

  return (
    <GlobalVariableUpdater.Provider value={dispatch} onLayout={onLayoutRootView}>
      <GlobalVariableContext.Provider value={state.values}>
        {children}
      </GlobalVariableContext.Provider>
    </GlobalVariableUpdater.Provider>
  );
}

// Hooks
export function useSetValue() {
  const dispatch = React.useContext(GlobalVariableUpdater);
  return ({ key, value }) => {
    return new Promise((resolve) => {
      dispatch({ type: "UPDATE", payload: { key, value } });

      // Add a callback to the dispatch 'queue'
      // This guarantees that the promise is only resolved after the initial dispatch
      // has completed and allows 'awaiting' the global variable update
      const dispatchCompleteCallback = () => {
        resolve(value);
      };
      dispatch({ type: "ADD_CALLBACK", payload: dispatchCompleteCallback });
    });
  };
}

export function useValues() {
  return React.useContext(GlobalVariableContext);
}
