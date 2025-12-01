/**
 * Utility functions for parsing Supabase OAuth tokens from URL hash
 * Used by the login screen to handle OAuth redirects on web
 */

/**
 * Parse Supabase OAuth tokens from the URL hash fragment
 * @returns {Object|null} Returns object with tokens if found, null otherwise
 */
export function parseSupabaseAuthFromHash() {
  // Only run on web
  if (typeof window === "undefined") {
    return null;
  }

  const { hash } = window.location;
  if (!hash || !hash.startsWith("#")) {
    return null;
  }

  try {
    // Remove the '#' and parse as URLSearchParams
    const queryString = hash.substring(1);
    const params = new URLSearchParams(queryString);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresAtRaw = params.get("expires_at");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    // Check for OAuth error
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return { error, errorDescription };
    }

    // Check if we have tokens
    if (!accessToken) {
      return null;
    }

    // Convert expiresAt from seconds to milliseconds (Supabase returns Unix timestamp in seconds)
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) * 1000 : null;

    console.log("OAuth tokens found in hash");

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (err) {
    console.error("Error parsing OAuth hash:", err);
    return null;
  }
}

/**
 * Clear the hash from the URL without reloading the page
 */
export function clearHashFromUrl() {
  // Only run on web
  if (typeof window === "undefined") {
    return;
  }

  try {
    // Clean up the URL to remove tokens from the address bar
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search,
    );
    console.log("URL hash cleared");
  } catch (e) {
    console.warn("Could not clean URL:", e.message);
    // Fallback: at least clear the hash
    window.location.hash = "";
  }
}
