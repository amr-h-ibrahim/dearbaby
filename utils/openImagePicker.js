import * as ImagePicker from "expo-image-picker";
import assetToBase64 from "./assetToBase64";

const normalizeMediaTypes = (input) => {
  const toArray = (value) => (Array.isArray(value) ? value : [value]);
  const resolveSingle = (value) => {
    if (!value) {
      return ["images"];
    }

    if (value === ImagePicker.MediaTypeOptions.All || value === "All" || value === "all") {
      return ["images", "videos"];
    }

    if (value === ImagePicker.MediaTypeOptions.Images || value === "Images" || value === "images") {
      return ["images"];
    }

    if (value === ImagePicker.MediaTypeOptions.Videos || value === "Videos" || value === "videos") {
      return ["videos"];
    }

    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "livephotos" || lower === "live_photos") {
        return ["livePhotos"];
      }
    }

    return [value];
  };

  const all = toArray(input).flatMap(resolveSingle).filter(Boolean);
  if (!all.length) {
    return "images";
  }

  const unique = Array.from(new Set(all));
  return unique.length === 1 ? unique[0] : unique;
};

async function openImagePicker({
  mediaTypes = "images",
  allowsEditing = false,
  quality = 1,
  allowsMultipleSelection = false,
  selectionLimit = 0,
  outputBase64 = true,
}) {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: normalizeMediaTypes(mediaTypes),
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
