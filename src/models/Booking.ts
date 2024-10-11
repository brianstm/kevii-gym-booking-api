import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  date: Date;
  duration: Number;
}

const BookingSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
});

export default mongoose.model<IBooking>("Booking", BookingSchema);
