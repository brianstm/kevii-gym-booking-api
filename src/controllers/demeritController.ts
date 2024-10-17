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
    // Get all unchecked bookings (regardless of date)
    const bookings = await Booking.find({
      demeritChecked: false,
    }).populate("user");

    // Get all unchecked check-ins
    const checkIns = await CheckIn.find({
      demeritChecked: false,
    }).populate("user");

    const demerits = [];

    // Check bookings for no-shows
    for (const booking of bookings) {
      // If the booking is marked as not present, it means they didn't check in
      if (!booking.present) {
        // Add demerit for no-show
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

      // Mark booking as checked regardless of whether a demerit was issued
      booking.demeritChecked = true;
      await booking.save();
    }

    // Check check-ins for missing check-outs or long duration
    for (const checkIn of checkIns) {
      if (!checkIn.checkOutTime) {
        // Add demerit for no check-out
        const demerit = new Demerit({
          user: checkIn.user,
          reason: "No check-out recorded",
          points: 1,
          checkedAt: new Date(),
          checkInId: checkIn._id,
        });
        await demerit.save();
        demerits.push(demerit);
      } else {
        // Check duration
        const duration = differenceInHours(
          new Date(checkIn.checkOutTime),
          new Date(checkIn.checkInTime)
        );

        if (duration > 5) {
          // Add demerit for exceeding 5 hours
          const demerit = new Demerit({
            user: checkIn.user,
            reason: "Gym session exceeded 5 hours",
            points: 1,
            checkedAt: new Date(),
            checkInId: checkIn._id,
          });
          await demerit.save();
          demerits.push(demerit);
        }
      }

      // Mark check-in as checked
      checkIn.demeritChecked = true;
      await checkIn.save();
    }

    res.status(200).send({
      message: "Demerit check completed",
      demeritsIssued: demerits.length,
      details: {
        bookingsChecked: bookings.length,
        checkInsChecked: checkIns.length,
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

    // Group demerits by reason
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

    // Calculate statistics
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
