'use client';
import {useState,useEffect,useLayoutEffect,useRef} from 'react';
import dynamic from 'next/dynamic';
import {QueryClient,QueryClientProvider,useQuery,useQueryClient} from '@tanstack/react-query';
import {BusFront,House,Ticket,LifeBuoy,ClipboardList,Users,Route,History,MapPin,WifiOff,CalendarDays,UserRound} from 'lucide-react';
import {toast} from 'sonner';
import {Appearance,ThemeToaster} from './theme-provider';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Skeleton} from '@/components/ui/skeleton';
import {api} from '@/lib/api';
import {queries} from '@/lib/queries';
import {useSingleMutation} from '@/lib/mutations';
import {LanguageContext,useLanguage,type Language} from '@/lib/i18n';
import {AuthDialog,type PublicConfig} from './auth-dialog';
import {Rider} from './rider';
import {ErrorState,LoadingCards} from './shared';

const DriverView=dynamic(()=>import('./driver').then(module=>module.DriverView),{loading:WorkspaceLoading});
const OperatorView=dynamic(()=>import('./operator').then(module=>module.OperatorView),{loading:WorkspaceLoading});
function WorkspaceLoading(){return <div className="workspace-loading" role="status" aria-busy="true"><Skeleton className="heading-skeleton"/><LoadingCards/></div>;}

export default function App(){
  const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:20000,retry:1,refetchOnWindowFocus:true,refetchIntervalInBackground:false},mutations:{retry:false}}}));
  const [language,setLanguage]=useState<Language>('en');
  useEffect(()=>{if(localStorage.getItem('saathi-language')==='hi')setLanguage('hi');},[]);
  useEffect(()=>{document.documentElement.lang=language;localStorage.setItem('saathi-language',language);},[language]);
  return <QueryClientProvider client={client}><LanguageContext.Provider value={{language,setLanguage}}><Workspace/><ThemeToaster/></LanguageContext.Provider></QueryClientProvider>;
}
function Workspace(){
  const {t,language,setLanguage}=useLanguage();const qc=useQueryClient();
  const [view,setView]=useState('book');const [workspaceView,setWorkspaceView]=useState('book');
  const [auth,setAuth]=useState(false);const [account,setAccount]=useState(false);const [offline,setOffline]=useState(false);
  const positions=useRef<Record<string,number>>({});
  const me=useQuery(queries.me());const config=useQuery(queries.config());
  const user=me.data;const role=user?.role||'passenger';
  useEffect(()=>{
    // Public reference data loads alongside session resolution, avoiding a waterfall.
    void qc.prefetchQuery(queries.stops());void qc.prefetchQuery(queries.routes());
  },[qc]);
  const previousSession=useRef<string|null>(null);
  useEffect(()=>{
    const previous=previousSession.current;
    if(previous&&previous!==user?.id){
      const privateRoots=new Set(['bookings','driver-trips','driver','manifest','operator','operator-departures']);
      qc.removeQueries({predicate:query=>privateRoots.has(String(query.queryKey[0]))&&query.queryKey[1]===previous});
    }
    previousSession.current=user?.id||null;
  },[user?.id,qc]);
  // Reset before committing children on account changes. Guest -> passenger keeps the chosen ride.
  const [owner,setOwner]=useState<string|null>(null);const [generation,setGeneration]=useState(0);
  const nextOwner=user?.id||null;
  if(me.data!==undefined&&owner!==nextOwner){
    setOwner(nextOwner);
    if(owner!==null){setGeneration(value=>value+1);setView('book');setWorkspaceView('book');setAccount(false);positions.current={};}
  }
  useEffect(()=>{
    const update=()=>setOffline(!navigator.onLine);update();
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  const views=role==='operator'
    ?[{id:'departures',label:'Departures',icon:CalendarDays},{id:'drivers',label:'Drivers',icon:Users},{id:'routes',label:'Routes',icon:Route},{id:'activity',label:'Activity',icon:History}]
    :role==='driver'
      ?[{id:'trips',label:'Trips',icon:ClipboardList},{id:'history',label:'History',icon:History},{id:'help',label:'Help',icon:LifeBuoy}]
      :[{id:'book',label:'Book a ride',icon:House},{id:'rides',label:'My rides',icon:Ticket},{id:'help',label:'Help',icon:LifeBuoy}];
  const active=views.some(item=>item.id===view)?view:views[0].id;
  const currentWorkspaceView=views.some(item=>item.id===workspaceView&&item.id!=='help')?workspaceView:views[0].id;
  function prefetchView(next:string){
    if(!user||offline)return;
    if(role==='passenger'&&next==='rides')void qc.prefetchInfiniteQuery(queries.bookings(user.id));
    if(role==='driver'&&(next==='trips'||next==='history'))void qc.prefetchInfiniteQuery(queries.driverTrips(user.id,next==='history'));
    if(role==='operator'){
      void qc.prefetchQuery(queries.operatorOverview(user.id));
      if(next==='departures')void qc.prefetchInfiniteQuery(queries.operatorDepartures(user.id,false));
    }
  }
  useEffect(()=>{
    if(!user)return;
    if(user.role==='passenger')void qc.prefetchInfiniteQuery(queries.bookings(user.id));
    if(user.role==='driver')void qc.prefetchInfiniteQuery(queries.driverTrips(user.id,true));
  },[user?.id,user?.role,qc]);
  function navigate(next:string){
    if(next===active)return;
    positions.current[active]=window.scrollY;prefetchView(next);
    if(next!=='help')setWorkspaceView(next);
    setView(next);
  }
  useLayoutEffect(()=>{
    const frame=requestAnimationFrame(()=>window.scrollTo({top:positions.current[active]||0,behavior:'instant'}));
    return()=>cancelAnimationFrame(frame);
  },[active,generation]);
  const logout=useSingleMutation({mutationFn:()=>api('/auth/logout',{method:'POST',body:{}}),onSuccess:async()=>{
    await qc.cancelQueries();qc.clear();qc.setQueryData(['me'],null);setAccount(false);setView('book');setWorkspaceView('book');
  },onError:error=>toast.error(error.message)});
  const nav=(mobile=false)=><nav className={mobile?'bottom-nav':undefined} aria-label={mobile?'Mobile navigation':'Main navigation'}>
    {views.map(item=><button key={item.id} className={active===item.id?'active':''} aria-current={active===item.id?'page':undefined} disabled={me.isPending}
      onMouseEnter={()=>prefetchView(item.id)} onFocus={()=>prefetchView(item.id)} onClick={()=>navigate(item.id)}><item.icon size={20}/><span>{t(item.label)}</span></button>)}
    {mobile&&<button disabled={me.isPending} onClick={()=>user?setAccount(true):setAuth(true)}><UserRound/><span>{t('Account')}</span></button>}
  </nav>;
  return <div className="app-shell"><a className="skip-link" href="#main-content">{t('Skip to content')}</a>
    <header className="topbar"><div className="brand"><span className="brand-mark"><BusFront size={24}/></span>saathi<span className="sr-only">Rides</span></div>
      <div className="header-actions"><Appearance/><Button variant="ghost" className="language-button" onClick={()=>setLanguage(language==='en'?'hi':'en')}>{language==='en'?'हिन्दी':'English'}</Button>
        {user?<Button variant="ghost" aria-label="Account" onClick={()=>setAccount(true)}><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><span className="hidden sm:inline">{user.name.split(' ')[0]}</span></Button>
          :<Button variant="outline" disabled={me.isPending} onClick={()=>setAuth(true)}>{t('Sign in')}</Button>}
      </div></header>
    {config.data?.demo&&<div className="demo-access"><span>{t('Demo service')}</span><Button variant="ghost" onClick={()=>setAuth(true)}>{t('Use a demo account')}</Button></div>}
    {offline&&<div className="offline-bar" role="status"><WifiOff size={16} className="inline mr-2"/>{t('Check your connection and retry.')} {t('Booking is not confirmed until the service responds.')}</div>}
    <div className="layout"><aside className="sidebar">{nav()}<div className="local-area"><MapPin size={19}/><strong>{t('Rampur & nearby towns')}</strong>{t('Shared e-rickshaw')}{config.data?.demo&&<p className="mt-3">{t('Demo service')}</p>}</div></aside>
      <main className="main-content" id="main-content" tabIndex={-1}>
        {me.isPending?<WorkspaceLoading/>:me.error&&!me.data?<ErrorState error={me.error} retry={()=>me.refetch()}/>:<>
          {me.error&&<ErrorState error={me.error} retry={()=>me.refetch()}/>}
          <section hidden={active==='help'} key={`${role}:${generation}`}>
            {role==='operator'&&user?<OperatorView user={user} view={currentWorkspaceView} visible={active!=='help'}/>
              :role==='driver'&&user?<DriverView user={user} view={currentWorkspaceView} visible={active!=='help'}/>
                :<Rider user={user||null} view={currentWorkspaceView} visible={active!=='help'} navigate={navigate} signIn={()=>setAuth(true)} demo={!!config.data?.demo}/>}
          </section>{active==='help'&&<Help config={config.data}/>}
        </>}
      </main></div>{nav(true)}
    <AuthDialog key={generation} open={auth} setOpen={setAuth} config={config.data}/>
    <Dialog open={account} onOpenChange={setAccount}><DialogContent><DialogHeader><DialogTitle>{t('Your account')}</DialogTitle><DialogDescription>{t('Current role')}: {t(role==='passenger'?'Passenger':role==='driver'?'Driver':'Operator')}</DialogDescription></DialogHeader><div className="account-info"><div><p>{t('Full name')}</p><strong>{user?.name}</strong></div><div><p>{t('Email')}</p><strong>{user?.email}</strong></div><Button variant="outline" onClick={()=>logout.mutate()} disabled={logout.isPending}>{t('Sign out')}</Button></div></DialogContent></Dialog>
  </div>;
}
function Help({config}:{config?:PublicConfig}){const {t}=useLanguage();return <><div className="page-heading"><h1>{t('Need a hand?')}</h1><p>{t('About this service')}</p></div><div className="help-list"><section className="help-item"><h2>{t('Booking support')}</h2><p>{config?.supportPhone?config.supportPhone:t('Support number is not configured. Ask your local operator.')}</p>{config?.supportPhone&&<Button asChild variant="outline"><a href={`tel:${config.supportPhone}`}>{t('Booking support')}</a></Button>}</section><section className="help-item"><h2>{t('Cancellation policy')}</h2><p>{t('Cancel before the scheduled departure or trip start, whichever comes first.')}</p></section><section className="help-item"><h2>{t('Cash payment')}</h2><p>{t('Cash is paid directly to the driver.')}</p></section><section className="help-item"><h2>{t('About this service')}</h2><p>{t('Scheduled e-rickshaw rides from local pickup points.')}</p><p className="mt-3">{t('This service does not provide emergency transport.')}</p>{config?.demo&&<p className="mt-3">{t('Demo service')}: {t('No actual transport is dispatched.')}</p>}</section></div></>}
