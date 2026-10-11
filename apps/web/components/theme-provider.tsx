'use client';
import {ThemeProvider as NextThemeProvider, useTheme} from 'next-themes';
import {Toaster} from 'sonner';
import {useEffect, useState} from 'react';
import {useLanguage} from '@/lib/i18n';
export function ThemeProvider({children}:{children:React.ReactNode}){
  return <NextThemeProvider attribute="class" storageKey="saathi-theme" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemeProvider>;
}
export function Appearance(){
  const {theme,setTheme}=useTheme();
  const {t}=useLanguage();
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  return <select className="appearance-select" disabled={!mounted} aria-label={t('Appearance')} value={mounted?theme:'system'} onChange={event=>setTheme(event.target.value)}>
    <option value="system">{t('System')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option>
  </select>;
}
export function ThemeToaster(){const {resolvedTheme}=useTheme();return <Toaster theme={resolvedTheme==='dark'?'dark':'light'} richColors position="top-center"/>;}
