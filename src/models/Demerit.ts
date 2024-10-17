import mongoose, { Schema, Document } from "mongoose";

export interface IDemerit extends Document {
  user: mongoose.Types.ObjectId;
  reason: string;
  points: number;
  checkedAt: Date;
  bookingId?: mongoose.Types.ObjectId;
  checkInId?: mongoose.Types.ObjectId;
}

const DemeritSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
  points: { type: Number, required: true },
  checkedAt: { type: Date, required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  checkInId: { type: Schema.Types.ObjectId, ref: "CheckIn" },
});

export default mongoose.model<IDemerit>("Demerit", DemeritSchema);
