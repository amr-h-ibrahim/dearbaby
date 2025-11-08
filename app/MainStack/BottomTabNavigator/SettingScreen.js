import React from "react";
import { CheckboxRow, Icon, ScreenContainer, Touchable, withTheme } from "@draftbit/ui";
import { Image, ScrollView, Text, View } from "react-native";
import Images from "../../../config/Images";
import palettes from "../../../themes/palettes";
import Breakpoints from "../../../utils/Breakpoints";
import * as StyleSheet from "../../../utils/StyleSheet";
import imageSource from "../../../utils/imageSource";
import useNavigation from "../../../utils/useNavigation";
import useParams from "../../../utils/useParams";
import useWindowDimensions from "../../../utils/useWindowDimensions";

const SettingScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const [checkboxRowValue, setCheckboxRowValue] = React.useState("");

  return (
    <ScreenContainer
      scrollable={false}
      hasSafeArea={true}
      hasTopSafeArea={false}
      style={StyleSheet.applyWidth(
        { backgroundColor: palettes.App["Custom Color_3"] },
        dimensions.width,
      )}
    >
      {/* Header */}
      <View
        style={StyleSheet.applyWidth(
          {
            alignItems: "center",
            backgroundColor: palettes.App["Custom Color_4"],
            flexDirection: "row",
            justifyContent: "space-between",
          },
          dimensions.width,
        )}
      >
        {/* Back */}
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
          <Touchable>
            <Icon size={24} name={"AntDesign/arrowleft"} />
          </Touchable>
        </View>
        {/* Screen Heading */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: theme.colors.text.strong,
              fontFamily: "Poppins_400Regular",
              fontSize: 15,
            },
            dimensions.width,
          )}
        >
          {"Settings"}
        </Text>
        {/* Blank */}
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
        />
      </View>

      <ScrollView
        bounces={true}
        horizontal={false}
        keyboardShouldPersistTaps={"never"}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={StyleSheet.applyWidth({ flex: 1 }, dimensions.width)}
      >
        {/* Account Setting */}
        <View
          style={StyleSheet.applyWidth(
            {
              backgroundColor: palettes.App["Custom Color_4"],
              paddingBottom: 5,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 16,
            },
            dimensions.width,
          )}
        >
          <Touchable style={StyleSheet.applyWidth({ marginBottom: 20 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  backgroundColor: palettes.App["Custom Color_3"],
                  borderRadius: 10,
                  height: 94,
                  justifyContent: "center",
                  opacity: 1,
                },
                dimensions.width,
              )}
            >
              <View
                style={StyleSheet.applyWidth(
                  { alignItems: "center", flexDirection: "row" },
                  dimensions.width,
                )}
              >
                <Image
                  resizeMode={"cover"}
                  source={imageSource(Images["DatingIconColor"])}
                  style={StyleSheet.applyWidth({ height: 30, width: 30 }, dimensions.width)}
                />
                <Text
                  accessible={true}
                  selectable={false}
                  style={StyleSheet.applyWidth(
                    {
                      color: palettes.App["Custom Color_7"],
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 17,
                      marginLeft: 8,
                    },
                    dimensions.width,
                  )}
                >
                  {"Dating Pro"}
                </Text>
              </View>

              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color_6"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 10,
                    marginTop: 2,
                  },
                  dimensions.width,
                )}
              >
                {"Unlimited likes and more"}
              </Text>
            </View>
          </Touchable>
          {/* Section heading */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: palettes.App["Custom Color"],
                fontFamily: "Poppins_600SemiBold",
                fontSize: 15,
              },
              dimensions.width,
            )}
          >
            {"Account Setting"}
          </Text>
          {/* Basic info */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Basic info"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
        </View>
        {/* Notifications */}
        <View
          style={StyleSheet.applyWidth(
            {
              backgroundColor: palettes.App["Custom Color_4"],
              marginTop: 8,
              paddingBottom: 5,
              paddingTop: 25,
            },
            dimensions.width,
          )}
        >
          {/* Section heading */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: palettes.App["Custom Color"],
                fontFamily: "Poppins_600SemiBold",
                fontSize: 15,
                paddingLeft: 20,
              },
              dimensions.width,
            )}
          >
            {"Notifications"}
          </Text>
          {/* Email */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              <CheckboxRow
                onPress={(newCheckboxRowValue) => {
                  try {
                    setCheckboxRowValue(newCheckboxRowValue);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                color={palettes.App["Custom Color_5"]}
                label={"Email"}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                    minHeight: 50,
                  },
                  dimensions.width,
                )}
                uncheckedColor={palettes.App["Custom Color_2"]}
              />
            </View>
          </Touchable>
          {/* Push Notifications */}
          <Touchable
            style={StyleSheet.applyWidth({ marginLeft: 20, marginRight: 20 }, dimensions.width)}
          >
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Push Notifications"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
        </View>
        {/* Contact Us */}
        <View
          style={StyleSheet.applyWidth(
            {
              backgroundColor: palettes.App["Custom Color_4"],
              marginTop: 8,
              paddingBottom: 5,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 25,
            },
            dimensions.width,
          )}
        >
          {/* Section heading */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: palettes.App["Custom Color"],
                fontFamily: "Poppins_600SemiBold",
                fontSize: 15,
              },
              dimensions.width,
            )}
          >
            {"Contact Us"}
          </Text>
          {/* Help & Support */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Help & support"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
        </View>
        {/* Legal */}
        <View
          style={StyleSheet.applyWidth(
            {
              backgroundColor: palettes.App["Custom Color_4"],
              marginTop: 8,
              paddingBottom: 5,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 25,
            },
            dimensions.width,
          )}
        >
          {/* Section heading */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: palettes.App["Custom Color"],
                fontFamily: "Poppins_600SemiBold",
                fontSize: 15,
              },
              dimensions.width,
            )}
          >
            {"Legal"}
          </Text>
          {/* Privacy Policy */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Privacy Policy"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
          {/* Terms of Service */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Terms of Service"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
          {/* Licences */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Licences"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
          {/* Restore purchases */}
          <Touchable style={StyleSheet.applyWidth({ marginTop: 5 }, dimensions.width)}>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  flexDirection: "row",
                  height: 48,
                  justifyContent: "space-between",
                },
                dimensions.width,
              )}
            >
              {/* Menu name */}
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: palettes.App["Custom Color"],
                    fontFamily: "Poppins_400Regular",
                    fontSize: 15,
                  },
                  dimensions.width,
                )}
              >
                {"Restore purchases"}
              </Text>
              {/* arrow icon */}
              <Icon
                size={24}
                color={palettes.App["Custom Color_2"]}
                name={"Feather/chevron-right"}
              />
            </View>
          </Touchable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

export default withTheme(SettingScreen);
