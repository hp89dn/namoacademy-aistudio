
import React from 'react';
import { Icon } from '../icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export const PromptInput: React.FC<{ prompt: string, setPrompt: (value: any) => void, placeholder: string }> = ({ prompt, setPrompt, placeholder }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setPrompt((p: string) => p ? `${p} ${text}` : text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    };
    return (
        <>
            <div className="flex justify-between items-center mb-2">
                <h3 className={`font-semibold ${theme.textMain}`}>{t('prompt')}</h3>
                <button onClick={handlePaste} title="Paste" className={`${theme.textSub} hover:text-orange-400`}><Icon name="clipboard" className="w-5 h-5"/></button>
            </div>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                className={`w-full ${theme.inputBg} ${theme.textMain} p-3 rounded-md h-28 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border ${theme.border}`}
            />
        </>
    );
};
