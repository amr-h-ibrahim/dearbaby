import { Image } from "react-native";
import { Asset } from "expo-asset";
import * as Font from "expo-font";
import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import IMAGES from "./Images.js";

const isFontTimeoutError = (error) =>
  typeof error?.message === "string" && /timeout exceeded/i.test(error.message);

const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadFontMapWithRetry(font, { maxAttempts = 2, retryDelay = 600 } = {}) {
  let attempt = 0;

  while (attempt <= maxAttempts) {
    try {
      await Font.loadAsync(font);
      return;
    } catch (error) {
      if (!isFontTimeoutError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const retryNumber = attempt + 1;
      const fontNames = font && typeof font === "object" ? Object.keys(font).join(", ") : "unknown";
      console.warn(
        `[cacheAssetsAsync] Timeout loading font "${fontNames}", retrying (${retryNumber + 1}/${
          maxAttempts + 1
        })`,
      );
      await waitFor(retryDelay);
      attempt += 1;
    }
  }
}

function cacheImages(images) {
  return images.map((image) => {
    if (typeof image === "string") {
      return Image.prefetch(image);
    } else {
      return Asset.fromModule(image).downloadAsync();
    }
  });
}

function cacheFonts(fonts) {
  return fonts.map((font) => {
    const fontNames =
      font && typeof font === "object" ? Object.keys(font).join(", ") : "unknown font";

    return loadFontMapWithRetry(font, { maxAttempts: 2, retryDelay: 600 }).catch((error) => {
      console.warn(`[cacheAssetsAsync] Failed to load font "${fontNames}"`, error);
    });
  });
}

export default function cacheAssetsAsync() {
  const imageAssets = cacheImages(Object.values(IMAGES));
  const iconAssets = cacheFonts([
    AntDesign.font,
    Entypo.font,
    Feather.font,
    FontAwesome.font,
    Ionicons.font,
    MaterialCommunityIcons.font,
  ]);

  return Promise.all([...imageAssets, ...iconAssets]);
}
