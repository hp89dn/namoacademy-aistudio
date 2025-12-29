
import React, { useState, useEffect, Suspense, lazy, memo } from 'react';
import type { Utility } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './icons';

const MoodboardCreator = lazy(() => import('./MoodboardCreator').then(m => ({ default: m.MoodboardCreator })));
const LightingCreator = lazy(() => import('./LightingCreator').then(m => ({ default: m.LightingCreator })));
const VirtualTourCreator = lazy(() => import('./VirtualTourCreator').then(m => ({ default: m.VirtualTourCreator })));
const ExtendViewCreator = lazy(() => import('./ExtendViewCreator').then(m => ({ default: m.ExtendViewCreator })));
const ChangeStyleCreator = lazy(() => import('./ChangeStyleCreator').then(m => ({ default: m.ChangeStyleCreator })));

interface UtilityThumbnailProps { 
    icon: string; 
    title: string; 
    description: string; 
    onClick: () => void; 
}

const UtilityThumbnail: React.FC<UtilityThumbnailProps> = memo(({ icon, title, description, onClick }) => {
    const { theme } = useTheme();
    return (
        <div 
            onClick={onClick}
            className={`${theme.panelBg} p-6 rounded-[2rem] border ${theme.border} hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500 cursor-pointer group`}
        >
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-colors duration-500">
                <Icon name={icon} className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors duration-500" />
            </div>
            <h3 className={`text-lg font-black uppercase tracking-tight ${theme.textMain} mb-2`}>{title}</h3>
            <p className={`${theme.textSub} text-[11px] font-medium leading-relaxed`}>{description}</p>
        </div>
    );
});

export const UtilitiesView: React.FC<any> = memo((props) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { activeUtility, setActiveUtility } = props;

    const utilities: { id: Utility; icon: string; }[] = [
        { id: 'moodboard', icon: 'clipboard' },
        { id: 'lighting', icon: 'sparkles' },
        { id: 'virtualTour', icon: 'globe' },
        { id: 'extendView', icon: 'arrows-pointing-out' },
        { id: 'changeStyle', icon: 'cpu-chip' }
    ];

    if (activeUtility) {
        return (
            <div className="lg:col-span-12">
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Icon name="sparkles" className="w-10 h-10 animate-spin text-orange-500" /></div>}>
                    {activeUtility === 'moodboard' && <MoodboardCreator onBack={() => setActiveUtility(null)} {...props} />}
                    {activeUtility === 'lighting' && <LightingCreator onBack={() => setActiveUtility(null)} {...props} />}
                    {activeUtility === 'virtualTour' && <VirtualTourCreator onBack={() => setActiveUtility(null)} {...props} />}
                    {activeUtility === 'extendView' && <ExtendViewCreator onBack={() => setActiveUtility(null)} {...props} />}
                    {activeUtility === 'changeStyle' && <ChangeStyleCreator onBack={() => setActiveUtility(null)} {...props} />}
                </Suspense>
            </div>
        );
    }

    return (
        <div className="lg:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {utilities.map(util => (
                    <UtilityThumbnail 
                        key={util.id}
                        icon={util.icon}
                        title={t(`${util.id}Title`)}
                        description={t(`${util.id}Desc`)}
                        onClick={() => setActiveUtility(util.id)}
                    />
                ))}
            </div>
        </div>
    );
});
