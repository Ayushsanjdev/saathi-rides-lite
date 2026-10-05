import type {Request,Response,NextFunction} from 'express';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {User,Driver} from './models';
import type {Role,UserDTO} from '@saathi/contracts';
import {AppError} from './errors';
declare module 'express-session' { interface SessionData {userId:string;csrfToken:string;} }
export function token(req:Request){if(!req.session.csrfToken)req.session.csrfToken=randomBytes(32).toString('hex');return req.session.csrfToken;}
export function csrf(origin:string){return (req:Request,_res:Response,next:NextFunction)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const actual=req.get('X-CSRF-Token');const expected=req.session.csrfToken;
  if(req.get('Origin')!==origin||!actual||!expected||!/^[a-f0-9]{64}$/.test(actual)||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return next(new AppError(403,'CSRF','Refresh this page and try again.'));
  next();
};}
export async function authenticate(req:Request,res:Response,next:NextFunction){
  if(!req.session.userId)throw new AppError(401,'UNAUTHENTICATED','Sign in to continue.');
  const user=await User.findOne({_id:req.session.userId,active:true}).lean();if(!user)throw new AppError(401,'UNAUTHENTICATED','Your session has expired.');
  if(user.role==='driver'&&!await Driver.exists({userId:String(user._id),active:true}))throw new AppError(403,'FORBIDDEN','Your driver account is inactive. Contact the operator.');
  res.locals.user={id:String(user._id),name:user.name,email:user.email,role:user.role,phone:user.phone} satisfies UserDTO;next();
}
export function requireRole(...roles:Role[]){return (_req:Request,res:Response,next:NextFunction)=>{if(!roles.includes((res.locals.user as UserDTO).role))throw new AppError(403,'FORBIDDEN','You do not have access to this action.');next();};}
export const actor=(res:Response)=>res.locals.user as UserDTO;
export const regenerate=(req:Request)=>new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
export const saveSession=(req:Request)=>new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
