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
    const now = new Date();
    const nowOffset = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    // Find bookings within a 20-minute window of the current time
    const twentyMinutesBefore = new Date(nowOffset.getTime() - 20 * 60 * 1000);
    const twentyMinutesAfter = new Date(nowOffset.getTime() + 20 * 60 * 1000);

    const booking = await Booking.findOne({
      user: req.user!._id,
      date: {
        $gte: twentyMinutesBefore,
        $lte: twentyMinutesAfter,
      },
    }).sort({ date: 1 }); // Get the nearest booking

    console.log("Current time with offset:", nowOffset);
    console.log("Booking found:", booking);

    if (!booking) {
      res.status(400).send({
        error: "No booking found within 20 minutes of the current time.",
      });
      return;
    }

    const bookingTime = new Date(booking.date);
    const timeDifference =
      (nowOffset.getTime() - bookingTime.getTime()) / (60 * 1000);

    if (timeDifference < -10) {
      res.status(400).send({
        error: "You can only check in up to 10 minutes before your booking.",
      });
      return;
    }

    if (timeDifference > 10) {
      res.status(400).send({
        error:
          "You are late. Check-in is not allowed more than 10 minutes after the booking time.",
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
      checkInTime: nowOffset,
    });
    await checkIn.save();

    booking.present = true;
    await booking.save();

    res.status(201).send({ checkIn, booking, timeDifference });
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

    const now = new Date();

    checkIn.checkOutTime = now;
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

export const getAllCheckIns = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { limit } = req.query;

    let limitNum = Number(limit);

    if (!limit) {
      limitNum = 10;
    }

    if (!req.user) {
      res.status(401).send({ error: "Authentication required" });
      return;
    }

    const checkIns = await CheckIn.find({ user: req.user._id })
      .sort({ checkInTime: -1 })
      .limit(limitNum);

    res.status(200).send(checkIns);
  } catch (error) {
    res
      .status(500)
      .send({ error: "An error occurred while fetching check-ins" });
  }
};
