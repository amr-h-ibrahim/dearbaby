/**
 * Upload a file (Blob/Uint8Array) to a given Pre-Authenticated Request (PAR) URL.
 * For OCI: create PAR for object, then PUT bytes to parUrl.
 */
export async function putToParUrl(parUrl: string, bytes: Uint8Array | ArrayBuffer, contentType: string) {
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const res = await fetch(parUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${txt}`);
  }
  return true;
}
