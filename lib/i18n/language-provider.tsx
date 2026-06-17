"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  dictionaries,
  type Locale,
  type TranslationKey,
} from "./dictionaries";

const STORAGE_KEY = "jogastop:language";
const SERVER_ERROR_KEYS: Record<string, TranslationKey> = {
  "A ligação à sala falhou. Tenta novamente.": "error.connection",
  "A tua sessão expirou. Volta a entrar na sala.": "error.session",
  "Não conseguimos carregar a sala. Tenta novamente.": "error.load",
  "Este código já pertence a outra sala. Tenta novamente.": "error.codeInUse",
  "Não encontramos esta sala.": "error.roomNotFound",
  "Não podes entrar nesta sala agora.": "error.cannotJoin",
  "Esta acção já não está disponível.": "error.actionUnavailable",
  "Este código de sala não é válido.": "error.invalidCode",
  "Confirma o teu nome e tenta novamente.": "error.confirmName",
  "Algo correu mal. Tenta novamente.": "error.generic",
  "Não conseguimos actualizar a tua presença.": "error.presence",
  "Esta acção não é válida.": "error.invalidAction",
  "Não conseguimos guardar as respostas.": "error.saveAnswers",
  "Este voto não é válido.": "error.invalidVote",
};

type Values = Record<string, string | number>;
type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Values) => string;
  category: (category: string) => string;
  errorMessage: (error: unknown) => string | undefined;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt");
  const preferenceLoaded = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const timeout = window.setTimeout(() => {
      preferenceLoaded.current = true;
      if (saved === "pt" || saved === "en" || saved === "fr") setLocale(saved);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded.current) return;
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang =
      locale === "pt" ? "pt-AO" : locale === "en" ? "en" : "fr";
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => {
    function t(key: TranslationKey, values: Values = {}) {
      return Object.entries(values).reduce(
        (text, [name, replacement]) =>
          text.replaceAll(`{${name}}`, String(replacement)),
        dictionaries[locale][key],
      );
    }

    return {
      locale,
      setLocale,
      t,
      category: (name) => {
        const key = `category.${name}` as TranslationKey;
        return key in dictionaries[locale] ? dictionaries[locale][key] : name;
      },
      errorMessage: (error) => {
        if (!(error instanceof Error)) return undefined;
        const key = SERVER_ERROR_KEYS[error.message];
        return key ? t(key) : error.message;
      },
    };
  }, [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
