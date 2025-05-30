import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import esTranslations from "./locales/es.json";
import enTranslations from "./locales/en.json";
import frTranslations from "./locales/fr.json";

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: esTranslations,
    },
    en: {
      translation: enTranslations,
    },
    fr: {
      translation: frTranslations,
    },
  },
  lng: "es", // default language
  fallbackLng: "es",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
