
export type EditSubMode = 'inpaint' | 'mergeHouse' | 'mergeMaterial' | 'mergeFurniture';
export type ActiveTab = 'create' | 'interior' | 'cameraAngle' | 'edit' | 'planTo3d' | 'video' | 'canva' | 'prompt' | 'utilities' | 'editorBeta' | 'library';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type ImageSize = '1K' | '2K' | '4K';
export type Utility = 'moodboard' | 'videoPrompt' | 'lighting' | 'virtualTour' | 'extendView' | 'changeStyle';

export interface SourceImage {
  base64?: string;    // Raw base64 string (used during editing/canvas)
  url?: string;       // Public URL to the binary image (PNG/JPG in Cloudflare R2)
  base64Url?: string; // @deprecated: No longer used for storage efficiency
  mimeType: string;
}

export interface Version {
  id: string;
  projectId: string;
  parentId: string | null;
  tab: ActiveTab | string;
  image: string;      // Public URL to the binary image
  thumbnailUrl?: string; // Public URL to the small thumbnail stored in R2
  prompt: string;
  metadata: any;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  baseImage: SourceImage | null;
  createdAt: number;
  lastModified: number;
  userId?: string;
}

export interface HistoryItem {
  id: string;
  tab: ActiveTab | 'utilities';
  sourceImage: SourceImage | null;
  sourceImage2?: SourceImage | null;
  referenceImage: SourceImage | null;
  prompt: string;
  negativePrompt?: string;
  imageCount: number;
  generatedImages: string[];
  generatedPrompts?: string | null;
  videoModel?: string;
}

export interface LibraryItem {
  id: string;
  imageData: string;
}

export interface ObjectTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}