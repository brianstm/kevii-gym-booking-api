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
  getBookingsForWeekByTimeslot,
} from "../controllers/bookingController";

const router = express.Router();

router.post("/bookings/", auth, createBooking);
router.get("/booking/:id", auth, getBooking);
router.get("/bookings/", auth, getAllBookings);
router.patch("/bookings/:id", auth, updateBooking);
router.delete("/bookings/:id", auth, deleteBooking);
router.get("/bookings/date/:date", auth, getBookingsForDate);
router.get("/bookings/week", auth, getBookingsForWeek);
router.get("/bookings/week-count", auth, getBookingsForWeekByTimeslot);
router.get("/bookings/all", auth, getUserBookingHistory);
router.get("/bookings/past", auth, getPastBookings);
router.get("/bookings/upcoming", auth, getUpcomingBookings);

export default router;
