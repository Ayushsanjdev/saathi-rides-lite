import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {connectDatabase} from '../apps/api/src/db';
import {seedDemo} from '../apps/api/src/seed';
dotenv.config({quiet:true});if(!process.env.MONGODB_URI)throw new Error('Set MONGODB_URI in .env first.');
await connectDatabase(process.env.MONGODB_URI);await seedDemo(process.env.DEMO_PASSWORD||'');await mongoose.disconnect();console.log('Demo data ready. Existing users and bookings preserved.');
