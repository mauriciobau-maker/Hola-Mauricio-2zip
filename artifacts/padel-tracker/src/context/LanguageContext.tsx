import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKey } from "../lib/translations";
import { useAuth } from "@workspace/replit-auth-web";

export type { Language, TranslationKey };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  setClubDefaultLanguage: (lang: string) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_language") as Language;
      if (saved === "es" || saved === "en" || saved === "pt") {
        return saved;
      }
    }
    return "es";
  });

  const [hasManualPreference, setHasManualPreference] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("app_language");
    }
    return false;
  });

  // Si el usuario no ha escogido un idioma manualmente, usar el de su perfil de usuario o club
  useEffect(() => {
    if (!hasManualPreference && user) {
      const playerLang = (user as any)?.playerLanguage || (user as any)?.language;
      if (playerLang && (playerLang === "es" || playerLang === "en" || playerLang === "pt")) {
        setLanguageState(playerLang as Language);
      }
    }
  }, [user, hasManualPreference]);

  const setLanguage = (lang: Language) => {
    if (lang !== "es" && lang !== "en" && lang !== "pt") return;
    setLanguageState(lang);
    setHasManualPreference(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_language", lang);
    }
  };

  const setClubDefaultLanguage = (clubLang: string) => {
    if (!hasManualPreference && (clubLang === "es" || clubLang === "en" || clubLang === "pt")) {
      setLanguageState(clubLang as Language);
    }
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback al diccionario en español
    if (translations.es && translations.es[key]) {
      return translations.es[key];
    }
    // Fallback explícito o la clave
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, setClubDefaultLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage debe ser usado dentro de un LanguageProvider");
  }
  return context;
};
