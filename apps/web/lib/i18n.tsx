"use client";
import { createContext, useContext } from "react";
import { translate, type Language } from "@saathi/core";
export type { Language } from "@saathi/core";
export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({ language: "en", setLanguage: () => {} });
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (text: string) => translate(context.language, text) };
}
