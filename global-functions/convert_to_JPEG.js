import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "../custom-files/ImageManipulator";

const convert_to_JPEG = async (inputUri, maxWidth, quality) => {
  // Real converter: returns JPEG file:// URI; falls back to original if conversion fails

  {
    const mw = parseInt(maxWidth ?? 512, 10) || 512;
    const q = Number(quality ?? 0.8) || 0.8;

    const resolveUri = (v) => {
      if (!v) return null;
      if (typeof v === "string") return v;
      if (v.uri) return v.uri;
      if (Array.isArray(v.assets) && v.assets[0]?.uri) return v.assets[0].uri;
      return null;
    };
    const uri = resolveUri(inputUri);
    if (!uri) return "";

    const ok =
      typeof ImageManipulator?.manipulateAsync === "function" && ImageManipulator?.SaveFormat;
    if (!ok) return uri;

    try {
      const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: mw } }], {
        compress: q,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return result?.uri || uri;
    } catch {
      return uri;
    }
  }
  module.exports = convert_to_JPEG;
};

export default convert_to_JPEG;
