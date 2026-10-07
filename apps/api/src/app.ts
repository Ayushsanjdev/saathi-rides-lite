import express, {type Request,type Response,type NextFunction} from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {registerSchema,loginSchema,bookingSchema,objectId,stopSchema,routeSchema,departureSchema,assignSchema,driverSchema,driverUpdateSchema} from '@saathi/contracts';
import {User,Driver,Stop,Route,Departure,Booking,Audit} from './models';
import {AppError,parse,missing,conflict} from './errors';
import {token,csrf,authenticate,requireRole,actor,regenerate,saveSession} from './auth';
import {createBooking,cancelBooking} from './booking';
import {scheduleDeparture,assignDriver,driverAction,cancelDeparture,collectCash,markNoShow} from './operations';
import {bookingDTO,departureDTO} from './serializers';
export interface AppConfig {mongoUri:string;sessionSecret:string;appOrigin:string;production?:boolean;trustProxy?:number;supportPhone?:string;demoSignIn?:boolean;}
const id=(req:Request)=>parse(objectId,req.params.id);
const pagination=(req:Request)=>parse(z.object({page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(100).default(30)}),req.query);
export function createApp(config:AppConfig){
  const app=express();const sessionStore=MongoStore.create({mongoUrl:config.mongoUri,collectionName:'sessions',autoRemove:'native'});app.locals.sessionStore=sessionStore;app.disable('x-powered-by');app.set('trust proxy',config.trustProxy??0);
  app.use(helmet());app.use(express.json({limit:'16kb'}));
  app.use(session({name:'saathi.sid',secret:config.sessionSecret,resave:false,saveUninitialized:false,store:sessionStore,cookie:{httpOnly:true,secure:config.production??false,sameSite:'lax',maxAge:7*86400000}}));
  app.use('/api',csrf(config.appOrigin));
  app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
  app.get('/api/ready',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({status:mongoose.connection.readyState===1?'ready':'unavailable'}));
  app.get('/api/config',(_req,res)=>res.json({supportPhone:config.supportPhone||null,demoSignIn:config.demoSignIn===true,demo:!config.production&&process.env.DEMO_MODE==='true'?{password:process.env.DEMO_PASSWORD}:null}));
  app.get('/api/auth/csrf',async(req,res)=>{const csrfToken=token(req);await saveSession(req);res.json({csrfToken});});
  const authLimit=rateLimit({windowMs:15*60000,limit:100,standardHeaders:'draft-8',legacyHeaders:false,message:{error:{code:'RATE_LIMITED',message:'Too many attempts. Try again later.'}}});
  const demoLimit=rateLimit({windowMs:15*60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{error:{code:'RATE_LIMITED',message:'Too many demo sign-ins. Try again later.'}}});
  app.post('/api/auth/demo',demoLimit,async(req,res)=>{
    if(!config.demoSignIn)throw new AppError(404,'NOT_FOUND','Demo sign-in is unavailable.');
    const passwordHash=await argon2.hash(randomUUID(),{type:argon2.argon2id});
    const user=await User.create({name:'Demo passenger',email:`demo-${randomUUID()}@saathi.test`,passwordHash,role:'passenger',active:true});
    await regenerate(req);req.session.userId=String(user._id);const csrfToken=token(req);await saveSession(req);
    res.json({user:{id:String(user._id),name:user.name,email:user.email,role:user.role},csrfToken});
  });
  app.post('/api/auth/register',authLimit,async(req,res)=>{
    const input=parse(registerSchema,req.body);const passwordHash=await argon2.hash(input.password,{type:argon2.argon2id});
    const user=await User.create({name:input.name,email:input.email,phone:input.phone,passwordHash,role:'passenger',active:true});
    await regenerate(req);req.session.userId=String(user._id);const csrfToken=token(req);await saveSession(req);
    res.status(201).json({user:{id:String(user._id),name:user.name,email:user.email,role:user.role,phone:user.phone},csrfToken});
  });
  app.post('/api/auth/login',authLimit,async(req,res)=>{
    const input=parse(loginSchema,req.body);const user=await User.findOne({email:input.email,active:true}).select('+passwordHash');
    if(!user||!await argon2.verify(user.passwordHash,input.password))throw new AppError(401,'INVALID_CREDENTIALS','Email or password is incorrect.');
    await regenerate(req);req.session.userId=String(user._id);const csrfToken=token(req);await saveSession(req);res.json({user:{id:String(user._id),name:user.name,email:user.email,role:user.role,phone:user.phone},csrfToken});
  });
  app.post('/api/auth/logout',(req,res,next)=>req.session.destroy(e=>{if(e)return next(e);res.clearCookie('saathi.sid',{httpOnly:true,secure:config.production??false,sameSite:'lax'});res.json({ok:true});}));
  app.get('/api/stops',async(_req,res)=>{const stops=await Stop.find({active:true}).sort({locality:1,name:1}).limit(200).lean();res.json({stops:stops.map(s=>({id:String(s._id),name:s.name,locality:s.locality,active:s.active}))});});
  app.get('/api/routes',async(_req,res)=>res.json({routes:await routesDTO(true)}));
  app.get('/api/departures',async(req,res)=>{
    const query=parse(z.object({from:objectId.optional(),to:objectId.optional(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}),req.query);
    let routeIds:string[]|undefined;
    if(query.from||query.to){const routes=await Route.find({active:true,...(query.from?{fromStopId:query.from}:{}),...(query.to?{toStopId:query.to}:{})}).lean();routeIds=routes.map(r=>String(r._id));}
    const from=query.date?new Date(`${query.date}T00:00:00+05:30`):new Date();if(Number.isNaN(from.getTime()))throw new AppError(400,'INVALID_INPUT','Choose a valid date.');
    const to=query.date?new Date(from.getTime()+86400000):new Date(Date.now()+7*86400000);
    const now=new Date();const ds=await Departure.find({status:'scheduled',assignment:{$in:['pending','accepted']},driverId:{$exists:true},availableSeats:{$gt:0},departureAt:{$gt:from>now?from:now,$lt:to},...(routeIds?{routeId:{$in:routeIds}}:{})}).sort({departureAt:1}).limit(100).lean();
    res.json({departures:await Promise.all(ds.map(d=>departureDTO(d)))});
  });
  app.use('/api',authenticate);
  app.get('/api/me',(_req,res)=>res.json({user:actor(res)}));
  app.post('/api/bookings',requireRole('passenger'),async(req,res)=>{const result=await createBooking(actor(res),parse(bookingSchema,req.body));res.status(result.replayed?200:201).json({booking:await bookingDTO(result.booking)});});
  app.get('/api/bookings',requireRole('passenger'),async(req,res)=>{const {page,limit}=pagination(req);const filter={passengerId:actor(res).id};const [bs,total]=await Promise.all([Booking.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),Booking.countDocuments(filter)]);res.json({bookings:await Promise.all(bs.map(bookingDTO)),page,total,hasMore:page*limit<total});});
  app.get('/api/bookings/:id',requireRole('passenger'),async(req,res)=>{const b=await Booking.findOne({_id:id(req),passengerId:actor(res).id}).lean();if(!b)throw missing();res.json({booking:await bookingDTO(b)});});
  app.post('/api/bookings/:id/cancel',requireRole('passenger'),async(req,res)=>res.json({booking:await bookingDTO(await cancelBooking(actor(res).id,id(req)))}));
  app.use('/api/driver',requireRole('driver'));
  app.get('/api/driver/trips',async(req,res)=>res.json(await departurePage(req,actor(res).id)));
  app.get('/api/driver/overview',async(_req,res)=>{
    const userId=actor(res).id;const trips=await Departure.find({driverId:userId}).sort({departureAt:-1}).limit(100).lean();
    const collections=await Booking.aggregate([{$match:{collectedBy:userId,cashCollected:true}},{$group:{_id:null,total:{$sum:'$totalPaise'}}}]);
    res.json({trips:await Promise.all(trips.map(d=>departureDTO(d,true))),collectedPaise:collections[0]?.total??0,completedTrips:await Departure.countDocuments({driverId:userId,status:'completed'}),profile:await Driver.findOne({userId}).lean()});
  });
  app.get('/api/driver/trips/:id/manifest',async(req,res)=>{const d=await Departure.findOne({_id:id(req),driverId:actor(res).id}).lean();if(!d)throw missing();const bs=await Booking.find({departureId:String(d._id),status:{$in:['confirmed','completed','no-show']}}).sort({createdAt:1}).limit(100).lean();res.json({departure:await departureDTO(d,true),bookings:await Promise.all(bs.map(bookingDTO))});});
  for(const action of ['accept','decline','start','complete'] as const)app.post(`/api/driver/trips/:id/${action}`,async(req,res)=>res.json({departure:await departureDTO(await driverAction(actor(res).id,id(req),action),true)}));
  app.post('/api/driver/bookings/:id/no-show',async(req,res)=>res.json({booking:await bookingDTO(await markNoShow(actor(res).id,id(req)))}));
  app.post('/api/driver/bookings/:id/collect',async(req,res)=>res.json({booking:await bookingDTO(await collectCash(actor(res).id,id(req)))}));
  app.use('/api/operator',requireRole('operator'));
  app.get('/api/operator/departures',async(req,res)=>res.json(await departurePage(req)));
  app.get('/api/operator/overview',async(_req,res)=>{
    const [ds,bs,drivers,stops,audit,collections,completedTrips,confirmed,cancelledBookings]=await Promise.all([
      Departure.find().sort({departureAt:-1}).limit(100).lean(),Booking.find().sort({createdAt:-1}).limit(100).lean(),driversDTO(),Stop.find().sort({name:1}).limit(200).lean(),Audit.find().sort({createdAt:-1}).limit(30).lean(),Booking.aggregate([{$match:{cashCollected:true}},{$group:{_id:null,total:{$sum:'$totalPaise'}}}]),Departure.countDocuments({status:'completed'}),Booking.aggregate([{$match:{status:'confirmed'}},{$group:{_id:null,total:{$sum:'$seats'}}}]),Booking.countDocuments({status:{$in:['passenger-cancelled','departure-cancelled']}})
    ]);
    res.json({departures:await Promise.all(ds.map(d=>departureDTO(d,true))),bookings:await Promise.all(bs.map(bookingDTO)),drivers,stops:stops.map(s=>({id:String(s._id),name:s.name,locality:s.locality,active:s.active})),routes:await routesDTO(false),audit:audit.map(a=>({id:String(a._id),actorId:a.actorId,action:a.action,entityId:a.entityId,summary:a.summary,createdAt:a.createdAt.toISOString()})),stats:{completedTrips,confirmedSeats:confirmed[0]?.total??0,collectedPaise:collections[0]?.total??0,cancelledBookings}});
  });
  app.post('/api/operator/stops',async(req,res)=>{const stop=await Stop.create(parse(stopSchema,req.body));await auditChange(actor(res).id,'stop.created',String(stop._id));res.status(201).json({stop});});
  app.patch('/api/operator/stops/:id',async(req,res)=>{const stop=await Stop.findByIdAndUpdate(id(req),parse(stopSchema,req.body),{returnDocument:'after'});if(!stop)throw missing();await auditChange(actor(res).id,'stop.updated',String(stop._id));res.json({stop});});
  app.post('/api/operator/routes',async(req,res)=>{const input=parse(routeSchema,req.body);if(await Stop.countDocuments({_id:{$in:[input.fromStopId,input.toStopId]},active:true})!==2)throw conflict('Choose two active stops.');const route=await Route.create(input);await auditChange(actor(res).id,'route.created',String(route._id));res.status(201).json({route});});
  app.patch('/api/operator/routes/:id',async(req,res)=>{const input=parse(routeSchema,req.body);if(await Stop.countDocuments({_id:{$in:[input.fromStopId,input.toStopId]},active:true})!==2)throw conflict('Choose two active stops.');const route=await Route.findByIdAndUpdate(id(req),input,{returnDocument:'after'});if(!route)throw missing();await auditChange(actor(res).id,'route.updated',String(route._id));res.json({route});});
  app.post('/api/operator/departures',async(req,res)=>res.status(201).json({departure:await departureDTO(await scheduleDeparture(actor(res).id,parse(departureSchema,req.body)),true)}));
  app.post('/api/operator/departures/:id/assign',async(req,res)=>res.json({departure:await departureDTO(await assignDriver(actor(res).id,id(req),parse(assignSchema,req.body).driverId),true)}));
  app.post('/api/operator/departures/:id/cancel',async(req,res)=>res.json({departure:await departureDTO(await cancelDeparture(actor(res).id,id(req)),true)}));
  app.post('/api/operator/drivers',async(req,res)=>{
    const input=parse(driverSchema,req.body);const passwordHash=await argon2.hash(input.password);
    const result=await mongoose.connection.transaction(async mongoSession=>{
      const [user]=await User.create([{name:input.name,email:input.email,phone:input.phone,passwordHash,role:'driver',active:true}],{session:mongoSession});
      const [driver]=await Driver.create([{userId:String(user._id),name:input.name,phone:input.phone,vehicle:input.vehicle,capacity:input.capacity,active:true,verified:input.verified}],{session:mongoSession});
      await Audit.create([{actorId:actor(res).id,action:'driver.created',entityId:String(driver._id),summary:'Driver account provisioned'}],{session:mongoSession});return driver;
    });res.status(201).json({driver:result});
  });
  app.patch('/api/operator/drivers/:id',async(req,res)=>{
    const input=parse(driverUpdateSchema,req.body);const driverId=id(req);
    const driver=await mongoose.connection.transaction(async mongoSession=>{
      const d=await Driver.findOneAndUpdate({userId:driverId},{$inc:{scheduleVersion:1}},{returnDocument:'after',session:mongoSession});if(!d)throw missing();
      if((!input.active||!input.verified)&&await Departure.exists({driverId,assignment:{$in:['pending','accepted']},$or:[{status:'in-progress'},{status:'scheduled',endAt:{$gt:new Date()}}]}).session(mongoSession))throw conflict('Reassign or cancel this driver’s upcoming trips before deactivating.');
      d.active=input.active;d.verified=input.verified;await d.save({session:mongoSession});await User.updateOne({_id:driverId},{$set:{active:input.active}},{session:mongoSession});
      await Audit.create([{actorId:actor(res).id,action:'driver.updated',entityId:driverId,summary:'Driver eligibility updated'}],{session:mongoSession});return d;
    });res.json({driver});
  });
  app.use((_req,_res,next)=>next(missing()));
  app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(error instanceof AppError)return res.status(error.status).json({error:{code:error.code,message:error.message}});
    if((error as {code?:number})?.code===11000)return res.status(409).json({error:{code:'CONFLICT',message:'This record already exists.'}});
    if(error instanceof SyntaxError)return res.status(400).json({error:{code:'INVALID_INPUT',message:'Send a valid JSON request.'}});
    console.error('API error:',error instanceof Error?error.message:'unknown');return res.status(500).json({error:{code:'INTERNAL',message:'The service could not complete this request. Try again.'}});
  });
  return app;
}
async function auditChange(actorId:string,action:string,entityId:string){await Audit.create({actorId,action,entityId,summary:action.replace('.',' ')});}
async function routesDTO(activeOnly:boolean){const [rs,stops]=await Promise.all([Route.find(activeOnly?{active:true}:{}).limit(200).lean(),Stop.find().limit(200).lean()]);const map=new Map(stops.map(s=>[String(s._id),s]));return rs.filter(r=>!activeOnly||(map.get(r.fromStopId)?.active&&map.get(r.toStopId)?.active)).map(r=>({id:String(r._id),fromStopId:r.fromStopId,toStopId:r.toStopId,farePaise:r.farePaise,active:r.active,pickup:map.get(r.fromStopId)?.name??'Unknown stop',destination:map.get(r.toStopId)?.name??'Unknown stop'}));}
async function driversDTO(){const [drivers,users]=await Promise.all([Driver.find().limit(200).lean(),User.find({role:'driver'}).limit(200).lean()]);const emails=new Map(users.map(u=>[String(u._id),u.email]));return drivers.map(d=>({id:String(d._id),userId:d.userId,name:d.name,phone:d.phone,vehicle:d.vehicle,capacity:d.capacity,active:d.active,verified:d.verified,email:emails.get(d.userId)??''}));}

async function departurePage(req:Request,driverId?:string){
  const {page,limit}=pagination(req);const history=parse(z.enum(['true','false']).default('false'),req.query.history)==='true';
  const filter={...(driverId?{driverId}:{}),status:{$in:history?['completed' as const,'cancelled' as const]:['scheduled' as const,'in-progress' as const]}};
  const [rows,total]=await Promise.all([Departure.find(filter).sort({departureAt:history?-1:1}).skip((page-1)*limit).limit(limit).lean(),Departure.countDocuments(filter)]);
  return {departures:await Promise.all(rows.map(d=>departureDTO(d,true))),page,total,hasMore:page*limit<total};
}
