import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  admin: boolean;
  suspended?: {
    until: Date;
    reason: string;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  isSuspended(): boolean;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  suspended: {
    until: { type: Date },
    reason: { type: String },
  },
  admin: { type: Boolean, default: false }, 
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isSuspended = function (): boolean {
  if (!this.suspended || !this.suspended.until) return false;
  return new Date() < new Date(this.suspended.until);
};

export default mongoose.model("User", UserSchema);
