import { createCustomApiService, type GenerateContentResponse } from "./customApiService";
import type { SourceImage, ObjectTransform, AspectRatio, ImageSize } from '../types';
import { translations } from '../locales/translations';
import { padImageToAspectRatioWithColor } from "../utils";
import { ensureBase64 } from "./imageService";
import { uploadImageToCloud } from "./storageService";
import { v4 as uuidv4 } from 'uuid';

function formatPrompt(template: string, ...args: any[]): string {
    if (!template) return '';
    return template.replace(/{(\d+)}/g, (match, number) => {
        return typeof args[number] !== 'undefined' ? args[number] : match;
    });
}

function prependFromUploadedImage(prompt: string): string {
    return `From uploaded image ${prompt}`;
}

const getClosestAspectRatio = async (sourceImage: SourceImage): Promise<string> => {
    const base64 = await ensureBase64(sourceImage);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const ratio = w / h;
            
            const targets = [
                { id: '1:1', val: 1 },
                { id: '4:3', val: 4/3 },
                { id: '3:4', val: 3/4 },
                { id: '16:9', val: 16/9 },
                { id: '9:16', val: 9/16 },
            ];
            
            const closest = targets.reduce((prev, curr) => 
                Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
            );
            resolve(closest.id);
        };
        img.onerror = () => resolve('4:3');
        img.src = `data:${sourceImage.mimeType};base64,${base64}`;
    });
};

const extractBase64Image = (response: GenerateContentResponse): string | null => {
  // FIX: Accessing .candidates through candidates[0].content.parts as per guidelines for multimodel output
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/**
 * Converts a SourceImage to a URL string.
 * If the image has base64 data, it uploads it to cloud storage first.
 */
const sourceImageToUrl = async (sourceImage: SourceImage): Promise<string> => {
  if (sourceImage.url) {
    return sourceImage.url;
  }
  
  if (sourceImage.base64) {
    // Upload base64 image to get a URL
    const path = `temp/${uuidv4()}.${sourceImage.mimeType.includes('png') ? 'png' : 'jpg'}`;
    return await uploadImageToCloud(path, sourceImage.base64, sourceImage.mimeType);
  }
  
  throw new Error("SourceImage has neither URL nor base64 data");
};

export const generateImages = async (
  sourceImage: SourceImage | null,
  prompt: string,
  count: number = 2,
  referenceImage: SourceImage | null = null,
  aspectRatio: string = '4:3',
  lang: 'vi' | 'en' = 'vi',
  negativePrompt?: string,
  modelName: string = 'gemini-2.5-flash-image',
  imageSize: ImageSize = '1K'
): Promise<string[]> => {
  // Use new automate API if there's a source image and no reference image
  // Otherwise fall back to the old method
  if (sourceImage && !referenceImage) {
    try {
      const results: string[] = [];
      const apiService = createCustomApiService();
      
      // Convert source image to URL
      const imageUrl = await sourceImageToUrl(sourceImage);
      
      // Build the prompt with negative prompt if provided (always use English)
      let finalPrompt = prompt;
      if (negativePrompt && negativePrompt.trim() !== '') {
        const template = translations.en.engineeredPrompts.generateWithoutReferenceNegative;
        finalPrompt = formatPrompt(template, prompt, negativePrompt);
      } else {
        const template = translations.en.engineeredPrompts.generateWithoutReference;
        finalPrompt = formatPrompt(template, prompt);
      }

      // Generate images using the automate API in parallel
      const generatePromises = Array.from({ length: count }, (_, i) =>
        apiService.generateImageAutomate(
          {
            image_url: imageUrl,
            prompt: prependFromUploadedImage(finalPrompt)
          },
          {
            onProgress: (progress, status) => {
              console.log(`Image ${i + 1}/${count} - Progress: ${progress}%, Status: ${status}`);
            }
          }
        ).catch((error) => {
          console.error(`Failed to generate image ${i + 1}/${count} with automate API:`, error);
          throw error;
        })
      );

      const generatedUrls = await Promise.all(generatePromises);
      return generatedUrls;
    } catch (error) {
      console.warn("Automate API failed, falling back to old method:", error);
      // Fall through to old method
    }
  }

  // Fall back to old method for cases with reference images or no source image
  // Try to use automate API even with reference images or no source image
  const results: string[] = [];
  const apiService = createCustomApiService();

  // For cases with reference images, we can't use automate API (it doesn't support reference images)
  // For cases without source image, we can't use automate API (it requires an image)
  // So we keep the old method for these cases
  if (!sourceImage || referenceImage) {
    let finalAspectRatio = aspectRatio;
    if (finalAspectRatio === 'auto') {
        if (sourceImage) finalAspectRatio = await getClosestAspectRatio(sourceImage);
        else finalAspectRatio = '4:3';
    }

    const imageConfig: any = { aspectRatio: finalAspectRatio };
    if (modelName === 'gemini-3-pro-image-preview') imageConfig.imageSize = imageSize;

    // Prepare base64 images once before parallel generation
    const sourceBase64 = sourceImage ? await ensureBase64(sourceImage) : null;
    const refBase64 = referenceImage ? await ensureBase64(referenceImage) : null;

    // Build engineered prompt once
    let engineeredPrompt = prompt;
    if (sourceImage) {
      if (referenceImage) {
        const template = (negativePrompt && negativePrompt.trim() !== '')
          ? translations.en.engineeredPrompts.generateWithReferenceNegative
          : translations.en.engineeredPrompts.generateWithReference;
        engineeredPrompt = formatPrompt(template, prompt, negativePrompt);
      } else {
        const template = (negativePrompt && negativePrompt.trim() !== '')
          ? translations.en.engineeredPrompts.generateWithoutReferenceNegative
          : translations.en.engineeredPrompts.generateWithoutReference;
        engineeredPrompt = formatPrompt(template, prompt, negativePrompt);
      }
    } else {
      if (negativePrompt && negativePrompt.trim() !== '') {
        engineeredPrompt = `${prompt} (Do not include: ${negativePrompt})`;
      }
    }

    // Generate images in parallel
    const generatePromises = Array.from({ length: count }, async (_, i) => {
      try {
        let parts: any[] = [];

        if (sourceBase64) {
          parts.push({
            inlineData: {
              data: sourceBase64,
              mimeType: sourceImage!.mimeType,
            },
          });

          if (refBase64) {
            parts.push({
              inlineData: {
                data: refBase64,
                mimeType: referenceImage!.mimeType,
              },
            });
          }
        }

        parts.push({ text: prependFromUploadedImage(engineeredPrompt) });

        // Using custom API service (old method for unsupported cases)
        const response = await apiService.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            imageConfig: imageConfig
          },
        });
        return extractBase64Image(response);
      } catch (error) {
        console.error(`Failed to generate image ${i + 1}/${count}:`, error);
        return null;
      }
    });

    const fallbackResults = await Promise.all(generatePromises);
    return fallbackResults.filter((result): result is string => result !== null);
  }

  // For cases with source image but no reference image, use automate API
  try {
    const imageUrl = await sourceImageToUrl(sourceImage!);
    
    let finalPrompt = prompt;
    if (negativePrompt && negativePrompt.trim() !== '') {
      const template = translations.en.engineeredPrompts.generateWithoutReferenceNegative;
      finalPrompt = formatPrompt(template, prompt, negativePrompt);
    } else {
      const template = translations.en.engineeredPrompts.generateWithoutReference;
      finalPrompt = formatPrompt(template, prompt);
    }

    // Generate images in parallel using Promise.all
    const generatePromises = Array.from({ length: count }, (_, i) =>
      apiService.generateImageAutomate(
        {
          image_url: imageUrl,
          prompt: prependFromUploadedImage(finalPrompt)
        },
        {
          onProgress: (progress, status) => {
            console.log(`Image ${i + 1}/${count} - Progress: ${progress}%, Status: ${status}`);
          }
        }
      ).catch((error) => {
        console.error(`Failed to generate image ${i + 1}/${count} with automate API:`, error);
        return null;
      })
    );

    const generatedUrls = await Promise.all(generatePromises);
    results.push(...generatedUrls.filter((url): url is string => url !== null));
  } catch (error) {
    console.error("Failed to use automate API:", error);
  }

  return results;
};

export const generateSketch = async (
    sourceImage: SourceImage,
    lang: 'vi' | 'en' = 'vi',
    modelName: string = 'gemini-2.5-flash-image'
): Promise<string[]> => {
    // Use new automate API for sketch generation (always use English)
    const apiService = createCustomApiService();
    const engineeredPrompt = translations.en.engineeredPrompts.generateSketch;
    
    try {
        // Convert source image to URL
        const imageUrl = await sourceImageToUrl(sourceImage);
        
        // Generate sketch using the automate API
        const generatedImageUrl = await apiService.generateImageAutomate(
            {
                image_url: imageUrl,
                prompt: prependFromUploadedImage(engineeredPrompt)
            },
            {
                onProgress: (progress, status) => {
                    console.log(`Sketch generation - Progress: ${progress}%, Status: ${status}`);
                }
            }
        );
        
        return [generatedImageUrl];
    } catch (error) {
        console.error("Failed to generate sketch with automate API:", error);
        throw error;
    }
};

export const generateVideo = async (
  sourceImage: SourceImage,
  prompt: string,
  model: string,
  onProgress: (message: string) => void
): Promise<string> => {
  const progressMessages = [
    "AI is warming up the virtual cameras...",
    "Analyzing the scene and your prompt...",
    "Storyboarding the first few frames...",
    "Rendering the motion sequence...",
    "Adding final touches and visual effects...",
    "This can take a few minutes, hang tight!",
  ];

  try {
    onProgress("Initializing video generation...");
    const veoModel = model.includes('veo') ? 'veo-3.1-fast-generate-preview' : model;
    const base64 = await ensureBase64(sourceImage);
    
    // Using custom API service
    const apiService = createCustomApiService();
    let operation = await apiService.generateVideos({
      model: veoModel,
      prompt: prependFromUploadedImage(prompt),
      image: {
        imageBytes: base64,
        mimeType: sourceImage.mimeType,
      },
      config: { numberOfVideos: 1 }
    });

    let messageIndex = 0;
    onProgress(progressMessages[messageIndex]);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      messageIndex = (messageIndex + 1) % progressMessages.length;
      onProgress(progressMessages[messageIndex]);
      operation = await apiService.getVideosOperation({ operation: operation });
    }

    onProgress("Video generated! Downloading...");
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");
    
    const response = await fetch(downloadLink);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);

    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    onProgress("Download complete!");
    return videoUrl;
  } catch (error) {
    console.error("Failed to generate video:", error);
    throw error;
  }
};

export const classifyImageType = async (
  sourceImage: SourceImage
): Promise<'interior' | 'exterior'> => {
  try {
    const base64 = await ensureBase64(sourceImage);
    const engineeredPrompt = translations.en.engineeredPrompts.classifyImageTypePrompt;
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: prependFromUploadedImage(engineeredPrompt) },
    ];

    // Using custom API service
    const apiService = createCustomApiService();
    const response = await apiService.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    const result = response.text?.trim().toLowerCase() || '';
    return result.includes('interior') ? 'interior' : 'exterior';
  } catch (error) {
    console.error("Failed to classify image type:", error);
    return 'exterior';
  }
};

export const generatePromptFromImage = async (
  sourceImage: SourceImage,
  lang: 'vi' | 'en' = 'vi',
  imageType: 'interior' | 'exterior' = 'exterior'
): Promise<string> => {
  try {
    const base64 = await ensureBase64(sourceImage);
    const templateKey = imageType === 'interior' ? 'generateFromImageInterior' : 'generateFromImage';
    const engineeredPrompt = translations.en.engineeredPrompts[templateKey];
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: prependFromUploadedImage(engineeredPrompt) },
    ];

    // Using custom API service
    const apiService = createCustomApiService();
    const response = await apiService.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate prompt from image:", error);
    throw new Error("Could not generate prompt from image.");
  }
};

export const generatePromptFromKeywords = async (
  keywords: string,
  lang: 'vi' | 'en' = 'vi',
  imageType: 'interior' | 'exterior' = 'exterior'
): Promise<string> => {
  const templateKey = imageType === 'interior' ? 'generateFromKeywordsInterior' : 'generateFromKeywords';
  const template = translations.en.engineeredPrompts[templateKey];
  const engineeredPrompt = formatPrompt(template, keywords);

  try {
    // Using custom API service
    const apiService = createCustomApiService();
    const response = await apiService.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: engineeredPrompt }] },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate prompt from keywords:", error);
    throw new Error("Could not generate prompt from keywords.");
  }
};

export const editImage = async (
  sourceImage: SourceImage,
  maskImage: SourceImage,
  prompt: string,
  count: number = 2,
  referenceImage: SourceImage | null = null,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  // Note: Automate API doesn't support mask images or reference images
  // So we use it only when there's no reference image and no mask
  // For now, we'll use the old method since mask is required for editImage
  const results: (string | null)[] = [];
  const sourceBase64 = await ensureBase64(sourceImage);
  const maskBase64 = await ensureBase64(maskImage);

  for (let i = 0; i < count; i++) {
    const parts: any[] = [
        { inlineData: { data: sourceBase64, mimeType: sourceImage.mimeType } },
        { inlineData: { data: maskBase64, mimeType: maskImage.mimeType } },
    ];
    
    let engineeredPrompt: string;
    if (referenceImage) {
        const refBase64 = await ensureBase64(referenceImage);
        parts.push({ inlineData: { data: refBase64, mimeType: referenceImage.mimeType } });
        const template = translations.en.engineeredPrompts.editWithReference;
        engineeredPrompt = formatPrompt(template, prompt);
    } else {
        const template = translations.en.engineeredPrompts.editWithoutReference;
        engineeredPrompt = formatPrompt(template, prompt);
    }
    
    parts.push({ text: prependFromUploadedImage(engineeredPrompt) });
    
    try {
        // Using custom API service (old method - automate API doesn't support masks)
        const apiService = createCustomApiService();
        const response = await apiService.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
          }
        );
        results.push(extractBase64Image(response));
    } catch(error) {
        console.error(`Failed to edit image ${i + 1}/${count}:`, error);
    }
  }
  return results.filter((result): result is string => result !== null);
};

export const mergeImages = async (
  image1: SourceImage,
  image2: SourceImage,
  prompt: string,
  count: number = 2,
): Promise<string[]> => {
  // Note: Automate API only supports one image, so we use the first image
  // and include merge instruction in the prompt
  const results: string[] = [];
  const apiService = createCustomApiService();

  try {
    const imageUrl = await sourceImageToUrl(image1);
    // Include merge instruction in prompt
    const mergePrompt = `Merge with the second image: ${prompt}`;

    for (let i = 0; i < count; i++) {
      try {
        const generatedImageUrl = await apiService.generateImageAutomate(
          {
            image_url: imageUrl,
            prompt: prependFromUploadedImage(mergePrompt)
          },
          {
            onProgress: (progress, status) => {
              console.log(`Merged image ${i + 1}/${count} - Progress: ${progress}%, Status: ${status}`);
            }
          }
        );
        results.push(generatedImageUrl);
      } catch (error) {
        console.error(`Failed to generate merged image ${i + 1}/${count} with automate API:`, error);
        // Fall back to old method
        const base64_1 = await ensureBase64(image1);
        const base64_2 = await ensureBase64(image2);
        const parts: any[] = [
          { inlineData: { data: base64_1, mimeType: image1.mimeType } },
          { inlineData: { data: base64_2, mimeType: image2.mimeType } },
          { text: prependFromUploadedImage(prompt) },
        ];
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        const result = extractBase64Image(response);
        if (result) results.push(result);
      }
    }
  } catch (error) {
    console.warn("Automate API failed for merge, using old method:", error);
    // Fall back to old method
    const base64_1 = await ensureBase64(image1);
    const base64_2 = await ensureBase64(image2);
    const fallbackResults: (string | null)[] = [];

    for (let i = 0; i < count; i++) {
      const parts: any[] = [
        { inlineData: { data: base64_1, mimeType: image1.mimeType } },
        { inlineData: { data: base64_2, mimeType: image2.mimeType } },
        { text: prependFromUploadedImage(prompt) },
      ];

      try {
        const apiService = createCustomApiService();
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        fallbackResults.push(extractBase64Image(response));
      } catch (error) {
        console.error(`Failed to generate merged image ${i + 1}/${count}:`, error);
      }
    }
    return fallbackResults.filter((result): result is string => result !== null);
  }

  return results;
};

export const placeAndRenderFurniture = async (
  bgImage: SourceImage,
  placements: { image: SourceImage; transform: ObjectTransform }[],
  count: number = 2,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  if (placements.length === 0) return [];

  const simplifiedPlacements = placements.map(({ transform }) => ({
    pos: { x: transform.x.toFixed(2), y: transform.y.toFixed(2) },
    scale: transform.scale.toFixed(2),
    rotation: transform.rotation.toFixed(0),
    orientation: {
        flip_horizontal: transform.flipHorizontal,
        flip_vertical: transform.flipVertical,
    }
  }));

  const template = translations.en.engineeredPrompts.placeAndRenderFurniture;
  const engineeredPrompt = formatPrompt(template, JSON.stringify(simplifiedPlacements, null, 2));

  const results: string[] = [];
  const apiService = createCustomApiService();

  try {
    const imageUrl = await sourceImageToUrl(bgImage);

    for (let i = 0; i < count; i++) {
      try {
        const generatedImageUrl = await apiService.generateImageAutomate(
          {
            image_url: imageUrl,
            prompt: prependFromUploadedImage(engineeredPrompt)
          },
          {
            onProgress: (progress, status) => {
              console.log(`Furniture placement ${i + 1}/${count} - Progress: ${progress}%, Status: ${status}`);
            }
          }
        );
        results.push(generatedImageUrl);
      } catch (error) {
        console.error(`Failed to generate canva image ${i + 1}/${count} with automate API:`, error);
        // Fall back to old method
        const bgBase64 = await ensureBase64(bgImage);
        const placementParts = await Promise.all(placements.map(async p => ({
            inlineData: { data: await ensureBase64(p.image), mimeType: p.image.mimeType }
        })));
        const parts: any[] = [
            { inlineData: { data: bgBase64, mimeType: bgImage.mimeType } },
            ...placementParts,
            { text: prependFromUploadedImage(engineeredPrompt) },
        ];
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        const result = extractBase64Image(response);
        if (result) results.push(result);
      }
    }
  } catch (error) {
    console.warn("Automate API failed for furniture placement, using old method:", error);
    // Fall back to old method
    const bgBase64 = await ensureBase64(bgImage);
    const placementParts = await Promise.all(placements.map(async p => ({
        inlineData: { data: await ensureBase64(p.image), mimeType: p.image.mimeType }
    })));
    const fallbackResults: (string | null)[] = [];

    for (let i = 0; i < count; i++) {
      const parts: any[] = [
          { inlineData: { data: bgBase64, mimeType: bgImage.mimeType } },
          ...placementParts,
          { text: prependFromUploadedImage(engineeredPrompt) },
      ];
      
      try {
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        fallbackResults.push(extractBase64Image(response));
      } catch (error) {
          console.error(`Failed to generate canva image ${i + 1}/${count}:`, error);
      }
    }
    return fallbackResults.filter((result): result is string => result !== null);
  }

  return results;
};

export const analyzeCharacterImage = async (
    characterImage: SourceImage,
    lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
    try {
        const base64 = await ensureBase64(characterImage);
        const engineeredPrompt = translations.en.engineeredPrompts.analyzeCharacterPrompt;
        const parts: any[] = [
            { inlineData: { data: base64, mimeType: characterImage.mimeType } },
            { text: prependFromUploadedImage(engineeredPrompt) },
        ];
        // Using custom API service
        const apiService = createCustomApiService();
        const response = await apiService.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Failed to analyze character image:", error);
        return "";
    }
};

export const analyzeImageArea = async (
    areaImage: SourceImage,
    lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
    try {
        const base64 = await ensureBase64(areaImage);
        const engineeredPrompt = translations.en.engineeredPrompts.analyzeAreaPrompt;
        const parts: any[] = [
            { inlineData: { data: base64, mimeType: areaImage.mimeType } },
            { text: prependFromUploadedImage(engineeredPrompt) },
        ];
        // Using custom API service
        const apiService = createCustomApiService();
        const response = await apiService.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Failed to analyze image area:", error);
        return "";
    }
};

export const generateArchitecturalPrompts = async (
    sourceImage: SourceImage,
    lang: 'vi' | 'en' = 'vi',
    characterDescription: string = ''
): Promise<string> => {
    try {
        const base64 = await ensureBase64(sourceImage);
        const template = translations.en.engineeredPrompts.generateArchitecturalPrompts;
        const engineeredPrompt = formatPrompt(template, characterDescription);
        const parts: any[] = [
            { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
            { text: prependFromUploadedImage(engineeredPrompt) },
        ];

        // Using custom API service
        const apiService = createCustomApiService();
        const response = await apiService.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts },
        });
        const rawText = response.text?.trim() || '';
        const firstHeaderIndex = rawText.search(/\d+️⃣/);
        const contentText = firstHeaderIndex !== -1 ? rawText.substring(firstHeaderIndex) : rawText;
        const cleanedText = contentText.replace(/\*/g, '').replace(/^\s*[-•]\s*/gm, '');
        return cleanedText.trim();
    } catch (error) {
        console.error("Failed to generate architectural prompts from image:", error);
        throw new Error("Could not generate prompts from image.");
    }
};

export const generatePromptFromPlan = async (
  sourceImage: SourceImage,
  lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
  try {
    const base64 = await ensureBase64(sourceImage);
    const engineeredPrompt = translations.en.engineeredPrompts.generateFromPlan;
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: prependFromUploadedImage(engineeredPrompt) },
    ];
    // Using custom API service
    const apiService = createCustomApiService();
    const response = await apiService.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate prompt from plan:", error);
    throw new Error("Could not generate prompt from plan.");
  }
};

export const generateMoodboard = async (
  sourceImage: SourceImage,
  userPrompt: string,
  referenceImage: SourceImage | null,
  imageCount: number,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  const results: string[] = [];
  const apiService = createCustomApiService();

  // Use automate API if no reference image, otherwise fall back to old method
  if (!referenceImage) {
    try {
      const imageUrl = await sourceImageToUrl(sourceImage);
      const template = translations.en.engineeredPrompts.generateMoodboard;
      const engineeredPrompt = formatPrompt(template, userPrompt);

      for (let i = 0; i < imageCount; i++) {
        try {
          const generatedImageUrl = await apiService.generateImageAutomate(
            {
              image_url: imageUrl,
              prompt: prependFromUploadedImage(engineeredPrompt)
            },
            {
              onProgress: (progress, status) => {
                console.log(`Moodboard ${i + 1}/${imageCount} - Progress: ${progress}%, Status: ${status}`);
              }
            }
          );
          results.push(generatedImageUrl);
        } catch (error) {
          console.error(`Failed to generate moodboard ${i + 1}/${imageCount} with automate API:`, error);
        }
      }
      return results;
    } catch (error) {
      console.warn("Automate API failed for moodboard, using old method:", error);
    }
  }

  // Fall back to old method for reference images or if automate API fails
  const fallbackResults: (string | null)[] = [];
  const sourceBase64 = await ensureBase64(sourceImage);

  for (let i = 0; i < imageCount; i++) {
    const parts: any[] = [
      { inlineData: { data: sourceBase64, mimeType: sourceImage.mimeType } },
    ];

    let engineeredPrompt: string;
    if (referenceImage) {
      const refBase64 = await ensureBase64(referenceImage);
      parts.push({ inlineData: { data: refBase64, mimeType: referenceImage.mimeType } });
      const template = translations.en.engineeredPrompts.generateMoodboardWithReference;
      engineeredPrompt = formatPrompt(template, userPrompt);
    } else {
      const template = translations.en.engineeredPrompts.generateMoodboard;
      engineeredPrompt = formatPrompt(template, userPrompt);
    }

    parts.push({ text: prependFromUploadedImage(engineeredPrompt) });
    
    try {
      const response = await apiService.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });
      fallbackResults.push(extractBase64Image(response));
    } catch (error) {
      console.error(`Failed to generate moodboard ${i + 1}/${imageCount}:`, error);
    }
  }
  return fallbackResults.filter((result): result is string => result !== null);
};

export const applyLighting = async (
  sourceImage: SourceImage,
  lightingPrompt: string,
  imageCount: number,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  const results: string[] = [];
  const apiService = createCustomApiService();
  const template = translations.en.engineeredPrompts.applyLighting;
  const engineeredPrompt = formatPrompt(template, lightingPrompt);

  try {
    const imageUrl = await sourceImageToUrl(sourceImage);

    for (let i = 0; i < imageCount; i++) {
      try {
        const generatedImageUrl = await apiService.generateImageAutomate(
          {
            image_url: imageUrl,
            prompt: prependFromUploadedImage(engineeredPrompt)
          },
          {
            onProgress: (progress, status) => {
              console.log(`Lighting ${i + 1}/${imageCount} - Progress: ${progress}%, Status: ${status}`);
            }
          }
        );
        results.push(generatedImageUrl);
      } catch (error) {
        console.error(`Failed to generate lighting image ${i + 1}/${imageCount} with automate API:`, error);
        // Fall back to old method
        const base64 = await ensureBase64(sourceImage);
        const parts: any[] = [
          { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
          { text: prependFromUploadedImage(engineeredPrompt) }
        ];
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        const result = extractBase64Image(response);
        if (result) results.push(result);
      }
    }
  } catch (error) {
    console.warn("Automate API failed for lighting, using old method:", error);
    // Fall back to old method
    const base64 = await ensureBase64(sourceImage);
    const fallbackResults: (string | null)[] = [];

    for (let i = 0; i < imageCount; i++) {
      const parts: any[] = [
        { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
        { text: prependFromUploadedImage(engineeredPrompt) }
      ];
      
      try {
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        fallbackResults.push(extractBase64Image(response));
      } catch (error) {
        console.error(`Failed to generate lighting image ${i + 1}/${imageCount}:`, error);
      }
    }
    return fallbackResults.filter((result): result is string => result !== null);
  }

  return results;
};

export const generateVideoScriptPrompt = async (
  sourceImage: SourceImage,
  userPrompt: string,
  lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
  try {
    const base64 = await ensureBase64(sourceImage);
    const engineeredPrompt = `hãy đóng vai một đạo diễn chuyên về quay phim kiến trúc,nội thất với hơn 20 năm kinh nghiệm và một chuyên gia viết promt chuyển từ ảnh thành video ngắn cho các ai kling và veo 3, bạn có kinh nghiệm về các góc camera, chuyển động của ánh sáng, bố cục và dựa vào tài liệu hàng đầu về nhiếp ảnh kiến trúc, nội thất. Khi tôi tải ảnh lên + yêu cầu bằng tiếng việt bạn hãy đựa vào đó viết promt tạo chuyển động cho ảnh theo chỉ định bằng tiếng anh, chỉ hiện promt ko hiện phân tích. Yêu cầu của người dùng là: "${userPrompt}"`;
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: prependFromUploadedImage(engineeredPrompt) },
    ];

    // Using custom API service
    const apiService = createCustomApiService();
    const response = await apiService.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate video script prompt:", error);
    throw new Error("Could not generate video script prompt.");
  }
};

const parseAspectRatio = (ratio: AspectRatio): number => {
  if (ratio === 'auto') return 4 / 3;
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
};

export const extendView = async (
  sourceImage: SourceImage,
  targetAspectRatioLabel: AspectRatio,
  imageCount: number,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  const targetAspectRatio = parseAspectRatio(targetAspectRatioLabel);
  const paddedImage = await padImageToAspectRatioWithColor(sourceImage, targetAspectRatio, '#FF00FF');
  const results: string[] = [];
  const apiService = createCustomApiService();
  const engineeredPrompt = translations.en.engineeredPrompts.extendView;

  try {
    const imageUrl = await sourceImageToUrl(paddedImage);

    for (let i = 0; i < imageCount; i++) {
      try {
        const generatedImageUrl = await apiService.generateImageAutomate(
          {
            image_url: imageUrl,
            prompt: prependFromUploadedImage(engineeredPrompt)
          },
          {
            onProgress: (progress, status) => {
              console.log(`Extended view ${i + 1}/${imageCount} - Progress: ${progress}%, Status: ${status}`);
            }
          }
        );
        results.push(generatedImageUrl);
      } catch (error) {
        console.error(`Failed to generate extended view image ${i + 1}/${imageCount} with automate API:`, error);
        // Fall back to old method
        const base64 = await ensureBase64(paddedImage);
        const parts: any[] = [
          { inlineData: { data: base64, mimeType: paddedImage.mimeType } },
          { text: prependFromUploadedImage(engineeredPrompt) }
        ];
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        const result = extractBase64Image(response);
        if (result) results.push(result);
      }
    }
  } catch (error) {
    console.warn("Automate API failed for extend view, using old method:", error);
    // Fall back to old method
    const base64 = await ensureBase64(paddedImage);
    const fallbackResults: (string | null)[] = [];

    for (let i = 0; i < imageCount; i++) {
      const parts: any[] = [
        { inlineData: { data: base64, mimeType: paddedImage.mimeType } },
        { text: prependFromUploadedImage(engineeredPrompt) }
      ];
      
      try {
        const response = await apiService.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        fallbackResults.push(extractBase64Image(response));
      } catch (error) {
        console.error(`Failed to generate extended view image ${i + 1}/${imageCount}:`, error);
      }
    }
    return fallbackResults.filter((result): result is string => result !== null);
  }

  return results;
};

export const generateStyleChangePrompt = async (
  sourceImage: SourceImage,
  userPrompt: string,
  lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
  try {
    const base64 = await ensureBase64(sourceImage);
    const template = translations.en.engineeredPrompts.changeStylePrompt;
    const engineeredPrompt = formatPrompt(template, userPrompt);
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: prependFromUploadedImage(engineeredPrompt) },
    ];

    // Using custom API service
    const apiService = createCustomApiService();
    const response = await apiService.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate style change prompt:", error);
    throw new Error("Could not generate style change prompt.");
  }
};