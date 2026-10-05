import dotenv from 'dotenv';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {connectDatabase} from '../apps/api/src/db';
import {seedDemo} from '../apps/api/src/seed';
import {createApp} from '../apps/api/src/app';
import {readConfig} from '../apps/api/src/config';
dotenv.config({quiet:true});
let repl:MongoMemoryServer|undefined;
if(!process.env.MONGODB_URI){
  await mkdir('.data/mongo',{recursive:true});await mkdir('.cache/mongodb',{recursive:true});
  process.env.MONGOMS_DOWNLOAD_DIR=path.resolve('.cache/mongodb');
  console.log('Starting persistent local MongoDB replica set…');
  repl=await MongoMemoryServer.create({binary:{version:'8.0.17'},instance:{port:27018,dbPath:path.resolve('.data/mongo'),replSet:'saathi-local',storageEngine:'wiredTiger'}});
  const bootstrap=new MongoClient(`${repl.getUri('saathi')}?directConnection=true`);
  await bootstrap.connect();
  try{await bootstrap.db('admin').command({replSetGetStatus:1});}catch(error){if((error as {code?:number}).code!==94)throw error;await bootstrap.db('admin').command({replSetInitiate:{_id:'saathi-local',members:[{_id:0,host:'127.0.0.1:27018'}]}});}
  let primary=false;for(let i=0;i<60;i++){if((await bootstrap.db('admin').command({hello:1})).isWritablePrimary){primary=true;break;}await new Promise(resolve=>setTimeout(resolve,500));}
  await bootstrap.close();if(!primary)throw new Error('Local MongoDB did not elect a primary.');
  process.env.MONGODB_URI=`${repl.getUri('saathi')}?replicaSet=saathi-local&directConnection=true`;
  process.env.ALLOW_DEMO_SEED='true';process.env.DEMO_PASSWORD ||= 'SaathiDemo2026!';process.env.DEMO_MODE='true';
}
if(!process.env.SESSION_SECRET){
  await mkdir('.data',{recursive:true});try{process.env.SESSION_SECRET=(await readFile('.data/session-secret','utf8')).trim();}catch{process.env.SESSION_SECRET=randomBytes(48).toString('hex');await writeFile('.data/session-secret',process.env.SESSION_SECRET,{mode:0o600});}
}
process.env.WATCHPACK_POLLING ||= 'true';
process.env.APP_ORIGIN ||= 'http://127.0.0.1:3000';process.env.API_INTERNAL_URL ||= 'http://127.0.0.1:4000';
await connectDatabase(process.env.MONGODB_URI!);
if(process.env.ALLOW_DEMO_SEED==='true')await seedDemo(process.env.DEMO_PASSWORD||'');
const app=createApp(readConfig());
const api=app.listen(Number(process.env.API_PORT||4000),'127.0.0.1');
const web=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1'],{cwd:path.resolve('apps/web'),env:process.env,stdio:'inherit'});
console.log(`Saathi Rides: ${process.env.APP_ORIGIN}`);
if(process.env.DEMO_MODE==='true')console.log('Demo accounts: passenger@saathi.test / driver@saathi.test / operator@saathi.test. Password:',process.env.DEMO_PASSWORD);
let stopping=false;
async function stop(){if(stopping)return;stopping=true;web.kill('SIGTERM');await new Promise<void>(resolve=>api.close(()=>resolve()));await app.locals.sessionStore.close();await mongoose.disconnect();if(repl)await repl.stop({doCleanup:false,force:false});process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);web.on('exit',()=>void stop());
