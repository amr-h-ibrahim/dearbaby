import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AvatarStatic from "./AvatarStatic";
import useRefreshOnFocusAvatar from "../hooks/useRefreshOnFocusAvatar";

const defaultPlaceholder = require("../assets/img/avatar-placeholder.png");
const babyPlaceholder = require("../assets/img/baby-placeholder.png");

function inferPlaceholder(objectKey) {
  if (typeof objectKey === "string" && objectKey.toLowerCase().includes("baby")) {
    return babyPlaceholder;
  }
  return defaultPlaceholder;
}

export default function Avatar({
  uri,
  objectKey,
  mintViewFn,
  size = 96,
  placeholder,
  style,
  activityIndicatorProps = {},
}) {
  const dynamicEnabled = !uri && objectKey && typeof mintViewFn === "function";
  const { avatarUrl, loading } = useRefreshOnFocusAvatar({
    objectKey,
    mintViewFn,
    initialUrl: uri || null,
    enabled: Boolean(dynamicEnabled),
  });

  const resolvedPlaceholder = placeholder || inferPlaceholder(objectKey) || defaultPlaceholder;
  const resolvedUri = uri || avatarUrl || null;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <AvatarStatic
        uri={resolvedUri}
        size={size}
        placeholder={resolvedPlaceholder}
        style={styles.image}
      />
      {loading ? (
        <View style={[styles.loadingOverlay, { pointerEvents: "none" }]}>
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            {...(activityIndicatorProps && typeof activityIndicatorProps === "object"
              ? activityIndicatorProps
              : {})}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
});
