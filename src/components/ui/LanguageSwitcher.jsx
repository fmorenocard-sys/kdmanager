import React, { useState, useRef, useEffect } from 'react';
import { Globe } from './icons';
import { useLang } from '../../context/LangContext';
import { cn } from '../../lib/utils';

const LANGS = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'tr', label: 'TR', name: 'Türkçe' },
    { code: 'uk', label: 'UK', name: 'Українська' },
    { code: 'ar', label: 'AR', name: 'عربي' },
    { code: 'pl', label: 'PL', name: 'Polski' },
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'vi', label: 'VI', name: 'Tiếng Việt' },
];

const LanguageSwitcher = () => {
    const { currentLang, changeLanguage } = useLang();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeLang = LANGS.find(l => l.code === currentLang) || LANGS[0];

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                data-testid="language-switcher-button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-bold"
                aria-label="Switch language"
            >
                <Globe size={15} />
                <span className="hidden sm:inline">{activeLang.label}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {LANGS.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => { changeLanguage(lang.code); setOpen(false); }}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                                currentLang === lang.code
                                    ? "text-indigo-400 bg-indigo-500/10"
                                    : "text-slate-300 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <span className="font-medium">{lang.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{lang.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
