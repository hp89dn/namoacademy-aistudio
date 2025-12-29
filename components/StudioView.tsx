
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as cloud from '../services/firebaseService';

import type { SourceImage, ActiveTab, AspectRatio, EditSubMode, ImageSize, Project, Version, ObjectTransform, Utility } from '../types';
import { 
    generateImages, editImage, mergeImages, placeAndRenderFurniture, 
    generateMoodboard, applyLighting, generateVideoScriptPrompt, 
    extendView, generateStyleChangePrompt, analyzeCharacterImage, generateArchitecturalPrompts,
    classifyImageType, generateVideo
} from '../services/geminiService';
import { sourceImageToDataUrl, dataUrlToSourceImage, compositeImage } from '../utils';
import { useLibrary } from '../hooks/useLibrary';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

import { Header } from './Header';
import { ControlPanel } from './ControlPanel';
import { GalleryPanel } from './GalleryPanel';
import { LibraryView } from './LibraryView';
import { UtilitiesView } from './UtilitiesView';
import { ToolSelectionScreen } from './ToolSelectionScreen';
import { Icon } from './icons';

const FullscreenViewer = lazy(() => import('./FullscreenViewer').then(m => ({ default: m.FullscreenViewer })));

interface StudioViewProps {
    user: any;
    projectId: string;
    initialTab?: ActiveTab;
    initialUtility?: any;
    initialSourceImage?: SourceImage | null;
    onLogout: () => void;
    onBack: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ 
    user, projectId, initialTab = 'create', initialUtility, initialSourceImage, onLogout, onBack 
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectVersions, setProjectVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [activeUtility, setActiveUtility] = useState<Utility | null>(initialUtility || null);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [hasChosenTool, setHasChosenTool] = useState(initialTab !== 'create' || initialSourceImage !== null);
  
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(initialSourceImage || null);
  const [sourceImage2, setSourceImage2] = useState<SourceImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<SourceImage | null>(null);
  const [editReferenceImage, setEditReferenceImage] = useState<SourceImage | null>(null);
  const [characterImage, setCharacterImage] = useState<SourceImage | null>(null);
  const [maskImage, setMaskImage] = useState<SourceImage | null>(null);
  const [annotatedImage, setAnnotatedImage] = useState<SourceImage | null>(null);
  const [prompt, setPrompt] = useState(t('promptInitial'));
  const [negativePrompt, setNegativePrompt] = useState(t('defaultNegativePrompt'));
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [isProMode, setIsProMode] = useState(false);
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [editSubMode, setEditSubMode] = useState<EditSubMode>('inpaint');
  const [planTo3dMode, setPlanTo3dMode] = useState<'render' | 'colorize'>('render');
  const [editTool, setEditTool] = useState<'lasso' | 'brush'>('lasso');
  const [brushSize, setBrushSize] = useState(30);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const aiModel = useMemo(() => {
    return isProMode ? 'gemini-3-pro-preview' : 'gemini-2.5-flash-image';
  }, [isProMode]);

  const [canvaObjects, setCanvaObjects] = useState<SourceImage[]>([]);
  const [canvaObjectTransforms, setCanvaObjectTransforms] = useState<ObjectTransform[]>([]);
  const [selectedCanvaObjectIndex, setSelectedCanvaObjectIndex] = useState<number | null>(null);
  const [isCanvaLayoutLocked, setIsCanvaLayoutLocked] = useState(false);

  const [moodboardSourceImage, setMoodboardSourceImage] = useState<SourceImage | null>(null);
  const [moodboardReferenceImage, setMoodboardReferenceImage] = useState<SourceImage | null>(null);
  const [moodboardPrompt, setMoodboardPrompt] = useState('');
  const [moodboardImageCount, setMoodboardImageCount] = useState(1);
  const [moodboardGeneratedImages, setMoodboardGeneratedImages] = useState<string[]>([]);
  const [moodboardSelectedImage, setMoodboardSelectedImage] = useState<string | null>(null);

  const [lightingSourceImage, setLightingSourceImage] = useState<SourceImage | null>(null);
  const [lightingSelectedPrompts, setLightingSelectedPrompts] = useState({ interior: '', exterior: '' });
  const [lightingImageCount, setLightingImageCount] = useState(1);
  const [lightingGeneratedImages, setLightingGeneratedImages] = useState<string[]>([]);
  const [lightingSelectedImage, setLightingSelectedImage] = useState<string | null>(null);

  const [virtualTourSourceImage, setVirtualTourSourceImage] = useState<SourceImage | null>(null);
  const [virtualTourHistory, setVirtualTourHistory] = useState<string[]>([]);
  const [virtualTourIndex, setVirtualTourIndex] = useState(-1);

  const [videoPromptSourceImage, setVideoPromptSourceImage] = useState<SourceImage | null>(null);
  const [videoPromptUserPrompt, setVideoPromptUserPrompt] = useState('');
  const [videoPromptGeneratedPrompt, setVideoPromptGeneratedPrompt] = useState<string | null>(null);

  const [extendViewSourceImage, setExtendViewSourceImage] = useState<SourceImage | null>(null);
  const [extendViewAspectRatio, setExtendViewAspectRatio] = useState<AspectRatio>('16:9');
  const [extendViewImageCount, setExtendViewImageCount] = useState(1);
  const [extendViewGeneratedImages, setExtendViewGeneratedImages] = useState<string[]>([]);
  const [extendViewSelectedImage, setExtendViewSelectedImage] = useState<string | null>(null);

  const [changeStyleSourceImage, setChangeStyleSourceImage] = useState<SourceImage | null>(null);
  const [changeStyleUserPrompt, setChangeStyleUserPrompt] = useState('');
  const [changeStyleGeneratedPrompt, setChangeStyleGeneratedPrompt] = useState<string | null>(null);
  const [changeStyleImageCount, setChangeStyleImageCount] = useState(1);
  const [changeStyleGeneratedImages, setChangeStyleGeneratedImages] = useState<string[]>([]);
  const [changeStyleSelectedImage, setChangeStyleSelectedImage] = useState<string | null>(null);

  const [editorBetaSource, setEditorBetaSource] = useState<SourceImage | null>(null);
  const [editorBetaReference, setEditorBetaReference] = useState<SourceImage | null>(null);
  const [editorBetaSelection, setEditorBetaSelection] = useState<{ box: any; mask: SourceImage } | null>(null);
  const [editorBetaPrompt, setEditorBetaPrompt] = useState('');
  const [editorBetaIntermediateResult, setEditorBetaIntermediateResult] = useState<SourceImage | null>(null);
  const [editorBetaFinalResult, setEditorBetaFinalResult] = useState<SourceImage | null>(null);
  const [editorBetaExpansion, setEditorBetaExpansion] = useState(10);
  const [editorBetaEdgeBlend, setEditorBetaEdgeBlend] = useState(5);

  const { library, addImageToLibrary, removeImageFromLibrary, justSavedId } = useLibrary();

  const areaSelectorRef = useRef<{ clear: () => void }>(null);
  const lassoEditorRef = useRef<{ clear: () => void }>(null);
  const brushEditorRef = useRef<{ clear: () => void }>(null);

  useEffect(() => {
    const loadData = async () => {
        if (!projectId || !user) return;
        try {
            const allProjects = await cloud.fetchUserProjects(user.uid);
            const project = allProjects.find(p => p.id === projectId);
            if (!project) {
                onBack();
                return;
            }
            setCurrentProject(project);
            const versions = await cloud.fetchProjectVersions(project.id);
            setProjectVersions(versions);
            
            if (initialSourceImage) {
                setSourceImage(initialSourceImage);
                setHasChosenTool(true);
            } else if (versions.length > 0) {
                const latest = versions[versions.length - 1];
                setCurrentVersion(latest);
                setGeneratedImages([latest.image]);
                setSelectedImage(latest.image);
                setPrompt(latest.prompt);
                setSourceImage({ url: latest.image, mimeType: 'image/png' });
            } else if (project.baseImage) {
                setSourceImage(project.baseImage);
            }
        } catch (err) {
            console.error("Load studio data error:", err);
        }
    };
    loadData();
  }, [projectId, user, onBack, initialSourceImage]);

  const handleToggleProMode = async () => {
      if (!isProMode) {
          if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
              await window.aistudio.openSelectKey();
          }
      }
      setIsProMode(!isProMode);
  };

  const handleSelectVersion = useCallback((version: Version | { id: string, image: string, prompt: string, isBase: boolean }) => {
    if ('isBase' in version && version.isBase) {
        setCurrentVersion(null);
        setGeneratedImages([]);
        setSelectedImage(null);
        setPrompt(t('promptInitial'));
        if (currentProject?.baseImage) {
            setSourceImage(currentProject.baseImage);
        }
        return;
    }
    
    const v = version as Version;
    setCurrentVersion(v);
    setGeneratedImages([v.image]);
    setSelectedImage(v.image);
    setPrompt(v.prompt);
    setSourceImage({ url: v.image, mimeType: 'image/png' });
  }, [currentProject, t]);

  // Keyboard navigation for Timeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
        
        if (isTyping || !currentProject || projectVersions.length === 0) return;

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const currentIndex = currentVersion 
                ? projectVersions.findIndex(v => v.id === currentVersion.id) 
                : -1;

            if (e.key === 'ArrowLeft') {
                if (currentIndex === 0) {
                    handleSelectVersion({ id: 'base', image: sourceImageToDataUrl(currentProject.baseImage!), prompt: t('promptInitial'), isBase: true });
                } else if (currentIndex > 0) {
                    handleSelectVersion(projectVersions[currentIndex - 1]);
                }
            } else if (e.key === 'ArrowRight') {
                if (currentIndex === -1) {
                    handleSelectVersion(projectVersions[0]);
                } else if (currentIndex < projectVersions.length - 1) {
                    handleSelectVersion(projectVersions[currentIndex + 1]);
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject, projectVersions, currentVersion, handleSelectVersion, t]);

  const addNewVersion = useCallback(async (image: string, usedPrompt: string) => {
    if (!currentProject) return;
    try {
        const version: Omit<Version, 'id'> = {
            projectId: currentProject.id,
            parentId: currentVersion?.id || null,
            tab: activeTab,
            image,
            prompt: usedPrompt,
            metadata: {},
            createdAt: Date.now(),
        };
        const savedVersion = await cloud.saveVersionToCloud(version);
        setProjectVersions(prev => [...prev, savedVersion]);
        setCurrentVersion(savedVersion);
        return savedVersion;
    } catch (err) {
        console.error("Cloud save version error:", err);
    }
  }, [currentProject, currentVersion, activeTab]);

  const handleSourceImageUpload = useCallback(async (img: SourceImage) => {
    setSourceImage(img);
    setSelectedImage(null);
    setGeneratedImages([]);
    setMaskImage(null);
    setAnnotatedImage(null);
    areaSelectorRef.current?.clear();
    lassoEditorRef.current?.clear();
    brushEditorRef.current?.clear();
  }, []);

  useEffect(() => {
    if (activeTab === 'create') setPrompt(t('promptInitial'));
    else if (activeTab === 'interior') setPrompt(t('promptInterior'));
    else if (activeTab === 'cameraAngle') setPrompt("");
  }, [activeTab, t]);

  const handleGeneration = useCallback(async () => {
    if (!currentProject) return;
    
    if ((isProMode || activeTab === 'video') && window.aistudio) {
        if (!(await window.aistudio.hasSelectedApiKey())) {
            await window.aistudio.openSelectKey();
        }
    }

    setIsLoading(true);
    setLoadingMessage(t('loadingStart'));

    try {
        let results: string[] = [];
        if (activeTab === 'create' || activeTab === 'interior' || activeTab === 'cameraAngle') {
            const inputImage = activeTab === 'cameraAngle' && annotatedImage ? annotatedImage : sourceImage;
            results = await generateImages(inputImage, prompt, imageCount, referenceImage, aspectRatio, language, negativePrompt, aiModel, imageSize);
        } else if (activeTab === 'edit') {
            if (editSubMode === 'inpaint') {
                if (!maskImage) { alert(t('alertDrawMask')); setIsLoading(false); return; }
                results = await editImage(sourceImage!, maskImage, prompt, imageCount, editReferenceImage, language);
            } else {
                if (!sourceImage2) { alert(t('alertUploadBothImages')); setIsLoading(false); return; }
                results = await mergeImages(sourceImage!, sourceImage2, prompt, imageCount);
            }
        } else if (activeTab === 'planTo3d') {
            results = await generateImages(sourceImage, prompt, imageCount, referenceImage, 'auto', language, negativePrompt, aiModel);
        } else if (activeTab === 'canva') {
            results = await placeAndRenderFurniture(sourceImage!, canvaObjects.map((obj, i) => ({ image: obj, transform: canvaObjectTransforms[i] })), imageCount, language);
        } else if (activeTab === 'prompt') {
            if (!sourceImage) { alert(t('alertUploadSource')); setIsLoading(false); return; }
            setLoadingMessage(t('loadingAnalyzePrompts'));
            let charDesc = "";
            if (characterImage) {
                charDesc = await analyzeCharacterImage(characterImage, language);
            }
            const promptsResult = await generateArchitecturalPrompts(sourceImage, language, charDesc);
            alert(t('promptArchitecturalGenerated'));
            setIsLoading(false);
            return;
        } else if (activeTab === 'video') {
            if (!sourceImage) { alert(t('alertUploadSource')); setIsLoading(false); return; }
            setLoadingMessage(t('loadingVideoHeader'));
            const videoUrl = await generateVideo(sourceImage, prompt, 'veo-3.1-fast-generate-preview', (msg) => {
                setLoadingMessage(msg);
            });
            results = [videoUrl];
        }

        if (results.length > 0) {
            setGeneratedImages(results);
            setSelectedImage(results[0]);
            
            for (const img of results) {
                await addNewVersion(img, prompt);
            }
            
            if (isSelectingArea) setIsSelectingArea(false);
        } else {
            alert(t('alertImageGenFailed'));
        }
    } catch (error: any) {
        console.error("Generation failed:", error);
        if (error?.message?.includes("Requested entity was not found")) {
            if (window.aistudio) await window.aistudio.openSelectKey();
        }
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentProject, sourceImage, referenceImage, annotatedImage, prompt, imageCount, aspectRatio, language, negativePrompt, aiModel, imageSize, activeTab, editSubMode, maskImage, sourceImage2, canvaObjects, canvaObjectTransforms, characterImage, addNewVersion, t, isProMode, isSelectingArea]);

  const handleMoodboardGeneration = useCallback(async () => {
    if (!moodboardSourceImage || !moodboardPrompt) return;
    setIsLoading(true);
    setLoadingMessage(t('generatingMoodboard'));
    try {
        const results = await generateMoodboard(moodboardSourceImage, moodboardPrompt, moodboardReferenceImage, moodboardImageCount, language);
        setMoodboardGeneratedImages(results);
        if (results.length > 0) setMoodboardSelectedImage(results[0]);
    } catch (err) {
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
    }
  }, [moodboardSourceImage, moodboardPrompt, moodboardReferenceImage, moodboardImageCount, language, t]);

  const handleLightingGeneration = useCallback(async () => {
    const lPrompt = lightingSelectedPrompts.interior || lightingSelectedPrompts.exterior;
    if (!lightingSourceImage || !lPrompt) return;
    setIsLoading(true);
    setLoadingMessage(t('generatingLighting'));
    try {
        const results = await applyLighting(lightingSourceImage, lPrompt, lightingImageCount, language);
        setLightingGeneratedImages(results);
        if (results.length > 0) setLightingSelectedImage(results[0]);
    } catch (err) {
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
    }
  }, [lightingSourceImage, lightingSelectedPrompts, lightingImageCount, language, t]);

  const handleExtendViewGeneration = useCallback(async () => {
    if (!extendViewSourceImage) return;
    setIsLoading(true);
    setLoadingMessage(t('generatingExtendedView'));
    try {
        const results = await extendView(extendViewSourceImage, extendViewAspectRatio, extendViewImageCount, language);
        setExtendViewGeneratedImages(results);
        if (results.length > 0) setExtendViewSelectedImage(results[0]);
    } catch (err) {
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
    }
  }, [extendViewSourceImage, extendViewAspectRatio, extendViewImageCount, language, t]);

  const handleStylePromptGeneration = useCallback(async () => {
    if (!changeStyleSourceImage || !changeStyleUserPrompt) return;
    setIsLoading(true);
    setLoadingMessage(t('generatingStylePrompt'));
    try {
        const result = await generateStyleChangePrompt(changeStyleSourceImage, changeStyleUserPrompt, language);
        setChangeStyleGeneratedPrompt(result);
    } catch (err) {
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
    }
  }, [changeStyleSourceImage, changeStyleUserPrompt, language, t]);

  const handleStyleImageGeneration = useCallback(async () => {
    if (!changeStyleSourceImage || !changeStyleGeneratedPrompt) return;
    setIsLoading(true);
    setLoadingMessage(t('generatingStyledImages'));
    try {
        const results = await generateImages(changeStyleSourceImage, changeStyleGeneratedPrompt, changeStyleImageCount, null, 'auto', language, '', aiModel);
        setChangeStyleGeneratedImages(results);
        if (results.length > 0) setChangeStyleSelectedImage(results[0]);
    } catch (err) {
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
    }
  }, [changeStyleSourceImage, changeStyleGeneratedPrompt, changeStyleImageCount, language, aiModel, t]);

  const handleEditorBetaGeneration = useCallback(async () => {
      if (!editorBetaSource || !editorBetaSelection) return;
      setIsLoading(true);
      setLoadingMessage(t('generating'));
      try {
          const results = await editImage(editorBetaSource, editorBetaSelection.mask, editorBetaPrompt, 1, editorBetaReference, language);
          if (results.length > 0) {
              const resImage = dataUrlToSourceImage(results[0]);
              setEditorBetaIntermediateResult(resImage);
              const options = { expansion: editorBetaExpansion, edgeBlend: editorBetaEdgeBlend };
              const final = await compositeImage(editorBetaSource, resImage!, editorBetaSelection.box, editorBetaSelection.mask, options);
              setEditorBetaFinalResult(final);
          }
      } catch (err) {
          alert(t('alertGenerationFailed'));
      } finally {
          setIsLoading(false);
      }
  }, [editorBetaSource, editorBetaSelection, editorBetaPrompt, editorBetaReference, editorBetaExpansion, editorBetaEdgeBlend, language, t]);

  const handleSetFinalAsSource = useCallback(() => {
    if (editorBetaFinalResult) {
        setEditorBetaSource(editorBetaFinalResult);
        setEditorBetaIntermediateResult(null);
        setEditorBetaFinalResult(null);
        setEditorBetaSelection(null);
    }
  }, [editorBetaFinalResult]);

  const handleUseEditorImageInCreate = useCallback((image: SourceImage) => {
    setSourceImage(image);
    setActiveTab('create');
    setHasChosenTool(true);
  }, []);

  const handleImageFromLibrary = useCallback((data: string) => {
    const img = dataUrlToSourceImage(data);
    if (img) {
      setSourceImage(img);
      setActiveTab('create');
      setHasChosenTool(true);
    }
  }, []);

  const handleImageAsSourceFromGallery = useCallback((data: string) => {
    const img = dataUrlToSourceImage(data);
    if (img) {
        handleSourceImageUpload(img);
    }
  }, [handleSourceImageUpload]);

  const handleVirtualTourImageUpload = useCallback((img: SourceImage | null) => {
    setVirtualTourSourceImage(img);
    if (img) {
      const url = sourceImageToDataUrl(img);
      setVirtualTourHistory([url]);
      setVirtualTourIndex(0);
    } else {
      setVirtualTourHistory([]);
      setVirtualTourIndex(-1);
    }
  }, []);

  const handleVirtualTourNavigation = useCallback(async (navPrompt: string) => {
    if (virtualTourIndex < 0 || virtualTourHistory.length === 0) return;
    const currentImg = virtualTourHistory[virtualTourIndex];
    setIsLoading(true);
    setLoadingMessage(t('generating'));
    try {
        const source = dataUrlToSourceImage(currentImg);
        const results = await generateImages(source, navPrompt, 1, null, 'auto', language, '', aiModel);
        if (results.length > 0) {
            const nextHistory = virtualTourHistory.slice(0, virtualTourIndex + 1);
            setVirtualTourHistory([...nextHistory, results[0]]);
            setVirtualTourIndex(nextHistory.length);
        }
    } catch (err) {
        alert(t('alertTourFailed'));
    } finally {
        setIsLoading(false);
    }
  }, [virtualTourIndex, virtualTourHistory, language, aiModel, t]);

  const handleUndo = useCallback(() => setVirtualTourIndex(i => Math.max(0, i - 1)), []);
  const handleRedo = useCallback(() => setVirtualTourIndex(i => Math.min(virtualTourHistory.length - 1, i + 1)), [virtualTourHistory.length]);
  const handleVirtualTourHistorySelect = useCallback((idx: number) => setVirtualTourIndex(idx), []);

  const handleSelectToolFromBox = (tab: ActiveTab, utility?: any, customInitialImage?: SourceImage) => {
    setActiveTab(tab);
    if (tab === 'utilities') {
        setActiveUtility(utility as Utility);
    } else {
        setActiveUtility(null);
    }
    setHasChosenTool(true);
    if (customInitialImage) {
        setSourceImage(customInitialImage);
        setSelectedImage(null);
        setGeneratedImages([]);

        const isBase = currentProject?.baseImage && (
            (customInitialImage.url && customInitialImage.url === currentProject.baseImage.url) ||
            (customInitialImage.base64 && customInitialImage.base64 === currentProject.baseImage.base64)
        );

        if (isBase) {
            setCurrentVersion(null);
        } else {
            const matchingVersion = projectVersions.find(v => v.image === customInitialImage.url || (v.image.startsWith('data:') && customInitialImage.base64 && v.image.includes(customInitialImage.base64)));
            if (matchingVersion) {
                setCurrentVersion(matchingVersion);
                setSelectedImage(matchingVersion.image);
                setGeneratedImages([matchingVersion.image]);
            } else {
                setCurrentVersion({ id: 'temp', image: sourceImageToDataUrl(customInitialImage), prompt: '', metadata: {}, createdAt: Date.now(), projectId: projectId, parentId: null, tab: tab } as Version);
            }
        }
    }
    setIsToolboxOpen(false);
  };

  const isEditView = activeTab === 'edit' || activeTab === 'editorBeta';

  return (
    <div className={`flex flex-col h-screen ${theme.appBg} ${theme.textMain} transition-colors duration-300 font-sans overflow-hidden`}>
        <header className={`h-16 px-6 flex items-center justify-between border-b ${theme.border} ${theme.navBg} backdrop-blur-md z-30 flex-shrink-0`}>
            <div className="flex items-center gap-4 lg:gap-6">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-orange-500 transition-colors" title="Quay lại dự án">
                    <Icon name="arrow-uturn-left" className="w-5 h-5" />
                </button>
                
                <div className="h-8 w-px bg-zinc-800 mx-1 hidden sm:block"></div>

                <div className="hidden md:flex flex-col ml-2">
                    <h1 className="text-sm font-black tracking-tighter uppercase leading-none truncate max-w-[150px]">{currentProject?.name || 'Studio'}</h1>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Project Workspace</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {!isEditView && <Header />}
                <button 
                    onClick={() => setIsToolboxOpen(true)}
                    className="flex items-center gap-2.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all shadow-lg shadow-orange-900/20 active:scale-95 group"
                >
                    <Icon name="sparkles" className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('toolLabel')}</span>
                </button>
            </div>
        </header>

        <main className="flex-grow flex overflow-hidden">
            {hasChosenTool && activeTab !== 'utilities' && activeTab !== 'library' && (
                <aside className={`w-80 border-r ${theme.border} ${theme.panelBg} overflow-y-auto thin-scrollbar z-20 flex-shrink-0 animate-slide-in-left`}>
                    <div className="p-6">
                    <ControlPanel 
                            activeTab={activeTab}
                            handleGeneration={handleGeneration}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            loadingMessage={loadingMessage}
                            setLoadingMessage={setLoadingMessage}
                            sourceImage={sourceImage}
                            setSourceImage={setSourceImage}
                            sourceImage2={sourceImage2}
                            setSourceImage2={setSourceImage2}
                            referenceImage={referenceImage}
                            setReferenceImage={setReferenceImage}
                            editReferenceImage={editReferenceImage}
                            setEditReferenceImage={setEditReferenceImage}
                            characterImage={characterImage}
                            setCharacterImage={setCharacterImage}
                            prompt={prompt}
                            setPrompt={setPrompt}
                            negativePrompt={negativePrompt}
                            setNegativePrompt={setNegativePrompt}
                            imageCount={imageCount}
                            setImageCount={setImageCount}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            imageSize={imageSize}
                            setImageSize={setImageSize}
                            isProMode={isProMode}
                            handleToggleProMode={handleToggleProMode}
                            handleSourceImageUpload={handleSourceImageUpload}
                            editSubMode={editSubMode}
                            setEditSubMode={setEditSubMode}
                            planTo3dMode={planTo3dMode}
                            setPlanTo3dMode={setPlanTo3dMode}
                            editTool={editTool}
                            setEditTool={setEditTool}
                            brushSize={brushSize}
                            setBrushSize={setBrushSize}
                            isSelectingArea={isSelectingArea}
                            setIsSelectingArea={setIsSelectingArea}
                            areaSelectorRef={areaSelectorRef}
                            lassoEditorRef={lassoEditorRef}
                            brushEditorRef={brushEditorRef}
                            setMaskImage={setMaskImage}
                            canvaObjects={canvaObjects}
                            setCanvaObjects={setCanvaObjects}
                            canvaObjectTransforms={canvaObjectTransforms}
                            setCanvaObjectTransforms={setCanvaObjectTransforms}
                            selectedCanvaObjectIndex={selectedCanvaObjectIndex}
                            setSelectedCanvaObjectIndex={setSelectedCanvaObjectIndex}
                            isCanvaLayoutLocked={isCanvaLayoutLocked}
                            setIsCanvaLayoutLocked={setIsCanvaLayoutLocked}
                            setGeneratedImages={setGeneratedImages}
                            setSelectedImage={setSelectedImage}
                            addNewVersion={addNewVersion}
                            aiModel={aiModel}
                    />
                    </div>
                </aside>
            )}

            <div className="flex-grow relative flex flex-col min-w-0">
                <div className="flex-grow overflow-y-auto p-8 lg:p-12 thin-scrollbar">
                    {activeTab === 'library' ? (
                        <LibraryView 
                            images={library} 
                            onDelete={removeImageFromLibrary} 
                            onUseAsSource={handleImageFromLibrary} 
                            onFullscreen={setFullscreenImage}
                            justSavedId={justSavedId}
                        />
                    ) : activeTab === 'utilities' ? (
                        <UtilitiesView 
                            {...{
                                moodboardSourceImage, setMoodboardSourceImage,
                                moodboardReferenceImage, setMoodboardReferenceImage,
                                moodboardPrompt, setMoodboardPrompt,
                                moodboardImageCount, setMoodboardImageCount,
                                moodboardGeneratedImages, moodboardSelectedImage,
                                setMoodboardSelectedImage, handleMoodboardGeneration,
                                lightingSourceImage, setLightingSourceImage,
                                lightingSelectedPrompts, setLightingSelectedPrompts,
                                lightingImageCount, setLightingImageCount,
                                lightingGeneratedImages, lightingSelectedImage,
                                setLightingSelectedImage, handleLightingGeneration,
                                extendViewSourceImage, setExtendViewSourceImage,
                                extendViewAspectRatio, setExtendViewAspectRatio,
                                extendViewImageCount, setExtendViewImageCount,
                                extendViewGeneratedImages, extendViewSelectedImage,
                                setExtendViewSelectedImage, handleExtendViewGeneration,
                                changeStyleSourceImage, setChangeStyleSourceImage,
                                changeStyleUserPrompt, setChangeStyleUserPrompt,
                                changeStyleGeneratedPrompt, setChangeStyleGeneratedPrompt,
                                changeStyleImageCount, setChangeStyleImageCount,
                                changeStyleGeneratedImages, changeStyleSelectedImage,
                                setChangeStyleSelectedImage, handleStylePromptGeneration, handleStyleImageGeneration,
                                editorBetaSource, setEditorBetaSource,
                                editorBetaReference, setEditorBetaReference,
                                editorBetaSelection, setEditorBetaSelection,
                                editorBetaPrompt, setEditorBetaPrompt,
                                editorBetaIntermediateResult, editorBetaFinalResult,
                                editorBetaExpansion, setEditorBetaExpansion,
                                editorBetaEdgeBlend, setEditorBetaEdgeBlend,
                                handleEditorBetaGeneration, handleSetFinalAsSource,
                                handleUseEditorImageInCreate,
                                handleVirtualTourHistorySelect,
                                virtualTourHistory, virtualTourIndex,
                                isLoading, loadingMessage, setFullscreenImage, sourceImage,
                                handleVirtualTourImageUpload, handleVirtualTourNavigation,
                                handleUndo, handleRedo,
                                setIsLoading, setLoadingMessage, setGeneratedImages, setSelectedImage, addNewVersion,
                                isProMode, handleToggleProMode, aiModel,
                                activeUtility, setActiveUtility
                            }}
                        />
                    ) : (
                        <div className="max-w-6xl mx-auto h-full flex flex-col">
                            {(sourceImage || selectedImage || isLoading) ? (
                                <div className="flex-grow flex items-center justify-center">
                                    <GalleryPanel 
                                        isLoading={isLoading}
                                        loadingMessage={loadingMessage}
                                        activeTab={activeTab}
                                        generatedImages={generatedImages}
                                        selectedImage={selectedImage}
                                        lastUsedPrompt={prompt}
                                        sourceImage={sourceImage}
                                        setSelectedImage={setSelectedImage}
                                        setFullscreenImage={setFullscreenImage}
                                        editSubMode={editSubMode}
                                        editTool={editTool}
                                        brushSize={brushSize}
                                        lassoEditorRef={lassoEditorRef}
                                        brushEditorRef={brushEditorRef}
                                        areaSelectorRef={areaSelectorRef}
                                        isSelectingArea={isSelectingArea}
                                        setMaskImage={setMaskImage}
                                        onAreaSelected={setAnnotatedImage}
                                        onOpenToolbox={() => setIsToolboxOpen(true)}
                                        onSaveToLibrary={addImageToLibrary}
                                        isSaved={!!justSavedId}
                                    />
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30 select-none">
                                    <div className="w-48 h-48 mb-8 relative">
                                        <div className="absolute inset-0 bg-orange-600/10 rounded-full animate-ping"></div>
                                        <div className="relative w-full h-full bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                                            <Icon name="sparkles" className="w-20 h-20 text-orange-600" />
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Workspace Trống</h2>
                                    <p className="max-w-md text-zinc-500 font-bold uppercase tracking-[0.2em] text-sm">
                                        Mở hộp công cụ AI để bắt đầu dự án sáng tạo của bạn
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>

        <div className={`h-24 border-t ${theme.border} ${theme.panelBg} flex items-center px-8 gap-4 overflow-x-auto thin-scrollbar z-30 flex-shrink-0`}>
            <div className="flex-shrink-0 mr-4">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Dòng thời gian</p>
                <p className="text-[10px] text-white font-bold uppercase tracking-widest">{projectVersions.length + (currentProject?.baseImage ? 1 : 0)} phiên bản</p>
            </div>
            
            {currentProject?.baseImage && (
                <div 
                    onClick={() => handleSelectVersion({ id: 'base', image: sourceImageToDataUrl(currentProject.baseImage!), prompt: t('promptInitial'), isBase: true })}
                    className={`w-14 h-14 rounded-xl flex-shrink-0 cursor-pointer overflow-hidden transition-all border-4 relative ${!currentVersion ? 'border-orange-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                >
                    <img src={sourceImageToDataUrl(currentProject.baseImage)} className="w-full h-full object-cover" alt="Original" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[8px] text-white font-black uppercase tracking-tighter">Gốc</span>
                    </div>
                </div>
            )}

            {projectVersions.map((v, i) => (
                <div 
                    key={v.id} 
                    onClick={() => handleSelectVersion(v)}
                    className={`w-14 h-14 rounded-xl flex-shrink-0 cursor-pointer overflow-hidden transition-all border-4 ${currentVersion?.id === v.id ? 'border-orange-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                >
                    {v.image.includes('.mp4') || v.image.startsWith('blob:') ? (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <Icon name="video-camera" className="w-6 h-6 text-orange-500" />
                        </div>
                    ) : (
                        <img src={v.thumbnailUrl || v.image} className="w-full h-full object-cover" alt={`V${i}`} />
                    )}
                </div>
            ))}
        </div>

        {isToolboxOpen && currentProject && (
            <div className="fixed inset-0 z-[100] animate-fade-in overflow-hidden">
                <ToolSelectionScreen 
                    project={currentProject}
                    onSelectTool={handleSelectToolFromBox}
                    onBack={() => setIsToolboxOpen(false)}
                />
            </div>
        )}

        <Suspense fallback={null}>
            {fullscreenImage && (
                <FullscreenViewer 
                    imageUrl={fullscreenImage} 
                    onClose={() => setFullscreenImage(null)} 
                    onSaveAsVersion={(dataUrl) => {
                        return addNewVersion(dataUrl, prompt + " (Edited)");
                    }}
                />
            )}
        </Suspense>
    </div>
  );
};
