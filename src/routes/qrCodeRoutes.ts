import express from "express";
import { auth } from "../middleware/auth";
import {
  createQRCode,
  deactivateQRCode,
  getQRCodeDetails,
  getAllQRCodes,
} from "../controllers/qrCodeController";

const router = express.Router();

router.post("/", auth, createQRCode);
router.patch("/:code/deactivate", auth, deactivateQRCode);
router.get("/:code", auth, getQRCodeDetails);
router.get("/", auth, getAllQRCodes);

export default router;
