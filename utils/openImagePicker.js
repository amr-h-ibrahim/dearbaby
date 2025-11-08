import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import assetToBase64 from "./assetToBase64";

async function openImagePicker({
  mediaTypes = ImagePicker.MediaTypeOptions.Images,
  allowsEditing = false,
  quality = 1,
  allowsMultipleSelection = false,
  selectionLimit = 0,
  outputBase64 = true,
}) {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes,
    allowsEditing,
    quality,
    allowsMultipleSelection,
    selectionLimit,
  });

  if (result.canceled) {
    console.error("Open image picker action was canceled");
    return;
  }

  const assets = result.assets;

  if (!assets || assets.length === 0) {
    console.error("No assets were returned with the open image picker action");
    return;
  }

  if (allowsMultipleSelection) {
    return outputBase64 ? Promise.all(assets.map((asset) => assetToBase64(asset))) : assets;
  } else {
    return outputBase64 ? await assetToBase64(assets[0]) : assets[0];
  }
}

export default openImagePicker;
