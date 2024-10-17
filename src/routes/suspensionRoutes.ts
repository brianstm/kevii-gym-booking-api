import express from "express";
import { SuspensionController } from "../controllers/suspensionController";
import { auth, isAdmin } from "../middleware/auth";

const router = express.Router();

router.post("/suspend", auth, isAdmin, SuspensionController.suspendUser);
router.delete(
  "/suspend/:userId",
  auth,
  isAdmin,
  SuspensionController.removeSuspension
);
router.get("/suspend/:userId", auth, SuspensionController.getSuspensionStatus);

export default router;
