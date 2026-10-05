let csrfToken:string|null=null;
export class ApiError extends Error {constructor(message:string,public status:number){super(message)}}
export async function api<T>(path:string,options:{method?:string;body?:unknown}={}):Promise<T>{
  const method=options.method||'GET';
  if(method!=='GET'&&!csrfToken){const r=await fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new ApiError('The service is unavailable. Try again.',r.status);csrfToken=(await r.json()).csrfToken;}
  let response:Response;
  try{response=await fetch(`/api${path}`,{method,credentials:'same-origin',cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':csrfToken||''}:{})},body:options.body?JSON.stringify(options.body):undefined,signal:AbortSignal.timeout(15000)});}catch{throw new ApiError('Connection interrupted. Check your network and try again.',0);}
  const json=await response.json().catch(()=>({error:{message:'The service is unavailable. Try again.'}}));
  if(!response.ok){if(response.status===403&&json.error?.code==='CSRF')csrfToken=null;throw new ApiError(json.error?.message||'The request could not be completed.',response.status);}
  if(json.csrfToken)csrfToken=json.csrfToken;
  if(path==='/auth/logout')csrfToken=null;
  return json as T;
}
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:paise%100?2:0}).format(paise/100);
export const time=(value:string)=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
export const date=(value:string)=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short'}).format(new Date(value));
export function localDate(offset=0){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86400000));}
export function localDateTime(offset=1){return `${localDate(offset)}T09:00`;}
