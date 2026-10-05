'use client';
import {MapPin,Clock,AlertCircle,Route as RouteIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Skeleton} from '@/components/ui/skeleton';
import {Badge} from '@/components/ui/badge';
import {useLanguage} from '@/lib/i18n';
import {time,date} from '@/lib/api';
import type {DepartureDTO} from '@saathi/contracts';
export function Picker({label,value,onChange,items,id}:{label:string;value:string;onChange:(v:string)=>void;items:{value:string;label:string}[];id:string}){const {t}=useLanguage();return <div className="field"><Label htmlFor={id}>{t(label)}</Label><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full h-12 bg-white"><SelectValue/></SelectTrigger><SelectContent>{items.map(i=><SelectItem key={i.value} value={i.value}>{t(i.label)}</SelectItem>)}</SelectContent></Select></div>}
export function RouteLine({departure,compact=false}:{departure:Pick<DepartureDTO,'pickup'|'destination'>;compact?:boolean}){const {t}=useLanguage();return <div className={`route-line ${compact?'compact':''}`}><div className="route-markers"><span/><i/><MapPin size={15}/></div><div className="route-names"><strong>{t(departure.pickup)}</strong><strong>{t(departure.destination)}</strong></div></div>}
export function TripTime({departure}:{departure:DepartureDTO}){return <div className="trip-time"><Clock size={15}/><span>{date(departure.departureAt)}</span><strong>{time(departure.departureAt)}</strong></div>}
export function Status({value}:{value:string}){const {t}=useLanguage();const labels:Record<string,string>={confirmed:'Confirmed',completed:'Completed','passenger-cancelled':'Cancelled','departure-cancelled':'Cancelled',cancelled:'Cancelled','in-progress':'In progress',scheduled:'Scheduled',accepted:'Accepted',pending:'Pending',declined:'Declined',unassigned:'Unassigned','no-show':'No show'};return <Badge variant="outline" className={`status status-${value}`}>{t(labels[value]||value)}</Badge>}
export function LoadingCards(){return <div aria-busy="true" className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} className="h-48 rounded-xl"/>)}</div>}
export function ErrorState({error,retry}:{error:Error|null;retry:()=>void}){const {t}=useLanguage();return <div role="alert" className="error-panel"><AlertCircle size={24}/><div><strong>{t('Network unavailable')}</strong><p>{error?.message||t('Check your connection and retry.')}</p><Button variant="outline" onClick={retry}>{t('Retry')}</Button></div></div>}
export function Empty({title,description,children}:{title:string;description?:string;children?:React.ReactNode}){const {t}=useLanguage();return <div className="empty-state"><RouteIcon size={32}/><h3>{t(title)}</h3>{description&&<p>{t(description)}</p>}{children}</div>}
