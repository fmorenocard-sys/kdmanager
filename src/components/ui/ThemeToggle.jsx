import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'kd_theme';

const applyTheme = (theme) => {
    const root = document.documentElement;
    // v1 legacy `transition-all` elements never settle if they animate the
    // theme flip — suspend all transitions for the swap (index.css guard).
    root.classList.add('theme-switching');
    root.classList.toggle('light', theme === 'light');
    void root.offsetHeight; // force reflow with transitions disabled
    window.setTimeout(() => root.classList.remove('theme-switching'), 80);
};

/**
 * v2 — light/dark toggle. Dark is the default; the 'light' class on <html>
 * flips the token set defined in index.css. Preference persists in localStorage.
 */
const ThemeToggle = () => {
    const { t } = useTranslation();
    const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'dark');

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const isLight = theme === 'light';

    return (
        <button
            type="button"
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            aria-label={t('common.toggle_theme')}
            title={t('common.toggle_theme')}
            aria-pressed={isLight}
            className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>
    );
};

export default ThemeToggle;
