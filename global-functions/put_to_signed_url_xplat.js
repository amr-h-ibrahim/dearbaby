import * as FileSystem from "../custom-files/FileSystem";

const maskUrl = (url) => {
  if (typeof url !== "string") {
    return url;
  }
  if (url.length <= 80) {
    return url;
  }
  return `${url.slice(0, 60)}...${url.slice(-12)}`;
};

const normalizeHeaders = (headers) => {
  if (!headers) {
    return undefined;
  }
  if (Array.isArray(headers)) {
    return headers.reduce((acc, item) => {
      if (!item) {
        return acc;
      }
      if (Array.isArray(item) && item.length >= 2) {
        acc[item[0]] = item[1];
        return acc;
      }
      if (typeof item === "object") {
        const key = item.key ?? item.name ?? item.header;
        const value = item.value ?? item.val ?? item.v;
        if (key && value != null) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  }
  if (typeof headers === "object") {
    const entries = Object.entries(headers).filter(
      ([key, value]) => key && value != null && value !== "",
    );
    if (!entries.length) {
      return undefined;
    }
    return entries.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return undefined;
};

const put_to_signed_url_xplat = async (putUrl, inputUri, headers) => {
  let uri = inputUri;
  if (uri && typeof uri === "object" && uri.uri) {
    uri = uri.uri;
  }

  if (!putUrl || !uri) {
    throw new Error(
      `putUrl and uri required (putUrl=${JSON.stringify(putUrl)}, uri=${JSON.stringify(uri)})`,
    );
  }
  if (typeof putUrl !== "string" || typeof uri !== "string") {
    throw new Error("putUrl and uri must be strings");
  }

  const resolvedHeaders = normalizeHeaders(headers);

  console.log("[put-upload] begin", {
    putUrl: maskUrl(putUrl),
    source: uri.startsWith("file://") ? "file-uri" : maskUrl(uri),
    headers: resolvedHeaders ?? null,
  });

  if (uri.startsWith("file://")) {
    const uploadResult = await FileSystem.uploadAsync(putUrl, uri, {
      httpMethod: "PUT",
      headers: resolvedHeaders,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    console.log("[put-upload] file response", {
      status: uploadResult?.status ?? null,
      body: uploadResult?.body ?? null,
    });
    if (![200, 201, 204].includes(uploadResult?.status)) {
      const message =
        `Upload failed: HTTP ${uploadResult?.status} ${uploadResult?.body || ""}`.trim();
      const error = new Error(message);
      const errorBody = uploadResult?.body ?? null;
      error.status = uploadResult?.status ?? null;
      error.body = errorBody;
      error.bodyText = errorBody;
      error.stage = "put";
      throw error;
    }
    return;
  }

  const getResponse = await fetch(uri);
  if (!getResponse?.ok) {
    let errorText = "";
    try {
      errorText = await getResponse.text();
    } catch (_) {
      // ignore parse issues
    }
    console.log("[put-upload] source fetch failed", {
      status: getResponse?.status ?? null,
      body: errorText,
    });
    const message = `Failed to read blob: ${getResponse?.status} ${errorText}`.trim();
    const error = new Error(message);
    error.status = getResponse?.status ?? null;
    error.body = errorText;
    error.bodyText = errorText;
    error.stage = "get";
    throw error;
  }
  const blob = await getResponse.blob();

  const putResponse = await fetch(putUrl, {
    method: "PUT",
    headers: resolvedHeaders,
    body: blob,
  });
  let responseBody = "";
  try {
    responseBody = await putResponse.text();
  } catch (_) {
    responseBody = "";
  }
  console.log("[put-upload] fetch response", {
    status: putResponse?.status ?? null,
    body: responseBody,
    bytes: blob?.size ?? null,
  });
  if (!putResponse?.ok) {
    const message = `Upload failed: HTTP ${putResponse?.status} ${responseBody}`.trim();
    const error = new Error(message);
    error.status = putResponse?.status ?? null;
    error.body = responseBody;
    error.bodyText = responseBody;
    error.stage = "put";
    throw error;
  }
};

export default put_to_signed_url_xplat;
