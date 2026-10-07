'use client';
import {useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {api} from '@/lib/api';
import {useLanguage} from '@/lib/i18n';
import type {UserDTO} from '@saathi/contracts';
export type PublicConfig={supportPhone:string|null;demo:{password:string}|null;demoSignIn?:boolean};
export function AuthDialog({open,setOpen,config}:{open:boolean;setOpen:(open:boolean)=>void;config?:PublicConfig}){
  const {t}=useLanguage();const qc=useQueryClient();const [register,setRegister]=useState(false);const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
  const mutation=useMutation({mutationFn:()=>api<{user:UserDTO}>(`/auth/${register?'register':'login'}`,{method:'POST',body:{...(register?{name}:{}),email,password}}),onSuccess:data=>{qc.setQueryData(['me'],data.user);setOpen(false);setPassword('');toast.success(t('You are signed in'));}});
  const demoMutation=useMutation({mutationFn:()=>api<{user:UserDTO}>('/auth/demo',{method:'POST'}),onSuccess:data=>{qc.setQueryData(['me'],data.user);setOpen(false);setPassword('');toast.success(t('You are signed in'));}});
  return <Dialog open={open} onOpenChange={o=>{setOpen(o);mutation.reset();demoMutation.reset();}}><DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle className="text-2xl">{t(register?'Create your account':'Welcome back')}</DialogTitle><DialogDescription>{t('Your local ride')}</DialogDescription></DialogHeader><form className="dialog-form mt-3" onSubmit={e=>{e.preventDefault();if(!demoMutation.isPending)mutation.mutate();}}>
  {register&&<div className="field"><Label htmlFor="auth-name">{t('Full name')}</Label><Input id="auth-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80}/></div>}
  <div className="field"><Label htmlFor="auth-email">{t('Email')}</Label><Input id="auth-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
  <div className="field"><Label htmlFor="auth-password">{t('Password')}</Label><Input id="auth-password" type="password" autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128}/></div>
  {mutation.error&&<div className="form-error" role="alert">{mutation.error.message}</div>}
  <Button className="w-full" disabled={mutation.isPending||demoMutation.isPending}>{mutation.isPending?t('Please wait'):t(register?'Create account':'Sign in')}</Button></form>
  {!register&&config?.demoSignIn&&<div className="demo-block"><Button type="button" variant="outline" className="w-full" disabled={mutation.isPending||demoMutation.isPending} onClick={()=>{mutation.reset();demoMutation.mutate();}}>{t(demoMutation.isPending?'Please wait':'Try demo')}</Button><p>{t('Explore with your own demo passenger account.')}</p>{demoMutation.error&&<div className="form-error mt-3" role="alert">{demoMutation.error.message}</div>}</div>}
  <div className="auth-links"><span>{t(register?'Already have an account?':'New here?')}</span><button onClick={()=>{setRegister(!register);mutation.reset();}}>{t(register?'Sign in':'Create account')}</button></div>
  {config?.demo&&<div className="demo-block"><strong className="text-sm">{t('Use a demo account')}</strong><div className="demo-actions">{['passenger','driver','operator'].map(role=><Button key={role} variant="outline" onClick={()=>{setRegister(false);setEmail(`${role}@saathi.test`);setPassword(config.demo!.password);mutation.reset();}}>{t(`Try ${role}`)}</Button>)}</div><p>{t('Demo accounts use real bookings in a shared test area.')}</p></div>}
  </DialogContent></Dialog>;
}
