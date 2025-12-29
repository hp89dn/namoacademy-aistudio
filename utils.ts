
import type { SourceImage, BoundingBox } from './types';
import { sourceImageToDataUrl, dataUrlToSourceImage } from './services/imageService';

export { sourceImageToDataUrl, dataUrlToSourceImage };

export const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy text: ', err);
    });
};

/**
 * Crops an image to a target aspect ratio, cutting from the center.
 * @param image The source image to crop.
 * @param targetAspectRatio The desired aspect ratio (width / height).
 * @returns A promise that resolves to the cropped SourceImage.
 */
export const cropImageToAspectRatio = (image: SourceImage, targetAspectRatio: number): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourceImageToDataUrl(image);

    img.onload = () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const originalAspectRatio = originalWidth / originalHeight;

      let sx = 0, sy = 0, sWidth = originalWidth, sHeight = originalHeight;

      if (originalAspectRatio > targetAspectRatio) {
        // Image is wider than target, crop the sides (reduce width)
        sWidth = originalHeight * targetAspectRatio;
        sx = (originalWidth - sWidth) / 2;
      } else if (originalAspectRatio < targetAspectRatio) {
        // Image is taller than target, crop the top/bottom (reduce height)
        sHeight = originalWidth / targetAspectRatio;
        sy = (originalHeight - sHeight) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sWidth);
      canvas.height = Math.round(sHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      ctx.drawImage(
        img, 
        sx, sy, sWidth, sHeight,
        0, 0, canvas.width, canvas.height
      );

      const dataUrl = canvas.toDataURL(image.mimeType);
      const newSourceImage = dataUrlToSourceImage(dataUrl);

      if (newSourceImage) {
        resolve(newSourceImage);
      } else {
        reject(new Error('Failed to convert cropped canvas to SourceImage'));
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Image could not be loaded: ${err}`));
    };
  });
};

/**
 * Pads an image with transparency to match a target aspect ratio.
 * The original image is centered within the new canvas.
 * @param image The source image to pad.
 * @param targetAspectRatio The desired aspect ratio (width / height).
 * @returns A promise that resolves to the padded SourceImage.
 */
export const padImageToAspectRatio = (image: SourceImage, targetAspectRatio: number): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourceImageToDataUrl(image);

    img.onload = () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const originalAspectRatio = originalWidth / originalHeight;

      if (Math.abs(originalAspectRatio - targetAspectRatio) < 0.01) {
        // Aspect ratios are close enough, no padding needed.
        resolve(image);
        return;
      }

      let canvasWidth = originalWidth;
      let canvasHeight = originalHeight;
      let dx = 0;
      let dy = 0;

      if (originalAspectRatio > targetAspectRatio) {
        // Image is wider than target. New canvas height will be larger.
        canvasHeight = originalWidth / targetAspectRatio;
        dy = (canvasHeight - originalHeight) / 2;
      } else {
        // Image is taller than target. New canvas width will be larger.
        canvasWidth = originalHeight * targetAspectRatio;
        dx = (canvasWidth - originalWidth) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(canvasWidth);
      canvas.height = Math.round(canvasHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      ctx.drawImage(img, dx, dy, originalWidth, originalHeight);

      const dataUrl = canvas.toDataURL('image/png'); // Always use PNG to preserve transparency
      const newSourceImage = dataUrlToSourceImage(dataUrl);

      if (newSourceImage) {
        resolve(newSourceImage);
      } else {
        reject(new Error('Failed to convert padded canvas to SourceImage'));
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Image could not be loaded: ${err}`));
    };
  });
};

/**
 * Pads an image with a solid color to match a target aspect ratio.
 * The original image is centered within the new canvas.
 * @param image The source image to pad.
 * @param targetAspectRatio The desired aspect ratio (width / height).
 * @param color The background color to use for padding.
 * @returns A promise that resolves to the padded SourceImage.
 */
export const padImageToAspectRatioWithColor = (image: SourceImage, targetAspectRatio: number, color: string = 'white'): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourceImageToDataUrl(image);

    img.onload = () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const originalAspectRatio = originalWidth / originalHeight;

      if (Math.abs(originalAspectRatio - targetAspectRatio) < 0.01) {
        resolve(image);
        return;
      }

      let canvasWidth = originalWidth;
      let canvasHeight = originalHeight;
      let dx = 0;
      let dy = 0;

      if (originalAspectRatio > targetAspectRatio) {
        canvasHeight = originalWidth / targetAspectRatio;
        dy = (canvasHeight - originalHeight) / 2;
      } else {
        canvasWidth = originalHeight * targetAspectRatio;
        dx = (canvasWidth - originalWidth) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(canvasWidth);
      canvas.height = Math.round(canvasHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, dx, dy, originalWidth, originalHeight);

      const mimeType = 'image/png';
      const dataUrl = canvas.toDataURL(mimeType);
      const newSourceImage = dataUrlToSourceImage(dataUrl);

      if (newSourceImage) {
        resolve(newSourceImage);
      } else {
        reject(new Error('Failed to convert padded canvas to SourceImage'));
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Image could not be loaded: ${err}`));
    };
  });
};

/**
 * Crops an image based on a bounding box.
 * @param image The source image to crop.
 * @param box The bounding box with x, y, width, height.
 * @returns A promise that resolves to the cropped SourceImage.
 */
export const cropImage = (image: SourceImage, box: BoundingBox): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourceImageToDataUrl(image);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(box.width);
      canvas.height = Math.round(box.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      ctx.drawImage(
        img, 
        Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height),
        0, 0, canvas.width, canvas.height
      );

      const dataUrl = canvas.toDataURL(image.mimeType);
      const newSourceImage = dataUrlToSourceImage(dataUrl);

      if (newSourceImage) {
        resolve(newSourceImage);
      } else {
        reject(new Error('Failed to convert cropped canvas to SourceImage'));
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Image could not be loaded: ${err}`));
    };
  });
};

interface CompositeOptions {
  expansion: number;
  edgeBlend: number;
}

/**
 * Composites a generated image back onto a source image using a mask.
 * @param bgImage The original background image.
 * @param fgImage The generated content to place. This image is the size of the `box`.
 * @param box The bounding box where the content should be placed on the background.
 * @param maskImage The full-size mask defining the shape of the composite.
 * @param options Options for blending, like expansion and edge blur.
 * @returns A promise that resolves to the final composited SourceImage.
 */
export const compositeImage = (
  bgImage: SourceImage,
  fgImage: SourceImage,
  box: BoundingBox,
  maskImage: SourceImage,
  options: CompositeOptions
): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    const bg = new Image();
    const fg = new Image();
    const mask = new Image();
    
    let loadedCount = 0;
    const totalImages = 3;

    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        performComposite();
      }
    };

    bg.crossOrigin = "anonymous";
    fg.crossOrigin = "anonymous";
    mask.crossOrigin = "anonymous";

    bg.onload = onImageLoad;
    fg.onload = onImageLoad;
    mask.onload = onImageLoad;

    const errorHandler = (err: any) => reject(new Error(`Image could not be loaded: ${err}`));
    bg.onerror = errorHandler;
    fg.onerror = errorHandler;
    mask.onerror = errorHandler;

    bg.src = sourceImageToDataUrl(bgImage);
    fg.src = sourceImageToDataUrl(fgImage);
    mask.src = sourceImageToDataUrl(maskImage);

    const performComposite = () => {
      try {
        // Final canvas for the result
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = bg.naturalWidth;
        finalCanvas.height = bg.naturalHeight;
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return reject(new Error('Could not get final canvas context'));

        // 1. Draw the original background image. This preserves all un-edited areas.
        finalCtx.drawImage(bg, 0, 0);

        // 2. Prepare the feathered mask on a separate canvas.
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = bg.naturalWidth;
        maskCanvas.height = bg.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return reject(new Error('Could not get mask canvas context'));

        // Apply blur to the mask to create the soft "feathered" edge.
        // The blur radius is controlled by the `edgeBlend` option.
        maskCtx.filter = `blur(${options.edgeBlend}px)`;
        maskCtx.drawImage(mask, 0, 0);
        maskCtx.filter = 'none'; // Reset filter

        // 3. Prepare the foreground content on its own canvas.
        const fgCanvas = document.createElement('canvas');
        fgCanvas.width = bg.naturalWidth;
        fgCanvas.height = bg.naturalHeight;
        const fgCtx = fgCanvas.getContext('2d');
        if (!fgCtx) return reject(new Error('Could not get foreground canvas context'));

        // Draw the generated foreground image at its exact original position and size.
        // This is the CRITICAL step that prevents distortion and misalignment.
        fgCtx.drawImage(fg, box.x, box.y, box.width, box.height);

        // 4. Use the feathered mask to "cut out" the foreground.
        // The 'destination-in' operation keeps the foreground pixels only where the mask is opaque.
        fgCtx.globalCompositeOperation = 'destination-in';
        fgCtx.drawImage(maskCanvas, 0, 0);

        // 5. Draw the masked, feathered foreground onto the final image.
        finalCtx.globalCompositeOperation = 'source-over'; // reset to default
        finalCtx.drawImage(fgCanvas, 0, 0);

        // 6. Get the result.
        const dataUrl = finalCanvas.toDataURL('image/png');
        const newSourceImage = dataUrlToSourceImage(dataUrl);

        if (newSourceImage) {
          resolve(newSourceImage);
        } else {
          reject(new Error('Failed to convert final canvas to SourceImage'));
        }
      } catch (error) {
        reject(error);
      }
    };
  });
};
