import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {Booking,Departure,Audit} from './models';
import {conflict,missing} from './errors';
import type {UserDTO} from '@saathi/contracts';

export async function createBooking(user:UserDTO,input:{departureId:string;seats:number;idempotencyKey:string;contactPhone:string}){
  // withTransaction retries transient write conflicts; a duplicate-key race is retried outside it.
  for(let attempt=0;attempt<3;attempt++){
    try {
      return await mongoose.connection.transaction(async session=>{
        const existing=await Booking.findOne({passengerId:user.id,idempotencyKey:input.idempotencyKey}).session(session);
        if(existing){if(existing.departureId!==input.departureId||existing.seats!==input.seats||existing.contactPhone!==input.contactPhone)throw conflict('This request key was already used for a different booking.');return {booking:existing.toObject(),replayed:true};}
        const d=await Departure.findOneAndUpdate({_id:input.departureId,status:'scheduled',assignment:{$in:['pending','accepted']},driverId:{$exists:true,$ne:null},departureAt:{$gt:new Date()},availableSeats:{$gte:input.seats}},{$inc:{availableSeats:-input.seats,version:1}},{returnDocument:'after',session});
        if(!d)throw conflict('These seats are no longer available. Choose another departure.');
        const [booking]=await Booking.create([{reference:`SR-${randomUUID().slice(0,8).toUpperCase()}`,passengerId:user.id,passengerName:user.name,contactPhone:input.contactPhone,departureId:input.departureId,seats:input.seats,totalPaise:d.farePaise*input.seats,idempotencyKey:input.idempotencyKey,status:'confirmed',cashCollected:false}],{session});
        await Audit.create([{actorId:user.id,action:'booking.created',entityId:String(booking._id),summary:`${input.seats} seat(s) booked`}],{session});
        return {booking:booking.toObject(),replayed:false};
      });
    }catch(error){if((error as {code?:number}).code===11000&&attempt<2)continue;throw error;}
  }
  throw conflict('Please retry your booking.');
}
export async function cancelBooking(userId:string,id:string){
  return mongoose.connection.transaction(async session=>{
    const b=await Booking.findOne({_id:id,passengerId:userId}).session(session);if(!b)throw missing();
    if(b.status==='passenger-cancelled')return b.toObject();
    if(b.status!=='confirmed')throw conflict('This booking can no longer be cancelled.');
    if(b.cashCollected)throw conflict('Payment was already recorded. Contact the operator before cancelling.');
    const d=await Departure.findOneAndUpdate({_id:b.departureId,status:'scheduled',departureAt:{$gt:new Date()}},{$inc:{availableSeats:b.seats,version:1}},{session,returnDocument:'after'});
    if(!d)throw conflict('The cancellation window has closed.');
    b.status='passenger-cancelled';await b.save({session});
    await Audit.create([{actorId:userId,action:'booking.cancelled',entityId:id,summary:'Seats restored'}],{session});
    return b.toObject();
  });
}
