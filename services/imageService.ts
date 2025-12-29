
import type { SourceImage } from "../types";

/**
 * Converts a SourceImage object to a usable Data URL string.
 */
export const sourceImageToDataUrl = (image: SourceImage): string => {
    if (image.base64) return `data:${image.mimeType};base64,${image.base64}`;
    if (image.url) return image.url;
    return '';
}

/**
 * Parses an image source string (Data URL or binary URL) into a SourceImage object.
 */
export const dataUrlToSourceImage = (input: string): SourceImage | null => {
    if (!input) return null;

    // Case 1: Standard URL (http/https)
    if (input.startsWith('http')) {
        return {
            url: input,
            mimeType: input.endsWith('.png') ? 'image/png' : 'image/jpeg' // Heuristic
        };
    }

    // Case 2: Data URL
    if (input.startsWith('data:')) {
        const [header, base64Data] = input.split(',');
        if (!header || !base64Data) {
            console.error("Invalid data URL format for image.");
            return null;
        }

        const mimeTypeMatch = header.match(/:(.*?);/);
        if (!mimeTypeMatch || !mimeTypeMatch[1]) {
            console.error("Could not extract mimeType from data URL.");
            return null;
        }
        
        return {
            base64: base64Data,
            mimeType: mimeTypeMatch[1]
        };
    }

    return null;
};

/**
 * Efficiently converts a base64 string to a Blob for network transmission.
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

/**
 * Ensures an image has base64 data. 
 * If it has a binary URL, it fetches the PNG and converts it back to Base64.
 * This maintains canvas compatibility while keeping R2 storage efficient (Blobs instead of text files).
 */
export const ensureBase64 = async (source: SourceImage): Promise<string> => {
    if (source.base64) return source.base64;

    if (source.url) {
        try {
            const resp = await fetch(source.url);
            if (!resp.ok) throw new Error("Failed to fetch image binary from cloud.");
            const blob = await resp.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("Error converting PNG binary to Base64:", err);
            throw err;
        }
    }
    throw new Error("SourceImage has neither local base64 nor cloud binary url.");
};

/**
 * Resizes an image to fit within maximum dimensions while maintaining aspect ratio.
 * Used to optimize storage and upload speeds.
 */
export const optimizeImageForStorage = async (source: SourceImage, maxWidth = 1600, maxHeight = 1200): Promise<SourceImage> => {
    const dataUrl = sourceImageToDataUrl(source);
    if (!dataUrl) return source;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            
            // If already within limits, return original
            if (width <= maxWidth && height <= maxHeight) {
                resolve(source);
                return;
            }

            const ratio = Math.min(maxWidth / width, maxHeight / height);
            const newWidth = Math.floor(width * ratio);
            const newHeight = Math.floor(height * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                resolve(source);
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Export at 90% quality to balance size and fidelity
            const resizedDataUrl = canvas.toDataURL(source.mimeType, 0.9);
            const base64 = resizedDataUrl.split(',')[1];
            
            resolve({
                base64,
                mimeType: source.mimeType
            });
        };
        img.onerror = () => resolve(source);
        img.src = dataUrl;
    });
};

/**
 * Generates a small thumbnail data URL for lightweight previews.
 */
export const createThumbnail = async (sourceUrl: string, size = 150): Promise<string> => {
  if (sourceUrl.includes('.mp4') || sourceUrl.startsWith('blob:')) {
    return ''; // Videos don't get image thumbnails this way
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(size / img.width, size / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve(sourceUrl);
      }
    };
    img.onerror = () => resolve(sourceUrl);
    img.src = sourceUrl;
  });
};
