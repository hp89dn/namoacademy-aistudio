
import React, { useEffect } from 'react';
import type { SourceImage, AspectRatio } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Icon } from './icons';
import { ImageDropzone } from './ImageDropzone';
import { sourceImageToDataUrl } from '../utils';
import { ASPECT_RATIO_OPTIONS } from '../constants';
import { translations } from '../locales/translations';

interface ExtendViewCreatorProps {
    onBack: () => void;
    extendViewSourceImage: SourceImage | null;
    setExtendViewSourceImage: (image: SourceImage | null) => void;
    extendViewAspectRatio: AspectRatio;
    setExtendViewAspectRatio: (ratio: AspectRatio) => void;
    extendViewImageCount: number;
    setExtendViewImageCount: (count: number) => void;
    extendViewGeneratedImages: string[];
    extendViewSelectedImage: string | null;
    setExtendViewSelectedImage: (image: string | null) => void;
    handleExtendViewGeneration: () => void;
    isLoading: boolean;
    setFullscreenImage: (url: string | null) => void;
}

export const ExtendViewCreator: React.FC<ExtendViewCreatorProps> = ({
    onBack,
    extendViewSourceImage: sourceImage,
    setExtendViewSourceImage: setSourceImage,
    extendViewAspectRatio: aspectRatio,
    setExtendViewAspectRatio: setAspectRatio,
    extendViewImageCount: imageCount,
    setExtendViewImageCount: setImageCount,
    extendViewGeneratedImages: generatedImages,
    extendViewSelectedImage: selectedImage,
    setExtendViewSelectedImage: setSelectedImage,
    handleExtendViewGeneration: handleGenerate,
    isLoading,
    setFullscreenImage,
}) => {
    const { t, language } = useLanguage();
    const { ASPECT_RATIO_LABELS } = translations[language].constants;

    useEffect(() => {
        if (generatedImages.length > 0 && !selectedImage) {
            setSelectedImage(generatedImages[0]);
        }
    }, [generatedImages, selectedImage, setSelectedImage]);

    return (
        <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700/50 animate-fade-in">
            <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-4">
                     <Icon name="arrows-pointing-out" className="w-8 h-8 text-orange-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">{t('extendViewTitle')}</h2>
                        <p className="text-sm text-slate-400">{t('extendViewDesc')}</p>
                    </div>
                </div>
                <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-orange-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50">
                    <Icon name="arrow-uturn-left" className="w-5 h-5" />
                    <span>{t('backToUtilities')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-6">
                    <section>
                        <h3 className="font-semibold text-slate-300 mb-3">{t('uploadImageToExtend')}</h3>
                        {sourceImage ? (
                          <div className='space-y-3'>
                              <ImageDropzone onImageUpload={setSourceImage} className="cursor-pointer rounded-lg">
                                <div className='bg-black/30 rounded-lg p-2'><img src={sourceImageToDataUrl(sourceImage)} alt="Source for extending" className="w-full h-auto object-contain rounded" /></div>
                              </ImageDropzone>
                              <button onClick={() => setSourceImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                          </div>
                        ) : (
                          <ImageDropzone onImageUpload={setSourceImage} className='w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-center text-slate-400 text-sm cursor-pointer'>
                              <div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-500">{t('dropzoneFormats')}</p></div>
                          </ImageDropzone>
                        )}
                    </section>
                    <section>
                        <h3 className="font-semibold text-slate-300 mb-2">{t('chooseAspectRatio')}</h3>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            {ASPECT_RATIO_OPTIONS.filter(r => r !== 'auto').map(ratio => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-2 px-2 text-center rounded-md border ${aspectRatio === ratio ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-900/70 hover:bg-slate-700 border-slate-700 text-white'}`}>{ASPECT_RATIO_LABELS[ratio]}</button>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h3 className="font-semibold text-slate-300 mb-2">{t('imageCount')}</h3>
                        <div className="flex items-center justify-between bg-slate-900/70 rounded-md p-2">
                            <button onClick={() => setImageCount(Math.max(1, imageCount - 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-700 text-white">-</button>
                            <span className="text-lg font-semibold text-white">{imageCount}</span>
                            <button onClick={() => setImageCount(Math.min(4, imageCount + 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-700 text-white">+</button>
                        </div>
                    </section>
                    
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !sourceImage} 
                        className={`w-full font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest shadow-2xl border-b-4 bg-gradient-to-r from-orange-500 to-orange-600 border-orange-800 hover:from-orange-400 hover:to-orange-500 shadow-orange-900/40 text-white disabled:from-zinc-800 disabled:to-zinc-900 disabled:border-zinc-950 disabled:shadow-none disabled:cursor-not-allowed text-sm`}
                    >
                        <Icon name="sparkles" className="w-5 h-5 text-white" />
                        <span className="text-white">{isLoading ? t('generating') : t('generateExtendedView')}</span>
                    </button>
                </div>
                <div className="lg:col-span-8 bg-slate-900/50 rounded-lg min-h-[60vh] flex items-center justify-center p-4 border border-slate-700">
                    {isLoading ? (
                        <div className="text-center text-slate-400">
                            <Icon name="sparkles" className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
                            <p>{t('generatingExtendedView')}...</p>
                        </div>
                    ) : generatedImages.length > 0 && selectedImage ? (
                       <div className="flex flex-col h-full w-full">
                            <div className="flex-grow flex items-center justify-center relative group bg-black/30 rounded-lg overflow-hidden">
                                <img src={selectedImage} alt="Selected Extended View" className="max-w-full max-h-[65vh] object-contain" />
                                <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button onClick={() => selectedImage && setFullscreenImage(selectedImage)} className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-white p-2.5 rounded-full" title={t('fullscreen')}>
                                        <Icon name="arrows-pointing-out" className="w-5 h-5" />
                                    </button>
                                    <a href={selectedImage} download={`namo-academy-extended-${Date.now()}.png`} className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-white p-2.5 rounded-full inline-flex" title={t('downloadImage')}>
                                        <Icon name="download" className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                            {generatedImages.length > 1 && (
                                <div className={`flex-shrink-0 mt-4 grid grid-cols-${Math.min(generatedImages.length, 4)} gap-2`}>
                                    {generatedImages.map((image, index) => (
                                        <div key={index} className={`relative cursor-pointer rounded-md overflow-hidden transition-all duration-200 h-28 ${selectedImage === image ? 'ring-2 ring-orange-500' : 'opacity-60 hover:opacity-100'}`} onClick={() => setSelectedImage(image)}>
                                            <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                            <Icon name="arrows-pointing-out" className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-400">{t('extendViewEmptyHeader')}</h3>
                            <p className="mt-2">{t('extendViewEmptyText')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
