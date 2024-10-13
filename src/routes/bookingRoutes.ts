import express from "express";
import { auth } from "../middleware/auth";
import {
  createBooking,
  getBooking,
  updateBooking,
  deleteBooking,
  getBookingsForDate,
  getUserBookingHistory,
  getAllBookings,
  getBookingsForWeek,
  getPastBookings,
  getUpcomingBookings,
} from "../controllers/bookingController";

const router = express.Router();

router.post("/bookings/", auth, createBooking);
router.get("/bookings/:id", auth, getBooking);
router.get("/bookings/", auth, getAllBookings);
router.patch("/bookings/:id", auth, updateBooking);
router.delete("/bookings/:id", auth, deleteBooking);
router.get("/bookings/date/:date", auth, getBookingsForDate);
router.get("/bookings/week/:date", auth, getBookingsForWeek);
router.get("/all-bookings", auth, getUserBookingHistory);
router.get("/past-bookings", auth, getPastBookings);
router.get("/upcoming-bookings", auth, getUpcomingBookings);

export default router;
