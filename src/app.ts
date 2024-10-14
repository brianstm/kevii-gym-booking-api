import express from "express";
import dotenv from "dotenv";
// import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import checkInRoutes from "./routes/checkInRoutes";
import mongoose from "mongoose";

mongoose.set("strictQuery", false);

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MongoDB URI is not defined");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection error:", error);
      if ("reason" in error) {
        console.error("Error reason:", (error as any).reason);
      }
    } else {
      console.error(
        "An unknown error occurred while connecting to the database"
      );
    }
    process.exit(1);
  }
};

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

connectDB();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/", bookingRoutes);
app.use("/api/checkin", checkInRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
