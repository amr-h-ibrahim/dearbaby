import React from "react";
import {
  Button,
  CheckboxRow,
  Divider,
  Icon,
  ScreenContainer,
  TextInput,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import { Image, Text, View } from "react-native";
import * as GlobalStyles from "../GlobalStyles.js";
import * as SupabaseDearBabyApi from "../apis/SupabaseDearBabyApi.js";
import * as GlobalVariables from "../config/GlobalVariableContext";
import Images from "../config/Images";
import palettes from "../themes/palettes";
import Breakpoints from "../utils/Breakpoints";
import * as StyleSheet from "../utils/StyleSheet";
import imageSource from "../utils/imageSource";
import useNavigation from "../utils/useNavigation";
import useParams from "../utils/useParams";
import useWindowDimensions from "../utils/useWindowDimensions";

const SignUpScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const navigation = useNavigation();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const [checkboxRowValue, setCheckboxRowValue] = React.useState("");
  const [emailInputValue, setEmailInputValue] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [passwordInputValue, setPasswordInputValue] = React.useState("");
  const [retypepassword, setRetypepassword] = React.useState("");
  const [textInputValue, setTextInputValue] = React.useState("");

  return (
    <ScreenContainer scrollable={false} hasSafeArea={true}>
      <View
        style={StyleSheet.applyWidth(
          {
            alignItems: "center",
            flex: 1,
            justifyContent: "space-evenly",
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 20,
          },
          dimensions.width,
        )}
      >
        {/* Logo */}
        <Image
          resizeMode={"cover"}
          source={imageSource(Images["BigLogo"])}
          style={StyleSheet.applyWidth({ height: 120, width: 120 }, dimensions.width)}
        />
        {/* Create New Account */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: theme.colors.text.strong,
              fontFamily: "Inter_700Bold",
              fontSize: 28,
            },
            dimensions.width,
          )}
        >
          {"Create New Account"}
        </Text>
        {/* Error Message */}
        <View>
          {/* Error Message */}
          <>
            {!errorMessage ? null : (
              <Text
                accessible={true}
                selectable={false}
                {...GlobalStyles.TextStyles(theme)["Text 2"].props}
                style={StyleSheet.applyWidth(
                  StyleSheet.compose(
                    GlobalStyles.TextStyles(theme)["Text 2"].style,
                    theme.typography.body1,
                    {
                      color: theme.colors.text.danger,
                      fontFamily: "System",
                      fontSize: 20,
                      fontWeight: "700",
                      textAlign: "center",
                    },
                  ),
                  dimensions.width,
                )}
              >
                {errorMessage}
              </Text>
            )}
          </>
        </View>
        {/* Email */}
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
              autoCorrect={true}
              changeTextDelay={500}
              onChangeText={(newTextInputValue) => {
                try {
                  setEmailInputValue(newTextInputValue);
                } catch (err) {
                  console.error(err);
                }
              }}
              webShowOutline={true}
              editable={true}
              placeholder={"Email"}
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
              value={emailInputValue}
            />
          </View>
        </View>
        {/* Password */}
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
              autoCorrect={true}
              changeTextDelay={500}
              onChangeText={(newTextInputValue) => {
                try {
                  setPasswordInputValue(newTextInputValue);
                } catch (err) {
                  console.error(err);
                }
              }}
              webShowOutline={true}
              editable={true}
              placeholder={"Password"}
              placeholderTextColor={palettes.App["Custom Color_20"]}
              secureTextEntry={true}
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
              value={passwordInputValue}
            />
          </View>
          <Icon size={24} color={palettes.App["Custom Color_20"]} name={"Ionicons/eye-off"} />
        </View>
        {/* Retype Password */}
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
              autoCorrect={true}
              changeTextDelay={500}
              onChangeText={(newTextInputValue) => {
                try {
                  setRetypepassword(newTextInputValue);
                } catch (err) {
                  console.error(err);
                }
              }}
              webShowOutline={true}
              editable={true}
              placeholder={"Enter Password again"}
              placeholderTextColor={palettes.App["Custom Color_20"]}
              secureTextEntry={true}
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
              value={retypepassword}
            />
          </View>
          <Icon size={24} color={palettes.App["Custom Color_20"]} name={"Ionicons/eye-off"} />
        </View>
        {/* Remember me */}
        <View style={StyleSheet.applyWidth({ width: 165 }, dimensions.width)}>
          <CheckboxRow
            onPress={(newCheckboxRowValue) => {
              try {
                setCheckboxRowValue(newCheckboxRowValue);
              } catch (err) {
                console.error(err);
              }
            }}
            direction={"row-reverse"}
            label={"Remember me"}
            style={StyleSheet.applyWidth({ minHeight: 50 }, dimensions.width)}
          />
        </View>
        {/* Sign up */}
        <Button
          accessible={true}
          iconPosition={"left"}
          onPress={() => {
            const handler = async () => {
              try {
                if (passwordInputValue === retypepassword) {
                  const SignUpResponse = (
                    await SupabaseDearBabyApi.signUpPOST(Constants, {
                      email: emailInputValue,
                      password: passwordInputValue,
                    })
                  )?.json;
                  const identities_Length = SignUpResponse?.identities?.length;
                  if (identities_Length > 0) {
                    SignUpResponse?.id;
                    if (SignUpResponse?.id) {
                      navigation.navigate("AuthStack", { screen: "" });
                    } else {
                      setErrorMessage("Sign Up Faild. Ensure the email address in valid");
                    }
                  } else {
                    setErrorMessage("User is already Register");
                  }
                } else {
                  setErrorMessage("Password Not Matching");
                }
              } catch (err) {
                console.error(err);
              }
            };
            handler();
          }}
          style={StyleSheet.applyWidth(
            {
              backgroundColor: theme.colors.branding.primary,
              borderRadius: 100,
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              height: 58,
              textAlign: "center",
              width: "100%",
            },
            dimensions.width,
          )}
          title={"Sign up"}
        />
        {/* or continue with */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: "center",
              flexDirection: "row",
              height: 45,
              justifyContent: "space-between",
              width: "100%",
            },
            dimensions.width,
          )}
        >
          <Divider
            color={theme.colors.border.base}
            style={StyleSheet.applyWidth({ height: 2, width: "20%" }, dimensions.width)}
          />
          {/* OR */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: theme.colors.text.strong,
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                marginLeft: 20,
                marginRight: 20,
                opacity: 0.8,
              },
              dimensions.width,
            )}
          >
            {"or continue with"}
          </Text>
          <Divider
            color={theme.colors.border.base}
            style={StyleSheet.applyWidth({ height: 2, width: "20%" }, dimensions.width)}
          />
        </View>
        {/* Social options */}
        <View
          style={StyleSheet.applyWidth(
            {
              flexDirection: "row",
              justifyContent: "space-evenly",
              width: "100%",
            },
            dimensions.width,
          )}
        >
          {/* Facebook */}
          <Touchable>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  borderLeftWidth: 2,
                  borderRadius: 16,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  flexDirection: "row",
                  height: 60,
                  justifyContent: "center",
                  width: 88,
                },
                dimensions.width,
              )}
            >
              <Image
                resizeMode={"cover"}
                source={imageSource(Images["ObFB"])}
                style={StyleSheet.applyWidth({ height: 24, width: 24 }, dimensions.width)}
              />
            </View>
          </Touchable>
          {/* Google */}
          <Touchable>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  borderLeftWidth: 2,
                  borderRadius: 16,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  flexDirection: "row",
                  height: 60,
                  justifyContent: "center",
                  width: 88,
                },
                dimensions.width,
              )}
            >
              <Image
                resizeMode={"cover"}
                source={imageSource(Images["ObGoogle"])}
                style={StyleSheet.applyWidth({ height: 24, width: 24 }, dimensions.width)}
              />
            </View>
          </Touchable>
          {/* Apple */}
          <Touchable>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  borderLeftWidth: 2,
                  borderRadius: 16,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  flexDirection: "row",
                  height: 60,
                  justifyContent: "center",
                  width: 88,
                },
                dimensions.width,
              )}
            >
              <Image
                resizeMode={"cover"}
                source={imageSource(Images["ObApple"])}
                style={StyleSheet.applyWidth({ height: 24, width: 24 }, dimensions.width)}
              />
            </View>
          </Touchable>
        </View>
        {/* Sign in */}
        <Touchable style={StyleSheet.applyWidth({ width: "100%" }, dimensions.width)}>
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
                  fontFamily: "Inter_500Medium",
                  marginLeft: 7,
                },
                dimensions.width,
              )}
            >
              {"Sign in"}
            </Text>
          </View>
        </Touchable>
        <View />
      </View>
    </ScreenContainer>
  );
};

export default withTheme(SignUpScreen);
