'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import type { Locale } from '../i18n/translations';

function USFlag({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
            <rect width="640" height="480" fill="#bd3d44" />
            <rect y="37" width="640" height="37" fill="#fff" />
            <rect y="111" width="640" height="37" fill="#fff" />
            <rect y="185" width="640" height="37" fill="#fff" />
            <rect y="259" width="640" height="37" fill="#fff" />
            <rect y="333" width="640" height="37" fill="#fff" />
            <rect y="407" width="640" height="37" fill="#fff" />
            <rect width="260" height="259" fill="#192f5d" />
        </svg>
    );
}

function SpainFlag({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
            <rect width="640" height="480" fill="#c60b1e" />
            <rect y="120" width="640" height="240" fill="#ffc400" />
        </svg>
    );
}

const languages: { code: Locale; label: string; Flag: React.FC<{ className?: string }> }[] = [
    { code: 'en', label: 'English', Flag: USFlag },
    { code: 'es', label: 'Español', Flag: SpainFlag },
];

export default function LanguageSwitcher() {
    const { locale, setLocale } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const current = languages.find(l => l.code === locale) || languages[0];

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center gap-2 h-9 px-3 rounded-full bg-default-100 dark:bg-default-50 hover:bg-default-200 dark:hover:bg-default-100 transition-all duration-200 text-sm font-medium text-foreground cursor-pointer select-none"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <current.Flag className="w-5 h-3.5 rounded-[2px] object-cover shadow-sm" />
                <span className="text-xs font-semibold">{current.code.toUpperCase()}</span>
                <svg
                    className={`w-3 h-3 text-foreground-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 mt-2 w-40 py-1 rounded-xl bg-white dark:bg-zinc-800 shadow-lg border border-default-200 dark:border-zinc-700 z-50"
                    role="listbox"
                    aria-label="Select language"
                >
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            role="option"
                            aria-selected={locale === lang.code}
                            onClick={() => { setLocale(lang.code); setOpen(false); }}
                            className={`
                                flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors cursor-pointer
                                ${locale === lang.code
                                    ? 'bg-primary-50 dark:bg-primary-500/15 text-primary font-semibold'
                                    : 'text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700'
                                }
                            `}
                        >
                            <lang.Flag className="w-5 h-3.5 rounded-[2px] shadow-sm flex-shrink-0" />
                            <span>{lang.label}</span>
                            {locale === lang.code && (
                                <svg className="w-4 h-4 ml-auto text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
