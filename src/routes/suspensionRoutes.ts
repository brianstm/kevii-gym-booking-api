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
router.get(
  "/suspend/user/:userId",
  auth,
  SuspensionController.getSuspensionStatus
);
router.get(
  "/users/suspend",
  auth,
  isAdmin,
  SuspensionController.getAllUsersWithSuspensionStatus
);
router.get(
  "/suspend/current",
  auth,
  SuspensionController.getUserSuspensionStatus
);
router.post(
  "/suspend/auto-check",
  auth,
  SuspensionController.checkAndAutoSuspendAllUsers
);

export default router;
