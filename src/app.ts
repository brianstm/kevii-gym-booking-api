import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import checkInRoutes from "./routes/checkInRoutes";
import demeritRoutes from "./routes/demeritRoutes";
import suspensionRoutes from "./routes/suspensionRoutes";
import qrCodeRoutes from "./routes/qrCodeRoutes";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://kevii-gym-booking-app.vercel.app",
    ],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/", bookingRoutes);
app.use("/api/checkin", checkInRoutes);
app.use("/api/demerit", demeritRoutes);
app.use("/api/", suspensionRoutes);
app.use("/api/qrcode", qrCodeRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "KEVII GYM BOOKING API", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
