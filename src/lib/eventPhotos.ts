/** Doc 09 — client-side event photo processing. */

export const EVENT_PHOTO_ORIGINAL_CAP = 10 * 1024 * 1024; // 10 MB
export const EVENT_PHOTO_TARGET_BYTES = 400 * 1024;
export const EVENT_PHOTO_MAX_EDGE = 1600;
export const EVENT_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export type ProcessedEventPhoto = {
  blob: Blob;
  fileName: string;
  mime: string;
  size: number;
  thumb: string;
  width: number;
  height: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Downscale to max long edge, JPEG ~0.8, target ≤ ~400 KB. */
export async function processEventPhoto(
  file: File,
): Promise<ProcessedEventPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only JPEG, PNG, or WebP images are accepted");
  }
  if (file.size > EVENT_PHOTO_ORIGINAL_CAP) {
    throw new Error("Original exceeds 10 MB — choose a smaller photo");
  }
  const img = await loadImage(file);
  const long = Math.max(img.width, img.height);
  const scale = Math.min(1, EVENT_PHOTO_MAX_EDGE / long);
  let width = Math.max(1, Math.round(img.width * scale));
  let height = Math.max(1, Math.round(img.height * scale));
  let quality = 0.8;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, width, height);
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    if (blob && blob.size <= EVENT_PHOTO_TARGET_BYTES) break;
    quality = Math.max(0.5, quality - 0.1);
    if (blob && blob.size > EVENT_PHOTO_TARGET_BYTES) {
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
  }
  if (!blob) throw new Error("Failed to encode photo");

  const thumbCanvas = document.createElement("canvas");
  const thumbScale = Math.min(1, 300 / Math.max(img.width, img.height));
  thumbCanvas.width = Math.max(1, Math.round(img.width * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(img.height * thumbScale));
  thumbCanvas.getContext("2d")?.drawImage(
    img,
    0,
    0,
    thumbCanvas.width,
    thumbCanvas.height,
  );
  const thumb = thumbCanvas.toDataURL("image/jpeg", 0.7);

  const base = file.name.replace(/\.[^.]+$/, "") || "event-photo";
  return {
    blob,
    fileName: `${base}.jpg`,
    mime: "image/jpeg",
    size: blob.size,
    thumb,
    width,
    height,
  };
}

export function isEventCategoryName(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return (
    n.includes("event") ||
    n.includes("outreach") ||
    n.includes("capacity") ||
    n.includes("network") ||
    n.includes("market")
  );
}
