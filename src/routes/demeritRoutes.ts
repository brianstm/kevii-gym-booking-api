import express from "express";
import { auth } from "../middleware/auth";
import {
  checkDemerits,
  getUserDemerits,
  getAllDemerits,
} from "../controllers/demeritController";

const router = express.Router();

router.post("/check", auth, checkDemerits);
router.get("/my-demerits", auth, getUserDemerits);
router.get("/all", auth, getAllDemerits);

export default router;
