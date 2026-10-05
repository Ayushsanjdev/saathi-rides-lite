import dotenv from 'dotenv';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import {z} from 'zod';
import {connectDatabase} from './db';
import {User,Audit} from './models';
dotenv.config({path:new URL('../../../.env',import.meta.url).pathname,quiet:true});
const input=z.object({MONGODB_URI:z.string().min(1),OPERATOR_NAME:z.string().trim().min(2).max(80),OPERATOR_EMAIL:z.email().trim().toLowerCase(),OPERATOR_PASSWORD:z.string().min(12).max(128)}).parse(process.env);
await connectDatabase(input.MONGODB_URI);
try{
  const user=await User.create({name:input.OPERATOR_NAME,email:input.OPERATOR_EMAIL,passwordHash:await argon2.hash(input.OPERATOR_PASSWORD),role:'operator',active:true});
  await Audit.create({actorId:String(user._id),action:'operator.provisioned',entityId:String(user._id),summary:'Operator created through administrative CLI'});
  console.log('Operator account created.');
}finally{await mongoose.disconnect();}
