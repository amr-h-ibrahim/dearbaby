import React from "react";
import { Image } from "react-native";

const defaultPlaceholder = require("../assets/img/avatar-placeholder.png");

export default function AvatarStatic({ uri, size = 96, placeholder, style }) {
  const resolvedPlaceholder = placeholder || defaultPlaceholder;
  const source = uri ? { uri } : resolvedPlaceholder;
  const key = uri ? uri : "placeholder";

  return (
    <Image
      key={key}
      source={source}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      resizeMode="cover"
    />
  );
}
