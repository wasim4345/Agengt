import { get, set, del, keys } from "idb-keyval";

export const FILE_SIZE_CAP_BYTES = 5 * 1024 * 1024; // 5 MB
export const TOTAL_WARN_BYTES = 100 * 1024 * 1024; // 100 MB

export type StoredBlob = {
  blob: Blob;
  fileName: string;
  mime: string;
  size: number;
};

export async function putFileBlob(
  blobKey: string,
  file: Blob,
  meta: { fileName: string; mime: string },
): Promise<void> {
  if (file.size > FILE_SIZE_CAP_BYTES) {
    throw new Error(
      `File exceeds ${FILE_SIZE_CAP_BYTES / (1024 * 1024)} MB prototype cap`,
    );
  }
  const record: StoredBlob = {
    blob: file,
    fileName: meta.fileName,
    mime: meta.mime,
    size: file.size,
  };
  await set(blobKey, record);
}

export async function getFileBlob(
  blobKey: string,
): Promise<StoredBlob | undefined> {
  return get<StoredBlob>(blobKey);
}

export async function deleteFileBlob(blobKey: string): Promise<void> {
  await del(blobKey);
}

export async function estimateFileStorageBytes(): Promise<number> {
  const allKeys = await keys();
  let total = 0;
  for (const key of allKeys) {
    if (typeof key !== "string" || !key.startsWith("blob:")) continue;
    const record = await get<StoredBlob>(key);
    if (record) total += record.size;
  }
  return total;
}

/** Seed helper: store a tiny text/pdf stand-in under the evidence blobKey. */
export async function putTextBlob(
  blobKey: string,
  text: string,
  fileName: string,
  mime = "text/plain",
): Promise<void> {
  const blob = new Blob([text], { type: mime });
  await putFileBlob(blobKey, blob, { fileName, mime });
}
