import express from "express";
import { auth } from "../middleware/auth";
import {
  checkIn,
  checkOut,
  getCheckInStatus,
  getAllCheckIns,
  getCurrentGymPopulation,
} from "../controllers/checkInController";

const router = express.Router();

router.post("/checkin", auth, checkIn);
router.post("/checkout", auth, checkOut);
router.get("/status", auth, getCheckInStatus);
router.get("/all", auth, getAllCheckIns);
router.get("/population", auth, getCurrentGymPopulation);

export default router;
