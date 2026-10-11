import { createContext, useContext } from "react";
import { translate, type Language } from "@saathi/core";
export const LanguageContext = createContext({
  language: "en" as Language,
  setLanguage: (_language: Language) => {},
});
export function useLanguage() {
  const value = useContext(LanguageContext);
  return { ...value, t: (text: string) => translate(value.language, text) };
}
