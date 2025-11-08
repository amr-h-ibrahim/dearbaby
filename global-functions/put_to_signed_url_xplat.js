import * as FileSystem from "../custom-files/FileSystem";

const put_to_signed_url_xplat = async (putUrl, uri) => {
  {
    const contentType = "image/jpeg";

    // Accept { uri } inputs too (Draftbit picker objects)
    if (uri && typeof uri === "object" && uri.uri) uri = uri.uri;

    if (!putUrl || !uri) {
      throw new Error(
        `putUrl and uri required (putUrl=${JSON.stringify(putUrl)}, uri=${JSON.stringify(uri)})`,
      );
    }
    if (typeof putUrl !== "string" || typeof uri !== "string") {
      throw new Error("putUrl and uri must be strings");
    }

    // Native file path
    if (uri.startsWith("file://")) {
      const r = await FileSystem.uploadAsync(putUrl, uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": contentType },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (![200, 201, 204].includes(r.status)) {
        throw new Error(`Upload failed: HTTP ${r.status} ${r.body || ""}`);
      }
      return;
    }

    // Web/blob:// fallback
    const getRes = await fetch(uri);
    if (!getRes.ok) throw new Error(`Failed to read blob: ${getRes.status}`);
    const blob = await getRes.blob();

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!putRes.ok) throw new Error(`Upload failed: HTTP ${putRes.status}`);
  }

  module.exports = put_to_signed_url_xplat;
};

export default put_to_signed_url_xplat;
