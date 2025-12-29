
import React, { useState } from 'react';
import { Icon } from '../icons';
import { ImageDropzone } from '../ImageDropzone';
import { sourceImageToDataUrl, padImageToAspectRatio } from '../../utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { translations } from '../../locales/translations';
import { PromptInput } from '../shared/ControlCommon';
import type { SourceImage, EditSubMode, ObjectTransform } from '../../types';
import { ImageEditor } from '../ImageEditor';
import { BrushEditor } from '../BrushEditor';

export const CameraAnglePanel: React.FC<any> = ({ sourceImage, setSourceImage, prompt, setPrompt, imageCount, setImageCount, isSelectingArea, setIsSelectingArea, areaSelectorRef, handleSourceImageUpload }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const { cameraAnglePrompts } = translations[language].constants;

    const handleToggleSelectingArea = () => {
        if (!isSelectingArea) {
            areaSelectorRef.current?.clear();
        }
        setIsSelectingArea((prev: boolean) => !prev);
    };

    const handleClearSelection = () => {
        areaSelectorRef.current?.clear();
        if (isSelectingArea) setIsSelectingArea(false);
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>1. {t('uploadImage')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <div className="bg-black/30 rounded-lg p-2 border border-zinc-800">
                            <img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" />
                        </div>
                        <button onClick={() => setSourceImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                    </div>
                ) : (
                  <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center text-center p-4 bg-zinc-900/20`}>
                      <Icon name="clock" className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
                        Chọn ảnh từ Dòng thời gian<br/>phía dưới để bắt đầu
                      </p>
                  </div>
                )}
            </section>

            {sourceImage && (
                <section>
                    <h3 className={`font-semibold ${theme.textMain} mb-3`}>2. {t('specifyCloseUpAngle')}</h3>
                    <p className={`text-xs ${theme.textSub} mb-3`}>{t('specifyCloseUpHelp')}</p>
                    <div className='flex items-center gap-2'>
                        <button onClick={handleToggleSelectingArea} className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-lg ${isSelectingArea ? 'bg-red-600 hover:bg-red-700 text-white' : `${theme.buttonSecondary}`}`}><Icon name="pencil-swoosh" className="w-5 h-5" />{isSelectingArea ? t('cancel') : t('selectArea')}</button>
                        {(isSelectingArea) && (<button onClick={handleClearSelection} className={`flex-shrink-0 flex items-center justify-center gap-2 text-sm ${theme.textMain} px-3 py-2.5 rounded-md ${theme.inputBg} hover:bg-white/10`} title={t('clearSelection')}><Icon name="trash" className="w-4 h-4" /></button>)}
                    </div>
                </section>
            )}

            <div className={`${isSelectingArea ? 'opacity-50 pointer-events-none' : ''} transition-opacity space-y-6`}>
                <section>
                    <h3 className={`font-semibold ${theme.textMain} mb-3`}>3. {t('chooseCameraAngle')}</h3>
                    <select disabled={isSelectingArea} value={cameraAnglePrompts.some(p => p.value === prompt) ? prompt : ""} onChange={(e) => setPrompt(e.target.value)} className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border ${theme.border}`} style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('selectCameraAnglePlaceholder')}</option>{cameraAnglePrompts.map(p => <option key={p.display} value={p.value}>{p.display}</option>)}</select>
                </section>
                <section>
                    <h3 className={`font-semibold ${theme.textMain} mb-2`}>4. {t('customDescription')}</h3>
                    <textarea disabled={isSelectingArea} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('customDescriptionPlaceholder')} className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border ${theme.border}`}/>
                </section>
            </div>
            
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-2`}>5. {t('imageCount')}</h3>
                <div className={`flex items-center justify-between ${theme.inputBg} rounded-md p-2 border ${theme.border}`}>
                    <button onClick={() => setImageCount((c: number) => Math.max(1, c - 1))} className={`px-4 py-2 rounded text-xl font-bold ${theme.buttonSecondary} ${theme.textMain}`}>-</button>
                    <span className={`text-lg font-semibold ${theme.textMain}`}>{imageCount}</span>
                    <button onClick={() => setImageCount((c: number) => Math.min(10, c + 1))} className={`px-4 py-2 rounded text-xl font-bold ${theme.buttonSecondary} ${theme.textMain}`}>+</button>
                </div>
            </section>
        </div>
    );
};

export const EditPanel: React.FC<any> = ({ 
    sourceImage, setSourceImage, prompt, setPrompt, imageCount, setImageCount, 
    editReferenceImage, setEditReferenceImage, editTool, setEditTool, brushSize, setBrushSize, 
    lassoEditorRef, brushEditorRef, handleSourceImageUpload, setMaskImage,
    editSubMode, setEditSubMode, sourceImage2, setSourceImage2 
}) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const { materialChangeOptions, furnitureChangeOptions, predefinedMaterialImages } = translations[language].constants;

    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);
    const [showMaterialGallery, setShowMaterialGallery] = useState(false);
    const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<keyof typeof predefinedMaterialImages>('Vietceramics');
    const [isProcessingMaterialRef, setIsProcessingMaterialRef] = useState(false);
    
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleEditReferenceImageUpload = async (newReferenceImage: SourceImage) => {
        if (!sourceImage) {
            setEditReferenceImage(newReferenceImage);
            return;
        }

        try {
            const sourceImg = new Image();
            sourceImg.src = sourceImageToDataUrl(sourceImage);
            await new Promise<void>((resolve, reject) => {
                sourceImg.onload = () => resolve();
                sourceImg.onerror = reject;
            });
            const targetAspectRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;

            const paddedImage = await padImageToAspectRatio(newReferenceImage, targetAspectRatio);
            setEditReferenceImage(paddedImage);

        } catch (error) {
            console.error("Failed to pad edit reference image:", error);
            alert("Could not process reference image. Using original.");
            setEditReferenceImage(newReferenceImage);
        }
    };

    const handleSourceImage2Upload = async (newImage: SourceImage) => {
        if (sourceImage && editSubMode !== 'inpaint') {
            const loadingPrompt = prompt;
            setPrompt(t('processingImage'));
            try {
                const img1 = new Image();
                img1.src = sourceImageToDataUrl(sourceImage);
                await new Promise((resolve, reject) => {
                    img1.onload = resolve;
                    img1.onerror = reject;
                });
                
                const targetAspectRatio = img1.naturalWidth / img1.naturalHeight;
                const paddedImage = await padImageToAspectRatio(newImage, targetAspectRatio);
                setSourceImage2(paddedImage);
            } catch (error) {
                console.error("Failed to pad image:", error);
                alert("Could not auto-adjust image ratio. Using original.");
                setSourceImage2(newImage);
            } finally {
                setPrompt(loadingPrompt);
            }
        } else {
            setSourceImage2(newImage);
        }
    };

    const handleSetMaterialFromUrl = async (url: string) => {
        setIsProcessingMaterialRef(true);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const newImage = await new Promise<SourceImage>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    const [, base64] = dataUrl.split(',');
                    if (base64) {
                        resolve({ base64, mimeType: blob.type });
                    } else {
                        reject(new Error("Could not read base64 from data URL."));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(blob);
            });
            
            await handleSourceImage2Upload(newImage);
            setShowMaterialGallery(false);

        } catch (error) {
            console.error("Could not load material image:", error);
            alert("Could not load material image.");
        } finally {
            setIsProcessingMaterialRef(false);
        }
    };

    const handleSubModeChange = (mode: EditSubMode) => {
        setEditSubMode(mode);
        if (mode === 'mergeHouse') setPrompt('Ghép công trình từ ảnh 2 vào bối cảnh của ảnh 1, giữ nguyên ánh sáng và cây cối của ảnh 1.');
        else if (mode === 'mergeMaterial') setPrompt('Sử dụng vật liệu từ ảnh 2 và áp dụng nó lên bề mặt tường của tòa nhà trong ảnh 1. Giữ nguyên hình khối kiến trúc của ảnh 1.');
        else if (mode === 'mergeFurniture') setPrompt('Thay thế đồ nội thất trong ảnh 1 (ví dụ: ghế sofa) bằng đồ vật tương ứng từ ảnh 2. Giữ nguyên bối cảnh, ánh sáng và không gian nội thất của ảnh 1.');
        else if (mode === 'inpaint') setPrompt('');
    };
    
    return (
        <div className="space-y-6">
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-2`}>1. {t('chooseFunction')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button onClick={() => handleSubModeChange('inpaint')} className={`py-2 px-2 text-center rounded-md border ${editSubMode === 'inpaint' ? 'bg-orange-600 text-white font-semibold border-orange-500' : `${theme.inputBg} ${theme.textMain} hover:bg-white/10 ${theme.border}`}`}>{t('editSelectedArea')}</button>
                    <button onClick={() => handleSubModeChange('mergeHouse')} className={`py-2 px-2 text-center rounded-md border ${editSubMode === 'mergeHouse' ? 'bg-orange-600 text-white font-semibold border-orange-500' : `${theme.inputBg} ${theme.textMain} hover:bg-white/10 ${theme.border}`}`}>{t('mergeHouse')}</button>
                    <button onClick={() => handleSubModeChange('mergeMaterial')} className={`py-2 px-2 text-center rounded-md border ${editSubMode === 'mergeMaterial' ? 'bg-orange-600 text-white font-semibold border-orange-500' : `${theme.inputBg} ${theme.textMain} hover:bg-white/10 ${theme.border}`}`}>{t('mergeMaterial')}</button>
                    <button onClick={() => handleSubModeChange('mergeFurniture')} className={`py-2 px-2 text-center rounded-md border ${editSubMode === 'mergeFurniture' ? 'bg-orange-600 text-white font-semibold border-orange-500' : `${theme.inputBg} ${theme.textMain} hover:bg-white/10 ${theme.border}`}`}>{t('mergeFurniture')}</button>
                </div>
                <p className={`text-xs ${theme.textSub} mt-2 text-center`}>{t(`editFunctionHelp.${editSubMode}`)}</p>
            </section>

            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>
                    {editSubMode === 'inpaint' ? `2. ${t('uploadSourceImage')}` : 
                     editSubMode === 'mergeHouse' ? `2. ${t('uploadContextImage')}` : `2. ${t('uploadSourceImage')} (Image 1)`}
                </h3>
                {editSubMode === 'mergeHouse' && (
                  <p className={`text-xs ${theme.textSub} mb-3`}>{t('contextImageHelp')}</p>
                )}
                {sourceImage ? (
                    <div className='space-y-2'>
                        <div className="relative bg-black/30 p-2 rounded-lg border border-zinc-800">
                            <img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded-lg" />
                            {isMobile && editSubMode === 'inpaint' && (
                                editTool === 'lasso' ? 
                                <ImageEditor ref={lassoEditorRef} sourceImage={sourceImage} onMaskReady={setMaskImage} strokeWidth={brushSize}/> : 
                                <BrushEditor ref={brushEditorRef} sourceImage={sourceImage} onMaskReady={setMaskImage} brushSize={brushSize}/>
                            )}
                        </div>
                        <button onClick={() => setSourceImage(null)} className='text-sm text-red-400 hover:text-red-500 w-full text-left px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('resetImage')}</button>
                    </div>
                ) : (
                  <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center text-center p-4 bg-zinc-900/20`}>
                      <Icon name="clock" className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
                        Chọn ảnh từ Dòng thời gian<br/>phía dưới để bắt đầu
                      </p>
                  </div>
                )}
            </section>

            {sourceImage && (
                <>
                    {editSubMode === 'inpaint' ? (
                        <>
                            <section>
                                <h3 className={`font-semibold ${theme.textMain} mb-3`}>3. {t('chooseToolAndDraw')}</h3>
                                 <div className={`flex ${theme.inputBg} rounded-md p-1 space-x-1 mb-4 border ${theme.border}`}>
                                    <button onClick={() => setEditTool('lasso')} className={`w-1/2 py-2 text-sm rounded ${editTool === 'lasso' ? 'bg-orange-600 text-white font-semibold' : `${theme.textSub} hover:bg-white/10`}`}>{t('lassoTool')}</button>
                                    <button onClick={() => setEditTool('brush')} className={`w-1/2 py-2 text-sm rounded ${editTool === 'brush' ? 'bg-orange-600 text-white font-semibold' : `${theme.textSub} hover:bg-white/10`}`}>{t('brushTool')}</button>
                                </div>
                                <button onClick={() => { if (editTool === 'lasso') lassoEditorRef.current?.clear(); else brushEditorRef.current?.clear(); setMaskImage(null); }} className={`w-full flex items-center justify-center gap-2 text-sm ${theme.textMain} px-3 py-2 rounded-md ${theme.buttonSecondary}`}><Icon name="arrow-uturn-left" className="w-4 h-4" />{t('clearSelection')}</button>
                                <div className='mt-4 space-y-2'>
                                    <label htmlFor="brushSize" className={`text-sm font-medium ${theme.textSub}`}>{editTool === 'lasso' ? t('lineThickness') : t('brushSize')}: {brushSize}px</label>
                                    <input id="brushSize" type="range" min="1" max={editTool === 'lasso' ? 10 : 50} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                                </div>
                            </section>
                            <section>
                                <h3 className={`font-semibold ${theme.textMain} mb-3`}>4. {t('uploadReferenceOptional')}</h3>
                                <p className={`text-xs ${theme.textSub} mb-3`}>{t('referenceImageHelpEdit')}</p>
                                {editReferenceImage ? (
                                    <div className="relative group">
                                        <ImageDropzone onImageUpload={handleEditReferenceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-black/30 rounded-lg p-2'><img src={sourceImageToDataUrl(editReferenceImage)} alt="Edit Reference" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                                        <button onClick={() => setEditReferenceImage(null)} className="absolute top-3 right-3 bg-black/60 rounded-full text-white hover:bg-black/80 p-1 opacity-0 group-hover:opacity-100 z-10"><Icon name="x-circle" className="w-5 h-5" /></button>
                                    </div>
                                ) : <ImageDropzone onImageUpload={handleEditReferenceImageUpload} className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-lg flex items-center justify-center text-center ${theme.textSub} text-sm cursor-pointer`}><p>{t('dropzoneHint')}</p></ImageDropzone>}
                            </section>
                            <section>
                               <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={t('promptPlaceholder.inpaint')} />
                            </section>
                        </>
                    ) : (
                        <>
                           <section>
                                <h3 className={`font-semibold ${theme.textMain} mb-3`}>{editSubMode === 'mergeHouse' ? `3. ${t('uploadBuildingImage')}` : `3. ${t('uploadMaterialFurnitureImage')}`}</h3>
                                <p className={`text-xs ${theme.textSub} mb-3`}>{t('image2Help')}</p>

                                {(editSubMode === 'mergeMaterial' || editSubMode === 'mergeFurniture') && (
                                    <>
                                        <div className="flex justify-end mb-2">
                                            <button onClick={() => setShowMaterialGallery(!showMaterialGallery)} className="text-sm text-orange-400 hover:text-orange-300 px-2 py-1">
                                                {showMaterialGallery ? t('close') : t('choosePresetMaterial')}
                                            </button>
                                        </div>
                                        {showMaterialGallery && (
                                          <div className={`${theme.inputBg} p-3 rounded-md mb-3 border ${theme.border}`}>
                                            <div className={`flex space-x-1 mb-3 border-b ${theme.border}`}>
                                              {(Object.keys(predefinedMaterialImages) as Array<keyof typeof predefinedMaterialImages>).map(cat => (
                                                <button key={cat as string} onClick={() => setSelectedMaterialCategory(cat as keyof typeof predefinedMaterialImages)} className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-t-md ${selectedMaterialCategory === cat ? 'bg-slate-700 text-white' : `${theme.textSub} hover:bg-white/10`}`}>{cat as string}</button>
                                              ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                              {predefinedMaterialImages[selectedMaterialCategory].length > 0 ? (
                                                predefinedMaterialImages[selectedMaterialCategory].map(img => <img key={img.url} src={img.url} alt={img.name} onClick={() => handleSetMaterialFromUrl(img.url)} className="w-full h-20 object-cover rounded cursor-pointer hover:ring-2 hover:ring-orange-500" />)
                                              ) : <p className={`col-span-2 text-center text-xs ${theme.textSub} py-4`}>No images in this category yet.</p>}
                                            </div>
                                          </div>
                                        )}
                                    </>
                                )}

                                {isProcessingMaterialRef ? (
                                    <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-lg flex items-center justify-center text-center ${theme.textSub} text-sm`}>
                                        <p>{t('loadingReference')}</p>
                                    </div>
                                ) : sourceImage2 ? (
                                    <div className='space-y-3'>
                                        <ImageDropzone onImageUpload={handleSourceImage2Upload} className="cursor-pointer rounded-lg"><div className='bg-black/30 rounded-lg p-2'><img src={sourceImageToDataUrl(sourceImage2)} alt="Source 2" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                                        <button onClick={() => setSourceImage2(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                                    </div>
                                ) : <ImageDropzone onImageUpload={handleSourceImage2Upload} className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-lg flex items-center justify-center text-center ${theme.textSub} text-sm cursor-pointer`}><p>{t('dropzoneHint')}</p></ImageDropzone>}
                            </section>
                            <section>
                                <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={t(`promptPlaceholder.${editSubMode}`)}/>
                                {(editSubMode === 'mergeMaterial' || editSubMode === 'mergeFurniture') && (
                                    <div className="mt-3">
                                        <p className={`text-xs ${theme.textSub} mb-1`}>{t('promptExamples')}</p>
                                        <select
                                            value={(editSubMode === 'mergeMaterial' ? materialChangeOptions : furnitureChangeOptions).some(opt => opt.value === prompt) ? prompt : ""}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border ${theme.border}`}
                                            style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}
                                        >
                                            <option value="" disabled>{t('selectOption')}</option>
                                            {(editSubMode === 'mergeMaterial' ? materialChangeOptions : furnitureChangeOptions).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.display}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                    <section>
                        <h3 className={`font-semibold ${theme.textMain} mb-2`}>5. {t('imageCount')}</h3>
                        <div className={`flex items-center justify-between ${theme.inputBg} rounded-md p-2 border ${theme.border}`}>
                            <button onClick={() => setImageCount((c: number) => Math.max(1, c - 1))} className={`px-4 py-2 rounded text-xl font-bold ${theme.buttonSecondary} ${theme.textMain}`}>-</button>
                            <span className={`text-lg font-semibold ${theme.textMain}`}>{imageCount}</span>
                            <button onClick={() => setImageCount((c: number) => Math.min(10, c + 1))} className={`px-4 py-2 rounded text-xl font-bold ${theme.buttonSecondary} ${theme.textMain}`}>+</button>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export const PlanTo3dPanel: React.FC<any> = ({ sourceImage, setSourceImage, prompt, setPrompt, imageCount, setImageCount, planTo3dMode, setPlanTo3dMode, handleSourceImageUpload }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const { planStylePrompts, planRoomTypePrompts, planColorizePrompts } = translations[language].constants;

    const handlePromptSelect = (selectedPrompt: string) => {
        setPrompt((current: string) => current.trim() === '' ? selectedPrompt : `${current}, ${selectedPrompt}`);
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>1. {t('upload2dPlan')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <div className="bg-black/30 rounded-lg p-2 border border-zinc-800">
                            <img src={sourceImageToDataUrl(sourceImage)} alt="Plan" className="w-full h-auto object-contain rounded" />
                        </div>
                        <button onClick={() => setSourceImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                    </div>
                ) : (
                  <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center text-center p-4 bg-zinc-900/20`}>
                      <Icon name="clock" className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
                        Chọn ảnh từ Dòng thời gian<br/>phía dưới để bắt đầu
                      </p>
                  </div>
                )}
            </section>
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-2`}>2. {t('chooseGoal')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button onClick={() => { setPlanTo3dMode('render'); setPrompt(t('promptPlanTo3d')); }} className={`py-2 px-2 text-center rounded-md border ${planTo3dMode === 'render' ? 'bg-orange-600 text-white font-semibold border-orange-500' : `${theme.inputBg} ${theme.textMain} hover:bg-white/10 ${theme.border}`}`}>{t('create3DImage')}</button>
                    <button onClick={() => { setPlanTo3dMode('colorize'); setPrompt(planColorizePrompts[0]); }} className={`py-2 px-2 text-center rounded-md border ${planTo3dMode === 'colorize' ? 'bg-orange-600 text-white font-semibold border-orange-500' : `${theme.inputBg} ${theme.textMain} hover:bg-white/10 ${theme.border}`}`}>{t('colorizePlan')}</button>
                </div>
            </section>
            <section>
                <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={t(`promptPlaceholder.planTo3d${planTo3dMode === 'render' ? 'Render' : 'Colorize'}`)} />
                <div className="mt-3 space-y-2">
                    <p className={`text-xs ${theme.textSub} mb-1`}>{t('suggestions')}</p>
                    {planTo3dMode === 'render' ? (
                        <>
                            <select onChange={(e) => handlePromptSelect(e.target.value)} value="" className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border ${theme.border}`} style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('style')}</option>{planStylePrompts.map((p: string) => <option key={p} value={p}>{p}</option>)}</select>
                            <select onChange={(e) => handlePromptSelect(e.target.value)} value="" className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border ${theme.border}`} style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('roomType')}</option>{planRoomTypePrompts.map((p: string) => <option key={p} value={p}>{p}</option>)}</select>
                        </>
                    ) : (
                        <select onChange={(e) => setPrompt(e.target.value)} value={planColorizePrompts.includes(prompt) ? prompt : ""} className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border ${theme.border}`} style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('selectOption')}</option>{planColorizePrompts.map((p: string) => <option key={p} value={p}>{p}</option>)}</select>
                    )}
                </div>
            </section>
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-2`}>4. {t('imageCount')}</h3>
                <div className={`flex items-center justify-between ${theme.inputBg} rounded-md p-2 border ${theme.border}`}>
                    <button onClick={() => setImageCount((c: number) => Math.max(1, c - 1))} className={`px-4 py-2 rounded text-xl font-bold ${theme.buttonSecondary} ${theme.textMain}`}>-</button>
                    <span className={`text-lg font-semibold ${theme.textMain}`}>{imageCount}</span>
                    <button onClick={() => setImageCount((c: number) => Math.min(10, c + 1))} className={`px-4 py-2 rounded text-xl font-bold ${theme.buttonSecondary} ${theme.textMain}`}>+</button>
                </div>
            </section>
        </div>
    );
};

export const VideoPanel: React.FC<any> = ({ sourceImage, setSourceImage, prompt, setPrompt, handleSourceImageUpload }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const { videoPrompts } = translations[language].constants;

    return (
        <div className="space-y-6">
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>1. {t('uploadImage')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <div className="bg-black/30 rounded-lg p-2 border border-zinc-800">
                            <img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" />
                        </div>
                        <button onClick={() => setSourceImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                    </div>
                ) : (
                  <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center text-center p-4 bg-zinc-900/20`}>
                      <Icon name="clock" className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
                        Chọn ảnh từ Dòng thời gian<br/>phía dưới để bắt đầu
                      </p>
                  </div>
                )}
            </section>
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-2`}>2. {t('motionDescription')}</h3>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('promptPlaceholder.video')} className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md h-28 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border ${theme.border}`}/>
                <div className="mt-3">
                    <p className={`text-xs ${theme.textSub} mb-1`}>{t('suggestions')}</p>
                    <select onChange={(e) => setPrompt(e.target.value)} value={videoPrompts.some((p: any) => p.value === prompt) ? prompt : ""} className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border ${theme.border}`} style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('selectSuggestion')}</option>{videoPrompts.map((p: any) => <option key={p.display} value={p.value}>{p.display}</option>)}</select>
                </div>
            </section>
        </div>
    );
};

export const CanvaPanel: React.FC<any> = ({ sourceImage, setSourceImage, canvaObjects, setCanvaObjects, canvaObjectTransforms, setCanvaObjectTransforms, selectedCanvaObjectIndex, setSelectedCanvaObjectIndex, isCanvaLayoutLocked, setIsCanvaLayoutLocked, handleSourceImageUpload }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();

    const handleDecorUpload = (images: SourceImage[]) => {
        setCanvaObjects((prev: SourceImage[]) => [...prev, ...images]);
        setCanvaObjectTransforms((prev: ObjectTransform[]) => [
            ...prev,
            ...images.map(() => ({ x: 50, y: 50, scale: 30, rotation: 0, flipHorizontal: false, flipVertical: false }))
        ]);
    };

    const updateTransform = (index: number, updates: Partial<ObjectTransform>) => {
        setCanvaObjectTransforms((prev: ObjectTransform[]) => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
    };

    const removeObject = (index: number) => {
        setCanvaObjects((prev: SourceImage[]) => prev.filter((_, i) => i !== index));
        setCanvaObjectTransforms((prev: ObjectTransform[]) => prev.filter((_, i) => i !== index));
        setSelectedCanvaObjectIndex(null);
    };

    const selectedTransform = selectedCanvaObjectIndex !== null ? canvaObjectTransforms[selectedCanvaObjectIndex] : null;

    return (
        <div className="space-y-6">
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>1. {t('uploadSpaceImage')}</h3>
                {sourceImage ? (
                   <div className='space-y-3'>
                      <div className="bg-black/30 rounded-lg p-2 border border-zinc-800">
                          <img src={sourceImageToDataUrl(sourceImage)} alt="BG" className="w-full h-auto object-contain rounded" />
                      </div>
                      <button onClick={() => setSourceImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('changeBgImage')}</button>
                   </div>
                ) : (
                  <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center text-center p-4 bg-zinc-900/20`}>
                      <Icon name="clock" className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
                        Chọn ảnh từ Dòng thời gian<br/>phía dưới để bắt đầu
                      </p>
                  </div>
                )}
            </section>

            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-semibold ${theme.textMain}`}>{t('uploadDecorImage')}</h3>
                    {canvaObjects.length > 0 && <button onClick={() => { setCanvaObjects([]); setCanvaObjectTransforms([]); setSelectedCanvaObjectIndex(null); }} className="text-xs text-red-400 hover:text-red-500">{t('deleteAll')}</button>}
                </div>
                <p className={`text-xs ${theme.textSub} -mt-2 mb-3`}>{t('decorHelp')}</p>
                <ImageDropzone onImagesUpload={handleDecorUpload} multiple className={`w-full h-24 border-2 border-dashed ${theme.border} rounded-lg flex items-center justify-center text-center ${theme.textSub} text-xs cursor-pointer mb-4`}><div><p>{t('clickToAdd')}</p></div></ImageDropzone>
                
                <div className="grid grid-cols-4 gap-2">
                    {canvaObjects.map((obj, i) => (
                        <div key={i} onClick={() => setSelectedCanvaObjectIndex(i)} className={`relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all ${selectedCanvaObjectIndex === i ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={sourceImageToDataUrl(obj)} className="w-full h-full object-contain" alt="Object" /></div>
                    ))}
                </div>
            </section>

            {selectedCanvaObjectIndex !== null && selectedTransform && (
                <section className="bg-black/20 p-4 rounded-xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('adjustments')}</h4>
                    <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-slate-300">{t('lockLayout')}</label>
                         <button onClick={() => setIsCanvaLayoutLocked(!isCanvaLayoutLocked)} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isCanvaLayoutLocked ? 'bg-orange-600' : 'bg-slate-700'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isCanvaLayoutLocked ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                    </div>
                    {!isCanvaLayoutLocked && (
                        <>
                            <button onClick={() => removeObject(selectedCanvaObjectIndex)} className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"><Icon name="trash" className="w-4 h-4" />{t('deleteObject')}</button>
                            <div className="space-y-3">
                                <div><div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>{t('rotate')}</span><span>{selectedTransform.rotation}°</span></div><input type="range" min="0" max="360" value={selectedTransform.rotation} onChange={(e) => updateTransform(selectedCanvaObjectIndex, { rotation: Number(e.target.value) })} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" /></div>
                                <div className="flex gap-2"><button onClick={() => updateTransform(selectedCanvaObjectIndex, { flipHorizontal: !selectedTransform.flipHorizontal })} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${selectedTransform.flipHorizontal ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{t('flipHorizontal')}</button><button onClick={() => updateTransform(selectedCanvaObjectIndex, { flipVertical: !selectedTransform.flipVertical })} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${selectedTransform.flipVertical ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{t('flipVertical')}</button></div>
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    );
};

export const PromptGenPanel: React.FC<any> = ({ sourceImage, setSourceImage, characterImage, setCharacterImage, handleSourceImageUpload }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();

    return (
        <div className="space-y-6">
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>1. {t('uploadToAnalyze')}</h3>
                <p className={`text-xs ${theme.textSub} -mt-2 mb-3`}>{t('analyzeHelp')}</p>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <div className="bg-black/30 rounded-lg p-2 border border-zinc-800">
                            <img src={sourceImageToDataUrl(sourceImage)} alt="Analyze" className="w-full h-auto object-contain rounded" />
                        </div>
                        <button onClick={() => setSourceImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                    </div>
                ) : (
                  <div className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center text-center p-4 bg-zinc-900/20`}>
                      <Icon name="clock" className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-tight">
                        Chọn ảnh từ Dòng thời gian<br/>phía dưới để bắt đầu
                      </p>
                  </div>
                )}
            </section>
            <section>
                <h3 className={`font-semibold ${theme.textMain} mb-3`}>2. {t('uploadCharacterImage')}</h3>
                <p className={`text-xs ${theme.textSub} -mt-2 mb-3`}>{t('characterHelp')}</p>
                {characterImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={setCharacterImage} className="cursor-pointer rounded-lg"><div className='bg-black/30 rounded-lg p-2'><img src={sourceImageToDataUrl(characterImage)} alt="Char" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                        <button onClick={() => setCharacterImage(null)} className='text-red-400 hover:text-red-500 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10'>{t('delete')}</button>
                    </div>
                ) : <ImageDropzone onImageUpload={setCharacterImage} className={`w-full h-32 border-2 border-dashed ${theme.border} rounded-lg flex items-center justify-center text-center ${theme.textSub} text-sm cursor-pointer`}><div><p>{t('dropzoneHint')}</p></div></ImageDropzone>}
            </section>
        </div>
    );
};
