import React from "react";
import { Icon, Touchable, useTheme } from "@draftbit/ui";
import { Tabs } from "expo-router";
import { I18nManager, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { systemWeights } from "react-native-typography";
import palettes from "../../../themes/palettes";
import Breakpoints from "../../../utils/Breakpoints";
import useNavigation from "../../../utils/useNavigation";
import useWindowDimensions from "../../../utils/useWindowDimensions";

export default function Layout() {
  const theme = useTheme();

  const tabBarOrDrawerIcons = {
    HomeScreen: "Entypo/home",
    SettingScreen: "AntDesign/setting",
    UploadMultipleImagesBlock: "",
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.background.base,
          borderBottomColor: "transparent",
        },
        headerTintColor: theme.colors.text.strong,
        headerTitleStyle: theme.typography.headline5,
        tabBarActiveTintColor: theme.colors.branding.primary,
        tabBarInactiveTintColor: theme.colors.text.light,
        tabBarLabelStyle: theme.typography.caption,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background.base,
          borderTopColor: "transparent",
        },
      }}
      initialRouteName={"index"}
    >
      <Tabs.Screen
        name="index"
        options={{
          gestureEnabled: false,
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.branding.secondary,
            borderBottomColor: "transparent",
          },
          headerTitle: "DearBaby",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name="Entypo/home"
              size={25}
              color={focused ? theme.colors.branding.primary : theme.colors.text.light}
            />
          ),
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="SettingScreen"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.branding.secondary,
            borderBottomColor: "transparent",
          },
          headerTitle: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name="AntDesign/setting"
              size={25}
              color={focused ? theme.colors.branding.primary : theme.colors.text.light}
            />
          ),
          title: "Setting",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
