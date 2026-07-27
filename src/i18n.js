import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import de from './locales/de/translation.json';
import tr from './locales/tr/translation.json';
import uk from './locales/uk/translation.json';
import ar from './locales/ar/translation.json';
import pl from './locales/pl/translation.json';
import es from './locales/es/translation.json';
import vi from './locales/vi/translation.json';
import it from './locales/it/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'fr', 'de', 'tr', 'uk', 'ar', 'pl', 'es', 'vi', 'it'],
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'kd_lang',
        },
        resources: {
            en: { translation: en },
            fr: { translation: fr },
            de: { translation: de },
            tr: { translation: tr },
            uk: { translation: uk },
            ar: { translation: ar },
            pl: { translation: pl },
            es: { translation: es },
            vi: { translation: vi },
            it: { translation: it },
        },
        interpolation: { escapeValue: false },
    });

export default i18n;
