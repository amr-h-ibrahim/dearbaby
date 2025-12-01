import * as React from "react";
import { useMutation, useQueryClient } from "react-query";
import * as GlobalVariables from "../config/GlobalVariableContext";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createAlbumRequest = async (Constants, { baby_id, title, description_md, description }) => {
  if (!baby_id) {
    throw new Error("A baby_id is required to create an album.");
  }

  const trimmedTitle = (title ?? "").trim();
  if (!trimmedTitle) {
    throw new Error("Album name cannot be empty.");
  }

  const shortDescription =
    typeof description_md === "string"
      ? description_md.trim()
      : typeof description === "string"
        ? description.trim()
        : null;

  const payload = {
    baby_id,
    title: trimmedTitle,
    description_md: shortDescription && shortDescription.length > 0 ? shortDescription : null,
  };

  const url = `${Constants.SUPABASE_URL}rest/v1/albums`;

  const attempts = 3;
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=representation",
        Authorization: Constants.AUTHORIZATION_HEADER,
        "Content-Profile": Constants["Content-Profile"] ?? "dearbaby",
        apikey: Constants.apiKey,
        auth_token: Constants.auth_token,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      return Array.isArray(json) ? (json[0] ?? null) : json;
    }

    const errorBody = await res.text();
    const error = new Error(errorBody || `Album creation failed with status ${res.status}`);
    error.status = res.status;
    error.body = errorBody;

    if (res.status === 409) {
      error.code = "DUPLICATE_ALBUM";
      throw error;
    }

    lastError = error;
    if (res.status >= 500 && attempt < attempts - 1) {
      await sleep(150);
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error("Unknown error while creating album.");
};

const useAlbumsInsertPOST = (options = {}) => {
  const Constants = GlobalVariables.useValues();
  const queryClient = useQueryClient();

  return useMutation((args = {}) => createAlbumRequest(Constants, args), {
    ...options,
    onSuccess: (data, variables, context) => {
      if (data?.baby_id) {
        queryClient.invalidateQueries(["album-list", { baby_id: data.baby_id }]);
      }
      options.onSuccess?.(data, variables, context);
    },
  });
};

export default useAlbumsInsertPOST;
