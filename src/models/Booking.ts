import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  date: Date;
  duration: Number;
  present: Boolean;
  demeritChecked: Boolean;
}

const BookingSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  present: { type: Boolean, default: false },
  demeritChecked: { type: Boolean, default: false },
});

export default mongoose.model<IBooking>("Booking", BookingSchema);
