import React from "react";
import {
  ExpoImage,
  Icon,
  ScreenContainer,
  SimpleStyleFlatList,
  SimpleStyleScrollView,
  Surface,
  Table,
  TableCell,
  TableRow,
  TextField,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as GlobalStyles from "../GlobalStyles.js";
import * as RestAPIExampleDataApi from "../apis/RestAPIExampleDataApi.js";
import * as SupabaseDearBaby2Api from "../apis/SupabaseDearBaby2Api.js";
import * as SupabaseDearBabyApi from "../apis/SupabaseDearBabyApi.js";
import useMintView from "../apis/useMintView";
import * as GlobalVariables from "../config/GlobalVariableContext";
import Images from "../config/Images";
import convert_to_JPEG from "../global-functions/convert_to_JPEG";
import Avatar from "../custom-files/components/Avatar";
import get_file_size_bytes_xplat from "../global-functions/get_file_size_bytes_xplat";
import prepare_jpeg_and_size from "../global-functions/prepare_jpeg_and_size";
import prewarm_media_pipeline from "../global-functions/prewarm_media_pipeline";
import put_to_signed_url_xplat from "../global-functions/put_to_signed_url_xplat";
import palettes from "../themes/palettes";
import * as StyleSheet from "../utils/StyleSheet";
import imageSource from "../utils/imageSource";
import openImagePickerUtil from "../utils/openImagePicker";
import useIsFocused from "../utils/useIsFocused";
import useNavigation from "../utils/useNavigation";
import useParams from "../utils/useParams";
import useWindowDimensions from "../utils/useWindowDimensions";
import { useRequireAuth } from "../utils/useAuthState";
import { resolveStorageUrl } from "../utils/storageUrlHelpers";
import { useQueryClient } from "react-query";

const resolveSignedUrl = (response) => resolveStorageUrl(response);

const LinkedBabiesCarouselContent = React.memo(({ userId, theme, width, mintBabyAvatar }) => {
  const isFocused = useIsFocused();
  const {
    isLoading: loading,
    data,
    error,
    refetch,
  } = SupabaseDearBabyApi.useGetLinkedBabiesGET(
    { uid: userId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    },
  );

  const [avatarUrls, setAvatarUrls] = React.useState({});
  const navigation = useNavigation();

  React.useEffect(() => {
    if (!isFocused) {
      return;
    }
    refetch?.();
    setAvatarUrls((prev) => (Object.keys(prev).length ? {} : prev));
  }, [isFocused, refetch]);

  const rawBabies = React.useMemo(
    () => (Array.isArray(data?.json) ? data?.json : []),
    [data?.json],
  );

  const babyIds = React.useMemo(() => {
    const ids = rawBabies
      .map((link) =>
        typeof link?.baby_id === "string" && link?.baby_id.length > 0 ? link?.baby_id : null,
      )
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [rawBabies]);

  const {
    isLoading: babiesLoading,
    data: babiesData,
    error: babiesError,
    refetch: refetchBabies,
  } = SupabaseDearBabyApi.useGetBabiesBatchGET(
    { baby_ids: babyIds },
    {
      enabled: babyIds.length > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 0,
    },
  );

  React.useEffect(() => {
    if (!isFocused) {
      return;
    }
    if (babyIds.length > 0) {
      refetchBabies?.();
    }
  }, [isFocused, babyIds, refetchBabies]);

  const babiesById = React.useMemo(() => {
    const rows = Array.isArray(babiesData?.json) ? babiesData?.json : [];
    if (!rows.length) {
      return {};
    }
    return rows.reduce((acc, baby) => {
      const key = typeof baby?.baby_id === "string" ? baby.baby_id : null;
      if (key) {
        acc[key] = baby;
      }
      return acc;
    }, {});
  }, [babiesData?.json]);

  const linkedBabies = React.useMemo(
    () =>
      rawBabies
        .map((link) => {
          const babyId = typeof link?.baby_id === "string" ? link?.baby_id : null;
          if (!babyId) {
            return null;
          }
          const babyData = babiesById[babyId] ?? null;
          return {
            id: babyData?.baby_id ?? babyId,
            name: babyData?.name ?? "Baby",
            relationship: link?.role ?? "",
            avatarObjectKey: babyData?.avatar_object_key ?? null,
          };
        })
        .filter(Boolean),
    [rawBabies, babiesById],
  );

  const avatarKeys = React.useMemo(
    () =>
      linkedBabies
        .map((baby) => baby?.avatarObjectKey)
        .filter((key) => typeof key === "string" && key.length > 0),
    [linkedBabies],
  );

  React.useEffect(() => {
    if (!avatarKeys.length) {
      if (Object.keys(avatarUrls).length === 0) {
        return;
      }
      setAvatarUrls({});
      return;
    }
    setAvatarUrls((prev) => {
      const next = {};
      avatarKeys.forEach((key) => {
        if (key in prev) {
          next[key] = prev[key];
        }
      });
      if (Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }
      return next;
    });
  }, [avatarKeys]);

  const keysToFetch = React.useMemo(() => {
    if (typeof mintBabyAvatar !== "function") {
      return [];
    }
    return avatarKeys.filter((key) => !(key in avatarUrls));
  }, [avatarKeys, avatarUrls, mintBabyAvatar]);

  React.useEffect(() => {
    if (!keysToFetch.length) {
      return;
    }
    let isCancelled = false;
    const run = async () => {
      try {
        const entries = await Promise.all(
          keysToFetch.map(async (objectKey) => {
            try {
              const url = await mintBabyAvatar(objectKey);
              return [objectKey, url ?? null];
            } catch (err) {
              console.error("Failed to mint linked baby avatar:", err);
              return [objectKey, null];
            }
          }),
        );
        if (!isCancelled && entries.length) {
          setAvatarUrls((prev) => {
            const next = { ...prev };
            entries.forEach(([key, url]) => {
              next[key] = url;
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to batch mint linked baby avatars:", err);
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [keysToFetch, mintBabyAvatar]);

  if (__DEV__) {
    console.log("LinkedBabies", {
      status: data?.status,
      errorStatus: error?.status,
      errorText: error?.statusText,
      payload: data?.json,
      babiesStatus: babiesData?.status,
      babiesErrorStatus: babiesError?.status,
      babiesPayload: babiesData?.json,
    });
  }

  if (loading || babiesLoading) {
    return (
      <View
        style={StyleSheet.applyWidth(
          {
            alignItems: "center",
            paddingVertical: 12,
          },
          width,
        )}
      >
        <ActivityIndicator size={"small"} color={theme.colors.text.strong} />
      </View>
    );
  }

  const hasError =
    error ||
    babiesError ||
    (data?.status != null && (data.status < 200 || data.status >= 300)) ||
    (babiesData?.status != null && (babiesData.status < 200 || babiesData.status >= 300));

  if (hasError) {
    return (
      <Text
        accessible={true}
        selectable={false}
        style={StyleSheet.applyWidth(
          {
            color: palettes.App.Peoplebit_Earthy_Brown,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            marginTop: 12,
            textAlign: "center",
          },
          width,
        )}
      >
        {"We couldn't load linked babies right now."}
      </Text>
    );
  }

  if (!linkedBabies.length) {
    return (
      <Text
        accessible={true}
        selectable={false}
        style={StyleSheet.applyWidth(
          {
            color: palettes.App.Peoplebit_Earthy_Brown,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            marginTop: 12,
            textAlign: "center",
          },
          width,
        )}
      >
        {"Link a baby to see their avatar here."}
      </Text>
    );
  }

  return (
    <SimpleStyleFlatList
      data={linkedBabies}
      decelerationRate={"normal"}
      horizontal={true}
      inverted={false}
      keyExtractor={(listItem, index) => `${listItem?.id ?? index}`}
      keyboardShouldPersistTaps={"never"}
      listKey={"ProfileScreen->LinkedBabies"}
      nestedScrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={StyleSheet.applyWidth({ paddingLeft: 4, paddingRight: 12 }, width)}
      style={StyleSheet.applyWidth({ paddingVertical: 4 }, width)}
      renderItem={({ item }) => {
        const avatarUri = item?.avatarObjectKey ? (avatarUrls[item.avatarObjectKey] ?? null) : null;
        return (
          <Touchable
            accessibilityRole="button"
            accessibilityHint="View this baby's profile"
            onPress={() => {
              if (!item?.id) {
                return;
              }
              navigation.navigate("MainStack", {
                screen: "BabyProfileScreen",
                params: { babyId: item.id },
              });
            }}
            disabled={!item?.id}
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                marginRight: 16,
                width: 120,
              },
              width,
            )}
          >
            <Avatar
              uri={avatarUri}
              objectKey={item?.avatarObjectKey}
              mintViewFn={typeof mintBabyAvatar === "function" ? mintBabyAvatar : undefined}
              size={88}
              style={StyleSheet.applyWidth(
                {
                  marginBottom: 8,
                },
                width,
              )}
            />
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: theme.colors.text.strong,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  textAlign: "center",
                  textTransform: "capitalize",
                },
                width,
              )}
            >
              {item?.name}
            </Text>
            {item?.relationship ? (
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App.Peoplebit_Earthy_Brown,
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    marginTop: 4,
                    textAlign: "center",
                  },
                  width,
                )}
              >
                {item?.relationship}
              </Text>
            ) : null}
          </Touchable>
        );
      }}
    />
  );
});

const LinkedBabiesCarousel = React.memo(({ userId, theme, width, mintBabyAvatar }) => {
  if (!userId) {
    return (
      <Text
        accessible={true}
        selectable={false}
        style={StyleSheet.applyWidth(
          {
            color: palettes.App.Peoplebit_Earthy_Brown,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            marginTop: 12,
            textAlign: "center",
          },
          width,
        )}
      >
        {"Sign in to see linked babies."}
      </Text>
    );
  }

  return (
    <LinkedBabiesCarouselContent
      userId={userId}
      theme={theme}
      width={width}
      mintBabyAvatar={mintBabyAvatar}
    />
  );
});

const ProfileScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  useRequireAuth();
  const Constants = GlobalVariables.useValues();
  const setGlobalVariableValue = GlobalVariables.useSetValue();
  const Variables = Constants;
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [FileName, setFileName] = React.useState("");
  const [MyName, setMyName] = React.useState("");
  const [Profile_Image, setProfile_Image] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [avatar_object_key, setAvatar_object_key] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [debug_step, setDebug_step] = React.useState("");
  const [display_name, setDisplay_name] = React.useState("");
  const [jpegBytes, setJpegBytes] = React.useState(0);
  const [jpegUri, setJpegUri] = React.useState("");
  const [mint_debug, setMint_debug] = React.useState("ttttt");
  const [mint_debug1, setMint_debug1] = React.useState("");
  const [object_key, setObject_key] = React.useState("");
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [putUrl, setPutUrl] = React.useState("");
  const [timezone, setTimezone] = React.useState("");
  const [showAddBabyModal, setShowAddBabyModal] = React.useState(false);
  const [babyName, setBabyName] = React.useState("");
  const [babyDateOfBirth, setBabyDateOfBirth] = React.useState("");
  const [babyGender, setBabyGender] = React.useState("");
  const [isCreatingBaby, setIsCreatingBaby] = React.useState(false);
  const [addBabyError, setAddBabyError] = React.useState("");
  const [addDobDay, setAddDobDay] = React.useState("");
  const [addDobMonth, setAddDobMonth] = React.useState("");
  const [addDobYear, setAddDobYear] = React.useState("");
  const [addDobError, setAddDobError] = React.useState("");
  const [activeAddDobPicker, setActiveAddDobPicker] = React.useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [
    refreshingScrollViewUserDetailsCurrentUserEmail,
    setRefreshingScrollViewUserDetailsCurrentUserEmail,
  ] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editDisplayName, setEditDisplayName] = React.useState("");
  const [editPhoneNumber, setEditPhoneNumber] = React.useState("");
  const [editTimezone, setEditTimezone] = React.useState("");
  const [editCountry, setEditCountry] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileEditError, setProfileEditError] = React.useState("");
  const [acceptingInviteId, setAcceptingInviteId] = React.useState(null);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [showTimezonePicker, setShowTimezonePicker] = React.useState(false);
  const [showCountryPicker, setShowCountryPicker] = React.useState(false);

  // Auto-detect timezone from device
  const detectTimezone = React.useCallback(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return detectedTimezone || "UTC";
    } catch (error) {
      console.error("Error detecting timezone:", error);
      return "UTC";
    }
  }, []);

  // Timezone options
  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Honolulu",
    "America/Toronto",
    "America/Vancouver",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "America/Buenos_Aires",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Madrid",
    "Europe/Amsterdam",
    "Europe/Brussels",
    "Europe/Vienna",
    "Europe/Stockholm",
    "Europe/Moscow",
    "Europe/Istanbul",
    "Asia/Dubai",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Singapore",
    "Asia/Seoul",
    "Asia/Bangkok",
    "Asia/Jakarta",
    "Asia/Manila",
    "Asia/Kolkata",
    "Asia/Karachi",
    "Asia/Riyadh",
    "Asia/Tehran",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Pacific/Auckland",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
  ];

  // Country options
  const countries = [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Netherlands",
    "Belgium",
    "Switzerland",
    "Austria",
    "Sweden",
    "Norway",
    "Denmark",
    "Finland",
    "Ireland",
    "Portugal",
    "Greece",
    "Poland",
    "Czech Republic",
    "Hungary",
    "Romania",
    "Russia",
    "Ukraine",
    "Turkey",
    "Israel",
    "United Arab Emirates",
    "Saudi Arabia",
    "Qatar",
    "Kuwait",
    "Bahrain",
    "Oman",
    "Egypt",
    "South Africa",
    "Nigeria",
    "Kenya",
    "Morocco",
    "Tunisia",
    "China",
    "Japan",
    "South Korea",
    "India",
    "Pakistan",
    "Bangladesh",
    "Indonesia",
    "Thailand",
    "Vietnam",
    "Philippines",
    "Malaysia",
    "Singapore",
    "Hong Kong",
    "Taiwan",
    "New Zealand",
    "Mexico",
    "Brazil",
    "Argentina",
    "Chile",
    "Colombia",
    "Peru",
    "Venezuela",
  ];

  const withCacheBust = React.useCallback((url) => {
    if (!url) {
      return null;
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}cb=${Date.now()}`;
  }, []);
  const { mutateAsync: mintViewAsync } = useMintView();
  const supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST =
    SupabaseDearBaby2Api.useMintAvatarUpload$EdgeFunction$POST();
  const supabaseDearBabyPATCHProfilePATCH = SupabaseDearBabyApi.usePATCHProfilePATCH();
  const supabaseDearBabyMintAvatarView$EdgeFunction$POST =
    SupabaseDearBabyApi.useMintAvatarView$EdgeFunction$POST();
  const supabaseDearBabyBabiesCreatePOST = SupabaseDearBabyApi.useBabiesCreatePOST();
  const supabaseDearBabyParentBabyCreatePOST = SupabaseDearBabyApi.useParentBabyCreatePOST();

  // Pending invites
  const {
    data: pendingInvitesData,
    isLoading: isLoadingInvites,
    error: invitesError,
    refetch: refetchInvites,
  } = SupabaseDearBabyApi.useGetMyPendingBabyInvitesRPC();

  const { mutateAsync: acceptInviteAsync } = SupabaseDearBabyApi.useAcceptBabyInviteByIdRPC();

  const pendingInvites = React.useMemo(() => {
    console.log("[ProfileScreen] pendingInvitesData:", pendingInvitesData);
    console.log("[ProfileScreen] isLoading:", isLoadingInvites);
    console.log("[ProfileScreen] error:", invitesError);
    if (!pendingInvitesData?.json) return [];
    const invites = Array.isArray(pendingInvitesData.json) ? pendingInvitesData.json : [];
    console.log("[ProfileScreen] Processed invites:", invites);
    return invites;
  }, [pendingInvitesData, isLoadingInvites, invitesError]);

  // Debug: Log auth and invite state
  React.useEffect(() => {
    console.log("[ProfileScreen] Auth token exists:", Boolean(Constants?.auth_token));
    console.log("[ProfileScreen] User email:", Constants?.user_email);
    console.log("[ProfileScreen] Pending invites count:", pendingInvites.length);
  }, [Constants?.auth_token, Constants?.user_email, pendingInvites.length]);

  const mintBabyAvatar = React.useCallback(
    async (objectKey) => {
      if (!objectKey || typeof mintViewAsync !== "function") {
        return null;
      }
      try {
        const response = await mintViewAsync({ objectKey });
        const url = resolveSignedUrl(response);
        return withCacheBust(url);
      } catch (error) {
        console.error("Failed to mint linked baby avatar:", error);
        return null;
      }
    },
    [mintViewAsync, withCacheBust],
  );
  const handleCreateBaby = React.useCallback(async () => {
    const trimmedName = babyName.trim();
    if (!trimmedName) {
      setAddBabyError("Baby name is required.");
      return;
    }
    if (!Constants?.user_id) {
      setAddBabyError("Sign in to create a baby profile.");
      return;
    }

    // Validate Date of Birth - now mandatory
    if (!addDobDay || !addDobMonth || !addDobYear) {
      setAddDobError("Date of birth is required. Please select day, month, and year.");
      return;
    }

    // Validate Gender - now mandatory
    if (!babyGender) {
      setAddBabyError("Gender is required. Please select Boy or Girl.");
      return;
    }

    // Validate and build DOB
    let dobIso = undefined;
    if (addDobDay && addDobMonth && addDobYear) {
      // Validate the date
      const dayNum = parseInt(addDobDay, 10);
      const monthNum = parseInt(addDobMonth, 10);
      const yearNum = parseInt(addDobYear, 10);

      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        setAddDobError("Please select a valid day (1-31).");
        return;
      }
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        setAddDobError("Please select a valid month (1-12).");
        return;
      }
      if (isNaN(yearNum)) {
        setAddDobError("Please select a valid year.");
        return;
      }

      // Build ISO date string
      const paddedMonth = String(monthNum).padStart(2, "0");
      const paddedDay = String(dayNum).padStart(2, "0");
      dobIso = `${yearNum}-${paddedMonth}-${paddedDay}`;

      // Validate the date is real (e.g., not Feb 30)
      try {
        const testDate = new Date(dobIso);
        if (
          testDate.getDate() !== dayNum ||
          testDate.getMonth() + 1 !== monthNum ||
          testDate.getFullYear() !== yearNum
        ) {
          setAddDobError("Please select a valid date.");
          return;
        }
      } catch (error) {
        setAddDobError("Please select a valid date.");
        return;
      }
    }

    setAddBabyError("");
    setAddDobError("");
    setIsCreatingBaby(true);
    try {
      // Create the baby
      const babyResponse = await supabaseDearBabyBabiesCreatePOST.mutateAsync({
        name: trimmedName,
        date_of_birth: dobIso,
        gender: babyGender || undefined,
        created_by: Constants.user_id,
      });

      const createdBaby = babyResponse?.json?.[0];
      const babyId = createdBaby?.baby_id;

      if (babyId) {
        // Link the baby to the current user with "owner" role
        await SupabaseDearBabyApi.parentBabyCreatePOST(Constants, {
          uid: Constants.user_id,
          baby_id: babyId,
          role: "owner",
        });
      }

      // Reset form and close modal
      setShowAddBabyModal(false);
      setBabyName("");
      setBabyDateOfBirth("");
      setBabyGender("");
      setAddBabyError("");
      setAddDobDay("");
      setAddDobMonth("");
      setAddDobYear("");
      setAddDobError("");
      setActiveAddDobPicker(null);

      // Show success message
      console.log("Baby profile created successfully!");
    } catch (error) {
      console.error("Failed to create baby", error);
      setAddBabyError(error?.message ?? "We couldn't create that baby profile. Try again.");
    } finally {
      setIsCreatingBaby(false);
    }
  }, [
    babyName,
    addDobDay,
    addDobMonth,
    addDobYear,
    babyGender,
    Constants,
    supabaseDearBabyBabiesCreatePOST,
  ]);

  // Handle profile edit save
  const handleSaveProfile = React.useCallback(async () => {
    setProfileEditError("");
    setIsSavingProfile(true);
    try {
      // Only include fields that have values to avoid setting them to null/undefined
      const updateData = {
        user_id: Constants.user_id,
      };

      // Only add fields if they have been edited and are not empty
      if (editDisplayName.trim()) {
        updateData.display_name = editDisplayName.trim();
      }
      if (editPhoneNumber.trim()) {
        updateData.Phone = editPhoneNumber.trim();
      }
      if (editTimezone.trim()) {
        updateData.timezone = editTimezone.trim();
      }
      if (editCountry.trim()) {
        updateData.country = editCountry.trim();
      }
      if (editCity.trim()) {
        updateData.city = editCity.trim();
      }

      const patchResp = await supabaseDearBabyPATCHProfilePATCH.mutateAsync(updateData);

      if (patchResp?.json && patchResp.json[0]) {
        // Update local state with saved values
        setDisplay_name(patchResp.json[0]?.display_name || editDisplayName.trim());
        setPhoneNumber(patchResp.json[0]?.Phone || editPhoneNumber.trim());
        setTimezone(patchResp.json[0]?.timezone || editTimezone);
        setCountry(patchResp.json[0]?.country || editCountry);
        setCity(patchResp.json[0]?.city || editCity);

        // Close edit mode
        setIsEditingProfile(false);
        console.log("Profile updated successfully");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      setProfileEditError(error?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    editDisplayName,
    editPhoneNumber,
    editTimezone,
    editCountry,
    editCity,
    Constants.user_id,
    supabaseDearBabyPATCHProfilePATCH,
  ]);

  // Handle logout
  const handleLogout = React.useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // Clear all auth-related global variables
      await Promise.all([
        setGlobalVariableValue({ key: "AUTHORIZATION_HEADER", value: "" }),
        setGlobalVariableValue({ key: "auth_token", value: "" }),
        setGlobalVariableValue({ key: "refresh_token", value: "" }),
        setGlobalVariableValue({ key: "user_id", value: "" }),
        setGlobalVariableValue({ key: "session_exp", value: null }),
      ]);

      // Invalidate all queries to clear cached data
      await queryClient.invalidateQueries();
      queryClient.clear();

      console.log("User logged out successfully");

      // Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: "AuthStack", params: { screen: "index" } }],
      });
    } catch (err) {
      console.error("Logout error:", err);
      // Even if there's an error, try to navigate to login
      navigation.reset({
        index: 0,
        routes: [{ name: "AuthStack", params: { screen: "index" } }],
      });
    } finally {
      setIsLoggingOut(false);
    }
  }, [setGlobalVariableValue, queryClient, navigation]);

  // Handle accepting an invite
  const handleAcceptInvite = React.useCallback(
    async (invite) => {
      console.log("[handleAcceptInvite] Starting accept for invite:", invite.invite_id);
      setAcceptingInviteId(invite.invite_id);

      try {
        const result = await acceptInviteAsync({ invite_id: invite.invite_id });

        console.log("[handleAcceptInvite] Result:", result);
        console.log("[handleAcceptInvite] Result.ok:", result?.ok);
        console.log("[handleAcceptInvite] Result.status:", result?.status);

        // Check if the HTTP request was successful
        // If result.ok is true or status is 200/204, consider it success
        if (result?.ok || result?.status === 200 || result?.status === 204) {
          console.log("[handleAcceptInvite] Success! Invite accepted.");

          // Try to get baby name from response, fallback to invite data
          let babyName = invite.baby_name;

          // Normalize response - could be array or object
          if (result?.json) {
            if (Array.isArray(result.json) && result.json.length > 0 && result.json[0]?.baby_name) {
              babyName = result.json[0].baby_name;
            } else if (result.json?.baby_name) {
              babyName = result.json.baby_name;
            }
          }

          console.log("[handleAcceptInvite] Using baby name:", babyName);

          // Show success toast
          if (Platform.OS === "web") {
            alert(`You're now part of ${babyName}'s DearBaby world 💛`);
          } else {
            console.log(`Success: You're now part of ${babyName}'s DearBaby world 💛`);
          }

          // Refresh invites list - this will trigger re-fetch of babies too
          await refetchInvites();
        } else {
          // Only throw error if the HTTP request actually failed
          throw new Error(`Failed to accept invite: HTTP ${result?.status}`);
        }
      } catch (error) {
        console.error("[handleAcceptInvite] Error occurred:");
        console.error("[handleAcceptInvite] Error type:", typeof error);
        console.error("[handleAcceptInvite] Error message:", error?.message);
        console.error("[handleAcceptInvite] Error stack:", error?.stack);
        console.error(
          "[handleAcceptInvite] Full error object:",
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        );
        console.error("[handleAcceptInvite] Error keys:", Object.keys(error));

        // If it's a response error, log more details
        if (error?.response) {
          console.error("[handleAcceptInvite] Response status:", error.response.status);
          console.error("[handleAcceptInvite] Response data:", error.response.data);
        }

        // Show error toast
        if (Platform.OS === "web") {
          alert("We couldn't accept this invitation. Please try again.");
        } else {
          console.error("Error: We couldn't accept this invitation. Please try again.");
        }
      } finally {
        setAcceptingInviteId(null);
      }
    },
    [acceptInviteAsync, refetchInvites],
  );

  React.useEffect(() => {
    const handler = async () => {
      try {
        await prewarm_media_pipeline();
      } catch (err) {
        console.error(err);
      }
    };
    handler();
  }, []);
  const isFocused = useIsFocused();
  const avatarKeyRef = React.useRef(null);

  // Fetch profile data when screen is focused
  React.useEffect(() => {
    const handler = async () => {
      try {
        if (!isFocused) {
          return;
        }
        const profileResp = (await SupabaseDearBabyApi.getProfileGET(Constants, {}))?.json;
        if (profileResp && profileResp[0]) {
          setAvatar_object_key(profileResp[0]?.avatar_object_key);
          setDisplay_name(profileResp[0]?.display_name || "");
          setPhoneNumber(profileResp[0]?.Phone || "");
          setEmail(profileResp[0]?.email || "");

          // Auto-detect timezone if not set in database
          const dbTimezone = profileResp[0]?.timezone || "";
          if (!dbTimezone) {
            const detectedTz = detectTimezone();
            setTimezone(detectedTz);
            // Optionally save to database immediately
            try {
              await supabaseDearBabyPATCHProfilePATCH.mutateAsync({
                timezone: detectedTz,
                user_id: Constants.user_id,
              });
            } catch (err) {
              console.log("Could not auto-save timezone:", err);
            }
          } else {
            setTimezone(dbTimezone);
          }

          setCountry(profileResp[0]?.country || "");
          setCity(profileResp[0]?.city || "");
          setBio(profileResp[0]?.bio || "");
        }
      } catch (err) {
        console.error(err);
      }
    };
    handler();
  }, [isFocused, detectTimezone, Constants.user_id, supabaseDearBabyPATCHProfilePATCH]);

  // Auto-reload avatar URL whenever avatar_object_key changes (like baby avatar does)
  React.useEffect(() => {
    const objectKey = avatar_object_key;
    if (!objectKey || !mintBabyAvatar) {
      avatarKeyRef.current = null;
      setAvatarUrl("");
      return;
    }
    // Skip if we've already loaded this key
    if (avatarKeyRef.current === objectKey) {
      return;
    }
    let isMounted = true;
    const mintAvatar = async () => {
      try {
        const mintedUrl = await mintBabyAvatar(objectKey);
        if (!isMounted) {
          return;
        }
        avatarKeyRef.current = objectKey;
        setAvatarUrl(withCacheBust(mintedUrl ?? ""));
      } catch (error) {
        console.error("Failed to mint profile avatar view URL", error);
        if (isMounted) {
          setAvatarUrl("");
        }
      }
    };
    mintAvatar();
    return () => {
      isMounted = false;
    };
  }, [avatar_object_key, mintBabyAvatar, withCacheBust]);

  return (
    <ScreenContainer
      hasSafeArea={false}
      scrollable={false}
      hasTopSafeArea={true}
      style={{ backgroundColor: "#FFF7F8" }}
    >
      {/* Header */}
      <View
        style={StyleSheet.applyWidth(
          { height: 48, marginLeft: 20, marginTop: 12 },
          dimensions.width,
        )}
      >
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: "#2C2C2C",
              fontFamily: "Inter_600SemiBold",
              fontSize: 24,
            },
            dimensions.width,
          )}
        >
          {"Profile"}
        </Text>
      </View>
      <SimpleStyleScrollView
        bounces={true}
        horizontal={false}
        keyboardShouldPersistTaps={"never"}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        style={StyleSheet.applyWidth(
          { flex: 1, marginBottom: 20, paddingBottom: 25, backgroundColor: "#FFF7F8" },
          dimensions.width,
        )}
      >
        {/* User Details */}
        <View
          style={StyleSheet.applyWidth(
            {
              flex: 1,
              justifyContent: "center",
              minHeight: 200,
              backgroundColor: "#FFFFFF",
              borderRadius: 32,
              marginHorizontal: 20,
              marginTop: 10,
              paddingTop: 36,
              paddingBottom: 36,
              paddingHorizontal: 28,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            },
            dimensions.width,
          )}
        >
          {/* Photo */}
          <View style={StyleSheet.applyWidth({ alignItems: "center" }, dimensions.width)}>
            <Pressable
              onPress={() => {
                const handler = async () => {
                  console.log("🔥 PROFILE AVATAR PRESSED");
                  console.log("Touchable ON_PRESS Start");
                  let error = null;
                  try {
                    setIsUploadingAvatar(true);
                    console.log("Start ON_PRESS:0 OPEN_IMAGE_PICKER");
                    const picker = await openImagePickerUtil({
                      mediaTypes: "images",
                      allowsEditing: true,
                      quality: 1,
                      allowsMultipleSelection: false,
                      selectionLimit: 0,
                      outputBase64: true,
                    });
                    console.log("Complete ON_PRESS:0 OPEN_IMAGE_PICKER", {
                      picker,
                    });
                    // User cancelled the picker
                    if (!picker) {
                      console.log("Image picker cancelled by user");
                      return;
                    }
                    console.log("Start ON_PRESS:1 SET_VARIABLE");
                    const response = picker;
                    setProfile_Image(response);
                    console.log("Complete ON_PRESS:1 SET_VARIABLE");
                    console.log("Start ON_PRESS:2 SET_VARIABLE");
                    setDebug_step("START*****");
                    console.log("Complete ON_PRESS:2 SET_VARIABLE");
                    console.log("Start ON_PRESS:3 CUSTOM_FUNCTION");
                    /* hidden 'Run a Custom Function' action */ console.log(
                      "Complete ON_PRESS:3 CUSTOM_FUNCTION",
                    );
                    console.log("Start ON_PRESS:4 CUSTOM_FUNCTION");
                    const prep = await prepare_jpeg_and_size(picker, 512, 0.82);
                    console.log("Complete ON_PRESS:4 CUSTOM_FUNCTION", {
                      prep,
                    });
                    console.log("Start ON_PRESS:5 SET_VARIABLE");
                    /* hidden 'Set Variable' action */ console.log(
                      "Complete ON_PRESS:5 SET_VARIABLE",
                    );
                    console.log("Start ON_PRESS:6 SET_VARIABLE");
                    setJpegUri(prep?.uri);
                    console.log("Complete ON_PRESS:6 SET_VARIABLE");
                    console.log("Start ON_PRESS:7 CUSTOM_FUNCTION");
                    /* hidden 'Run a Custom Function' action */ console.log(
                      "Complete ON_PRESS:7 CUSTOM_FUNCTION",
                    );
                    console.log("Start ON_PRESS:8 SET_VARIABLE");
                    setJpegBytes(prep?.bytes);
                    console.log("Complete ON_PRESS:8 SET_VARIABLE");
                    console.log("Start ON_PRESS:9 FETCH_REQUEST");
                    const mintResp = (
                      await supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST.mutateAsync({
                        bytes: prep?.bytes,
                        content_type: "image/jpeg",
                        mimeType: "image/jpeg",
                        target: "avatar",
                      })
                    )?.json;
                    console.log("Complete ON_PRESS:9 FETCH_REQUEST", {
                      mintResp,
                    });
                    console.log("Start ON_PRESS:10 SET_VARIABLE");
                    /* hidden 'Set Variable' action */ console.log(
                      "Complete ON_PRESS:10 SET_VARIABLE",
                    );
                    console.log("Start ON_PRESS:11 SET_VARIABLE");
                    setObject_key(mintResp?.data?.objectKey);
                    console.log("Complete ON_PRESS:11 SET_VARIABLE");
                    console.log("Start ON_PRESS:12 SET_VARIABLE");
                    setPutUrl(mintResp?.data?.uploadUrl);
                    console.log("Complete ON_PRESS:12 SET_VARIABLE");
                    console.log("Start ON_PRESS:13 CUSTOM_FUNCTION");
                    await put_to_signed_url_xplat(mintResp?.data?.uploadUrl, jpegUri);
                    console.log("Complete ON_PRESS:13 CUSTOM_FUNCTION");
                    console.log("Start ON_PRESS:14 SET_VARIABLE");
                    setDebug_step("after-put");
                    console.log("Complete ON_PRESS:14 SET_VARIABLE");
                    console.log("Start ON_PRESS:15 FETCH_REQUEST");
                    const patchResp = (
                      await supabaseDearBabyPATCHProfilePATCH.mutateAsync({
                        object_key: mintResp?.data?.objectKey,
                        user_id: Constants.user_id,
                      })
                    )?.json;
                    console.log("Complete ON_PRESS:15 FETCH_REQUEST", {
                      patchResp,
                    });
                    console.log("Start ON_PRESS:16 SET_VARIABLE");
                    setDebug_step("after-patch");
                    console.log("Complete ON_PRESS:16 SET_VARIABLE");
                    console.log("Start ON_PRESS:17 SET_VARIABLE");
                    setDebug_step("Before mint avatar view");
                    console.log("Complete ON_PRESS:17 SET_VARIABLE");
                    console.log("Start ON_PRESS:18 FETCH_REQUEST");
                    /* hidden 'API Request' action */ console.log(
                      "Complete ON_PRESS:18 FETCH_REQUEST",
                    );
                    console.log("Start ON_PRESS:19 SET_VARIABLE");
                    setDebug_step("after-mint-view");
                    console.log("Complete ON_PRESS:19 SET_VARIABLE");
                    console.log("Start ON_PRESS:20 SET_VARIABLE");
                    const newObjectKey = patchResp && patchResp[0]?.avatar_object_key;
                    setAvatar_object_key(newObjectKey);
                    console.log("Complete ON_PRESS:20 SET_VARIABLE");
                    console.log("Start ON_PRESS:21 SET_VARIABLE");
                    setDebug_step("After PATCH - avatar updated");
                    console.log("Complete ON_PRESS:21 SET_VARIABLE");
                    console.log("Start ON_PRESS:22 MINT_NEW_AVATAR");
                    // Immediately mint and set the new avatar URL (like baby avatar does)
                    if (newObjectKey) {
                      try {
                        const mintedUrl = await mintBabyAvatar(newObjectKey);
                        avatarKeyRef.current = newObjectKey;
                        setAvatarUrl(withCacheBust(mintedUrl ?? ""));
                        console.log("✅ New avatar loaded successfully");
                      } catch (mintError) {
                        console.error("Failed to mint new avatar after upload", mintError);
                        setAvatarUrl("");
                      }
                    }
                    console.log("Complete ON_PRESS:22 MINT_NEW_AVATAR");
                  } catch (err) {
                    console.error(err);
                    error = err.message ?? err;
                  } finally {
                    setIsUploadingAvatar(false);
                  }
                  console.log("Touchable ON_PRESS Complete", error ? { error } : "no error");
                };
                handler();
              }}
              disabled={isUploadingAvatar}
              hitSlop={16}
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  justifyContent: "center",
                },
                dimensions.width,
              )}
            >
              <View
                style={StyleSheet.applyWidth(
                  {
                    borderRadius: 60,
                    height: 120,
                    width: 120,
                    overflow: "hidden",
                    borderWidth: 4,
                    borderColor: "#C7CEEA",
                    shadowColor: "#C7CEEA",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 3,
                  },
                  dimensions.width,
                )}
              >
                <ExpoImage
                  allowDownscaling={true}
                  cachePolicy={"disk"}
                  contentPosition={"center"}
                  contentFit={"cover"}
                  transitionDuration={300}
                  transitionEffect={"cross-dissolve"}
                  transitionTiming={"ease-in-out"}
                  source={imageSource(`${avatarUrl}`)}
                  style={StyleSheet.applyWidth(
                    {
                      width: "100%",
                      height: "100%",
                    },
                    dimensions.width,
                  )}
                />
              </View>
              {/* Loading indicator overlay */}
              {isUploadingAvatar ? (
                <View
                  style={StyleSheet.applyWidth(
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.25)",
                      borderRadius: 60,
                      width: 120,
                      height: 120,
                    },
                    dimensions.width,
                  )}
                >
                  <ActivityIndicator color="#ffffff" size="small" />
                </View>
              ) : null}
              <View
                pointerEvents="none"
                style={StyleSheet.applyWidth(
                  {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  dimensions.width,
                )}
              >
                <ExpoImage
                  allowDownscaling={true}
                  cachePolicy={"disk"}
                  contentPosition={"center"}
                  contentFit={"cover"}
                  transitionDuration={300}
                  transitionEffect={"cross-dissolve"}
                  transitionTiming={"ease-in-out"}
                  source={imageSource(Images["EditPicFrame"])}
                  style={StyleSheet.applyWidth({ height: 137, width: 120 }, dimensions.width)}
                />
              </View>
            </Pressable>

            {false && (
              <SimpleStyleScrollView
                bounces={true}
                horizontal={false}
                keyboardShouldPersistTaps={"never"}
                nestedScrollEnabled={false}
                showsHorizontalScrollIndicator={true}
                showsVerticalScrollIndicator={true}
              >
                {/* mint_debug 2 */}
                <Text
                  accessible={true}
                  selectable={false}
                  {...GlobalStyles.TextStyles(theme)["Text 2"].props}
                  style={StyleSheet.applyWidth(
                    StyleSheet.compose(
                      GlobalStyles.TextStyles(theme)["Text 2"].style,
                      theme.typography.body1,
                      {},
                    ),
                    dimensions.width,
                  )}
                >
                  {"USER_ID: "}
                  {Constants["user_id"]}
                  {"\navatar_object_key : "}
                  {avatar_object_key}
                  {"\navatarUrl: "}
                  {avatarUrl}
                </Text>

                <Table
                  borderColor={theme.colors.border.base}
                  borderStyle={"solid"}
                  borderWidth={1}
                  cellHorizontalPadding={10}
                  cellVerticalPadding={10}
                  drawBottomBorder={false}
                  drawEndBorder={false}
                  drawStartBorder={false}
                  drawTopBorder={true}
                  showsVerticalScrollIndicator={true}
                  {...GlobalStyles.TableStyles(theme)["Table"].props}
                  style={StyleSheet.applyWidth(
                    GlobalStyles.TableStyles(theme)["Table"].style,
                    dimensions.width,
                  )}
                >
                  <TableRow
                    drawBottomBorder={true}
                    drawEndBorder={false}
                    drawStartBorder={true}
                    drawTopBorder={false}
                    isTableHeader={false}
                  >
                    <TableCell
                      drawBottomBorder={false}
                      drawEndBorder={true}
                      drawStartBorder={false}
                      drawTopBorder={false}
                      {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
                      style={StyleSheet.applyWidth(
                        GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                        dimensions.width,
                      )}
                    >
                      <Text
                        accessible={true}
                        selectable={false}
                        {...GlobalStyles.TextStyles(theme)["Text 2"].props}
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(
                            GlobalStyles.TextStyles(theme)["Text 2"].style,
                            theme.typography.body1,
                            {},
                          ),
                          dimensions.width,
                        )}
                      >
                        {"FileName: "}
                      </Text>
                    </TableCell>
                  </TableRow>
                  {/* Table Row 2 */}
                  <TableRow
                    drawBottomBorder={true}
                    drawEndBorder={false}
                    drawStartBorder={true}
                    drawTopBorder={false}
                    isTableHeader={false}
                  >
                    <TableCell
                      drawBottomBorder={false}
                      drawEndBorder={true}
                      drawStartBorder={false}
                      drawTopBorder={false}
                      {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
                      style={StyleSheet.applyWidth(
                        GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                        dimensions.width,
                      )}
                    >
                      {/* Text 2 */}
                      <Text
                        accessible={true}
                        selectable={false}
                        {...GlobalStyles.TextStyles(theme)["Text 2"].props}
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(
                            GlobalStyles.TextStyles(theme)["Text 2"].style,
                            theme.typography.body1,
                            {},
                          ),
                          dimensions.width,
                        )}
                      >
                        {"jpegUri: \n"}
                        {jpegUri}
                      </Text>
                    </TableCell>
                  </TableRow>
                  {/* Table Row 3 */}
                  <TableRow
                    drawBottomBorder={true}
                    drawEndBorder={false}
                    drawStartBorder={true}
                    drawTopBorder={false}
                    isTableHeader={true}
                  >
                    <TableCell
                      drawBottomBorder={false}
                      drawEndBorder={true}
                      drawStartBorder={false}
                      drawTopBorder={false}
                      {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
                      style={StyleSheet.applyWidth(
                        GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                        dimensions.width,
                      )}
                    >
                      {/* Text 3 */}
                      <Text
                        accessible={true}
                        selectable={false}
                        {...GlobalStyles.TextStyles(theme)["Text 2"].props}
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(
                            GlobalStyles.TextStyles(theme)["Text 2"].style,
                            theme.typography.body1,
                            {},
                          ),
                          dimensions.width,
                        )}
                      >
                        {"jpegBytes: "}
                        {jpegBytes}
                        {"\nobject_key: "}
                        {object_key}
                        {"\n"}
                      </Text>
                    </TableCell>
                  </TableRow>
                  {/* Table Row 4 */}
                  <TableRow
                    drawBottomBorder={true}
                    drawEndBorder={false}
                    drawStartBorder={true}
                    drawTopBorder={false}
                    isTableHeader={false}
                  >
                    <TableCell
                      drawBottomBorder={false}
                      drawEndBorder={true}
                      drawStartBorder={false}
                      drawTopBorder={false}
                      {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
                      style={StyleSheet.applyWidth(
                        GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                        dimensions.width,
                      )}
                    >
                      {/* Text 3 */}
                      <Text
                        accessible={true}
                        selectable={false}
                        {...GlobalStyles.TextStyles(theme)["Text 2"].props}
                        style={StyleSheet.applyWidth(
                          StyleSheet.compose(
                            GlobalStyles.TextStyles(theme)["Text 2"].style,
                            theme.typography.body1,
                            {},
                          ),
                          dimensions.width,
                        )}
                      >
                        {"putUrl: "}
                        {putUrl}
                      </Text>
                    </TableCell>
                  </TableRow>
                </Table>
              </SimpleStyleScrollView>
            )}
          </View>
          {/* Display Name and Phone */}
          <View
            style={StyleSheet.applyWidth({ alignItems: "center", marginTop: 16 }, dimensions.width)}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: "#2C2C2C",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 20,
                  textAlign: "center",
                },
                dimensions.width,
              )}
            >
              {display_name || "Add your name"}
            </Text>
            {phoneNumber ? (
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#7A7A7A",
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    marginTop: 4,
                    textAlign: "center",
                  },
                  dimensions.width,
                )}
              >
                {phoneNumber}
              </Text>
            ) : null}
            {/* Location and Timezone Info */}
            {city || country || timezone ? (
              <View
                style={StyleSheet.applyWidth(
                  {
                    alignItems: "center",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    marginTop: 8,
                    gap: 8,
                  },
                  dimensions.width,
                )}
              >
                {/* Location Badge */}
                {city || country ? (
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgba(181, 234, 215, 0.2)",
                      borderRadius: 20,
                      flexDirection: "row",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Icon
                      name="MaterialIcons/location-on"
                      size={15}
                      color="#2F4858"
                      style={{ marginRight: 5, opacity: 0.75 }}
                    />
                    <Text
                      accessible={true}
                      selectable={false}
                      style={{
                        color: "#2F4858",
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                      }}
                    >
                      {city && country ? `${city}, ${country}` : city || country}
                    </Text>
                  </View>
                ) : null}
                {/* Timezone Badge */}
                {timezone ? (
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: "rgba(10, 132, 255, 0.1)",
                      borderRadius: 20,
                      flexDirection: "row",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Icon
                      name="MaterialIcons/access-time"
                      size={15}
                      color="#0A84FF"
                      style={{ marginRight: 5, opacity: 0.85 }}
                    />
                    <Text
                      accessible={true}
                      selectable={false}
                      style={{
                        color: "#0A84FF",
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                      }}
                    >
                      {timezone.replace(/_/g, " ")}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {/* Edit Profile Button */}
            <Pressable
              onPress={() => {
                setEditDisplayName(display_name || "");
                setEditPhoneNumber(phoneNumber || "");
                setEditTimezone(timezone || "");
                setEditCountry(country || "");
                setEditCity(city || "");
                setIsEditingProfile(true);
              }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={({ pressed }) =>
                StyleSheet.applyWidth(
                  {
                    alignItems: "center",
                    backgroundColor: pressed ? "#EAF3FF" : "transparent",
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "center",
                    marginTop: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  },
                  dimensions.width,
                )
              }
            >
              <Icon
                name="MaterialIcons/edit"
                size={16}
                color="#0A84FF"
                style={{ marginRight: 4 }}
              />
              <Text
                style={StyleSheet.applyWidth(
                  {
                    color: "#0A84FF",
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                  },
                  dimensions.width,
                )}
              >
                {"Edit Profile"}
              </Text>
            </Pressable>
          </View>
          {/* Email */}
          {email ? (
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: "#7A7A7A",
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginTop: 12,
                  textAlign: "center",
                },
                dimensions.width,
              )}
            >
              {email}
            </Text>
          ) : null}
          {/* User ID */}
          {Constants?.user_id ? (
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: "#7A7A7A",
                  fontFamily: "Inter_400Regular",
                  fontSize: 10,
                  marginTop: 4,
                  opacity: 0.5,
                  textAlign: "center",
                },
                dimensions.width,
              )}
            >
              {`ID: ${Constants.user_id.substring(0, 8)}...`}
            </Text>
          ) : null}
          {/* Invitations waiting */}
          {pendingInvites.length > 0 ? (
            <View
              style={StyleSheet.applyWidth(
                {
                  backgroundColor: "#FFFFFF",
                  borderRadius: 32,
                  marginHorizontal: 20,
                  marginTop: 24,
                  marginBottom: 8,
                  padding: 28,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 4,
                },
                dimensions.width,
              )}
            >
              {/* Card Header */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                    marginBottom: 8,
                  },
                  dimensions.width,
                )}
              >
                {"Invitations waiting for you"}
              </Text>
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#7A7A7A",
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    lineHeight: 20,
                    marginBottom: 16,
                  },
                  dimensions.width,
                )}
              >
                {
                  "Loved ones have opened little worlds for you. You can step into them whenever you're ready."
                }
              </Text>
              {/* Invites List */}
              {pendingInvites.map((invite, index) => {
                const isAccepting = acceptingInviteId === invite.invite_id;
                const roleColor =
                  invite.role === "owner"
                    ? palettes.Socialize.primary0A84FF
                    : invite.role === "editor"
                      ? palettes.Socialize.accent2
                      : palettes.Socialize.accent3;

                const roleLabel =
                  invite.role === "owner"
                    ? "Owner"
                    : invite.role === "editor"
                      ? "Editor"
                      : "Viewer";

                return (
                  <View
                    key={invite.invite_id}
                    style={StyleSheet.applyWidth(
                      {
                        backgroundColor: "#F9F9FB",
                        borderRadius: 12,
                        marginBottom: index < pendingInvites.length - 1 ? 12 : 0,
                        padding: 14,
                      },
                      dimensions.width,
                    )}
                  >
                    <View
                      style={StyleSheet.applyWidth(
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        },
                        dimensions.width,
                      )}
                    >
                      {/* Left side: Baby name and invited by */}
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          accessible={true}
                          selectable={false}
                          style={StyleSheet.applyWidth(
                            {
                              color: theme.colors.text.strong,
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 16,
                              marginBottom: 4,
                            },
                            dimensions.width,
                          )}
                        >
                          {invite.baby_name}
                        </Text>
                        <View
                          style={StyleSheet.applyWidth(
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              flexWrap: "wrap",
                            },
                            dimensions.width,
                          )}
                        >
                          <Text
                            accessible={true}
                            selectable={false}
                            style={StyleSheet.applyWidth(
                              {
                                color: theme.colors.text.medium,
                                fontFamily: "Inter_400Regular",
                                fontSize: 13,
                              },
                              dimensions.width,
                            )}
                          >
                            {`Invited by ${invite.invited_by_name || "someone"} · Role: `}
                          </Text>
                          <View
                            style={StyleSheet.applyWidth(
                              {
                                backgroundColor: roleColor,
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              },
                              dimensions.width,
                            )}
                          >
                            <Text
                              accessible={true}
                              selectable={false}
                              style={StyleSheet.applyWidth(
                                {
                                  color: "#FFFFFF",
                                  fontFamily: "Inter_600SemiBold",
                                  fontSize: 11,
                                },
                                dimensions.width,
                              )}
                            >
                              {roleLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {/* Right side: Accept button */}
                      <Pressable
                        onPress={() => !isAccepting && handleAcceptInvite(invite)}
                        disabled={isAccepting}
                        accessibilityRole="button"
                        accessibilityLabel={`Accept invite to ${invite.baby_name}`}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={({ pressed }) =>
                          StyleSheet.applyWidth(
                            {
                              alignItems: "center",
                              backgroundColor: isAccepting
                                ? "#E0E0E0"
                                : pressed
                                  ? "#0066CC"
                                  : palettes.Socialize.primary0A84FF,
                              borderRadius: 16,
                              justifyContent: "center",
                              minHeight: 36,
                              minWidth: 80,
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                            },
                            dimensions.width,
                          )
                        }
                      >
                        {isAccepting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text
                            accessible={true}
                            selectable={false}
                            style={StyleSheet.applyWidth(
                              {
                                color: "#FFFFFF",
                                fontFamily: "Inter_600SemiBold",
                                fontSize: 14,
                              },
                              dimensions.width,
                            )}
                          >
                            {"Accept"}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
          {/* My Babies */}
          <View
            style={StyleSheet.applyWidth(
              {
                flexGrow: 0,
                flexShrink: 0,
                paddingLeft: 20,
                paddingRight: 20,
                marginTop: 8,
              },
              dimensions.width,
            )}
          >
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 24,
                  marginBottom: 12,
                },
                dimensions.width,
              )}
            >
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#FF9AA2",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  },
                  dimensions.width,
                )}
              >
                {"My Babies"}
              </Text>
              <Pressable
                onPress={() => setShowAddBabyModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Add new baby"
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                style={({ pressed, hovered }) =>
                  StyleSheet.applyWidth(
                    {
                      alignItems: "center",
                      backgroundColor: pressed || hovered ? "#EAF3FF" : "#FFFFFF",
                      borderColor: "#E5E5EA",
                      borderRadius: 12,
                      borderWidth: 1,
                      flexDirection: "row",
                      justifyContent: "center",
                      minHeight: 32,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    },
                    dimensions.width,
                  )
                }
              >
                <Icon
                  name="MaterialCommunityIcons/plus"
                  size={16}
                  color="#0A84FF"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={StyleSheet.applyWidth(
                    {
                      color: "#0A84FF",
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                      fontWeight: "500",
                    },
                    dimensions.width,
                  )}
                >
                  {"Add Baby"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View
            style={StyleSheet.applyWidth(
              {
                marginBottom: 12,
                paddingBottom: 8,
                paddingLeft: 16,
                paddingRight: 16,
              },
              dimensions.width,
            )}
          >
            <LinkedBabiesCarousel
              userId={Constants?.user_id}
              theme={theme}
              width={dimensions.width}
              mintBabyAvatar={mintBabyAvatar}
            />
          </View>
        </View>
        {/* Menu */}
        <View
          style={StyleSheet.applyWidth(
            {
              marginBottom: 20,
              marginLeft: 20,
              marginRight: 20,
              gap: 12,
            },
            dimensions.width,
          )}
        >
          {/* Location */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                },
                dimensions.width,
              )}
            >
              <Icon size={24} color={"#B5EAD7"} name={"Ionicons/location-outline"} />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 14,
                  },
                  dimensions.width,
                )}
              >
                {"Location"}
              </Text>
            </View>
          </Touchable>
          {/* Payment */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                },
                dimensions.width,
              )}
            >
              <Icon size={24} color={"#C7CEEA"} name={"Ionicons/wallet-outline"} />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 14,
                  },
                  dimensions.width,
                )}
              >
                {"Payment"}
              </Text>
            </View>
          </Touchable>
          {/* Privacy */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                },
                dimensions.width,
              )}
            >
              <Icon size={24} color={"#0A84FF"} name={"MaterialCommunityIcons/security"} />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 14,
                  },
                  dimensions.width,
                )}
              >
                {"Privacy Policy"}
              </Text>
            </View>
          </Touchable>
          {/* Terms and Conditions */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                },
                dimensions.width,
              )}
            >
              <Icon size={24} color={"#FF9AA2"} name={"Entypo/text-document"} />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 14,
                  },
                  dimensions.width,
                )}
              >
                {"Term And Conditions"}
              </Text>
            </View>
          </Touchable>
          {/* Contact Us */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                },
                dimensions.width,
              )}
            >
              <Icon size={24} color={"#B5EAD7"} name={"AntDesign/contacts"} />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 14,
                  },
                  dimensions.width,
                )}
              >
                {"Contact Us"}
              </Text>
            </View>
          </Touchable>
          {/* Logout */}
          <Touchable
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.8}
            disabledOpacity={0.8}
          >
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 60,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                },
                dimensions.width,
              )}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={"#FF9AA2"} />
              ) : (
                <Icon size={24} color={"#FF9AA2"} name={"AntDesign/logout"} />
              )}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#2C2C2C",
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 14,
                    opacity: isLoggingOut ? 0.6 : 1,
                  },
                  dimensions.width,
                )}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Text>
            </View>
          </Touchable>
        </View>
      </SimpleStyleScrollView>
      {/* Bottom Tab */}
      <View
        style={StyleSheet.applyWidth(
          {
            alignItems: "center",
            backgroundColor: palettes.App["Custom #ffffff"],
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            flexDirection: "row",
            height: 117,
            justifyContent: "space-between",
            paddingBottom: 20,
            paddingLeft: 30,
            paddingRight: 30,
          },
          dimensions.width,
        )}
      >
        {/* Home */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon size={24} color={theme.colors.text.medium} name={"AntDesign/home"} />
          </View>
        </Touchable>
        {/* History Transaction */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon
              size={24}
              color={theme.colors.text.medium}
              name={"Ionicons/document-text-outline"}
            />
          </View>
        </Touchable>
        {/* Messages */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon size={24} color={theme.colors.text.medium} name={"Ionicons/chatbox-outline"} />
          </View>
        </Touchable>
        {/* Profile */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon size={24} color={theme.colors.branding.primary} name={"FontAwesome/user"} />
          </View>
        </Touchable>
      </View>
      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isEditingProfile}
        onRequestClose={() => setIsEditingProfile(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditingProfile(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={StyleSheet.applyWidth(
                  {
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 24,
                    paddingTop: 22,
                    paddingBottom: 36 + (Platform.OS === "ios" ? 12 : 0),
                  },
                  dimensions.width,
                )}
              >
                <View
                  style={{
                    alignSelf: "center",
                    height: 4,
                    width: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(0,0,0,0.12)",
                    marginBottom: 20,
                  }}
                />
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                    marginBottom: 6,
                  }}
                >
                  {"Edit Profile"}
                </Text>
                <Text
                  style={{
                    color: "rgba(0,0,0,0.45)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  {"Update your profile information below."}
                </Text>

                {/* Display Name Input */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Display Name"}
                </Text>
                <TextInput
                  placeholder="Enter your full name"
                  value={editDisplayName}
                  onChangeText={(value) => {
                    setProfileEditError("");
                    setEditDisplayName(value);
                  }}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "#E2E2E2",
                    borderRadius: 12,
                    borderWidth: 1,
                    color: "rgba(0,0,0,0.78)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                />

                {/* Phone Number Input */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Phone Number"}
                </Text>
                <TextInput
                  placeholder="Enter your phone number"
                  value={editPhoneNumber}
                  onChangeText={(value) => {
                    setProfileEditError("");
                    setEditPhoneNumber(value);
                  }}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "#E2E2E2",
                    borderRadius: 12,
                    borderWidth: 1,
                    color: "rgba(0,0,0,0.78)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                />

                {/* Timezone Picker */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Timezone"}
                </Text>
                <Pressable
                  onPress={() => setShowTimezonePicker(true)}
                  style={({ pressed }) => ({
                    backgroundColor: "#FAFAFA",
                    borderColor: "#E2E2E2",
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: editTimezone ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.35)",
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                    }}
                  >
                    {editTimezone || "Select timezone"}
                  </Text>
                  <Icon name="MaterialIcons/arrow-drop-down" size={24} color="rgba(0,0,0,0.5)" />
                </Pressable>
                <Text
                  style={{
                    color: "rgba(0,0,0,0.45)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 11,
                    marginTop: -12,
                    marginBottom: 16,
                    marginLeft: 4,
                  }}
                >
                  {"💡 Tap to auto-detect or choose manually"}
                </Text>

                {/* Country Picker */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Country"}
                </Text>
                <Pressable
                  onPress={() => setShowCountryPicker(true)}
                  style={({ pressed }) => ({
                    backgroundColor: "#FAFAFA",
                    borderColor: "#E2E2E2",
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: editCountry ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.35)",
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                    }}
                  >
                    {editCountry || "Select country"}
                  </Text>
                  <Icon name="MaterialIcons/arrow-drop-down" size={24} color="rgba(0,0,0,0.5)" />
                </Pressable>

                {/* City Input */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"City"}
                </Text>
                <TextInput
                  placeholder="Enter your city"
                  value={editCity}
                  onChangeText={(value) => {
                    setProfileEditError("");
                    setEditCity(value);
                  }}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "#E2E2E2",
                    borderRadius: 12,
                    borderWidth: 1,
                    color: "rgba(0,0,0,0.78)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                />

                {/* Error Message */}
                {profileEditError ? (
                  <Text
                    style={{
                      color: "#FF9AA2",
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    {profileEditError}
                  </Text>
                ) : null}

                {/* Save Button */}
                <Pressable
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor: isSavingProfile
                          ? "rgba(181,234,215,0.45)"
                          : pressed
                            ? "#A0DCC3"
                            : "#B5EAD7",
                        borderRadius: 16,
                        marginTop: 8,
                        paddingVertical: 14,
                        boxShadow: isSavingProfile ? undefined : "0px 10px 14px rgba(0,0,0,0.18)",
                      },
                      dimensions.width,
                    )
                  }
                >
                  {isSavingProfile ? (
                    <ActivityIndicator color="#2F4858" size="small" />
                  ) : (
                    <Text
                      style={{
                        color: "#2F4858",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                      }}
                    >
                      {"Save Changes"}
                    </Text>
                  )}
                </Pressable>

                {/* Cancel Button */}
                <Pressable
                  onPress={() => {
                    setIsEditingProfile(false);
                    setProfileEditError("");
                  }}
                  disabled={isSavingProfile}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    marginTop: 12,
                    opacity: isSavingProfile ? 0.6 : pressed ? 0.7 : 1,
                    paddingVertical: 10,
                  })}
                >
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.4)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                    }}
                  >
                    {"Cancel"}
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Timezone Picker Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showTimezonePicker}
        onRequestClose={() => setShowTimezonePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTimezonePicker(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  paddingTop: 22,
                  maxHeight: "70%",
                }}
              >
                <View
                  style={{
                    alignSelf: "center",
                    height: 4,
                    width: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(0,0,0,0.12)",
                    marginBottom: 16,
                  }}
                />
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                    marginBottom: 16,
                    paddingHorizontal: 24,
                  }}
                >
                  {"Select Timezone"}
                </Text>

                {/* Auto-detect Button */}
                <Pressable
                  onPress={() => {
                    const detectedTz = detectTimezone();
                    setEditTimezone(detectedTz);
                    setShowTimezonePicker(false);
                    setProfileEditError("");
                  }}
                  style={({ pressed }) => ({
                    marginHorizontal: 24,
                    marginBottom: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: pressed ? "#A0DCC3" : "#B5EAD7",
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                >
                  <Icon
                    name="MaterialIcons/my-location"
                    size={18}
                    color="#2F4858"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      color: "#2F4858",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {"Auto-detect from Device"}
                  </Text>
                </Pressable>

                <ScrollView style={{ maxHeight: 400 }}>
                  {timezones.map((tz, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
                        setEditTimezone(tz);
                        setShowTimezonePicker(false);
                        setProfileEditError("");
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        backgroundColor: pressed
                          ? "#F0F0F0"
                          : editTimezone === tz
                            ? "#EAF3FF"
                            : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: "#F0F0F0",
                      })}
                    >
                      <Text
                        style={{
                          color: editTimezone === tz ? "#0A84FF" : "#111111",
                          fontFamily: editTimezone === tz ? "Inter_500Medium" : "Inter_400Regular",
                          fontSize: 15,
                        }}
                      >
                        {tz}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Country Picker Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showCountryPicker}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCountryPicker(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  paddingTop: 22,
                  maxHeight: "70%",
                }}
              >
                <View
                  style={{
                    alignSelf: "center",
                    height: 4,
                    width: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(0,0,0,0.12)",
                    marginBottom: 16,
                  }}
                />
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                    marginBottom: 16,
                    paddingHorizontal: 24,
                  }}
                >
                  {"Select Country"}
                </Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  {countries.map((ctry, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
                        setEditCountry(ctry);
                        setShowCountryPicker(false);
                        setProfileEditError("");
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        backgroundColor: pressed
                          ? "#F0F0F0"
                          : editCountry === ctry
                            ? "#EAF3FF"
                            : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: "#F0F0F0",
                      })}
                    >
                      <Text
                        style={{
                          color: editCountry === ctry ? "#0A84FF" : "#111111",
                          fontFamily: editCountry === ctry ? "Inter_500Medium" : "Inter_400Regular",
                          fontSize: 15,
                        }}
                      >
                        {ctry}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add Baby Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showAddBabyModal}
        onRequestClose={() => setShowAddBabyModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddBabyModal(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={StyleSheet.applyWidth(
                  {
                    backgroundColor: "#FFFFFF",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 24,
                    paddingTop: 22,
                    paddingBottom: 36 + (Platform.OS === "ios" ? 12 : 0),
                  },
                  dimensions.width,
                )}
              >
                <View
                  style={{
                    alignSelf: "center",
                    height: 4,
                    width: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(0,0,0,0.12)",
                    marginBottom: 20,
                  }}
                />
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                    marginBottom: 6,
                  }}
                >
                  {"Add New Baby"}
                </Text>
                <Text
                  style={{
                    color: "rgba(0,0,0,0.45)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  {"All fields are mandatory. Please provide all details to create a baby profile."}
                </Text>

                {/* Baby Name Input */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Name *"}
                </Text>
                <TextInput
                  placeholder="Enter baby's name"
                  value={babyName}
                  onChangeText={(value) => {
                    setAddBabyError("");
                    setBabyName(value);
                  }}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderColor: "#E2E2E2",
                    borderRadius: 12,
                    borderWidth: 1,
                    color: "rgba(0,0,0,0.78)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                />

                {/* Date of Birth Input - Custom 3-Part Selector */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Date of Birth *"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginBottom: addDobError ? 8 : 16,
                  }}
                >
                  {/* Day Selector */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "rgba(0,0,0,0.5)",
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        marginBottom: 6,
                        textAlign: "center",
                      }}
                    >
                      Day
                    </Text>
                    <Pressable
                      onPress={() => {
                        setActiveAddDobPicker("day");
                        setAddDobError("");
                      }}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor:
                          activeAddDobPicker === "day"
                            ? "#A0DCC3"
                            : addDobDay
                              ? "#B5EAD7"
                              : pressed
                                ? "#F0F0F0"
                                : "#FAFAFA",
                        borderColor:
                          activeAddDobPicker === "day"
                            ? "#78C9A8"
                            : addDobDay
                              ? "#B5EAD7"
                              : "#E2E2E2",
                        borderRadius: 14,
                        borderWidth: activeAddDobPicker === "day" ? 2 : 1.5,
                        justifyContent: "center",
                        minHeight: 56,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        shadowColor:
                          addDobDay || activeAddDobPicker === "day" ? "#000" : "transparent",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: addDobDay || activeAddDobPicker === "day" ? 3 : 0,
                        transform:
                          activeAddDobPicker === "day"
                            ? [{ scale: 1.02 }]
                            : [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <Text
                        style={{
                          color:
                            addDobDay || activeAddDobPicker === "day"
                              ? "#2F4858"
                              : "rgba(0,0,0,0.35)",
                          fontFamily:
                            addDobDay || activeAddDobPicker === "day"
                              ? "Inter_600SemiBold"
                              : "Inter_400Regular",
                          fontSize: 17,
                        }}
                      >
                        {addDobDay || "DD"}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Month Selector */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "rgba(0,0,0,0.5)",
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        marginBottom: 6,
                        textAlign: "center",
                      }}
                    >
                      Month
                    </Text>
                    <Pressable
                      onPress={() => {
                        setActiveAddDobPicker("month");
                        setAddDobError("");
                      }}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor:
                          activeAddDobPicker === "month"
                            ? "#A0DCC3"
                            : addDobMonth
                              ? "#B5EAD7"
                              : pressed
                                ? "#F0F0F0"
                                : "#FAFAFA",
                        borderColor:
                          activeAddDobPicker === "month"
                            ? "#78C9A8"
                            : addDobMonth
                              ? "#B5EAD7"
                              : "#E2E2E2",
                        borderRadius: 14,
                        borderWidth: activeAddDobPicker === "month" ? 2 : 1.5,
                        justifyContent: "center",
                        minHeight: 56,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        shadowColor:
                          addDobMonth || activeAddDobPicker === "month" ? "#000" : "transparent",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: addDobMonth || activeAddDobPicker === "month" ? 3 : 0,
                        transform:
                          activeAddDobPicker === "month"
                            ? [{ scale: 1.02 }]
                            : [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <Text
                        style={{
                          color:
                            addDobMonth || activeAddDobPicker === "month"
                              ? "#2F4858"
                              : "rgba(0,0,0,0.35)",
                          fontFamily:
                            addDobMonth || activeAddDobPicker === "month"
                              ? "Inter_600SemiBold"
                              : "Inter_400Regular",
                          fontSize: 17,
                        }}
                      >
                        {addDobMonth
                          ? [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ][parseInt(addDobMonth, 10) - 1]
                          : "MM"}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Year Selector */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "rgba(0,0,0,0.5)",
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        marginBottom: 6,
                        textAlign: "center",
                      }}
                    >
                      Year
                    </Text>
                    <Pressable
                      onPress={() => {
                        setActiveAddDobPicker("year");
                        setAddDobError("");
                      }}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor:
                          activeAddDobPicker === "year"
                            ? "#A0DCC3"
                            : addDobYear
                              ? "#B5EAD7"
                              : pressed
                                ? "#F0F0F0"
                                : "#FAFAFA",
                        borderColor:
                          activeAddDobPicker === "year"
                            ? "#78C9A8"
                            : addDobYear
                              ? "#B5EAD7"
                              : "#E2E2E2",
                        borderRadius: 14,
                        borderWidth: activeAddDobPicker === "year" ? 2 : 1.5,
                        justifyContent: "center",
                        minHeight: 56,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        shadowColor:
                          addDobYear || activeAddDobPicker === "year" ? "#000" : "transparent",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: addDobYear || activeAddDobPicker === "year" ? 3 : 0,
                        transform:
                          activeAddDobPicker === "year"
                            ? [{ scale: 1.02 }]
                            : [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <Text
                        style={{
                          color:
                            addDobYear || activeAddDobPicker === "year"
                              ? "#2F4858"
                              : "rgba(0,0,0,0.35)",
                          fontFamily:
                            addDobYear || activeAddDobPicker === "year"
                              ? "Inter_600SemiBold"
                              : "Inter_400Regular",
                          fontSize: 17,
                        }}
                      >
                        {addDobYear || "YYYY"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* DOB Error Message */}
                {addDobError ? (
                  <Text
                    style={{
                      color: "#FF9AA2",
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      marginBottom: 12,
                      marginTop: -4,
                    }}
                  >
                    {addDobError}
                  </Text>
                ) : null}

                {/* Gender Input */}
                <Text
                  style={{
                    color: "#111111",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {"Gender *"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    marginBottom: 16,
                  }}
                >
                  {["Boy", "Girl"].map((gender) => (
                    <Pressable
                      key={gender}
                      onPress={() => {
                        setAddBabyError("");
                        setBabyGender(babyGender === gender ? "" : gender);
                      }}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor:
                          babyGender === gender ? "#B5EAD7" : pressed ? "#F0F0F0" : "#FAFAFA",
                        borderColor: babyGender === gender ? "#B5EAD7" : "#E2E2E2",
                        borderRadius: 10,
                        borderWidth: 1,
                        flex: 1,
                        marginRight: gender !== "Girl" ? 8 : 0,
                        paddingVertical: 10,
                      })}
                    >
                      <Text
                        style={{
                          color: babyGender === gender ? "#2F4858" : "rgba(0,0,0,0.6)",
                          fontFamily: "Inter_500Medium",
                          fontSize: 14,
                        }}
                      >
                        {gender}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Error Message */}
                {addBabyError ? (
                  <Text
                    style={{
                      color: "#FF9AA2",
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    {addBabyError}
                  </Text>
                ) : null}

                {/* Create Button */}
                <Pressable
                  onPress={handleCreateBaby}
                  disabled={
                    isCreatingBaby ||
                    !babyName.trim() ||
                    !addDobDay ||
                    !addDobMonth ||
                    !addDobYear ||
                    !babyGender
                  }
                  style={({ pressed }) =>
                    StyleSheet.applyWidth(
                      {
                        alignItems: "center",
                        backgroundColor:
                          isCreatingBaby ||
                          !babyName.trim() ||
                          !addDobDay ||
                          !addDobMonth ||
                          !addDobYear ||
                          !babyGender
                            ? "rgba(181,234,215,0.45)"
                            : pressed
                              ? "#A0DCC3"
                              : "#B5EAD7",
                        borderRadius: 16,
                        marginTop: 8,
                        paddingVertical: 14,
                        boxShadow:
                          isCreatingBaby ||
                          !babyName.trim() ||
                          !addDobDay ||
                          !addDobMonth ||
                          !addDobYear ||
                          !babyGender
                            ? undefined
                            : "0px 10px 14px rgba(0,0,0,0.18)",
                      },
                      dimensions.width,
                    )
                  }
                >
                  {isCreatingBaby ? (
                    <ActivityIndicator color="#2F4858" size="small" />
                  ) : (
                    <Text
                      style={{
                        color: "#2F4858",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                      }}
                    >
                      {"Create Baby Profile"}
                    </Text>
                  )}
                </Pressable>

                {/* Cancel Button */}
                <Pressable
                  onPress={() => {
                    setShowAddBabyModal(false);
                    setBabyName("");
                    setBabyDateOfBirth("");
                    setBabyGender("");
                    setAddBabyError("");
                    setAddDobDay("");
                    setAddDobMonth("");
                    setAddDobYear("");
                    setAddDobError("");
                    setActiveAddDobPicker(null);
                  }}
                  disabled={isCreatingBaby}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    marginTop: 12,
                    opacity: isCreatingBaby ? 0.6 : pressed ? 0.7 : 1,
                    paddingVertical: 10,
                  })}
                >
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.4)",
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                    }}
                  >
                    {"Cancel"}
                  </Text>
                </Pressable>

                {/* DOB Picker Sheet - Appears when a chip is tapped */}
                {activeAddDobPicker && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      justifyContent: "flex-end",
                      zIndex: 1000,
                    }}
                  >
                    <TouchableWithoutFeedback
                      onPress={() => {
                        setActiveAddDobPicker(null);
                      }}
                    >
                      <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>

                    <View
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        paddingHorizontal: 20,
                        paddingTop: 16,
                        paddingBottom: 24 + (Platform.OS === "ios" ? 20 : 0),
                        maxHeight: 380,
                      }}
                    >
                      {/* Handle Bar */}
                      <View
                        style={{
                          alignSelf: "center",
                          height: 4,
                          width: 48,
                          borderRadius: 2,
                          backgroundColor: "rgba(0,0,0,0.14)",
                          marginBottom: 16,
                        }}
                      />

                      {/* Sheet Title */}
                      <Text
                        style={{
                          color: "#111111",
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 16,
                          marginBottom: 12,
                          textAlign: "center",
                        }}
                      >
                        {activeAddDobPicker === "day"
                          ? "Select Day"
                          : activeAddDobPicker === "month"
                            ? "Select Month"
                            : "Select Year"}
                      </Text>

                      {/* Scrollable List */}
                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 260 }}
                        contentContainerStyle={{ paddingBottom: 8 }}
                      >
                        {activeAddDobPicker === "day" &&
                          Array.from({ length: 31 }, (_, i) => {
                            const day = String(i + 1);
                            return (
                              <Pressable
                                key={day}
                                onPress={() => {
                                  setAddDobDay(day);
                                  setAddDobError("");
                                  setActiveAddDobPicker(null);
                                }}
                                style={({ pressed }) => ({
                                  alignItems: "center",
                                  backgroundColor:
                                    addDobDay === day
                                      ? "#B5EAD7"
                                      : pressed
                                        ? "rgba(181,234,215,0.25)"
                                        : "#FFFFFF",
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: addDobDay === day ? "#B5EAD7" : "rgba(0,0,0,0.08)",
                                  marginBottom: 8,
                                  paddingVertical: 14,
                                })}
                              >
                                <Text
                                  style={{
                                    color: addDobDay === day ? "#2F4858" : "rgba(0,0,0,0.75)",
                                    fontFamily:
                                      addDobDay === day ? "Inter_600SemiBold" : "Inter_500Medium",
                                    fontSize: 16,
                                  }}
                                >
                                  {day}
                                </Text>
                              </Pressable>
                            );
                          })}

                        {activeAddDobPicker === "month" &&
                          [
                            { label: "January", short: "Jan", value: "1" },
                            { label: "February", short: "Feb", value: "2" },
                            { label: "March", short: "Mar", value: "3" },
                            { label: "April", short: "Apr", value: "4" },
                            { label: "May", short: "May", value: "5" },
                            { label: "June", short: "Jun", value: "6" },
                            { label: "July", short: "Jul", value: "7" },
                            { label: "August", short: "Aug", value: "8" },
                            { label: "September", short: "Sep", value: "9" },
                            { label: "October", short: "Oct", value: "10" },
                            { label: "November", short: "Nov", value: "11" },
                            { label: "December", short: "Dec", value: "12" },
                          ].map((month) => (
                            <Pressable
                              key={month.value}
                              onPress={() => {
                                setAddDobMonth(month.value);
                                setAddDobError("");
                                setActiveAddDobPicker(null);
                              }}
                              style={({ pressed }) => ({
                                alignItems: "center",
                                backgroundColor:
                                  addDobMonth === month.value
                                    ? "#B5EAD7"
                                    : pressed
                                      ? "rgba(181,234,215,0.25)"
                                      : "#FFFFFF",
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor:
                                  addDobMonth === month.value ? "#B5EAD7" : "rgba(0,0,0,0.08)",
                                marginBottom: 8,
                                paddingVertical: 14,
                              })}
                            >
                              <Text
                                style={{
                                  color:
                                    addDobMonth === month.value ? "#2F4858" : "rgba(0,0,0,0.75)",
                                  fontFamily:
                                    addDobMonth === month.value
                                      ? "Inter_600SemiBold"
                                      : "Inter_500Medium",
                                  fontSize: 16,
                                }}
                              >
                                {month.label}
                              </Text>
                            </Pressable>
                          ))}

                        {activeAddDobPicker === "year" &&
                          Array.from({ length: 11 }, (_, i) => {
                            const year = String(new Date().getFullYear() - i);
                            return (
                              <Pressable
                                key={year}
                                onPress={() => {
                                  setAddDobYear(year);
                                  setAddDobError("");
                                  setActiveAddDobPicker(null);
                                }}
                                style={({ pressed }) => ({
                                  alignItems: "center",
                                  backgroundColor:
                                    addDobYear === year
                                      ? "#B5EAD7"
                                      : pressed
                                        ? "rgba(181,234,215,0.25)"
                                        : "#FFFFFF",
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: addDobYear === year ? "#B5EAD7" : "rgba(0,0,0,0.08)",
                                  marginBottom: 8,
                                  paddingVertical: 14,
                                })}
                              >
                                <Text
                                  style={{
                                    color: addDobYear === year ? "#2F4858" : "rgba(0,0,0,0.75)",
                                    fontFamily:
                                      addDobYear === year ? "Inter_600SemiBold" : "Inter_500Medium",
                                    fontSize: 16,
                                  }}
                                >
                                  {year}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </ScrollView>

                      {/* Cancel Button */}
                      <Pressable
                        onPress={() => {
                          setActiveAddDobPicker(null);
                        }}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          backgroundColor: pressed ? "#F0F0F0" : "#FAFAFA",
                          borderRadius: 14,
                          marginTop: 12,
                          paddingVertical: 12,
                        })}
                      >
                        <Text
                          style={{
                            color: "rgba(0,0,0,0.5)",
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 14,
                          }}
                        >
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenContainer>
  );
};

export default withTheme(ProfileScreen);
