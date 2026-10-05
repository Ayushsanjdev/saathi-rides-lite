import type {NextRequest} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const limit=16*1024;
async function proxy(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
  const {path}=await params;
  // The upstream origin is deployment configuration, never a client-supplied URL.
  const upstream=new URL(process.env.API_INTERNAL_URL||'http://127.0.0.1:4000');
  upstream.pathname=`/api/${path.map(encodeURIComponent).join('/')}`;upstream.search=request.nextUrl.search;
  const headers=new Headers();for(const name of ['content-type','cookie','origin','x-csrf-token']){const value=request.headers.get(name);if(value)headers.set(name,value);}
  // Only trust the protocol configured by the operator, not client-provided forwarded headers.
  headers.set('x-forwarded-proto',process.env.APP_ORIGIN?.startsWith('https://')?'https':'http');
  let body:Uint8Array|undefined;
  if(request.body&&!['GET','HEAD'].includes(request.method)){
    const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return Response.json({error:{code:'BODY_TOO_LARGE',message:'Request is too large.'}},{status:413});}chunks.push(value);}
    body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  }
  try{
    const result=await fetch(upstream,{method:request.method,headers,body:body as BodyInit|undefined,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(12000)});
    const responseHeaders=new Headers({'content-type':result.headers.get('content-type')||'application/json','cache-control':'no-store'});
    for(const cookie of result.headers.getSetCookie())responseHeaders.append('set-cookie',cookie);
    const retry=result.headers.get('retry-after');if(retry)responseHeaders.set('retry-after',retry);
    return new Response(result.body,{status:result.status,headers:responseHeaders});
  }catch{return Response.json({error:{code:'UPSTREAM_UNAVAILABLE',message:'The booking service is unavailable. Please retry.'}},{status:502});}
}
export {proxy as GET,proxy as POST,proxy as PATCH,proxy as PUT,proxy as DELETE,proxy as HEAD};
