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
  const roleDemoMutation=useMutation({mutationFn:(demoEmail:string)=>api<{user:UserDTO}>('/auth/login',{method:'POST',body:{email:demoEmail,password:config?.demo?.password}}),onSuccess:data=>{qc.setQueryData(['me'],data.user);setOpen(false);setPassword('');toast.success(t('You are signed in'));}});
  const pending=mutation.isPending||demoMutation.isPending||roleDemoMutation.isPending;
  return <Dialog open={open} onOpenChange={o=>{setOpen(o);mutation.reset();demoMutation.reset();roleDemoMutation.reset();}}><DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle className="text-2xl">{t(register?'Create your account':'Welcome back')}</DialogTitle><DialogDescription>{t('Your local ride')}</DialogDescription></DialogHeader><form className="dialog-form mt-3" onSubmit={e=>{e.preventDefault();if(!pending)mutation.mutate();}}>
  {register&&<div className="field"><Label htmlFor="auth-name">{t('Full name')}</Label><Input id="auth-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80}/></div>}
  <div className="field"><Label htmlFor="auth-email">{t('Email')}</Label><Input id="auth-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
  <div className="field"><Label htmlFor="auth-password">{t('Password')}</Label><Input id="auth-password" type="password" autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128}/></div>
  {mutation.error&&<div className="form-error" role="alert">{mutation.error.message}</div>}
  <Button className="w-full" disabled={pending}>{mutation.isPending?t('Please wait'):t(register?'Create account':'Sign in')}</Button></form>
  {!register&&config?.demoSignIn&&!config.demo&&<div className="demo-block"><Button type="button" variant="outline" className="w-full" disabled={pending} onClick={()=>{mutation.reset();demoMutation.mutate();}}>{t(demoMutation.isPending?'Please wait':'Try demo')}</Button><p>{t('Explore with your own demo passenger account.')}</p>{demoMutation.error&&<div className="form-error mt-3" role="alert">{demoMutation.error.message}</div>}</div>}
  <div className="auth-links"><span>{t(register?'Already have an account?':'New here?')}</span><button disabled={pending} onClick={()=>{setRegister(!register);mutation.reset();roleDemoMutation.reset();}}>{t(register?'Sign in':'Create account')}</button></div>
  {!register&&config?.demo&&<div className="demo-block"><strong className="text-sm">{t('Use a demo account')}</strong><p>{t('Choose a role to sign in instantly.')}</p><div className="grid grid-cols-2 gap-2 mt-3">{[{email:'passenger',label:'Try passenger'},{email:'driver',label:'Try driver'},{email:'driver2',label:'Try second driver'},{email:'driver3',label:'Try third driver'},{email:'operator',label:'Try operator'}].map(account=><Button key={account.email} aria-label={t(account.label)} type="button" variant="outline" className="h-auto min-h-14 flex-col gap-1 py-3" disabled={pending} onClick={()=>{mutation.reset();roleDemoMutation.mutate(`${account.email}@saathi.test`);}}><span>{t(roleDemoMutation.isPending&&roleDemoMutation.variables===`${account.email}@saathi.test`?'Please wait':account.label)}</span><span className="text-[10px] text-muted-foreground font-normal">{account.email}@saathi.test</span></Button>)}</div><p>{t('Demo password')}: <code>{config.demo.password}</code></p><p>{t('Demo accounts use real bookings in a shared test area.')}</p>{roleDemoMutation.error&&<div className="form-error mt-3" role="alert">{roleDemoMutation.error.message}</div>}</div>}
  </DialogContent></Dialog>;
}
