import { Request, Response } from "express";
import QRCode, { IQRCode } from "../models/QRCode";
import { IUser } from "../models/User";

interface AuthRequest extends Request {
  user?: IUser;
}

export const createQRCode = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.admin) {
      res.status(403).send({ error: "Admin privileges required" });
      return;
    }

    const { code, name } = req.body;

    const existingCode = await QRCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      res.status(400).send({ error: "QR code already exists" });
      return;
    }

    const qrCode = new QRCode({
      code: code.toUpperCase(),
      name,
      active: true,
    });

    await qrCode.save();
    res.status(201).send(qrCode);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const deactivateQRCode = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.admin) {
      res.status(403).send({ error: "Admin privileges required" });
      return;
    }

    const { code } = req.params;

    const qrCode = await QRCode.findOne({ code: code.toUpperCase() });
    if (!qrCode) {
      res.status(404).send({ error: "QR code not found" });
      return;
    }

    qrCode.active = false;
    await qrCode.save();

    res.send(qrCode);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getQRCodeDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;

    const qrCode = await QRCode.findOne({ code: code.toUpperCase() });
    if (!qrCode) {
      res.status(404).send({ error: "QR code not found" });
      return;
    }

    res.send(qrCode);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getAllQRCodes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.admin) {
      res.status(403).send({ error: "Admin privileges required" });
      return;
    }

    const { active } = req.query;

    let query = {};
    if (active !== undefined) {
      query = { active: active === "true" };
    }

    const qrCodes = await QRCode.find(query).sort({ createdAt: -1 });
    res.send(qrCodes);
  } catch (error) {
    res.status(500).send(error);
  }
};
