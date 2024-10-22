import mongoose, { Schema, Document } from "mongoose";

export interface IQRCode extends Document {
  code: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QRCodeSchema: Schema = new Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

export default mongoose.model<IQRCode>("QRCode", QRCodeSchema);
