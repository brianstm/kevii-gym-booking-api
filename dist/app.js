import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import checkInRoutes from "./routes/checkInRoutes";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;
connectDB();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/", bookingRoutes);
app.use("/api/checkin", checkInRoutes);
app.get("/", (req, res) => {
    res.status(200).json({ message: "KEVII GYM BOOKING API", version: "1.0.0" });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
export default app;
