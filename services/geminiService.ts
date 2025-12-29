import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { SourceImage, ObjectTransform, AspectRatio, ImageSize } from '../types';
import { translations } from '../locales/translations';
import { padImageToAspectRatioWithColor } from "../utils";
import { ensureBase64 } from "./imageService";

// FIX: Removed global 'ai' instance and API_KEY constant to adhere to guidelines.
// GoogleGenAI instances must be created right before making an API call using process.env.API_KEY.

function formatPrompt(template: string, ...args: any[]): string {
    if (!template) return '';
    return template.replace(/{(\d+)}/g, (match, number) => {
        return typeof args[number] !== 'undefined' ? args[number] : match;
    });
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
  // FIX: Using process.env.API_KEY directly as a hard requirement.
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  const results: (string | null)[] = [];
  let finalAspectRatio = aspectRatio;
  if (finalAspectRatio === 'auto') {
      if (sourceImage) finalAspectRatio = await getClosestAspectRatio(sourceImage);
      else finalAspectRatio = '4:3';
  }

  const imageConfig: any = { aspectRatio: finalAspectRatio };
  if (modelName === 'gemini-3-pro-image-preview') imageConfig.imageSize = imageSize;

  for (let i = 0; i < count; i++) {
    try {
      let parts: any[] = [];
      let engineeredPrompt = prompt;

      if (sourceImage) {
        const sourceBase64 = await ensureBase64(sourceImage);
        parts.push({
          inlineData: {
            data: sourceBase64,
            mimeType: sourceImage.mimeType,
          },
        });

        if (referenceImage) {
            const refBase64 = await ensureBase64(referenceImage);
            parts.push({
                inlineData: {
                    data: refBase64,
                    mimeType: referenceImage.mimeType,
                },
            });
            const template = (negativePrompt && negativePrompt.trim() !== '')
                ? translations[lang].engineeredPrompts.generateWithReferenceNegative
                : translations[lang].engineeredPrompts.generateWithReference;
            engineeredPrompt = formatPrompt(template, prompt, negativePrompt);
        } else {
            const template = (negativePrompt && negativePrompt.trim() !== '')
                ? translations[lang].engineeredPrompts.generateWithoutReferenceNegative
                : translations[lang].engineeredPrompts.generateWithoutReference;
            engineeredPrompt = formatPrompt(template, prompt, negativePrompt);
        }
      } else {
          if (negativePrompt && negativePrompt.trim() !== '') {
              engineeredPrompt = `${prompt} (Do not include: ${negativePrompt})`;
          }
      }

      parts.push({ text: engineeredPrompt });

      // FIX: Creating ai instance right before API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          imageConfig: imageConfig
        },
      });
      results.push(extractBase64Image(response));
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}/${count}:`, error);
    }
  }

  return results.filter((result): result is string => result !== null);
};

export const generateSketch = async (
    sourceImage: SourceImage,
    lang: 'vi' | 'en' = 'vi',
    modelName: string = 'gemini-2.5-flash-image'
): Promise<string[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

    const sourceBase64 = await ensureBase64(sourceImage);
    const engineeredPrompt = translations[lang].engineeredPrompts.generateSketch;
    const aspectRatio = await getClosestAspectRatio(sourceImage);

    try {
        const parts = [
            { inlineData: { data: sourceBase64, mimeType: sourceImage.mimeType } },
            { text: engineeredPrompt }
        ];

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
                imageConfig: { aspectRatio }
            },
        });
        const result = extractBase64Image(response);
        return result ? [result] : [];
    } catch (error) {
        console.error("Failed to generate sketch:", error);
        throw error;
    }
};

export const generateVideo = async (
  sourceImage: SourceImage,
  prompt: string,
  model: string,
  onProgress: (message: string) => void
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
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
    
    // FIX: Creating ai instance right before API call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
      model: veoModel,
      prompt: prompt,
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
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    onProgress("Video generated! Downloading...");
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation succeeded but no download link was found.");
    
    // FIX: Appending process.env.API_KEY to download link
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  try {
    const base64 = await ensureBase64(sourceImage);
    const engineeredPrompt = translations.vi.engineeredPrompts.classifyImageTypePrompt;
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: engineeredPrompt },
    ];

    // FIX: Creating ai instance right before API call and using .text property correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  try {
    const base64 = await ensureBase64(sourceImage);
    const templateKey = imageType === 'interior' ? 'generateFromImageInterior' : 'generateFromImage';
    const engineeredPrompt = translations[lang].engineeredPrompts[templateKey];
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: engineeredPrompt },
    ];

    // FIX: Creating ai instance right before API call and using .text property correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
  
  const templateKey = imageType === 'interior' ? 'generateFromKeywordsInterior' : 'generateFromKeywords';
  const template = translations[lang].engineeredPrompts[templateKey];
  const engineeredPrompt = formatPrompt(template, keywords);

  try {
    // FIX: Creating ai instance right before API call and using .text property correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: engineeredPrompt,
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

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
        const template = translations[lang].engineeredPrompts.editWithReference;
        engineeredPrompt = formatPrompt(template, prompt);
    } else {
        const template = translations[lang].engineeredPrompts.editWithoutReference;
        engineeredPrompt = formatPrompt(template, prompt);
    }
    
    parts.push({ text: engineeredPrompt });
    
    try {
        // FIX: Creating ai instance right before API call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  const results: (string | null)[] = [];
  const base64_1 = await ensureBase64(image1);
  const base64_2 = await ensureBase64(image2);

  for (let i = 0; i < count; i++) {
    const parts: any[] = [
      { inlineData: { data: base64_1, mimeType: image1.mimeType } },
      { inlineData: { data: base64_2, mimeType: image2.mimeType } },
      { text: prompt },
    ];

    try {
      // FIX: Creating ai instance right before API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });
      results.push(extractBase64Image(response));
    } catch (error) {
      console.error(`Failed to generate merged image ${i + 1}/${count}:`, error);
    }
  }
  return results.filter((result): result is string => result !== null);
};

export const placeAndRenderFurniture = async (
  bgImage: SourceImage,
  placements: { image: SourceImage; transform: ObjectTransform }[],
  count: number = 2,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
  if (placements.length === 0) return [];

  const bgBase64 = await ensureBase64(bgImage);
  const placementParts = await Promise.all(placements.map(async p => ({
      inlineData: { data: await ensureBase64(p.image), mimeType: p.image.mimeType }
  })));

  const simplifiedPlacements = placements.map(({ transform }) => ({
    pos: { x: transform.x.toFixed(2), y: transform.y.toFixed(2) },
    scale: transform.scale.toFixed(2),
    rotation: transform.rotation.toFixed(0),
    orientation: {
        flip_horizontal: transform.flipHorizontal,
        flip_vertical: transform.flipVertical,
    }
  }));

  const template = translations[lang].engineeredPrompts.placeAndRenderFurniture;
  const engineeredPrompt = formatPrompt(template, JSON.stringify(simplifiedPlacements, null, 2));

  const results: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    const parts: any[] = [
        { inlineData: { data: bgBase64, mimeType: bgImage.mimeType } },
        ...placementParts,
        { text: engineeredPrompt },
    ];
    
    try {
        // FIX: Creating ai instance right before API call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
        });
        results.push(extractBase64Image(response));
    } catch (error) {
        console.error(`Failed to generate canva image ${i + 1}/${count}:`, error);
    }
  }
  return results.filter((result): result is string => result !== null);
};

export const analyzeCharacterImage = async (
    characterImage: SourceImage,
    lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

    try {
        const base64 = await ensureBase64(characterImage);
        const engineeredPrompt = translations[lang].engineeredPrompts.analyzeCharacterPrompt;
        const parts: any[] = [
            { inlineData: { data: base64, mimeType: characterImage.mimeType } },
            { text: engineeredPrompt },
        ];
        // FIX: Creating ai instance right before API call and using .text property correctly
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
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
    if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

    try {
        const base64 = await ensureBase64(areaImage);
        const engineeredPrompt = translations[lang].engineeredPrompts.analyzeAreaPrompt;
        const parts: any[] = [
            { inlineData: { data: base64, mimeType: areaImage.mimeType } },
            { text: engineeredPrompt },
        ];
        // FIX: Creating ai instance right before API call and using .text property correctly
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
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
    if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

    try {
        const base64 = await ensureBase64(sourceImage);
        const template = translations[lang].engineeredPrompts.generateArchitecturalPrompts;
        const engineeredPrompt = formatPrompt(template, characterDescription);
        const parts: any[] = [
            { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
            { text: engineeredPrompt },
        ];

        // FIX: Creating ai instance right before API call and using .text property correctly
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  try {
    const base64 = await ensureBase64(sourceImage);
    const engineeredPrompt = translations[lang].engineeredPrompts.generateFromPlan;
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: engineeredPrompt },
    ];
    // FIX: Creating ai instance right before API call and using .text property correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  const results: (string | null)[] = [];
  const sourceBase64 = await ensureBase64(sourceImage);

  for (let i = 0; i < imageCount; i++) {
    const parts: any[] = [
      { inlineData: { data: sourceBase64, mimeType: sourceImage.mimeType } },
    ];

    let engineeredPrompt: string;
    if (referenceImage) {
      const refBase64 = await ensureBase64(referenceImage);
      parts.push({ inlineData: { data: refBase64, mimeType: referenceImage.mimeType } });
      const template = translations[lang].engineeredPrompts.generateMoodboardWithReference;
      engineeredPrompt = formatPrompt(template, userPrompt);
    } else {
      const template = translations[lang].engineeredPrompts.generateMoodboard;
      engineeredPrompt = formatPrompt(template, userPrompt);
    }

    parts.push({ text: engineeredPrompt });
    
    try {
      // FIX: Creating ai instance right before API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });
      results.push(extractBase64Image(response));
    } catch (error) {
      console.error(`Failed to generate moodboard ${i + 1}/${imageCount}:`, error);
    }
  }
  return results.filter((result): result is string => result !== null);
};

export const applyLighting = async (
  sourceImage: SourceImage,
  lightingPrompt: string,
  imageCount: number,
  lang: 'vi' | 'en' = 'vi'
): Promise<string[]> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");

  const results: (string | null)[] = [];
  const base64 = await ensureBase64(sourceImage);
  const template = translations[lang].engineeredPrompts.applyLighting;
  const engineeredPrompt = formatPrompt(template, lightingPrompt);

  for (let i = 0; i < imageCount; i++) {
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: engineeredPrompt }
    ];
    
    try {
      // FIX: Creating ai instance right before API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });
      results.push(extractBase64Image(response));
    } catch (error) {
      console.error(`Failed to generate lighting image ${i + 1}/${imageCount}:`, error);
    }
  }
  return results.filter((result): result is string => result !== null);
};

export const generateVideoScriptPrompt = async (
  sourceImage: SourceImage,
  userPrompt: string,
  lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
  
  try {
    const base64 = await ensureBase64(sourceImage);
    const engineeredPrompt = `hãy đóng vai một đạo diễn chuyên về quay phim kiến trúc,nội thất với hơn 20 năm kinh nghiệm và một chuyên gia viết promt chuyển từ ảnh thành video ngắn cho các ai kling và veo 3, bạn có kinh nghiệm về các góc camera, chuyển động của ánh sáng, bố cục và dựa vào tài liệu hàng đầu về nhiếp ảnh kiến trúc, nội thất. Khi tôi tải ảnh lên + yêu cầu bằng tiếng việt bạn hãy đựa vào đó viết promt tạo chuyển động cho ảnh theo chỉ định bằng tiếng anh, chỉ hiện promt ko hiện phân tích. Yêu cầu của người dùng là: "${userPrompt}"`;
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: engineeredPrompt },
    ];

    // FIX: Creating ai instance right before API call and using .text property correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
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
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
  
  const targetAspectRatio = parseAspectRatio(targetAspectRatioLabel);
  const paddedImage = await padImageToAspectRatioWithColor(sourceImage, targetAspectRatio, '#FF00FF');
  const base64 = await ensureBase64(paddedImage);
  
  const results: (string | null)[] = [];
  const engineeredPrompt = translations[lang].engineeredPrompts.extendView;

  for (let i = 0; i < imageCount; i++) {
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: paddedImage.mimeType } },
      { text: engineeredPrompt }
    ];
    
    try {
      // FIX: Creating ai instance right before API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });
      results.push(extractBase64Image(response));
    } catch (error) {
      console.error(`Failed to generate extended view image ${i + 1}/${imageCount}:`, error);
    }
  }
  return results.filter((result): result is string => result !== null);
};

export const generateStyleChangePrompt = async (
  sourceImage: SourceImage,
  userPrompt: string,
  lang: 'vi' | 'en' = 'vi'
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
  
  try {
    const base64 = await ensureBase64(sourceImage);
    const template = translations[lang].engineeredPrompts.changeStylePrompt;
    const engineeredPrompt = formatPrompt(template, userPrompt);
    const parts: any[] = [
      { inlineData: { data: base64, mimeType: sourceImage.mimeType } },
      { text: engineeredPrompt },
    ];

    // FIX: Creating ai instance right before API call and using .text property correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate style change prompt:", error);
    throw new Error("Could not generate style change prompt.");
  }
};