import mongoose, { Schema, Document } from "mongoose";

export interface ICheckIn extends Document {
  user: mongoose.Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
}

const CheckInSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date },
});

export default mongoose.model<ICheckIn>("CheckIn", CheckInSchema);
