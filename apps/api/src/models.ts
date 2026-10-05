import mongoose, { Schema } from 'mongoose';
import type { Role, Assignment, DepartureStatus } from '@saathi/contracts';
export interface UserRecord {name:string;email:string;phone?:string;passwordHash:string;role:Role;active:boolean;createdAt:Date;updatedAt:Date}
export interface DriverRecord {userId:string;name:string;phone:string;vehicle:string;capacity:number;active:boolean;verified:boolean;scheduleVersion:number;createdAt:Date;updatedAt:Date}
export interface StopRecord {name:string;locality:string;active:boolean;createdAt:Date;updatedAt:Date}
export interface RouteRecord {fromStopId:string;toStopId:string;farePaise:number;active:boolean;createdAt:Date;updatedAt:Date}
export interface DepartureRecord {routeId:string;pickup:string;destination:string;farePaise:number;departureAt:Date;endAt:Date;capacity:number;availableSeats:number;driverId?:string;status:DepartureStatus;assignment:Assignment;version:number;createdAt:Date;updatedAt:Date}
export interface BookingRecord {reference:string;passengerId:string;passengerName:string;departureId:string;seats:number;totalPaise:number;idempotencyKey:string;status:'confirmed'|'completed'|'passenger-cancelled'|'departure-cancelled'|'no-show';contactPhone:string;cashCollected:boolean;collectedBy?:string;collectedAt?:Date;createdAt:Date;updatedAt:Date}
export interface AuditRecord {actorId:string;action:string;entityId:string;summary:string;createdAt:Date;updatedAt:Date}
const opts={timestamps:true,versionKey:false} as const;
const userSchema=new Schema<UserRecord>({name:{type:String,required:true},email:{type:String,required:true,unique:true},phone:String,passwordHash:{type:String,required:true,select:false},role:{type:String,enum:['passenger','driver','operator'],required:true},active:{type:Boolean,default:true}},opts);
const driverSchema=new Schema<DriverRecord>({userId:{type:String,required:true,unique:true},name:String,phone:String,vehicle:String,capacity:Number,active:{type:Boolean,default:true},verified:{type:Boolean,default:false},scheduleVersion:{type:Number,default:0}},opts);
const stopSchema=new Schema<StopRecord>({name:String,locality:String,active:{type:Boolean,default:true}},opts);
const routeSchema=new Schema<RouteRecord>({fromStopId:String,toStopId:String,farePaise:Number,active:{type:Boolean,default:true}},opts);
const departureSchema=new Schema<DepartureRecord>({routeId:String,pickup:String,destination:String,farePaise:Number,departureAt:Date,endAt:Date,capacity:Number,availableSeats:Number,driverId:String,status:{type:String,enum:['scheduled','in-progress','completed','cancelled'],default:'scheduled'},assignment:{type:String,enum:['unassigned','pending','accepted','declined'],default:'unassigned'},version:{type:Number,default:0}},opts);
const bookingSchema=new Schema<BookingRecord>({reference:{type:String,unique:true},passengerId:String,passengerName:String,departureId:String,seats:Number,totalPaise:Number,idempotencyKey:String,status:{type:String,enum:['confirmed','completed','passenger-cancelled','departure-cancelled','no-show'],default:'confirmed'},contactPhone:String,cashCollected:{type:Boolean,default:false},collectedBy:String,collectedAt:Date},opts);
const auditSchema=new Schema<AuditRecord>({actorId:String,action:String,entityId:String,summary:String},opts);
bookingSchema.index({passengerId:1,idempotencyKey:1},{unique:true});
bookingSchema.index({passengerId:1,createdAt:-1}); bookingSchema.index({departureId:1,status:1});
departureSchema.index({routeId:1,departureAt:1}); departureSchema.index({driverId:1,departureAt:1,endAt:1});
auditSchema.index({entityId:1,createdAt:-1});
export const User=mongoose.model<UserRecord>('User',userSchema);
export const Driver=mongoose.model<DriverRecord>('Driver',driverSchema);
export const Stop=mongoose.model<StopRecord>('Stop',stopSchema);
export const Route=mongoose.model<RouteRecord>('Route',routeSchema);
export const Departure=mongoose.model<DepartureRecord>('Departure',departureSchema);
export const Booking=mongoose.model<BookingRecord>('Booking',bookingSchema);
export const Audit=mongoose.model<AuditRecord>('AuditEvent',auditSchema);
export async function ensureIndexes(){await Promise.all([User,Driver,Stop,Route,Departure,Booking,Audit].map(m=>m.createIndexes()));}
