
import React from 'react';
import type { LibraryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './icons';

interface LibraryViewProps {
  images: LibraryItem[];
  onDelete: (id: string) => void;
  onUseAsSource: (imageData: string) => void;
  onFullscreen: (imageData: string) => void;
  justSavedId: string | null;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ images, onDelete, onUseAsSource, onFullscreen, justSavedId }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();

    if (images.length === 0) {
        return (
            <div className={`lg:col-span-12 ${theme.panelBg} p-6 rounded-xl border ${theme.border} min-h-[70vh] flex flex-col items-center justify-center text-center text-slate-500`}>
                <Icon name="heart" className="w-16 h-16 mb-4 text-slate-600" />
                <h3 className={`text-xl font-semibold ${theme.textSub}`}>
                    {t('libraryEmptyHeader')}
                </h3>
                <p className="mt-2">
                    {t('libraryEmptyText')}
                </p>
            </div>
        );
    }

    return (
        <div className="lg:col-span-12">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map(item => (
                    <div key={item.id} className={`relative group aspect-square ${theme.panelBg} rounded-lg overflow-hidden shadow-lg border ${theme.border}`}>
                        <img src={item.imageData} alt="Saved in library" className="w-full h-full object-cover" />
                        
                        {justSavedId === item.id && (
                             <div className="absolute inset-0 bg-black/70 flex items-center justify-center animate-pulse-once">
                                <p className="text-white font-bold text-lg">{t('saved')}</p>
                             </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                            <div className="flex justify-center items-center gap-2">
                                <button onClick={() => onFullscreen(item.imageData)} className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-white p-2.5 rounded-full" title={t('fullscreen')}>
                                    <Icon name="arrows-pointing-out" className="w-5 h-5" />
                                </button>
                                <button onClick={() => onUseAsSource(item.imageData)} className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-700 text-white p-2.5 rounded-full" title={t('useAsSource')}>
                                    <Icon name="arrow-up-tray" className="w-5 h-5" />
                                </button>
                                <button onClick={() => onDelete(item.id)} className="bg-red-600/80 backdrop-blur-sm border border-red-500 hover:bg-red-500 text-white p-2.5 rounded-full" title={t('deleteFromLibrary')}>
                                    <Icon name="trash" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
