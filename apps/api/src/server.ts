import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {createApp} from './app';
import {connectDatabase} from './db';
import {readConfig} from './config';
import {seedDemo} from './seed';
dotenv.config({path:new URL('../../../.env',import.meta.url).pathname,quiet:true});
const config=readConfig();await connectDatabase(config.mongoUri);
if(config.hostedDemo)await seedDemo('SaathiDemo2026!',{hostedDemo:true});
const app=createApp(config);
const server=app.listen(Number(process.env.API_PORT||4000),'0.0.0.0',()=>console.log('Saathi API ready'));
async function shutdown(){server.close(async()=>{await app.locals.sessionStore.close();await mongoose.disconnect();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
