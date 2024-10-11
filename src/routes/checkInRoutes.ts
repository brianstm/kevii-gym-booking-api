import express from "express";
import { auth } from "../middleware/auth";
import {
  checkIn,
  checkOut,
  getCheckInStatus,
} from "../controllers/checkInController";

const router = express.Router();

router.post("/checkin", auth, checkIn);
router.post("/checkout", auth, checkOut);
router.get("/status", auth, getCheckInStatus);

export default router;
