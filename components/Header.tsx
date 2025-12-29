import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './icons';

declare global {
  interface AIStudio {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const HeaderControls: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const { theme } = useTheme();

    const handleSelectKey = async () => {
        if (window.aistudio?.openSelectKey) {
            await window.aistudio.openSelectKey();
        } else {
            alert(t('alertApiKeyUtilUnavailable'));
        }
    };

    return (
        <div className="flex items-center gap-4">
            <a
                href="https://www.youtube.com/watch?v=IMKaFiz2Yi4"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2.5 ${theme.inputBg} hover:bg-zinc-800 text-zinc-400 px-4 py-2.5 text-[10px] font-black rounded-xl transition-all border ${theme.border}`}
                title="Hướng dẫn tạo API"
            >
                <Icon name="video-camera" className="w-4 h-4 text-blue-500" />
                <span className="hidden lg:inline uppercase tracking-widest">HƯỚNG DẪN</span>
            </a>

            <button
                onClick={handleSelectKey}
                className={`flex items-center gap-2.5 ${theme.inputBg} hover:bg-zinc-800 text-zinc-400 px-4 py-2.5 text-[10px] font-black rounded-xl transition-all border ${theme.border}`}
                title={t('selectApiKey')}
            >
                <Icon name="key" className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline uppercase tracking-widest">CÀI ĐẶT API</span>
            </button>

            <div className={`flex space-x-1 ${theme.inputBg} border ${theme.border} p-1 rounded-xl`}>
                <button
                    onClick={() => setLanguage('vi')}
                    aria-label="Switch to Vietnamese"
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${
                        language === 'vi' ? 'bg-zinc-800 text-orange-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    VN
                </button>
                <button
                    onClick={() => setLanguage('en')}
                    aria-label="Switch to English"
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${
                        language === 'en' ? 'bg-zinc-800 text-orange-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    EN
                </button>
            </div>
        </div>
    );
};

export const Header: React.FC = () => {
  return (
    <HeaderControls />
  );
}