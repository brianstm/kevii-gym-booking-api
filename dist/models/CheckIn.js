import mongoose, { Schema } from "mongoose";
const CheckInSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
});
export default mongoose.model("CheckIn", CheckInSchema);
