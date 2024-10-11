import { Request, Response } from "express";
import CheckIn, { ICheckIn } from "../models/CheckIn";
import User, { IUser } from "../models/User";
import Booking from "../models/Booking";

interface AuthRequest extends Request {
  user?: IUser;
}

export const checkIn = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const booking = await Booking.findOne({
      user: req.user!._id,
      date: {
        $gte: new Date(),
        $lte: new Date(new Date().getTime() + 10 * 60 * 1000),
      },
    });

    if (!booking) {
      res.status(400).send({
        error: "You can only check in up to 10 minutes before your booking.",
      });
      return;
    }

    const existingCheckIn = await CheckIn.findOne({
      user: req.user!._id,
      checkOutTime: null,
    });
    if (existingCheckIn) {
      res.status(400).send({ error: "You are already checked in" });
      return;
    }

    const checkIn = new CheckIn({
      user: req.user!._id,
      checkInTime: new Date(),
    });
    await checkIn.save();
    res.status(201).send(checkIn);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const checkOut = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const checkIn = await CheckIn.findOne({
      user: req.user!._id,
      checkOutTime: null,
    });
    if (!checkIn) {
      res.status(400).send({ error: "You are not checked in" });
      return;
    }

    checkIn.checkOutTime = new Date();
    await checkIn.save();
    res.send(checkIn);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getCheckInStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const checkIn = await CheckIn.findOne({
      user: req.user!._id,
      checkOutTime: null,
    });
    if (checkIn) {
      res.send({ status: "checked-in", checkIn });
    } else {
      res.send({ status: "checked-out" });
    }
  } catch (error) {
    res.status(500).send(error);
  }
};
