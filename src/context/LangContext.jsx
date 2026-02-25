import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGS = ['ar'];

const LangContext = createContext({});

export const LangProvider = ({ children }) => {
    const { i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
        setCurrentLang(lang);
    };

    useEffect(() => {
        const isRTL = RTL_LANGS.includes(currentLang);
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLang;
    }, [currentLang]);

    // Sync if language changed externally
    useEffect(() => {
        const handleLangChange = (lng) => setCurrentLang(lng);
        i18n.on('languageChanged', handleLangChange);
        return () => i18n.off('languageChanged', handleLangChange);
    }, [i18n]);

    return (
        <LangContext.Provider value={{ currentLang, changeLanguage }}>
            {children}
        </LangContext.Provider>
    );
};

export const useLang = () => useContext(LangContext);

export default LangContext;
