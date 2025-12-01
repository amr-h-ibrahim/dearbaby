import React from "react";
import {
  Button,
  Divider,
  ExpoImage,
  Icon,
  ScreenContainer,
  TextInput,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import * as GlobalStyles from "../../GlobalStyles.js";
import * as SupabaseDearBabyApi from "../../apis/SupabaseDearBabyApi.js";
import * as GlobalVariables from "../../config/GlobalVariableContext";
import Images from "../../config/Images";
import palettes from "../../themes/palettes";
import Breakpoints from "../../utils/Breakpoints";
import * as StyleSheet from "../../utils/StyleSheet";
import imageSource from "../../utils/imageSource";
import useNavigation from "../../utils/useNavigation";
import useParams from "../../utils/useParams";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { useQueryClient } from "react-query";

const AuthSignupScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const navigation = useNavigation();
  const Constants = GlobalVariables.useValues();
  const setGlobalVariableValue = GlobalVariables.useSetValue();
  const queryClient = useQueryClient();

  // Local state for form fields
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = React.useState(false);

  // Local state for UI
  const [loadingSignup, setLoadingSignup] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [infoMessage, setInfoMessage] = React.useState("");

  // Email validation helper
  const isValidEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  // Form validation
  const validateForm = () => {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return false;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return false;
    }
    if (!isValidEmail(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      setErrorMessage("Please enter a password.");
      return false;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please try again.");
      return false;
    }
    return true;
  };

  // Check if form is valid for button state
  const isFormValid = () => {
    return (
      fullName.trim() &&
      email.trim() &&
      isValidEmail(email.trim()) &&
      password.length >= 8 &&
      password === confirmPassword
    );
  };

  // Handle signup
  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoadingSignup(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const signupResult = await SupabaseDearBabyApi.supabaseAuthSignupPOST(Constants, {
        email: email.trim(),
        password: password,
        full_name: fullName.trim(),
      });

      console.log("📋 Signup result status:", signupResult?.status);
      console.log("📋 Signup result body:", JSON.stringify(signupResult?.json, null, 2));

      const response = signupResult?.json;

      // ONLY check for error - do NOT check for session
      if (signupResult?.status >= 400 || response?.error) {
        console.log("❌ Signup error");
        const errorMsg =
          response?.error_description ||
          response?.error?.message ||
          response?.message ||
          response?.msg ||
          response?.error ||
          "Unable to create account. Please try again.";

        console.log("❌ Error message:", errorMsg);

        // Show the real Supabase error message
        setErrorMessage(errorMsg);
        setLoadingSignup(false);
        return;
      }

      // SUCCESS: No error means signup succeeded
      // (Even if there's no session - that's expected with email confirmation)
      console.log("✅ Signup successful!");

      const userEmail = response?.user?.email || email.trim();
      setErrorMessage(""); // Clear any errors
      setInfoMessage(
        `Welcome to DearBaby! 🎉\n\nWe've sent a confirmation email to ${userEmail}. Please verify your email and then log in to start capturing precious moments.`,
      );
      setLoadingSignup(false);

      // Note: Do NOT set auth tokens here
      // Do NOT call welcome email here
      // Do NOT navigate away - keep user on signup screen with success message
      // Welcome email will be sent on first successful login after verification
    } catch (err) {
      console.error("❌ Signup exception:", err);
      setErrorMessage(
        err?.message ||
          "Oops! We couldn't create your account right now.\n\nPlease check your internet connection and try again.",
      );
      setLoadingSignup(false);
    }
  };

  // Handle Google OAuth
  const handleGoogleSignIn = () => {
    // Use different redirect URLs for web vs mobile
    const isWeb = Platform.OS === "web";
    const redirectTo = isWeb ? "https://5d70a094cb.draftbit.dev" : "dearbaby://auth/callback";

    const supabaseUrl = (
      Constants?.SUPABASE_URL || "https://qiekucvzrkfhamhjrxtk.supabase.co"
    ).replace(/\/$/, "");
    const url = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;

    console.log("🚀 SignupScreen: Opening Google auth URL:", url);
    console.log("📍 Platform:", Platform.OS);
    console.log("📍 Redirect will be to:", redirectTo);

    Linking.openURL(url);
  };

  return (
    <ScreenContainer scrollable={true} hasSafeArea={true} style={{ backgroundColor: "#ffffff" }}>
      <View
        style={{
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 40,
          paddingBottom: 40,
          backgroundColor: "#ffffff",
        }}
      >
        {/* Logo */}
        <ExpoImage
          allowDownscaling={true}
          cachePolicy={"disk"}
          contentPosition={"center"}
          contentFit={"cover"}
          transitionDuration={300}
          transitionEffect={"cross-dissolve"}
          transitionTiming={"ease-in-out"}
          source={imageSource(Images["BigLogo"])}
          style={StyleSheet.applyWidth(
            { height: 100, width: 100, marginBottom: 16 },
            dimensions.width,
          )}
        />

        {/* Headline */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: theme.colors.text.strong,
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              textAlign: "center",
              marginBottom: 24,
            },
            dimensions.width,
          )}
        >
          {"Create your DearBaby account"}
        </Text>

        {/* Error Banner */}
        {errorMessage ? (
          <View
            style={StyleSheet.applyWidth(
              {
                backgroundColor: "#FFEBEE",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                width: "100%",
                borderWidth: 1,
                borderColor: "#FFCDD2",
              },
              dimensions.width,
            )}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: "#C62828",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  textAlign: "center",
                },
                dimensions.width,
              )}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Info Banner */}
        {infoMessage ? (
          <View
            style={StyleSheet.applyWidth(
              {
                backgroundColor: "#E8F5E9",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                width: "100%",
                borderWidth: 1,
                borderColor: "#C8E6C9",
              },
              dimensions.width,
            )}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: "#2E7D32",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  textAlign: "center",
                },
                dimensions.width,
              )}
            >
              {infoMessage}
            </Text>
          </View>
        ) : null}

        {/* Full Name Input */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: "center",
              backgroundColor: palettes.App["BG Gray"],
              borderBottomWidth: 1,
              borderColor: theme.colors.border.brand,
              borderLeftWidth: 1,
              borderRadius: 16,
              borderRightWidth: 1,
              borderTopWidth: 1,
              flexDirection: "row",
              height: 60,
              justifyContent: "space-between",
              paddingLeft: 20,
              paddingRight: 20,
              width: "100%",
              marginBottom: 12,
            },
            dimensions.width,
          )}
        >
          <Icon
            size={24}
            color={palettes.App["Custom Color_20"]}
            name={"Ionicons/person-outline"}
          />
          <View
            style={StyleSheet.applyWidth(
              { flex: 1, paddingLeft: 10, paddingRight: 10 },
              dimensions.width,
            )}
          >
            <TextInput
              autoCapitalize={"words"}
              autoCorrect={false}
              changeTextDelay={500}
              onChangeText={setFullName}
              webShowOutline={true}
              editable={true}
              placeholder={"Full Name"}
              placeholderTextColor={palettes.App["Custom Color_20"]}
              style={StyleSheet.applyWidth(
                {
                  borderRadius: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 8,
                },
                dimensions.width,
              )}
              value={fullName}
            />
          </View>
        </View>

        {/* Email Input */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: "center",
              backgroundColor: palettes.App["BG Gray"],
              borderBottomWidth: 1,
              borderColor: theme.colors.border.brand,
              borderLeftWidth: 1,
              borderRadius: 16,
              borderRightWidth: 1,
              borderTopWidth: 1,
              flexDirection: "row",
              height: 60,
              justifyContent: "space-between",
              paddingLeft: 20,
              paddingRight: 20,
              width: "100%",
              marginBottom: 12,
            },
            dimensions.width,
          )}
        >
          <Icon
            size={24}
            color={palettes.App["Custom Color_20"]}
            name={"MaterialCommunityIcons/email"}
          />
          <View
            style={StyleSheet.applyWidth(
              { flex: 1, paddingLeft: 10, paddingRight: 10 },
              dimensions.width,
            )}
          >
            <TextInput
              autoCapitalize={"none"}
              autoCorrect={false}
              changeTextDelay={500}
              onChangeText={setEmail}
              webShowOutline={true}
              editable={true}
              placeholder={"Email"}
              placeholderTextColor={palettes.App["Custom Color_20"]}
              keyboardType={"email-address"}
              style={StyleSheet.applyWidth(
                {
                  borderRadius: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 8,
                },
                dimensions.width,
              )}
              value={email}
            />
          </View>
        </View>

        {/* Password Input */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: "center",
              backgroundColor: palettes.App["BG Gray"],
              borderBottomWidth: 1,
              borderColor: theme.colors.border.brand,
              borderLeftWidth: 1,
              borderRadius: 16,
              borderRightWidth: 1,
              borderTopWidth: 1,
              flexDirection: "row",
              height: 60,
              justifyContent: "space-between",
              paddingLeft: 20,
              paddingRight: 20,
              width: "100%",
              marginBottom: 12,
            },
            dimensions.width,
          )}
        >
          <Icon size={24} color={palettes.App["Custom Color_20"]} name={"FontAwesome/lock"} />
          <View
            style={StyleSheet.applyWidth(
              { flex: 1, paddingLeft: 10, paddingRight: 10 },
              dimensions.width,
            )}
          >
            <TextInput
              autoCapitalize={"none"}
              autoCorrect={false}
              changeTextDelay={500}
              onChangeText={setPassword}
              webShowOutline={true}
              editable={true}
              placeholder={"Password (min 8 characters)"}
              placeholderTextColor={palettes.App["Custom Color_20"]}
              secureTextEntry={!isPasswordVisible}
              style={StyleSheet.applyWidth(
                {
                  borderRadius: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 8,
                },
                dimensions.width,
              )}
              value={password}
            />
          </View>
          <Touchable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            accessibilityRole={"button"}
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
          >
            <Icon
              size={24}
              color={palettes.App["Custom Color_20"]}
              name={isPasswordVisible ? "Ionicons/eye" : "Ionicons/eye-off"}
            />
          </Touchable>
        </View>

        {/* Confirm Password Input */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: "center",
              backgroundColor: palettes.App["BG Gray"],
              borderBottomWidth: 1,
              borderColor: theme.colors.border.brand,
              borderLeftWidth: 1,
              borderRadius: 16,
              borderRightWidth: 1,
              borderTopWidth: 1,
              flexDirection: "row",
              height: 60,
              justifyContent: "space-between",
              paddingLeft: 20,
              paddingRight: 20,
              width: "100%",
              marginBottom: 20,
            },
            dimensions.width,
          )}
        >
          <Icon size={24} color={palettes.App["Custom Color_20"]} name={"FontAwesome/lock"} />
          <View
            style={StyleSheet.applyWidth(
              { flex: 1, paddingLeft: 10, paddingRight: 10 },
              dimensions.width,
            )}
          >
            <TextInput
              autoCapitalize={"none"}
              autoCorrect={false}
              changeTextDelay={500}
              onChangeText={setConfirmPassword}
              webShowOutline={true}
              editable={true}
              placeholder={"Confirm Password"}
              placeholderTextColor={palettes.App["Custom Color_20"]}
              secureTextEntry={!isConfirmPasswordVisible}
              style={StyleSheet.applyWidth(
                {
                  borderRadius: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 8,
                },
                dimensions.width,
              )}
              value={confirmPassword}
            />
          </View>
          <Touchable
            onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
            accessibilityRole={"button"}
            accessibilityLabel={isConfirmPasswordVisible ? "Hide password" : "Show password"}
          >
            <Icon
              size={24}
              color={palettes.App["Custom Color_20"]}
              name={isConfirmPasswordVisible ? "Ionicons/eye" : "Ionicons/eye-off"}
            />
          </Touchable>
        </View>

        {/* Create Account Button */}
        <Touchable
          onPress={handleSignup}
          disabled={loadingSignup || !isFormValid()}
          style={StyleSheet.applyWidth({ width: "100%" }, dimensions.width)}
        >
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  loadingSignup || !isFormValid() ? "#BDBDBD" : theme.colors.branding.primary,
                borderRadius: 100,
                height: 58,
                width: "100%",
              },
              dimensions.width,
            )}
          >
            {loadingSignup ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: "#ffffff",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    textAlign: "center",
                  },
                  dimensions.width,
                )}
              >
                {"Create my DearBaby account"}
              </Text>
            )}
          </View>
        </Touchable>

        {/* Or continue with divider */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: "center",
              flexDirection: "row",
              height: 45,
              justifyContent: "space-between",
              width: "100%",
              marginTop: 20,
            },
            dimensions.width,
          )}
        >
          <Divider
            color={theme.colors.border.base}
            style={StyleSheet.applyWidth({ height: 2, width: "30%" }, dimensions.width)}
          />
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: theme.colors.text.strong,
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                marginLeft: 10,
                marginRight: 10,
                opacity: 0.7,
              },
              dimensions.width,
            )}
          >
            {"or"}
          </Text>
          <Divider
            color={theme.colors.border.base}
            style={StyleSheet.applyWidth({ height: 2, width: "30%" }, dimensions.width)}
          />
        </View>

        {/* Google Sign In Button */}
        <Touchable
          onPress={handleGoogleSignIn}
          style={StyleSheet.applyWidth({ width: "100%", marginTop: 10 }, dimensions.width)}
        >
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                borderBottomWidth: 2,
                borderColor: theme.colors.border.brand,
                borderLeftWidth: 2,
                borderRadius: 100,
                borderRightWidth: 2,
                borderTopWidth: 2,
                flexDirection: "row",
                height: 58,
                justifyContent: "center",
                width: "100%",
              },
              dimensions.width,
            )}
          >
            <ExpoImage
              allowDownscaling={true}
              cachePolicy={"disk"}
              contentPosition={"center"}
              resizeMode={"cover"}
              transitionDuration={300}
              transitionEffect={"cross-dissolve"}
              transitionTiming={"ease-in-out"}
              source={imageSource(Images["ObGoogle"])}
              style={StyleSheet.applyWidth(
                { height: 24, width: 24, marginRight: 12 },
                dimensions.width,
              )}
            />
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: theme.colors.text.strong,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                },
                dimensions.width,
              )}
            >
              {"Continue with Google"}
            </Text>
          </View>
        </Touchable>

        {/* Google info text */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: palettes.App["Custom Color_20"],
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              textAlign: "center",
              marginTop: 8,
            },
            dimensions.width,
          )}
        >
          {"We'll open Google in a secure browser window."}
        </Text>

        {/* Login Link */}
        <Touchable
          onPress={() => navigation.navigate("AuthStack", { screen: "index" })}
          style={StyleSheet.applyWidth({ width: "100%", marginTop: 20 }, dimensions.width)}
        >
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                paddingBottom: 10,
                paddingTop: 10,
              },
              dimensions.width,
            )}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: palettes.App["Custom Color_20"],
                  fontFamily: "Inter_400Regular",
                },
                dimensions.width,
              )}
            >
              {"Already have an account?"}
            </Text>
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: palettes.App["Custom Color"],
                  fontFamily: "Inter_600SemiBold",
                  marginLeft: 7,
                },
                dimensions.width,
              )}
            >
              {"Log in"}
            </Text>
          </View>
        </Touchable>
      </View>
    </ScreenContainer>
  );
};

export default withTheme(AuthSignupScreen);
