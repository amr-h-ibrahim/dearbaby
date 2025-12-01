import React from "react";
import { Linking, Platform } from "react-native";
import * as GlobalVariables from "../config/GlobalVariableContext";
import * as SupabaseDearBabyApi from "../apis/SupabaseDearBabyApi.js";
import useNavigation from "../utils/useNavigation";

/**
 * AuthDeepLinkHandler
 *
 * This component listens for incoming deep links (dearbaby://auth/callback)
 * and extracts OAuth tokens from the URL fragment.
 *
 * It should be mounted early in the app (e.g., in the AuthStack layout)
 * and will automatically handle:
 * 1. App launched from a deep link (getInitialURL)
 * 2. Deep links while app is running (addEventListener)
 *
 * Supabase OAuth redirects tokens in the URL fragment like:
 * dearbaby://auth/callback#access_token=xxx&refresh_token=xxx&expires_at=xxx
 */
const AuthDeepLinkHandler = ({ children }) => {
  const navigation = useNavigation();
  const setGlobalVariableValue = GlobalVariables.useSetValue();
  const Constants = GlobalVariables.useValues();

  // Log when component mounts
  React.useEffect(() => {
    console.log("🎬 AuthDeepLinkHandler component mounted");
    console.log("📊 Current auth state:", {
      hasAuthToken: !!Constants?.auth_token,
      hasRefreshToken: !!Constants?.refresh_token,
      hasUserId: !!Constants?.user_id,
    });
    return () => {
      console.log("🛑 AuthDeepLinkHandler component unmounting");
    };
  }, []);

  // Web OAuth hash handling has been moved to the login screen's On Mount effect
  // See app/AuthStack/index.js and app/utils/supabaseOAuthHash.js

  /**
   * Parse the OAuth callback URL and extract tokens (MOBILE deep links)
   */
  const handleAuthCallback = React.useCallback(
    async (url) => {
      console.log("🔍 handleAuthCallback called with URL:", url);

      if (!url) {
        console.log("⚠️ URL is null/undefined, skipping");
        return false;
      }

      // Only handle our auth callback URLs
      if (!url.startsWith("dearbaby://auth/callback")) {
        console.log("ℹ️ Not an auth callback URL, skipping:", url);
        return false;
      }

      console.log("✅ AuthDeepLinkHandler: Received auth callback URL:", url);
      console.log("🔄 AuthDeepLinkHandler: Processing callback URL...");

      try {
        // Supabase puts tokens in the URL fragment (after #)
        let queryString = "";
        const hashIndex = url.indexOf("#");

        if (hashIndex >= 0) {
          // Tokens are in the fragment (most common for OAuth)
          queryString = url.substring(hashIndex + 1);
          console.log("📍 Found tokens in URL fragment");
        } else {
          // Fallback to query string if no fragment
          const qIndex = url.indexOf("?");
          if (qIndex >= 0) {
            queryString = url.substring(qIndex + 1);
            console.log("📍 Found tokens in URL query string");
          }
        }

        if (!queryString) {
          console.warn("⚠️ AuthDeepLinkHandler: No tokens found in URL");
          return false;
        }

        console.log("🔍 Query string length:", queryString.length);

        // Parse the URL parameters
        const params = new URLSearchParams(queryString);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const expiresAtRaw = params.get("expires_at") || params.get("expires_in");
        const tokenType = params.get("token_type");

        // Check for error in callback
        const error = params.get("error");
        const errorDescription = params.get("error_description");
        if (error) {
          console.error("❌ AuthDeepLinkHandler: OAuth error:", error);
          console.error("📝 Error description:", errorDescription);
          // Could show an error toast here
          return false;
        }

        // Validate required tokens
        if (!accessToken || !refreshToken) {
          console.warn("⚠️ AuthDeepLinkHandler: Missing required tokens");
          console.warn("   - access_token present:", !!accessToken);
          console.warn("   - refresh_token present:", !!refreshToken);
          return false;
        }

        console.log("✅ AuthDeepLinkHandler: Tokens found!");
        console.log("🔐 Access token length:", accessToken.length);
        console.log("🔐 Refresh token length:", refreshToken.length);
        console.log("⏰ Expires at raw:", expiresAtRaw);
        console.log("🔄 Setting app variables...");

        // Calculate expires_at
        let expiresAt = null;
        if (expiresAtRaw) {
          const expiresValue = Number(expiresAtRaw);
          if (!isNaN(expiresValue)) {
            // If it looks like a Unix timestamp (large number), use directly
            // Otherwise, treat it as expires_in (seconds from now)
            if (expiresValue > 2000000000) {
              // Likely a Unix timestamp
              expiresAt = expiresValue;
            } else {
              // Likely expires_in seconds
              const nowSec = Math.floor(Date.now() / 1000);
              expiresAt = nowSec + expiresValue;
            }
          }
        }

        // Set App Variables (same mechanism as existing login)
        const AUTHORIZATION_HEADER = `Bearer ${accessToken.trim()}`;

        await Promise.all([
          setGlobalVariableValue({ key: "AUTHORIZATION_HEADER", value: AUTHORIZATION_HEADER }),
          setGlobalVariableValue({ key: "auth_token", value: accessToken.trim() }),
          setGlobalVariableValue({ key: "refresh_token", value: refreshToken }),
          setGlobalVariableValue({ key: "apiKey", value: GlobalVariables.AppVariables.apiKey }),
        ]);

        if (expiresAt) {
          await setGlobalVariableValue({ key: "session_exp", value: expiresAt });
        }

        // Fetch current user to get user_id (matching email/password login behavior)
        console.log("👤 Fetching user profile...");
        try {
          const userResponse = await fetch(
            "https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/user",
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                Authorization: AUTHORIZATION_HEADER,
                apikey:
                  Constants?.SUPABASE_ANON_KEY || GlobalVariables.AppVariables.SUPABASE_ANON_KEY,
              },
            },
          );

          if (userResponse.ok) {
            const userData = await userResponse.json();
            const userId = userData?.id || userData?.identities?.[0]?.user_id;
            if (userId) {
              await setGlobalVariableValue({
                key: "user_id",
                value: userId.trim ? userId.trim() : userId,
              });
              console.log("✅ user_id set:", userId);
            } else {
              console.warn("⚠️ No user_id found in response");
            }
          } else {
            console.warn("⚠️ Failed to fetch user data, status:", userResponse.status);
          }
        } catch (userFetchError) {
          console.warn("⚠️ Error fetching user data:", userFetchError.message);
          // Continue anyway - user_id will be populated on next API call
        }

        console.log("🎉 App variables set successfully!");
        console.log("🚀 Navigating to main app (ProfileScreen)...");

        // Verify navigation object is available
        if (!navigation) {
          console.error("❌ Navigation object is null/undefined!");
          return false;
        }

        console.log("✅ Navigation object available, calling reset...");

        // Small delay to ensure all state updates are complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Two-step flow: Fetch profile, check welcome_email_sent, then conditionally send welcome email
        // This is fire-and-forget and doesn't block navigation
        console.log("📧 Mobile OAuth: Fetching profile to check welcome_email_sent...");

        // Get user_id from userData we just fetched
        const userId = userData?.id || userData?.identities?.[0]?.user_id;
        const authTokenForApi = accessToken?.trim(); // Use fresh token from OAuth flow

        if (userId && authTokenForApi) {
          // Create a Constants object with fresh values
          const freshConstants = {
            ...Constants,
            auth_token: authTokenForApi,
            user_id: userId,
            apiKey: GlobalVariables.AppVariables.apiKey,
          };

          console.log(
            "📧 Using fresh auth_token (Mobile OAuth):",
            authTokenForApi.substring(0, 20) + "...",
          );

          SupabaseDearBabyApi.getCurrentProfileGET(freshConstants, { user_id: userId })
            .then((profileResult) => {
              console.log("📧 Profile fetch response (Mobile OAuth):", profileResult?.status);
              console.log("📧 Profile data (Mobile OAuth):", profileResult?.json);

              const profileData = profileResult?.json;
              const profile = Array.isArray(profileData) ? profileData[0] : null;

              if (!profile) {
                console.warn("⚠️ No profile found (Mobile OAuth), skipping welcome email");
                return;
              }

              const welcomeEmailSent = profile.welcome_email_sent;
              console.log("📧 welcome_email_sent status (Mobile OAuth):", welcomeEmailSent);

              if (welcomeEmailSent === true) {
                console.log("ℹ️ Welcome email already sent (Mobile OAuth), skipping");
                return;
              }

              // welcome_email_sent is false, null, or undefined - send welcome email
              console.log("📧 Sending welcome email (Mobile OAuth)...");
              return SupabaseDearBabyApi.sendWelcomeEmailPOST(freshConstants, {});
            })
            .then((result) => {
              if (!result) return; // Skipped

              console.log("📧 Welcome email API response (Mobile OAuth):", result?.status);
              console.log("📧 Welcome email API body (Mobile OAuth):", result?.json);
              if (result?.json?.success) {
                console.log("✅ Welcome email sent successfully (Mobile OAuth)");
              } else {
                console.log(
                  "ℹ️ Welcome email response (Mobile OAuth):",
                  result?.status,
                  result?.json,
                );
              }
            })
            .catch((error) => {
              console.error("❌ Error in welcome email flow (Mobile OAuth):", error?.message);
              // Don't throw - this is fire-and-forget
            });
        } else {
          console.warn(
            "⚠️ No user_id or auth_token available (Mobile OAuth), skipping welcome email check",
          );
        }

        // Navigate to main app stack
        // Using reset to clear the auth stack and prevent going back
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: "ProfileScreen" }],
          });
          console.log("✅ Navigation reset completed!");
        } catch (navError) {
          console.error("❌ Navigation error:", navError.message);
          console.error("   Stack:", navError.stack);
          // Try alternative navigation
          try {
            console.log("🔄 Trying navigate instead of reset...");
            navigation.navigate("ProfileScreen");
          } catch (fallbackError) {
            console.error("❌ Fallback navigation also failed:", fallbackError.message);
          }
        }

        return true;
      } catch (err) {
        console.error("❌ AuthDeepLinkHandler: Error processing callback:");
        console.error("   Error:", err.message);
        console.error("   Stack:", err.stack);
        return false;
      }
    },
    [navigation, setGlobalVariableValue, Constants],
  );

  React.useEffect(() => {
    // 1) Check if the app was opened via a deep link (cold start)
    console.log("🔗 AuthDeepLinkHandler: Setting up deep link listeners...");
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          console.log("📱 Initial URL detected (cold start):", initialUrl);
          handleAuthCallback(initialUrl);
        } else {
          console.log("ℹ️ No initial URL (normal app launch)");
        }
      })
      .catch((err) => {
        console.error("❌ Error getting initial URL:", err.message);
      });

    // 2) Listen for subsequent deep links (warm start / app already running)
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("📱 Deep link received (warm start):", event.url);
      handleAuthCallback(event.url);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [handleAuthCallback]);

  // Web OAuth hash is now handled by the login screen's On Mount effect
  // No longer needed here

  // This component doesn't render anything visible
  // It just provides the deep link handling logic
  return children || null;
};

export default AuthDeepLinkHandler;
