import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKey } from "../lib/translations";
import { useAuth } from "@/lib/useAuth"; // 👈 1. Importamos la autenticación

// 👈 Solución: Re-exportamos el tipo Language para que otros archivos puedan importarlo desde aquí
export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language, userInitiated?: boolean) => void;
  setClubDefaultLanguage: (lang: string) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // 👈 2. Obtenemos el usuario activo

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language") as Language;
    return saved || "es";
  });

  const [hasUserPreference, setHasUserPreference] = useState<boolean>(() => {
    return !!localStorage.getItem("app_language");
  });

  // 👈 3. NUEVO: Si el usuario inició sesión/se inscribió y tiene un idioma en su perfil, se aplica globalmente
  useEffect(() => {
    const playerLang = (user as any)?.playerLanguage || (user as any)?.language;
    if (playerLang && (playerLang === "es" || playerLang === "en" || playerLang === "pt")) {
      setLanguageState(playerLang as Language);
    }
  }, [user]);

  const setLanguage = (lang: Language, userInitiated: boolean = false) => {
    setLanguageState(lang);
    if (userInitiated) {
      localStorage.setItem("app_language", lang);
      setHasUserPreference(true);
    }
  };

  const setClubDefaultLanguage = (clubLang: string) => {
    if (!hasUserPreference && (clubLang === "es" || clubLang === "en" || clubLang === "pt")) {
      setLanguageState(clubLang as Language);
    }
  };

  const t = (key: TranslationKey): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    // Fallback a español si no existe en el idioma actual
    if (translations.es && translations.es[key]) {
      return translations.es[key];
    }
    return key;
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
