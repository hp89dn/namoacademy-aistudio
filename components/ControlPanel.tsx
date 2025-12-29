
import React, { memo, Suspense, lazy } from 'react';
import { Icon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

// Lazy load panels to reduce initial bundle size and complexity
const CreateFreePanel = lazy(() => import('./panels/CreateFreePanel').then(m => ({ default: m.CreateFreePanel })));
const CreateApiPanel = lazy(() => import('./panels/CreateApiPanel').then(m => ({ default: m.CreateApiPanel })));
const InteriorPanel = lazy(() => import('./panels/InteriorPanel').then(m => ({ default: m.InteriorPanel })));
const CameraAnglePanel = lazy(() => import('./panels/SecondaryPanels').then(m => ({ default: m.CameraAnglePanel })));
const EditPanel = lazy(() => import('./panels/SecondaryPanels').then(m => ({ default: m.EditPanel })));
const PlanTo3dPanel = lazy(() => import('./panels/SecondaryPanels').then(m => ({ default: m.PlanTo3dPanel })));
const VideoPanel = lazy(() => import('./panels/SecondaryPanels').then(m => ({ default: m.VideoPanel })));
const CanvaPanel = lazy(() => import('./panels/SecondaryPanels').then(m => ({ default: m.CanvaPanel })));
const PromptGenPanel = lazy(() => import('./panels/SecondaryPanels').then(m => ({ default: m.PromptGenPanel })));

const PanelLoader = () => (
    <div className="w-full h-40 flex items-center justify-center">
        <Icon name="sparkles" className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
);

export const ControlPanel: React.FC<any> = memo((props) => {
    const { activeTab, handleGeneration, isLoading, sourceImage, sourceImage2, editSubMode, isProMode, handleToggleProMode } = props;
    const { t } = useLanguage();
    const { theme } = useTheme();

    const renderPanel = () => {
        return (
            <Suspense fallback={<PanelLoader />}>
                {activeTab === 'create' && (
                    isProMode ? <CreateApiPanel {...props} /> : <CreateFreePanel {...props} />
                )}
                {activeTab === 'interior' && <InteriorPanel {...props} />}
                {activeTab === 'cameraAngle' && <CameraAnglePanel {...props} />}
                {activeTab === 'edit' && <EditPanel {...props} />}
                {activeTab === 'planTo3d' && <PlanTo3dPanel {...props} />}
                {activeTab === 'canva' && <CanvaPanel {...props} />}
                {activeTab === 'prompt' && <PromptGenPanel {...props} />}
                {activeTab === 'video' && <VideoPanel {...props} />}
            </Suspense>
        );
    }
    
    const isGenerationDisabled = () => {
        if (isLoading) return true;
        if (activeTab === 'prompt') return !sourceImage;
        if (activeTab !== 'create' && activeTab !== 'interior' && !sourceImage) return true;
        if (activeTab === 'edit' && editSubMode !== 'inpaint' && !sourceImage2) return true;
        return false;
    }

    const getButtonText = () => {
        switch(activeTab) {
            case 'video': return t('createVideo');
            case 'prompt': return t('createPrompt');
            default: return t('createImage');
        }
    }

    const getButtonIcon = () => {
        switch(activeTab) {
            case 'video': return 'video-camera';
            case 'prompt': return 'sparkles';
            default: return 'camera';
        }
    }

    if (activeTab === 'library') return null;

    return (
        <div className="flex flex-col gap-8 h-max pb-12">
            <div className={`p-4 rounded-2xl border ${isProMode ? 'border-amber-200 bg-amber-50/30' : theme.border} transition-all`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isProMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon name={isProMode ? 'sparkles' : 'cpu-chip'} className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Cấu hình model</p>
                            <p className="text-xs font-bold text-slate-800 leading-none">{isProMode ? t('proMode') : t('standardMode')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleToggleProMode}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isProMode ? 'bg-orange-600' : 'bg-slate-200'}`}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isProMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2 leading-tight">
                    {isProMode ? t('proModeDesc') : t('standardModeDesc')}
                </p>
            </div>

            {renderPanel()}
            
            <button 
                onClick={handleGeneration} 
                disabled={isGenerationDisabled()} 
                className={`w-full font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest shadow-2xl border-b-4 ${
                    isProMode 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-800 hover:from-amber-400 hover:to-amber-500 shadow-amber-900/40' 
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-800 hover:from-orange-400 hover:to-orange-500 shadow-orange-900/40'
                } text-white disabled:from-zinc-800 disabled:to-zinc-900 disabled:border-zinc-950 disabled:shadow-none disabled:cursor-not-allowed mt-8 text-xs lg:text-sm`}
            >
                <Icon name={getButtonIcon()} className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                <span className="text-white">{getButtonText()}</span>
            </button>
        </div>
    );
});
