import mongoose from 'mongoose';
import {Departure,Driver,Route,Stop,Booking,Audit} from './models';
import {conflict,missing} from './errors';

async function lockAndCheckDriver(driverId:string,start:Date,end:Date,capacity:number,excludeId?:string,session?:mongoose.ClientSession){
  const driver=await Driver.findOneAndUpdate({userId:driverId,active:true,verified:true,capacity:{$gte:capacity}},{$inc:{scheduleVersion:1}},{returnDocument:'after',session});
  if(!driver)throw conflict('Choose an active, verified driver with enough vehicle capacity.');
  const overlap=await Departure.findOne({driverId,...(excludeId?{_id:{$ne:excludeId}}:{}),status:{$in:['scheduled','in-progress']},assignment:{$in:['pending','accepted']},departureAt:{$lt:end},endAt:{$gt:start}}).session(session!);
  if(overlap)throw conflict('This driver already has a trip during that time.');
}
export async function scheduleDeparture(actorId:string,input:{routeId:string;departureAt:string;durationMinutes:number;capacity:number;driverId?:string}){
  return mongoose.connection.transaction(async session=>{
    const route=await Route.findOne({_id:input.routeId,active:true}).session(session);if(!route)throw missing();
    const from=await Stop.findOne({_id:route.fromStopId,active:true}).session(session);const to=await Stop.findOne({_id:route.toStopId,active:true}).session(session);if(!from||!to)throw conflict('This route contains an inactive stop.');
    const start=new Date(input.departureAt);if(start<=new Date())throw conflict('Choose a future departure time.');
    const end=new Date(start.getTime()+input.durationMinutes*60000);
    if(input.driverId)await lockAndCheckDriver(input.driverId,start,end,input.capacity,undefined,session);
    const [d]=await Departure.create([{routeId:input.routeId,pickup:from.name,destination:to.name,farePaise:route.farePaise,departureAt:start,endAt:end,capacity:input.capacity,availableSeats:input.capacity,driverId:input.driverId,assignment:input.driverId?'pending':'unassigned',status:'scheduled'}],{session});
    await Audit.create([{actorId,action:'departure.created',entityId:String(d._id),summary:'Scheduled departure'}],{session});return d.toObject();
  });
}
export async function assignDriver(actorId:string,id:string,driverId:string){
  return mongoose.connection.transaction(async session=>{
    const d=await Departure.findById(id).session(session);if(!d)throw missing();if(d.status!=='scheduled'||d.departureAt<=new Date())throw conflict('Only future scheduled trips can be reassigned.');
    // Lock the old schedule too, preventing concurrent deactivation or assignment changes.
    if(d.driverId&&d.driverId!==driverId)await Driver.updateOne({userId:d.driverId},{$inc:{scheduleVersion:1}},{session});
    await lockAndCheckDriver(driverId,d.departureAt,d.endAt,d.capacity,id,session);
    d.driverId=driverId;d.assignment='pending';d.version=(d.version??0)+1;await d.save({session});
    await Audit.create([{actorId,action:'departure.assigned',entityId:id,summary:'Driver assignment updated'}],{session});return d.toObject();
  });
}
export async function driverAction(actorId:string,id:string,action:'accept'|'decline'|'start'|'complete'){
  return mongoose.connection.transaction(async session=>{
    const d=await Departure.findOne({_id:id,driverId:actorId}).session(session);if(!d)throw missing();
    const driver=await Driver.findOneAndUpdate({userId:actorId,active:true,verified:true},{$inc:{scheduleVersion:1}},{session,returnDocument:'after'});if(!driver)throw conflict('Your driver account is not active and verified.');
    if(action==='accept'||action==='decline'){
      if(d.status!=='scheduled'||d.assignment!=='pending'||d.departureAt<=new Date())throw conflict('This assignment can no longer be changed.');
      d.assignment=action==='accept'?'accepted':'declined';
    }else if(action==='start'){
      if(await Departure.exists({_id:{$ne:id},driverId:actorId,status:'in-progress'}).session(session))throw conflict('Complete your current trip before starting another one.');
      if(d.status!=='scheduled'||d.assignment!=='accepted')throw conflict('Accept this assignment before starting the trip.');
      // Drivers may start up to 15 minutes before the scheduled departure.
      if(d.departureAt.getTime()-Date.now()>15*60000)throw conflict('This trip can start 15 minutes before departure.');
      d.status='in-progress';
    }else{
      if(d.status!=='in-progress')throw conflict('Start this trip before completing it.');d.status='completed';
      await Booking.updateMany({departureId:id,status:'confirmed'},{$set:{status:'completed'}},{session});
    }
    d.version=(d.version??0)+1;await d.save({session});
    await Audit.create([{actorId,action:`trip.${action}`,entityId:id,summary:`Trip ${action}`}],{session});return d.toObject();
  });
}
export async function cancelDeparture(actorId:string,id:string){
  return mongoose.connection.transaction(async session=>{
    const d=await Departure.findById(id).session(session);if(!d)throw missing();if(d.status==='cancelled')return d.toObject();if(d.status!=='scheduled')throw conflict('A started trip cannot be cancelled here.');
    if(await Booking.exists({departureId:id,cashCollected:true}).session(session))throw conflict('Cash was already recorded. Resolve refunds before cancelling this trip.');
    if(d.driverId)await Driver.updateOne({userId:d.driverId},{$inc:{scheduleVersion:1}},{session});
    d.status='cancelled';d.availableSeats=d.capacity;d.version=(d.version??0)+1;await d.save({session});
    await Booking.updateMany({departureId:id,status:'confirmed'},{$set:{status:'departure-cancelled'}},{session});
    await Audit.create([{actorId,action:'departure.cancelled',entityId:id,summary:'Departure and bookings cancelled'}],{session});return d.toObject();
  });
}
export async function collectCash(actorId:string,id:string){
  return mongoose.connection.transaction(async session=>{
    const b=await Booking.findById(id).session(session);if(!b)throw missing();
    const d=await Departure.findOneAndUpdate({_id:b.departureId,driverId:actorId,status:{$in:['in-progress','completed']},assignment:'accepted'},{$inc:{version:1}},{session,returnDocument:'after'});if(!d)throw conflict('Cash can be recorded on your started or completed trips only.');
    if(!['confirmed','completed'].includes(b.status))throw conflict('This booking is cancelled.');
    if(b.cashCollected)return b.toObject();b.cashCollected=true;b.collectedBy=actorId;b.collectedAt=new Date();await b.save({session});
    await Audit.create([{actorId,action:'cash.collected',entityId:id,summary:`${b.totalPaise} paise recorded`}],{session});return b.toObject();
  });
}

export async function markNoShow(actorId:string,id:string){
  return mongoose.connection.transaction(async session=>{
    const b=await Booking.findById(id).session(session);if(!b)throw missing();
    const d=await Departure.findOneAndUpdate({_id:b.departureId,driverId:actorId,status:'in-progress',assignment:'accepted'},{$inc:{version:1}},{session,returnDocument:'after'});if(!d)throw conflict('No shows can be recorded on your started trips only.');
    if(b.status==='no-show')return b.toObject();
    if(b.status!=='confirmed'||b.cashCollected)throw conflict('This booking cannot be marked as a no show.');
    b.status='no-show';await b.save({session});
    await Audit.create([{actorId,action:'booking.no-show',entityId:id,summary:'Passenger absent; no penalty or cash collection created'}],{session});return b.toObject();
  });
}
