import type { SourceImage } from "../types";
import { base64ToBlob } from "./imageService";

/**
 * --- Cloudflare Worker R2 Configuration ---
 */
const WORKER_URL = "https://upload-r2-assets.huynhphvan.workers.dev";
const AUTH_SECRET = "mpYlW2Fa7nUk#Cze"; // must match env.AUTH_SECRET in Worker

/** Normalize paths and avoid double slashes */
function normalizeKey(path: string) {
  const clean = path.trim().replace(/^\/+/, ""); // remove leading slashes
  if (!clean) throw new Error("Invalid upload path (empty key).");
  return clean;
}

/**
 * Uploads a blob to Cloudflare R2 via a dedicated Worker.
 * Returns the public access URL.
 */
export async function uploadToWorker(path: string, blob: Blob): Promise<string> {
  const key = normalizeKey(path);
  // Ensure base URL has a trailing slash for reliable concatenation
  const baseUrl = WORKER_URL.endsWith('/') ? WORKER_URL : `${WORKER_URL}/`;
  const url = `${baseUrl}${key}`;

  try {
    const resp = await fetch(url, {
      method: "PUT",
      body: blob,
      mode: 'cors', // Ensure CORS is explicitly enabled
      credentials: 'omit', // Avoid sending unnecessary cookies to a third-party worker
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Authorization": `Bearer ${AUTH_SECRET}`,
      },
    });

    const contentType = resp.headers.get("content-type") || "";
    const bodyText = await resp.text();

    if (!resp.ok) {
      throw new Error(
        `Cloudflare Worker Upload Failed: ${resp.status} ${resp.statusText} - ${bodyText}`
      );
    }

    // If Worker returns JSON { url/publicUrl/... }
    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(bodyText) as any;
        if (typeof data?.url === "string") return data.url;
        if (typeof data?.publicUrl === "string") return data.publicUrl;
        if (typeof data?.key === "string") return new URL(data.key, WORKER_URL).toString();
      } catch {
        // ignore parse errors
      }
    }

    // If Worker returned plain text URL
    const trimmed = bodyText.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    // Default: construct URL based on Worker domain
    return url;
  } catch (error: any) {
    console.error("Storage Service Fetch Error:", error);
    if (error.message === 'Failed to fetch') {
      throw new Error("Mất kết nối với máy chủ lưu trữ (Failed to fetch). Vui lòng kiểm tra kết nối internet hoặc tắt trình chặn quảng cáo.");
    }
    throw error;
  }
}

/**
 * Single-upload: Binary image Blob (PNG/JPG)
 * Efficiency: No longer uploads redundant Base64 text files.
 * Canvas compatibility is handled by on-the-fly conversion when reopening.
 */
export const uploadImageToCloud = async (
  path: string, 
  base64: string, 
  mimeType: string
): Promise<string> => {
  // 1. Convert Base64 (edited format) to binary Blob (storage format)
  const imageBlob = base64ToBlob(base64, mimeType);
  
  // 2. Upload efficient binary image
  const imageUrl = await uploadToWorker(path, imageBlob);

  return imageUrl;
};

// @deprecated Kept for legacy caller compatibility
export const uploadImageWithBase64ToCloud = async (
  path: string,
  base64: string,
  mimeType: string
): Promise<{ imageUrl: string, base64Url: string }> => {
  const imageUrl = await uploadImageToCloud(path, base64, mimeType);
  return { imageUrl, base64Url: "" }; // base64Url is no longer generated for efficiency
};