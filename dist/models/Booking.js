import mongoose, { Schema } from "mongoose";
const BookingSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    duration: { type: Number, required: true },
});
export default mongoose.model("Booking", BookingSchema);
