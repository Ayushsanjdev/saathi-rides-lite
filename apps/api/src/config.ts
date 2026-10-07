import {z} from 'zod';
import type {AppConfig} from './app';
export function readConfig():AppConfig{
  const env=z.object({MONGODB_URI:z.string().min(1),SESSION_SECRET:z.string().min(32),APP_ORIGIN:z.url(),API_PORT:z.coerce.number().int().min(1).max(65535).default(4000),NODE_ENV:z.enum(['development','test','production']).default('development'),TRUST_PROXY:z.coerce.number().int().min(0).max(5).default(0),SUPPORT_PHONE:z.string().optional()}).parse(process.env);
  if(env.NODE_ENV==='production'&&!env.APP_ORIGIN.startsWith('https://'))throw new Error('Production requires an HTTPS APP_ORIGIN.');
  const hostedDemo=process.env.HOSTED_DEMO==='true';
  let mongoUri=env.MONGODB_URI;
  if(hostedDemo){const uri=new URL(mongoUri);uri.pathname='/saathi_demo';if(!uri.searchParams.has('authSource'))uri.searchParams.set('authSource','admin');mongoUri=uri.toString();}
  return {mongoUri,sessionSecret:env.SESSION_SECRET,appOrigin:env.APP_ORIGIN,production:env.NODE_ENV==='production',trustProxy:env.TRUST_PROXY,supportPhone:env.SUPPORT_PHONE,demoSignIn:process.env.DEMO_SIGN_IN==='true',hostedDemo};
}
