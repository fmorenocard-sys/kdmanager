import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from './icons';

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
            className="inline-flex items-center gap-2 min-h-[44px] px-3 sm:px-4 rounded-xl border border-[var(--border-flat)] text-[var(--text-secondary)] text-[13px] font-bold hover:text-[var(--text-primary)] hover:bg-[var(--border-flat)] transition-colors"
        >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
            <span className="hidden sm:inline">{isLight ? 'Dark' : 'Light'}</span>
        </button>
    );
};

export default ThemeToggle;
