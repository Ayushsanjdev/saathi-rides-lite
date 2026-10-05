import {z} from 'zod';
export class AppError extends Error {constructor(public status:number,public code:string,message:string){super(message)}}
export const conflict=(message:string)=>new AppError(409,'CONFLICT',message);
export const missing=()=>new AppError(404,'NOT_FOUND','This record is unavailable.');
export function parse<T>(schema:z.ZodType<T>,input:unknown):T {const result=schema.safeParse(input);if(!result.success)throw new AppError(400,'INVALID_INPUT',result.error.issues.map(i=>`${i.path.join('.')||'Request'}: ${i.message}`).join('; '));return result.data;}
