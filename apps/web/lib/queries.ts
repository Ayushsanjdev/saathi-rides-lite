import {infiniteQueryOptions,queryOptions} from '@tanstack/react-query';
import {api,ApiError} from './api';
import type {UserDTO,StopDTO,RouteDTO,DepartureDTO,BookingDTO,DeparturePageDTO,OverviewDTO} from '@saathi/contracts';
import type {PublicConfig} from '@/components/auth-dialog';

export type DepartureFilters={from:string;to:string;date:string};
type BookingPage={bookings:BookingDTO[];page:number;hasMore:boolean};
type Manifest={departure:DepartureDTO;bookings:BookingDTO[]};

// Screens and intent prefetching must share keys, request functions and freshness.
export const queries={
  me:()=>queryOptions({queryKey:['me'],queryFn:async()=>{
    try{return (await api<{user:UserDTO}>('/me')).user;}
    catch(error){if(error instanceof ApiError&&error.status===401)return null;throw error;}
  },retry:false}),
  config:()=>queryOptions({queryKey:['config'],queryFn:()=>api<PublicConfig>('/config'),staleTime:Infinity}),
  stops:()=>queryOptions({queryKey:['stops'],queryFn:()=>api<{stops:StopDTO[]}>('/stops'),staleTime:300_000}),
  routes:()=>queryOptions({queryKey:['routes'],queryFn:()=>api<{routes:RouteDTO[]}>('/routes'),staleTime:300_000}),
  departures:(filters:DepartureFilters)=>queryOptions({queryKey:['departures',filters],queryFn:()=>api<{departures:DepartureDTO[]}>(`/departures?${new URLSearchParams(filters)}`)}),
  bookings:(userId:string)=>infiniteQueryOptions({queryKey:['bookings',userId],queryFn:({pageParam})=>api<BookingPage>(`/bookings?page=${pageParam}&limit=30`),initialPageParam:1,getNextPageParam:(last:BookingPage)=>last.hasMore?last.page+1:undefined}),
  driverTrips:(userId:string,history:boolean)=>infiniteQueryOptions({queryKey:['driver-trips',userId,history],queryFn:({pageParam})=>api<DeparturePageDTO>(`/driver/trips?history=${history}&page=${pageParam}&limit=30`),initialPageParam:1,getNextPageParam:(last:DeparturePageDTO)=>last.hasMore?last.page+1:undefined}),
  driverOverview:(userId:string)=>queryOptions({queryKey:['driver',userId],queryFn:()=>api<{trips:DepartureDTO[];collectedPaise:number;completedTrips:number}>('/driver/overview')}),
  manifest:(userId:string,tripId:string)=>queryOptions({queryKey:['manifest',userId,tripId],queryFn:()=>api<Manifest>(`/driver/trips/${tripId}/manifest`)}),
  operatorOverview:(userId:string)=>queryOptions({queryKey:['operator',userId],queryFn:()=>api<OverviewDTO>('/operator/overview')}),
  operatorDepartures:(userId:string,history:boolean)=>infiniteQueryOptions({queryKey:['operator-departures',userId,history],queryFn:({pageParam})=>api<DeparturePageDTO>(`/operator/departures?history=${history}&page=${pageParam}&limit=30`),initialPageParam:1,getNextPageParam:(last:DeparturePageDTO)=>last.hasMore?last.page+1:undefined}),
};
