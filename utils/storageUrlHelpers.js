export const resolveStorageUrl = (payload) => {
  if (!payload) {
    return null;
  }

  const sources = [payload, payload?.data, payload?.raw];
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }
    const candidate =
      source.signedUrl ??
      source.signed_url ??
      source.url ??
      source.publicUrl ??
      source.public_url ??
      source.publicURL ??
      null;
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

export const resolveStorageExpiresAt = (payload) => {
  if (!payload) {
    return null;
  }

  const sources = [payload, payload?.data, payload?.raw];
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }
    const candidate = source.expiresAt ?? source.expires_at ?? null;
    if (candidate != null) {
      return candidate;
    }
  }

  return null;
};
