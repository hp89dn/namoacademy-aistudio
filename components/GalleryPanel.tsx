
import React, { useState } from 'react';
import { Icon } from './icons';
import type { ActiveTab, SourceImage, EditSubMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { sourceImageToDataUrl } from '../utils';
import { ImageEditor } from './ImageEditor';
import { BrushEditor } from './BrushEditor';
import { AreaSelector } from './ArrowEditor';

interface GalleryPanelProps {
    isLoading: boolean;
    loadingMessage: string;
    activeTab: ActiveTab;
    generatedImages: string[];
    selectedImage: string | null;
    lastUsedPrompt: string;
    sourceImage: SourceImage | null;
    setSelectedImage: (image: string) => void;
    setFullscreenImage: (url: string | null) => void;
    editSubMode?: EditSubMode;
    editTool?: 'lasso' | 'brush';
    brushSize?: number;
    lassoEditorRef?: React.RefObject<{ clear: () => void } | null>;
    brushEditorRef?: React.RefObject<{ clear: () => void } | null>;
    areaSelectorRef?: React.RefObject<{ clear: () => void } | null>;
    isSelectingArea?: boolean;
    setMaskImage?: (mask: SourceImage | null) => void;
    onAreaSelected?: (annotatedImage: SourceImage | null) => void;
    onOpenToolbox?: () => void;
    onSaveToLibrary?: (image: string) => void;
    isSaved?: boolean;
}

export const GalleryPanel: React.FC<GalleryPanelProps> = ({
    isLoading, loadingMessage, activeTab, generatedImages, selectedImage, lastUsedPrompt, sourceImage,
    setSelectedImage, setFullscreenImage,
    editSubMode, editTool, brushSize, lassoEditorRef, brushEditorRef, areaSelectorRef, isSelectingArea, setMaskImage, onAreaSelected,
    onOpenToolbox, onSaveToLibrary, isSaved
}) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [isPromptHidden, setIsPromptHidden] = useState(false);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center animate-pulse">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-orange-900/20">
            <Icon name="camera" className="w-10 h-10 text-orange-600 animate-spin-slow" />
          </div>
          <h3 className="text-xl font-black text-slate-100 tracking-tight uppercase">{loadingMessage || t('generating')}</h3>
        </div>
      );
    }

    const isEditingInpaint = activeTab === 'edit' && editSubMode === 'inpaint' && sourceImage;
    const isSelectingCameraArea = activeTab === 'cameraAngle' && isSelectingArea && sourceImage;

    const displayImg = (isEditingInpaint || isSelectingCameraArea) 
        ? (sourceImage ? sourceImageToDataUrl(sourceImage) : null)
        : (selectedImage || (sourceImage ? sourceImageToDataUrl(sourceImage) : null));

    const isVideo = displayImg?.includes('.mp4') || displayImg?.startsWith('blob:');

    const shouldShowGallery = displayImg || isEditingInpaint || isSelectingCameraArea;

    if (shouldShowGallery) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
                {/* Action Bar Outside Image (Fullscreen & Download) */}
                {!isEditingInpaint && !isSelectingCameraArea && (
                    <div className="w-full max-w-4xl flex items-center justify-end mb-4 px-2 gap-2">
                        {onSaveToLibrary && selectedImage && (
                            <button 
                                onClick={() => onSaveToLibrary(selectedImage)} 
                                className={`flex items-center gap-2 px-4 py-2 ${isSaved ? 'bg-green-600 text-white shadow-green-900/20' : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-900/20'} rounded-xl transition-all shadow-lg text-[10px] font-black uppercase tracking-widest active:scale-95`}
                                title={t('saveToLibrary')}
                            >
                                <Icon name="heart" className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isSaved ? t('saved') : t('saveToLibrary')}</span>
                            </button>
                        )}
                        {!isVideo && (
                            <button 
                                onClick={() => setFullscreenImage(displayImg)} 
                                className={`flex items-center gap-2 px-4 py-2 ${theme.inputBg} hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all border ${theme.border} text-[10px] font-black uppercase tracking-widest active:scale-95`}
                                title={t('fullscreen')}
                            >
                                <Icon name="arrows-pointing-out" className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('fullscreen')}</span>
                            </button>
                        )}
                        <a 
                            href={displayImg!} 
                            download={isVideo ? "render-video.mp4" : "render-namo.png"} 
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl transition-all shadow-lg text-[10px] font-black uppercase tracking-widest active:scale-95"
                            title={t('downloadImage')}
                        >
                            <Icon name="download" className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('downloadImage')}</span>
                        </a>
                    </div>
                )}

                <div className="w-full max-w-4xl flex flex-col items-start gap-4 animate-fade-in">
                    <div className={`relative group w-full ${theme.panelBg} shadow-[0_30px_100px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-slate-700/50`}>
                        {displayImg && (
                          <div className="relative overflow-hidden">
                            {isVideo ? (
                                <video 
                                    src={displayImg} 
                                    className="w-full max-h-[60vh] object-contain" 
                                    controls 
                                    autoPlay 
                                    loop 
                                />
                            ) : (
                                <img src={displayImg} className="w-full max-h-[60vh] object-contain" alt="Gallery Content" />
                            )}

                            {/* Centered AI Tool Button - Higher contrast for white images */}
                            {!isEditingInpaint && !isSelectingArea && !isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/10 backdrop-blur-[2px] pointer-events-none">
                                    <button 
                                        onClick={onOpenToolbox}
                                        className="w-24 h-24 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-2xl border border-white/20 scale-90 group-hover:scale-100 active:scale-95 group/btn pointer-events-auto"
                                        title={t('toolLabel')}
                                    >
                                        <div className="relative flex items-center justify-center flex-col">
                                            <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-0 group-hover/btn:opacity-60 transition-opacity"></div>
                                            <Icon name="sparkles" className="w-12 h-12 text-white relative z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
                                        </div>
                                    </button>
                                </div>
                            )}
                            
                            {isEditingInpaint && setMaskImage && (
                                <div className="absolute inset-0">
                                    {editTool === 'lasso' ? (
                                        <ImageEditor 
                                            ref={lassoEditorRef as any} 
                                            sourceImage={sourceImage!} 
                                            onMaskReady={setMaskImage} 
                                            strokeWidth={brushSize || 2} 
                                        />
                                    ) : (
                                        <BrushEditor 
                                            ref={brushEditorRef as any} 
                                            sourceImage={sourceImage!} 
                                            onMaskReady={setMaskImage} 
                                            brushSize={brushSize || 30} 
                                        />
                                    )}
                                </div>
                            )}

                            {isSelectingCameraArea && onAreaSelected && (
                                <div className="absolute inset-0">
                                    <AreaSelector 
                                        ref={areaSelectorRef as any} 
                                        sourceImage={sourceImage!} 
                                        onAreaSelected={onAreaSelected} 
                                    />
                                </div>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Prompt Box Outside Image - Aligned Left Below */}
                    {!isEditingInpaint && !isSelectingCameraArea && !isVideo && lastUsedPrompt && (
                        <div className="w-full flex items-start">
                            {!isPromptHidden ? (
                                <div className={`${isPromptExpanded ? 'w-full max-w-2xl' : 'max-w-xl'} bg-white/5 backdrop-blur-2xl p-5 rounded-3xl border border-white/10 text-left transition-all duration-500 shadow-xl group/prompt`}>
                                    <div className="flex justify-between items-center gap-4 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-orange-600/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                                                <Icon name="sparkles" className="w-3.5 h-3.5 text-orange-500" />
                                            </div>
                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Prompt sử dụng</p>
                                            <button 
                                                onClick={() => setIsPromptHidden(true)}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[9px] font-black text-white transition-all uppercase tracking-widest border border-white/5"
                                                title="Ẩn prompt"
                                            >
                                                <Icon name="eye-slash" className="w-3 h-3 text-white" />
                                                <span>Ẩn</span>
                                            </button>
                                        </div>
                                        {lastUsedPrompt.length > 80 && (
                                            <button 
                                                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[9px] font-black text-white transition-all uppercase tracking-widest border border-white/5 active:scale-95"
                                            >
                                                <span>{isPromptExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                                                <Icon name={isPromptExpanded ? "arrow-up-circle" : "arrow-down-circle"} className="w-3 h-3 text-white" />
                                            </button>
                                        )}
                                    </div>
                                    <p className={`text-[12px] font-medium text-white/90 leading-relaxed ${isPromptExpanded ? 'max-h-60 overflow-y-auto thin-scrollbar pb-1' : 'line-clamp-2'}`}>
                                        {lastUsedPrompt}
                                    </p>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsPromptHidden(false)}
                                    className="bg-white/5 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl flex items-center gap-2.5 active:scale-95"
                                    title="Hiện prompt"
                                >
                                    <Icon name="eye" className="w-4 h-4 text-white" />
                                    <span>Hiện Prompt</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                {generatedImages.length > 1 && !isEditingInpaint && !isSelectingCameraArea && (
                  <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 p-3 ${theme.panelBg}/80 backdrop-blur-2xl rounded-2xl border ${theme.border} shadow-xl z-20`}>
                      {generatedImages.map((img, i) => (
                          <div 
                            key={i} 
                            onClick={() => setSelectedImage(img)}
                            className={`w-14 h-14 rounded-xl flex-shrink-0 cursor-pointer transition-all border-4 ${selectedImage === img ? 'border-orange-500 scale-105 shadow-md' : 'border-transparent opacity-40 hover:opacity-100'}`} 
                          >
                              {img.includes('.mp4') || img.startsWith('blob:') ? (
                                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center rounded-lg">
                                      <Icon name="video-camera" className="w-6 h-6 text-orange-500" />
                                  </div>
                              ) : (
                                  <img src={img} className="w-full h-full object-cover rounded-lg" alt={`Thumb ${i}`} />
                              )}
                          </div>
                      ))}
                  </div>
                )}
            </div>
        );
    }

    return (
        <div className="text-center opacity-20 flex flex-col items-center gap-6 group">
            <div className={`w-32 h-32 ${theme.panelBg} rounded-3xl flex items-center justify-center border ${theme.border} shadow-xl group-hover:scale-105 transition-all`}>
                <Icon name="sparkles" className="w-16 h-16 text-slate-700" />
            </div>
            <p className="text-xl font-black tracking-widest uppercase italic text-slate-100">Sẵn sàng render</p>
        </div>
    );
};
