import { Request, Response } from "express";
import Booking from "../models/Booking";
import CheckIn from "../models/CheckIn";
import Demerit from "../models/Demerit";
import { differenceInHours } from "date-fns";
import { IUser } from "../models/User";

interface AuthRequest extends Request {
  user?: IUser;
}

export const checkDemerits = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const now = new Date();

    const bookings = await Booking.find({
      demeritChecked: false,
      date: { $lt: now },
    }).populate("user");

    const checkIns = await CheckIn.find({
      demeritChecked: false,
      checkInTime: { $lt: now },
    }).populate("user");

    const demerits = [];
    const autoCheckouts = [];

    for (const booking of bookings) {
      if (!booking.present) {
        const demerit = new Demerit({
          user: booking.user,
          reason: "No-show for booked session",
          points: 1,
          checkedAt: new Date(),
          bookingId: booking._id,
        });
        await demerit.save();
        demerits.push(demerit);
      }

      booking.demeritChecked = true;
      await booking.save();
    }

    for (const checkIn of checkIns) {
      const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

      if (!checkIn.checkOutTime && checkIn.checkInTime < fiveHoursAgo) {
        const demerit = new Demerit({
          user: checkIn.user,
          reason: "No check-out recorded - Auto checkout applied",
          points: 1,
          checkedAt: now,
          checkInId: checkIn._id,
        });
        await demerit.save();
        demerits.push(demerit);

        checkIn.checkOutTime = now;
        autoCheckouts.push({
          userId: checkIn.user._id,
          checkInId: checkIn._id,
          originalCheckInTime: checkIn.checkInTime,
          autoCheckoutTime: now,
        });
      } else if (checkIn.checkOutTime) {
        const duration = differenceInHours(
          new Date(checkIn.checkOutTime),
          new Date(checkIn.checkInTime)
        );

        if (duration > 5) {
          const demerit = new Demerit({
            user: checkIn.user,
            reason: "Gym session exceeded 5 hours",
            points: 1,
            checkedAt: now,
            checkInId: checkIn._id,
          });
          await demerit.save();
          demerits.push(demerit);
        }
      }

      checkIn.demeritChecked = true;
      await checkIn.save();
    }

    res.status(200).send({
      message: "Demerit check completed",
      demeritsIssued: demerits.length,
      details: {
        bookingsChecked: bookings.length,
        checkInsChecked: checkIns.length,
        autoCheckoutsApplied: autoCheckouts.length,
        autoCheckouts: autoCheckouts,
        demeritsIssued: demerits.map((d) => ({
          user: d.user,
          reason: d.reason,
          points: d.points,
          checkedAt: d.checkedAt,
        })),
      },
    });
  } catch (error) {
    res.status(500).send({
      error: "Failed to check demerits",
      details: error,
    });
  }
};

export const getUserDemerits = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const demerits = await Demerit.find({ user: req.user!._id }).sort({
      checkedAt: -1,
    });

    const totalPoints = demerits.reduce(
      (sum, demerit) => sum + demerit.points,
      0
    );

    const demeritsByReason = demerits.reduce((acc: any, demerit) => {
      if (!acc[demerit.reason]) {
        acc[demerit.reason] = 0;
      }
      acc[demerit.reason] += demerit.points;
      return acc;
    }, {});

    res.status(200).send({
      totalPoints,
      demeritsByReason,
      demerits,
    });
  } catch (error) {
    res.status(500).send({
      error: "Failed to retrieve user demerits",
      details: error,
    });
  }
};

export const getAllDemerits = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const demerits = await Demerit.find()
      .populate("user", "name email")
      .sort({ checkedAt: -1 });

    const stats = {
      totalDemerits: demerits.length,
      totalPoints: demerits.reduce((sum, d) => sum + d.points, 0),
      byReason: demerits.reduce((acc: any, d) => {
        if (!acc[d.reason]) {
          acc[d.reason] = { count: 0, points: 0 };
        }
        acc[d.reason].count++;
        acc[d.reason].points += d.points;
        return acc;
      }, {}),
      byUser: demerits.reduce((acc: any, d) => {
        const userId = d.user._id.toString();
        if (!acc[userId]) {
          acc[userId] = {
            id: d.user.id,
            totalPoints: 0,
            demeritsCount: 0,
          };
        }
        acc[userId].totalPoints += d.points;
        acc[userId].demeritsCount++;
        return acc;
      }, {}),
    };

    res.status(200).send({
      statistics: stats,
      demerits,
    });
  } catch (error) {
    res.status(500).send({
      error: "Failed to retrieve all demerits",
      details: error,
    });
  }
};
