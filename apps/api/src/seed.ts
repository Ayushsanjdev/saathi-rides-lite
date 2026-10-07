import argon2 from 'argon2';
import mongoose from 'mongoose';
import {User,Driver,Stop,Route,Departure} from './models';
export async function seedDemo(password:string,options:{hostedDemo?:boolean}={}){
  if(options.hostedDemo){if(mongoose.connection.name!=='saathi_demo')throw new Error('Hosted demo seed requires the isolated saathi_demo database.');}
  else if(process.env.NODE_ENV==='production'||process.env.ALLOW_DEMO_SEED!=='true')throw new Error('Demo seed requires ALLOW_DEMO_SEED=true and a non-production environment.');
  if(password.length<10)throw new Error('DEMO_PASSWORD must be at least 10 characters.');
  const hash=await argon2.hash(password);
  const account=async(email:string,name:string,role:'passenger'|'driver'|'operator')=>User.findOneAndUpdate({email},{$setOnInsert:{email,name,role,phone:role==='passenger'?'9000000099':undefined,active:true,passwordHash:hash}},{upsert:true,returnDocument:'after'});
  const [rider,driver,secondDriver,thirdDriver,operator]=await Promise.all([account('passenger@saathi.test','Ayush','passenger'),account('driver@saathi.test','Ramesh Kumar','driver'),account('driver2@saathi.test','Sunita Devi','driver'),account('driver3@saathi.test','Imran Ali','driver'),account('operator@saathi.test','Local operator','operator')]);
  const drivers=[driver,secondDriver,thirdDriver];
  await Promise.all(drivers.map((u,i)=>Driver.findOneAndUpdate({userId:String(u!._id)},{$setOnInsert:{userId:String(u!._id),name:u!.name,phone:`900000000${i}`,vehicle:`UP 00 SR 100${i+1}`,capacity:4,active:true,verified:true,scheduleVersion:0}},{upsert:true})));
  const names=[['Rampur chowk','Rampur'],['Town bus stand','Sitapur'],['Community clinic','Sitapur'],['Weekly market','Sitapur']];
  const stops=await Promise.all(names.map(([name,locality])=>Stop.findOneAndUpdate({name},{$setOnInsert:{name,locality,active:true}},{upsert:true,returnDocument:'after'})));
  const routes=await Promise.all([1,2,3].map((i)=>Route.findOneAndUpdate({fromStopId:String(stops[0]!._id),toStopId:String(stops[i]!._id)},{$setOnInsert:{fromStopId:String(stops[0]!._id),toStopId:String(stops[i]!._id),farePaise:[0,2000,3000,2500][i],active:true}},{upsert:true,returnDocument:'after'})));
  // Replenish only missing route/date combinations; preserve bookings and edited trips.
  const now=Date.now();const istOffset=330*60000;
  const today=Math.floor((now+istOffset)/86400000)*86400000-istOffset;
  for(let day=0;day<8;day++)for(let r=0;r<routes.length;r++){
    const route=routes[r]!;const dayStart=today+day*86400000;const dayEnd=dayStart+86400000;
    if(await Departure.exists({routeId:String(route._id),departureAt:{$gte:new Date(Math.max(now,dayStart)),$lt:new Date(dayEnd)},status:'scheduled'}))continue;
    const first=day===0?Math.max(dayStart+9*3600000,now+10*60000+r*45*60000):dayStart+9*3600000+r*45*60000;
    for(let trip=0;trip<2;trip++){
      const depart=new Date(first+trip*3*3600000);if(depart.getTime()>=dayEnd)continue;
      await Departure.create({routeId:String(route._id),pickup:stops[0]!.name,destination:stops[r+1]!.name,farePaise:route.farePaise,departureAt:depart,endAt:new Date(depart.getTime()+30*60000),capacity:4,availableSeats:4,driverId:String(drivers[r]!._id),status:'scheduled',assignment:'accepted'});
    }
  }
  await User.updateOne({email:'passenger@saathi.test',phone:{$exists:false}},{$set:{phone:'9000000099'}});
  return {passengerId:String(rider!._id),operatorId:String(operator!._id)};
}
