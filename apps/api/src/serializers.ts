import type { Types } from 'mongoose';
import type { BookingDTO, DepartureDTO } from '@saathi/contracts';
import {Departure,Driver, type DepartureRecord, type BookingRecord} from './models';
type Row<T>=T & {_id:Types.ObjectId};
export async function departureDTO(d:Row<DepartureRecord>,privateDetails=false):Promise<DepartureDTO>{
  const driver=d.driverId?await Driver.findOne({userId:d.driverId}).lean():null;
  return {id:String(d._id),routeId:d.routeId,pickup:d.pickup,destination:d.destination,farePaise:d.farePaise,departureAt:d.departureAt.toISOString(),endAt:d.endAt.toISOString(),capacity:d.capacity,availableSeats:d.availableSeats,driverId:d.driverId,driverName:driver?.name,vehicle:driver?.vehicle,...(privateDetails?{driverPhone:driver?.phone}:{}),status:d.status,assignment:d.assignment,bookedSeats:d.capacity-d.availableSeats};
}
export async function bookingDTO(b:Row<BookingRecord>):Promise<BookingDTO>{
  const d=await Departure.findById(b.departureId).lean();if(!d)throw new Error('Booking references missing departure');
  return {id:String(b._id),reference:b.reference,departureId:b.departureId,passengerId:b.passengerId,passengerName:b.passengerName,contactPhone:b.contactPhone,seats:b.seats,totalPaise:b.totalPaise,status:b.status,cashCollected:b.cashCollected,createdAt:(b.createdAt??new Date()).toISOString(),departure:await departureDTO(d,true)};
}
