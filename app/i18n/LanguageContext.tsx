'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Locale, type TranslationKeys } from './translations';

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function detectBrowserLocale(): Locale {
    if (typeof window === 'undefined') return 'en';

    // Check localStorage first (user preference)
    const saved = localStorage.getItem('image-compressor-lang');
    if (saved === 'en' || saved === 'es') return saved;

    // Detect from browser language
    const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setLocaleState(detectBrowserLocale());
        setMounted(true);
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('image-compressor-lang', newLocale);
    };

    // Avoid hydration mismatch by rendering with default until mounted
    const effectiveLocale: Locale = mounted ? locale : 'en';
    const t = translations[effectiveLocale];

    return (
        <LanguageContext.Provider value={{ locale: effectiveLocale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}
