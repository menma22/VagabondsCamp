import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '../lib/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('ja');

    useEffect(() => {
        const savedLang = localStorage.getItem('app_language') as Language;
        if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
            setLanguage(savedLang);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('app_language', lang);
    };

    const t = (path: string, params?: Record<string, string | number>): any => {
        const keys = path.split('.');
        let value: any = translations[language];

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key as keyof typeof value];
            } else {
                console.warn(`Translation missing for key: ${path} in language: ${language}`);
                return path;
            }
        }

        if (typeof value === 'string' && params) {
            return Object.entries(params).reduce((acc, [key, val]) => {
                return acc.replace(`{${key}}`, String(val));
            }, value);
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
