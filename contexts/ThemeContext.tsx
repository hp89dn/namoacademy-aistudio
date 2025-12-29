import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'warm' | 'cold';

export interface ThemeClasses {
    id: ThemeType;
    appBg: string;
    panelBg: string;
    navBg: string;
    textMain: string;
    textSub: string;
    border: string;
    accent: string;
    buttonSecondary: string;
    inputBg: string;
}

const themes: Record<ThemeType, ThemeClasses> = {
    light: {
        id: 'light',
        appBg: 'bg-[#f8fafc]',
        panelBg: 'bg-[#ffffff]',
        navBg: 'bg-white/90',
        textMain: 'text-slate-900',
        textSub: 'text-slate-500',
        border: 'border-slate-200',
        accent: 'text-orange-600',
        buttonSecondary: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200',
        inputBg: 'bg-white border border-slate-200',
    },
    dark: {
        id: 'dark',
        appBg: 'bg-[#09090b]', // Deep Black (Zinc 950)
        panelBg: 'bg-[#121214]', // Dark Grey (Zinc 900ish)
        navBg: 'bg-[#121214]/90',
        textMain: 'text-zinc-100',
        textSub: 'text-zinc-500',
        border: 'border-zinc-800', // Subtle borders
        accent: 'text-orange-500',
        buttonSecondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
        inputBg: 'bg-[#18181b]',
    },
    warm: {
        id: 'warm',
        appBg: 'bg-[#1c1917]',
        panelBg: 'bg-[#292524]',
        navBg: 'bg-[#292524]/90',
        textMain: 'text-stone-200',
        textSub: 'text-stone-400',
        border: 'border-stone-700',
        accent: 'text-amber-500',
        buttonSecondary: 'bg-stone-700 hover:bg-stone-600 text-stone-200',
        inputBg: 'bg-stone-900/70',
    },
    cold: {
        id: 'cold',
        appBg: 'bg-[#020617]',
        panelBg: 'bg-[#0f172a]',
        navBg: 'bg-[#0f172a]/90',
        textMain: 'text-blue-100',
        textSub: 'text-blue-300',
        border: 'border-blue-900',
        accent: 'text-cyan-400',
        buttonSecondary: 'bg-blue-900/50 hover:bg-blue-800 text-blue-100 border border-blue-800',
        inputBg: 'bg-[#172033]/70',
    }
};

interface ThemeContextType {
    theme: ThemeClasses;
    setThemeType: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [themeType, setThemeType] = useState<ThemeType>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('app_theme') as ThemeType;
        if (savedTheme && themes[savedTheme]) {
            setThemeType(savedTheme);
        }
    }, []);

    const handleSetTheme = (type: ThemeType) => {
        setThemeType(type);
        localStorage.setItem('app_theme', type);
    };

    return (
        <ThemeContext.Provider value={{ theme: themes[themeType], setThemeType: handleSetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};