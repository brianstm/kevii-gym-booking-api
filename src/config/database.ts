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

export default connectDB;
