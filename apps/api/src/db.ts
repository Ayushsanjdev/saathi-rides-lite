import mongoose from 'mongoose';
import {ensureIndexes} from './models';
export async function connectDatabase(uri:string){await mongoose.connect(uri,{serverSelectionTimeoutMS:60000});await ensureIndexes();}
