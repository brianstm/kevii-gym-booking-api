import { Request, Response } from "express";
import Booking, { IBooking } from "../models/Booking";
import User, { IUser } from "../models/User";

interface AuthRequest extends Request {
  user?: IUser;
}

export const createBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const maxUsersPerHour = 4;
    const maxDuration = 3;
    const maxBookingsPerDay = 3;

    const { date, duration } = req.body;

    if (duration > maxDuration) {
      res
        .status(400)
        .send({ error: `Maximum booking duration is ${maxDuration} hours.` });
      return;
    }

    const bookingStartTime = new Date(date);
    const bookingEndTime = new Date(
      new Date(date).getTime() + duration * 60 * 60 * 1000
    );

    const overlappingBookings = await Booking.find({
      user: req.user!._id,
      $or: [
        {
          date: { $gte: bookingStartTime, $lt: bookingEndTime },
        },
        {
          date: { $lt: bookingStartTime },
          $expr: {
            $gte: [
              { $add: ["$date", { $multiply: ["$duration", 60 * 60 * 1000] }] },
              bookingStartTime,
            ],
          },
        },
      ],
    });

    if (overlappingBookings.length > 0) {
      res
        .status(400)
        .send({ error: "You already have a booking during this time." });
      return;
    }

    const startOfDay = new Date(bookingStartTime.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingStartTime.setUTCHours(23, 59, 59, 999));

    const dailyBookings = await Booking.find({
      user: req.user!._id,
      date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    if (dailyBookings.length >= maxBookingsPerDay) {
      res.status(400).send({
        error: `You can only book up to ${maxBookingsPerDay} slots per day.`,
      });
      return;
    }

    const existingBookings = await Booking.find({
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + duration * 60 * 60 * 1000),
      },
    });

    if (existingBookings.length >= maxUsersPerHour) {
      res
        .status(400)
        .send({ error: "Gym is fully booked for the selected time." });
      return;
    }

    const booking = new Booking({
      user: req.user!._id,
      date: date,
      duration,
    });

    await booking.save();
    res.status(201).send(booking);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).send();
      return;
    }
    res.send(booking);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const updateBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const updates = Object.keys(req.body) as Array<keyof IBooking>;
  const allowedUpdates: Array<keyof IBooking> = ["date", "duration"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    res.status(400).send({ error: "Invalid updates!" });
    return;
  }

  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!booking) {
      res.status(404).send();
      return;
    }

    updates.forEach((update) => {
      if (update === "date") {
        booking.date = new Date(req.body.date);
      } else if (update === "duration") {
        booking.duration = req.body.duration;
      }
    });

    await booking.save();
    res.send(booking);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const deleteBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const booking = await Booking.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!booking) {
      res.status(404).send();
      return;
    }

    res.send(booking);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const getAllBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bookings = await Booking.find().populate("user", "name");

    res.status(200).send(bookings);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to retrieve bookings", details: error });
  }
};

export const getBookingsForDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date } = req.params;

    if (!date || isNaN(Date.parse(date as string))) {
      res.status(400).send({ error: "Invalid or missing date parameter" });
      return;
    }

    const parsedDate = new Date(date as string);

    const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setUTCHours(23, 59, 59, 999));

    const bookings = await Booking.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }).populate("user", "name");

    res.status(200).send(bookings);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to retrieve bookings", details: error });
  }
};

export const getUserBookingHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const bookings = await Booking.find({ user: req.user!._id })
      .sort({
        date: -1,
      })
      .populate("user", "name");

    res.status(200).send(bookings);
  } catch (error) {
    res.status(500).send(error);
  }
};
