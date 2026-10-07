import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';
import path from 'node:path';
import {seedDemo} from '../src/seed';
import {connectDatabase} from '../src/db';

const origin='http://127.0.0.1:3000';
const ids={ rider:new mongoose.Types.ObjectId(), other:new mongoose.Types.ObjectId(), driver:new mongoose.Types.ObjectId(), operator:new mongoose.Types.ObjectId(), route:new mongoose.Types.ObjectId(), from:new mongoose.Types.ObjectId(), to:new mongoose.Types.ObjectId(), departure:new mongoose.Types.ObjectId() };
let repl:MongoMemoryReplSet; let app:Express; let passwordHash:string;
const db=()=>mongoose.connection.db!;
const login=async(role:keyof Pick<typeof ids,'rider'|'other'|'driver'|'operator'>)=>{
  const agent=request.agent(app);
  const token=(await agent.get('/api/auth/csrf')).body.csrfToken;
  const result=await agent.post('/api/auth/login').set('Origin',origin).set('X-CSRF-Token',token??'missing').send({email:`${role}@saathi.test`,password:'TestPassword123!'});
  expect(result.status).toBe(200);
  return {agent,token:result.body.csrfToken as string};
};
const post=(client:Awaited<ReturnType<typeof login>>,url:string,body:object)=>client.agent.post(url).set('Origin',origin).set('X-CSRF-Token',client.token).send(body);
const departureId=()=>ids.departure.toString();
const book=(client:Awaited<ReturnType<typeof login>>, key:string,seats=1)=>post(client,'/api/bookings',{departureId:departureId(),seats,idempotencyKey:key,contactPhone:'9000000099'});

beforeAll(async()=>{
  process.env.MONGOMS_DOWNLOAD_DIR=path.resolve('.cache/mongodb');
  repl=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger'},binary:{version:'8.0.17'}});
  await mongoose.connect(repl.getUri('saathi_test'));
  passwordHash=await argon2.hash('TestPassword123!');
  app=createApp({mongoUri:repl.getUri('saathi_test'),sessionSecret:'test-secret-at-least-thirty-two-characters',appOrigin:origin});
});
afterAll(async()=>{await app.locals.sessionStore.close(); await mongoose.disconnect(); await repl?.stop();});
beforeEach(async()=>{
  for(const name of ['users','drivers','stops','routes','departures','bookings','auditevents','sessions']) await db().collection(name).deleteMany({});
  await db().collection('users').createIndex({email:1},{unique:true});
  await db().collection('bookings').createIndex({passengerId:1,idempotencyKey:1},{unique:true});
  await db().collection('bookings').createIndex({reference:1},{unique:true});
  await db().collection('users').insertMany(['rider','other','driver','operator'].map(role=>({_id:ids[role as 'rider'],email:`${role}@saathi.test`,name:role,role:role==='other'?'passenger':role==='rider'?'passenger':role,active:true,passwordHash})));
  await db().collection('drivers').insertOne({userId:ids.driver.toString(),name:'Ramesh Kumar',phone:'9000000000',vehicle:'UP 00 AB 1234',capacity:4,active:true,verified:true,scheduleVersion:0});
  await db().collection('stops').insertMany([{_id:ids.from,name:'Village square',locality:'Rampur',active:true},{_id:ids.to,name:'Bus stand',locality:'Town',active:true}]);
  await db().collection('routes').insertOne({_id:ids.route,fromStopId:ids.from.toString(),toStopId:ids.to.toString(),farePaise:2500,active:true});
  const start=new Date(Date.now()+600000);
  await db().collection('departures').insertOne({_id:ids.departure,routeId:ids.route.toString(),pickup:'Village square',destination:'Bus stand',farePaise:2500,departureAt:start,endAt:new Date(start.getTime()+1800000),capacity:4,availableSeats:4,driverId:ids.driver.toString(),status:'scheduled',assignment:'accepted',createdAt:new Date()});
});

describe('sessions and permissions',()=>{
  it('seeds all README demo roles and bookable routes only in the isolated hosted database',async()=>{
    const oldNodeEnv=process.env.NODE_ENV;process.env.NODE_ENV='production';
    try {
      await expect(seedDemo('SaathiDemo2026!',{hostedDemo:true})).rejects.toThrow();
      await mongoose.disconnect();await connectDatabase(repl.getUri('saathi_demo'));
      await seedDemo('SaathiDemo2026!',{hostedDemo:true});
      const demoApp=createApp({mongoUri:repl.getUri('saathi_demo'),sessionSecret:'test-secret-at-least-thirty-two-characters',appOrigin:origin,hostedDemo:true});
      try {
        const demoConfig=(await request(demoApp).get('/api/config')).body;
        expect(demoConfig.demo.password).toBe('SaathiDemo2026!');
        for(const [email,role] of [['passenger','passenger'],['driver','driver'],['driver2','driver'],['driver3','driver'],['operator','operator']]){
          const agent=request.agent(demoApp);const csrf=(await agent.get('/api/auth/csrf')).body.csrfToken;
          const result=await agent.post('/api/auth/login').set('Origin',origin).set('X-CSRF-Token',csrf).send({email:`${email}@saathi.test`,password:'SaathiDemo2026!'});
          expect(result.status).toBe(200);expect(result.body.user.role).toBe(role);
        }
        expect((await request(demoApp).get('/api/stops')).body.stops).toHaveLength(4);
        expect((await request(demoApp).get('/api/routes')).body.routes).toHaveLength(3);
        const count=await db().collection('departures').countDocuments();expect(count).toBeGreaterThan(0);
        await seedDemo('SaathiDemo2026!',{hostedDemo:true});
        expect(await db().collection('departures').countDocuments()).toBe(count);
      } finally {await demoApp.locals.sessionStore.close();}
    } finally {process.env.NODE_ENV=oldNodeEnv;await mongoose.disconnect();await connectDatabase(repl.getUri('saathi_test'));}
  });
  it('signs demo visitors into separate passenger sessions without granting operator access',async()=>{
    const demoApp=createApp({mongoUri:repl.getUri('saathi_test'),sessionSecret:'test-secret-at-least-thirty-two-characters',appOrigin:origin,demoSignIn:true} as Parameters<typeof createApp>[0]);
    try {
      expect((await request(demoApp).get('/api/config')).body.demoSignIn).toBe(true);
      expect((await request(demoApp).post('/api/auth/demo')).status).toBe(403);
      const visitors=[];
      for(let i=0;i<2;i++){
        const agent=request.agent(demoApp);const csrf=(await agent.get('/api/auth/csrf')).body.csrfToken;
        const result=await agent.post('/api/auth/demo').set('Origin',origin).set('X-CSRF-Token',csrf).send({role:'operator'});
        expect(result.status).toBe(200);expect(result.body.user.role).toBe('passenger');expect(result.body.csrfToken).toBeTruthy();
        expect((await agent.get('/api/me')).body.user.id).toBe(result.body.user.id);
        visitors.push(result.body.user.id);
      }
      expect(visitors[0]).not.toBe(visitors[1]);
    } finally {await demoApp.locals.sessionStore.close();}
  });
  it('does not offer demo sign-in unless explicitly enabled',async()=>{
    expect((await request(app).get('/api/config')).body.demoSignIn).toBe(false);
    const agent=request.agent(app);const csrf=(await agent.get('/api/auth/csrf')).body.csrfToken;
    expect((await agent.post('/api/auth/demo').set('Origin',origin).set('X-CSRF-Token',csrf)).status).toBe(404);
  });
  it('requires a session for private profile',async()=>expect((await request(app).get('/api/me')).status).toBe(401));
  it('registers a passenger and rejects privilege injection',async()=>{
    const agent=request.agent(app); const csrf=(await agent.get('/api/auth/csrf')).body.csrfToken;
    const invalid=await agent.post('/api/auth/register').set('Origin',origin).set('X-CSRF-Token',csrf??'x').send({name:'New User',email:'new@test.in',password:'TestPassword123!',role:'operator'});
    expect(invalid.status).toBe(400);
    const good=await agent.post('/api/auth/register').set('Origin',origin).set('X-CSRF-Token',csrf??'x').send({name:'New User',email:'new@test.in',password:'TestPassword123!'});
    expect(good.status).toBe(201); expect(good.body.user.role).toBe('passenger');
  });
  it('regenerates session and rejects mutations without CSRF',async()=>{
    const client=await login('rider');
    expect((await client.agent.get('/api/me')).body.user.email).toBe('rider@saathi.test');
    expect((await client.agent.post('/api/bookings').set('Origin',origin).send({})).status).toBe(403);
    expect((await client.agent.post('/api/bookings').set('Origin','https://evil.test').set('X-CSRF-Token',client.token).send({})).status).toBe(403);
  });
  it('blocks passenger from operator data',async()=>{const c=await login('rider');expect((await c.agent.get('/api/operator/overview')).status).toBe(403);});
  it('invalidates sessions on logout',async()=>{const c=await login('rider');expect((await post(c,'/api/auth/logout',{})).status).toBe(200);expect((await c.agent.get('/api/me')).status).toBe(401);});
});
describe('booking invariants',()=>{
  it('returns route-filtered departures and server-side fares',async()=>{
    const r=await request(app).get(`/api/departures?from=${ids.from}&to=${ids.to}`);
    expect(r.status).toBe(200);expect(r.body.departures[0].farePaise).toBe(2500);
    expect((await request(app).get('/api/departures?from=not-an-id')).status).toBe(400);
  });
  it('books with an authoritative fare and persists across app instances',async()=>{
    const c=await login('rider');const b=await book(c,'price-0001',2);
    expect(b.status).toBe(201);expect(b.body.booking.totalPaise).toBe(5000);
    const another=createApp({mongoUri:repl.getUri('saathi_test'),sessionSecret:'test-secret-at-least-thirty-two-characters',appOrigin:origin});
    const stored=await db().collection('bookings').findOne({_id:new mongoose.Types.ObjectId(b.body.booking.id)});
    expect(stored?.seats).toBe(2);expect((await request(another).get('/api/health')).status).toBe(200);await request(another).get('/api/auth/csrf');await another.locals.sessionStore.close();
  });
  it('never oversells with concurrent requests',async()=>{
    const c=await login('rider');
    const results=await Promise.all(Array.from({length:8},(_,i)=>book(c,`parallel-${i}`)));
    expect(results.filter(r=>r.status===201)).toHaveLength(4);
    expect(results.filter(r=>r.status===409)).toHaveLength(4);
    expect((await db().collection('departures').findOne({_id:ids.departure}))?.availableSeats).toBe(0);
    expect(await db().collection('bookings').countDocuments()).toBe(4);
  });
  it('deduplicates simultaneous retries and rejects changed payloads',async()=>{
    const c=await login('rider');const rs=await Promise.all([book(c,'same-key-0001'),book(c,'same-key-0001')]);
    expect(rs.every(r=>[200,201].includes(r.status))).toBe(true);
    expect(rs[0].body.booking.id).toBe(rs[1].body.booking.id);
    expect((await book(c,'same-key-0001',2)).status).toBe(409);
    expect((await db().collection('departures').findOne({_id:ids.departure}))?.availableSeats).toBe(3);
  });
  it('restores cancelled seats only once and protects ownership',async()=>{
    const c=await login('rider');const other=await login('other');const b=(await book(c,'cancel-0001',2)).body.booking;
    expect((await post(other,`/api/bookings/${b.id}/cancel`,{})).status).toBe(404);
    expect((await other.agent.get(`/api/bookings/${b.id}`)).status).toBe(404);
    const rs=await Promise.all([post(c,`/api/bookings/${b.id}/cancel`,{}),post(c,`/api/bookings/${b.id}/cancel`,{})]);
    expect(rs.every(r=>r.status===200)).toBe(true);
    expect((await db().collection('departures').findOne({_id:ids.departure}))?.availableSeats).toBe(4);
  });
  it('rejects invalid identifiers and untrusted price fields',async()=>{
    const c=await login('rider');expect((await post(c,'/api/bookings',{departureId:'wrong',seats:1,idempotencyKey:'invalid-0001'})).status).toBe(400);
    expect((await post(c,'/api/bookings',{departureId:departureId(),seats:1,idempotencyKey:'invalid-0002',totalPaise:1})).status).toBe(400);
  });
  it('rejects expired departures',async()=>{await db().collection('departures').updateOne({_id:ids.departure},{$set:{departureAt:new Date(Date.now()-1000)}});const c=await login('rider');expect((await book(c,'expired-0001')).status).toBe(409);});
});
describe('driver and operator workflows',()=>{
  it('restricts manifests and requires accepted assignment before starting',async()=>{
    const c=await login('rider');expect((await c.agent.get(`/api/driver/trips/${departureId()}/manifest`)).status).toBe(403);
    const driver=await login('driver');await db().collection('departures').updateOne({_id:ids.departure},{$set:{assignment:'pending'}});
    expect((await post(driver,`/api/driver/trips/${departureId()}/start`,{})).status).toBe(409);
    expect((await post(driver,`/api/driver/trips/${departureId()}/accept`,{})).status).toBe(200);
    expect((await post(driver,`/api/driver/trips/${departureId()}/start`,{})).status).toBe(200);
    expect((await book(c,'late-book-0001')).status).toBe(409);
  });
  it('completes bookings and records cash exactly once',async()=>{
    const rider=await login('rider');const b=(await book(rider,'cash-book-0001',2)).body.booking;const driver=await login('driver');
    expect((await post(driver,`/api/driver/trips/${departureId()}/complete`,{})).status).toBe(409);
    await post(driver,`/api/driver/trips/${departureId()}/start`,{});
    const payments=await Promise.all([post(driver,`/api/driver/bookings/${b.id}/collect`,{}),post(driver,`/api/driver/bookings/${b.id}/collect`,{})]);
    expect(payments.every(r=>r.status===200)).toBe(true);
    expect((await post(driver,`/api/driver/trips/${departureId()}/complete`,{})).status).toBe(200);
    expect((await rider.agent.get(`/api/bookings/${b.id}`)).body.booking.status).toBe('completed');
    const overview=(await driver.agent.get('/api/driver/overview')).body;expect(overview.collectedPaise).toBe(5000);
  });
  it('cancels a departure and all its bookings atomically',async()=>{
    const c=await login('rider');await book(c,'departure-cancel-0001');const op=await login('operator');
    expect((await post(op,`/api/operator/departures/${departureId()}/cancel`,{})).status).toBe(200);
    expect((await db().collection('bookings').findOne({}))?.status).toBe('departure-cancelled');
    expect((await book(c,'departure-cancel-0002')).status).toBe(409);
  });
  it('serialises overlapping driver assignments',async()=>{
    const op=await login('operator');const start=new Date(Date.now()+7200000);
    const data={routeId:ids.route.toString(),departureAt:start.toISOString(),durationMinutes:30,capacity:4,driverId:ids.driver.toString()};
    const rs=await Promise.all([post(op,'/api/operator/departures',data),post(op,'/api/operator/departures',data)]);
    expect(rs.filter(r=>r.status===201)).toHaveLength(1);expect(rs.filter(r=>r.status===409)).toHaveLength(1);
  });
  it('declines and reassigns trips with an audit trail',async()=>{
    await db().collection('departures').updateOne({_id:ids.departure},{$set:{assignment:'pending'}});
    const driver=await login('driver');expect((await post(driver,`/api/driver/trips/${departureId()}/decline`,{})).status).toBe(200);
    const op=await login('operator');expect((await post(op,`/api/operator/departures/${departureId()}/assign`,{driverId:ids.driver.toString()})).status).toBe(200);
    expect((await db().collection('departures').findOne({_id:ids.departure}))?.assignment).toBe('pending');
    expect(await db().collection('auditevents').countDocuments()).toBeGreaterThan(0);
  });
});

describe('review regressions',()=>{
  it('rejects booking a declined or unassigned departure',async()=>{
    const c=await login('rider');
    for(const assignment of ['declined','unassigned']){await db().collection('departures').updateOne({_id:ids.departure},{$set:{assignment}});expect((await book(c,`assignment-${assignment}`)).status).toBe(409);}
  });
  it('prevents simultaneous starts and blocks deactivation of overdue active work',async()=>{
    const second=new mongoose.Types.ObjectId();const start=new Date(Date.now()+5*60000);
    await db().collection('departures').insertOne({_id:second,routeId:ids.route.toString(),pickup:'Village square',destination:'Bus stand',farePaise:2500,departureAt:start,endAt:new Date(start.getTime()+30*60000),capacity:4,availableSeats:4,driverId:ids.driver.toString(),status:'scheduled',assignment:'accepted'});
    const driver=await login('driver');const rs=await Promise.all([post(driver,`/api/driver/trips/${departureId()}/start`,{}),post(driver,`/api/driver/trips/${second}/start`,{})]);
    expect(rs.filter(r=>r.status===200)).toHaveLength(1);expect(rs.filter(r=>r.status===409)).toHaveLength(1);
    await db().collection('departures').updateMany({status:'in-progress'},{$set:{endAt:new Date(Date.now()-1000)}});
    const op=await login('operator');const response=await op.agent.patch(`/api/operator/drivers/${ids.driver}`).set('Origin',origin).set('X-CSRF-Token',op.token).send({active:false,verified:true});expect(response.status).toBe(409);
  });
  it('keeps active work accessible with more than 100 newer departures',async()=>{
    await db().collection('departures').insertMany(Array.from({length:130},(_,i)=>({routeId:ids.route.toString(),pickup:'Village square',destination:'Bus stand',farePaise:2500,departureAt:new Date(Date.now()+(i+2)*86400000),endAt:new Date(Date.now()+(i+2)*86400000+1800000),capacity:4,availableSeats:4,driverId:ids.driver.toString(),status:'scheduled',assignment:'accepted'})));
    const driver=await login('driver');const result=await driver.agent.get('/api/driver/trips?history=false&page=1&limit=30');expect(result.status).toBe(200);expect(result.body.departures[0].id).toBe(departureId());expect(result.body.hasMore).toBe(true);
    const op=await login('operator');const result2=await op.agent.get('/api/operator/departures?history=false&page=1&limit=30');expect(result2.status).toBe(200);expect(result2.body.departures[0].id).toBe(departureId());expect(result2.body.total).toBe(131);
  });
  it('rejects a malformed unicode CSRF token without a server error',async()=>{
    const c=await login('rider');const result=await c.agent.post('/api/bookings').set('Origin',origin).set('X-CSRF-Token','é'.repeat(64)).send({});expect(result.status).toBe(403);
  });
});

describe('passenger contact and attendance',()=>{
  it('stores contact snapshots and marks no shows without collecting cash',async()=>{
    const rider=await login('rider');const driver=await login('driver');const result=await book(rider,'contact-0001');expect(result.status).toBe(201);const b=result.body.booking;
    expect(b.contactPhone).toBe('9000000099');
    await post(driver,`/api/driver/trips/${departureId()}/start`,{});
    expect((await post(driver,`/api/driver/bookings/${b.id}/no-show`,{})).status).toBe(200);
    expect((await post(driver,`/api/driver/bookings/${b.id}/no-show`,{})).status).toBe(200);
    expect((await post(driver,`/api/driver/bookings/${b.id}/collect`,{})).status).toBe(409);
    expect((await rider.agent.get(`/api/bookings/${b.id}`)).body.booking.status).toBe('no-show');
  });
});

it('lets a passenger cancel after the assigned driver declines',async()=>{
  await db().collection('departures').updateOne({_id:ids.departure},{$set:{assignment:'pending'}});
  const rider=await login('rider');const b=(await book(rider,'decline-cancel-0001')).body.booking;const driver=await login('driver');
  expect((await post(driver,`/api/driver/trips/${departureId()}/decline`,{})).status).toBe(200);
  expect((await post(rider,`/api/bookings/${b.id}/cancel`,{})).status).toBe(200);
  expect((await db().collection('departures').findOne({_id:ids.departure}))?.availableSeats).toBe(4);
});
