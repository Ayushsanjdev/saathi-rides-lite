import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type ThemePreference = 'light' | 'dark' | 'system';
const light = { ink:'#163b53', green:'#176b50', background:'#f5f8fa', card:'#ffffff', muted:'#5f7281', border:'#dce5eb', red:'#b42318', buttonText:'#ffffff', success:'#e7f2eb', warning:'#fff3cd', danger:'#fde8e7', info:'#e8f1ff' };
const dark: typeof light = { ink:'#e5edf3', green:'#83dbb1', background:'#101c25', card:'#192b37', muted:'#a5b7c4', border:'#354d5d', red:'#ffaaa0', buttonText:'#102c21', success:'#1d4033', warning:'#44371d', danger:'#492c2c', info:'#263e59' };
export const palettes = { light, dark };
const ThemeContext = createContext({ preference:'system' as ThemePreference, scheme:'light' as 'light'|'dark', colors:light, setPreference:(_value:ThemePreference)=>{} });
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const device = useColorScheme();
  const [preference, change] = useState<ThemePreference>('system');
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(()=>{ let active=true; void AsyncStorage.getItem('saathi-theme').then(value=>{if(active&&!changed.current&&(value==='light'||value==='dark'||value==='system'))change(value)}).catch(()=>{}); return ()=>{active=false}; },[]);
  const setPreference=(value:ThemePreference)=>{changed.current=true;change(value);writes.current=writes.current.then(()=>AsyncStorage.setItem('saathi-theme',value)).catch(()=>{});};
  useEffect(() => { Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference); return () => Appearance.setColorScheme('unspecified'); }, [preference]);
  const scheme = preference==='system' ? (device==='dark'?'dark':'light') : preference;
  return <ThemeContext.Provider value={{preference,scheme,colors:palettes[scheme],setPreference}}>{children}</ThemeContext.Provider>;
}
export function useTheme(){return useContext(ThemeContext);}
