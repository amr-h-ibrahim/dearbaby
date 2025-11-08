import React from "react";
import { Image } from "react-native";

export default function AvatarStatic({ uri, size = 96, placeholder, style }) {
  const src = uri ? { uri } : placeholder || require("../assets/img/SearchPeopleNearby.png");

  return (
    <Image
      source={src}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      resizeMode="cover"
    />
  );
}
