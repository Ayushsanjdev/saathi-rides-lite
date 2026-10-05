'use client';
import {useState,useEffect} from 'react';
import {QueryClient,QueryClientProvider,useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {BusFront,House,Ticket,LifeBuoy,ClipboardList,Users,Route,History,MapPin,WifiOff,CalendarDays,UserRound} from 'lucide-react';
import {Toaster,toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api,ApiError} from '@/lib/api';
import {LanguageContext,useLanguage,type Language} from '@/lib/i18n';
import {AuthDialog,type PublicConfig} from './auth-dialog';
import {Rider} from './rider';
import {DriverView} from './driver';
import {OperatorView} from './operator';
import {ErrorState} from './shared';
import type {UserDTO} from '@saathi/contracts';
export default function App(){
  const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:20000,retry:1,refetchOnWindowFocus:true},mutations:{retry:false}}}));
  const [language,setLanguage]=useState<Language>('en');
  useEffect(()=>{if(localStorage.getItem('saathi-language')==='hi')setLanguage('hi');},[]);
  useEffect(()=>{document.documentElement.lang=language;localStorage.setItem('saathi-language',language);},[language]);
  return <QueryClientProvider client={client}><LanguageContext.Provider value={{language,setLanguage}}><Workspace/><Toaster richColors position="top-center"/></LanguageContext.Provider></QueryClientProvider>;
}
function Workspace(){
  const {t,language,setLanguage}=useLanguage();const qc=useQueryClient();const [view,setView]=useState('book');const [auth,setAuth]=useState(false);const [account,setAccount]=useState(false);const [offline,setOffline]=useState(false);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  const me=useQuery({queryKey:['me'],queryFn:async()=>{try{return (await api<{user:UserDTO}>('/me')).user;}catch(e){if(e instanceof ApiError&&e.status===401)return null;throw e;}},retry:false});
  const config=useQuery({queryKey:['config'],queryFn:()=>api<PublicConfig>('/config'),staleTime:Infinity});
  const user=me.data;const role=user?.role||'passenger';
  const views=role==='operator'?[{id:'departures',label:'Departures',icon:CalendarDays},{id:'drivers',label:'Drivers',icon:Users},{id:'routes',label:'Routes',icon:Route},{id:'activity',label:'Activity',icon:History}]:role==='driver'?[{id:'trips',label:'Trips',icon:ClipboardList},{id:'history',label:'History',icon:History},{id:'help',label:'Help',icon:LifeBuoy}]:[{id:'book',label:'Book a ride',icon:House},{id:'rides',label:'My rides',icon:Ticket},{id:'help',label:'Help',icon:LifeBuoy}];
  const active=views.some(v=>v.id===view)?view:views[0].id;
  const logout=useMutation({mutationFn:()=>api('/auth/logout',{method:'POST',body:{}}),onSuccess:()=>{qc.clear();qc.setQueryData(['me'],null);setAccount(false);setView('book');},onError:e=>toast.error(e.message)});
  const nav=(mobile=false)=><nav className={mobile?'bottom-nav':undefined} aria-label={mobile?'Mobile navigation':'Main navigation'}>{views.map(v=><button key={v.id} className={active===v.id?'active':''} aria-current={active===v.id?'page':undefined} onClick={()=>setView(v.id)}><v.icon size={20}/><span>{t(v.label)}</span></button>)}{mobile&&<button onClick={()=>user?setAccount(true):setAuth(true)}><UserRound/><span>{t('Account')}</span></button>}</nav>;
  return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark"><BusFront size={24}/></span>saathi<span className="sr-only">Rides</span></div><div className="header-actions"><Button variant="ghost" className="language-button" onClick={()=>setLanguage(language==='en'?'hi':'en')}>{language==='en'?'हिन्दी':'English'}</Button>{user?<Button variant="ghost" aria-label="Account" onClick={()=>setAccount(true)}><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><span className="hidden sm:inline">{user.name.split(' ')[0]}</span></Button>:<Button variant="outline" onClick={()=>setAuth(true)}>{t('Sign in')}</Button>}</div></header>
  {offline&&<div className="offline-bar" role="status"><WifiOff size={16} className="inline mr-2"/>{t('Check your connection and retry.')} {t('Booking is not confirmed until the service responds.')}</div>}
  <div className="layout"><aside className="sidebar">{nav()}<div className="local-area"><MapPin size={19}/><strong>{t('Rampur & nearby towns')}</strong>{t('Shared e-rickshaw')}{config.data?.demo&&<p className="mt-3">{t('Demo service')}</p>}</div></aside><main className="main-content">
  {me.error?<ErrorState error={me.error} retry={()=>me.refetch()}/>:active==='help'?<Help config={config.data}/>:role==='operator'&&user?<OperatorView user={user} view={active}/>:role==='driver'&&user?<DriverView user={user} view={active}/>:<Rider user={user||null} view={active} navigate={setView} signIn={()=>setAuth(true)} demo={!!config.data?.demo}/>}
  </main></div>{nav(true)}
  <AuthDialog open={auth} setOpen={setAuth} config={config.data}/>
  <Dialog open={account} onOpenChange={setAccount}><DialogContent><DialogHeader><DialogTitle>{t('Your account')}</DialogTitle><DialogDescription>{t('Current role')}: {t(role==='passenger'?'Passenger':role==='driver'?'Driver':'Operator')}</DialogDescription></DialogHeader><div className="account-info"><div><p>{t('Full name')}</p><strong>{user?.name}</strong></div><div><p>{t('Email')}</p><strong>{user?.email}</strong></div><Button variant="outline" onClick={()=>logout.mutate()} disabled={logout.isPending}>{t('Sign out')}</Button></div></DialogContent></Dialog>
  </div>;
}
function Help({config}:{config?:PublicConfig}){const {t}=useLanguage();return <><div className="page-heading"><h1>{t('Need a hand?')}</h1><p>{t('About this service')}</p></div><div className="help-list"><section className="help-item"><h2>{t('Booking support')}</h2><p>{config?.supportPhone?config.supportPhone:t('Support number is not configured. Ask your local operator.')}</p>{config?.supportPhone&&<Button asChild variant="outline"><a href={`tel:${config.supportPhone}`}>{t('Booking support')}</a></Button>}</section><section className="help-item"><h2>{t('Cancellation policy')}</h2><p>{t('Cancel before the scheduled departure or trip start, whichever comes first.')}</p></section><section className="help-item"><h2>{t('Cash payment')}</h2><p>{t('Cash is paid directly to the driver.')}</p></section><section className="help-item"><h2>{t('About this service')}</h2><p>{t('Scheduled e-rickshaw rides from local pickup points.')}</p><p className="mt-3">{t('This service does not provide emergency transport.')}</p>{config?.demo&&<p className="mt-3">{t('Demo service')}: {t('No actual transport is dispatched.')}</p>}</section></div></>}
