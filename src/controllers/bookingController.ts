import { Request, Response } from "express";
import Booking, { IBooking } from "../models/Booking";
import User, { IUser } from "../models/User";
import { startOfWeek, addDays, addMinutes, format, set } from "date-fns";
import { format as formatWithTimezone, fromZonedTime } from "date-fns-tz";

interface AuthRequest extends Request {
  user?: IUser;
}

interface FormattedBooking {
  _id: string;
  date: string;
  duration: Number;
  user: {
    _id: string;
    name: string;
  };
  overlappingUsers: Array<{ _id: string; name: string }>;
}

export const createBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const maxUsersPerHour = 5;
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
    const booking = await Booking.findById(req.params.id).populate(
      "user",
      "name"
    );
    if (!booking) {
      res.status(404).send({ error: "Booking not found." });
      return;
    }

    const formattedBookings = formatBookingDates(booking);
    res.status(200).send(formattedBookings);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to retrieve booking", details: error });
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

    const now = new Date();
    const bookingTime = new Date(booking.date);
    const timeDifference = bookingTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference <= 1) {
      res.status(400).send({
        error:
          "Cannot edit bookings less than 1 hour before the scheduled time.",
      });
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
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!booking) {
      res.status(404).send();
      return;
    }

    const now = new Date();
    const bookingTime = new Date(booking.date);
    const timeDifference = bookingTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference <= 1) {
      res.status(400).send({
        error:
          "Cannot delete bookings less than 1 hour before the scheduled time.",
      });
      return;
    }

    await Booking.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

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

    const formattedBookings = bookings.map(formatBookingDates);
    res.status(200).send(formattedBookings);
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

    const timeZone = "Asia/Singapore";
    const parsedDateSGT = fromZonedTime(date, timeZone);

    const startOfDaySGT = new Date(parsedDateSGT.setUTCHours(0, 0, 0, 0));
    const endOfDaySGT = new Date(parsedDateSGT.setUTCHours(23, 59, 59, 999));

    const bookings = await Booking.find({
      date: {
        $gte: startOfDaySGT,
        $lt: endOfDaySGT,
      },
    }).populate("user", "name");

    const formattedBookings = bookings.map((booking) => {
      return formatBookingDates(booking);
    });

    res.status(200).send(formattedBookings);
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

    const formattedBookings = bookings.map(formatBookingDates);
    res.status(200).send(formattedBookings);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const getBookingsForWeek = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date, startOfWeek: startOfWeekParam } = req.query;

    if (!date || isNaN(Date.parse(date as string))) {
      res.status(400).send({ error: "Invalid or missing date parameter" });
      return;
    }

    const givenDate = new Date(date as string);
    const useStartOfWeek = startOfWeekParam === "true";

    let startDate: Date;
    let endDate: Date;

    if (useStartOfWeek) {
      startDate = startOfWeek(givenDate, { weekStartsOn: 1 }); // Monday
      endDate = addDays(startDate, 6); // Sunday
    } else {
      startDate = givenDate;
      endDate = addDays(startDate, 6);
    }

    const weeklyBookings = await Booking.find({
      date: { $gte: startDate, $lte: endDate },
    }).populate("user", "name");

    // Group bookings by date
    const groupedBookings: { [key: string]: any[] } = {};

    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(startDate, i);
      const dateKey = format(currentDate, "yyyy-MM-dd");
      groupedBookings[dateKey] = [];
    }

    weeklyBookings.forEach((booking) => {
      const bookingDate = format(booking.date, "yyyy-MM-dd");
      if (groupedBookings[bookingDate]) {
        groupedBookings[bookingDate].push(formatBookingDates(booking));
      }
    });

    res.status(200).send(groupedBookings);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to retrieve bookings", details: error });
  }
};

export const getPastBookings = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    const userId = req.user!._id;

    const pastBookings = await Booking.find({
      user: userId,
      date: { $lt: now },
    })
      .populate("user", "name")
      .sort({ date: -1 });

    const formattedBookings = pastBookings.map(formatBookingDates);
    res.status(200).send(formattedBookings);
  } catch (error) {
    res.status(500).send({
      error: "Failed to retrieve past bookings",
      details: error,
    });
  }
};

export const getUpcomingBookings = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    const userId = req.user!._id;

    const upcomingBookings = await Booking.find({
      user: userId,
      date: { $gte: now },
    })
      .populate<{ user: IUser }>("user", "name")
      .sort({ date: 1 });

    const formattedBookings: FormattedBooking[] = await Promise.all(
      upcomingBookings.map(async (booking) => {
        const bookingStart = new Date(booking.date);
        const bookingEnd = new Date(
          bookingStart.getTime() + Number(booking.duration) * 60000
        );

        const overlappingBookings = await Booking.find({
          _id: { $ne: booking._id },
          $or: [
            { date: { $lt: bookingEnd, $gte: bookingStart } },
            {
              $expr: {
                $and: [
                  { $lt: ["$date", bookingEnd] },
                  {
                    $gte: [
                      { $add: ["$date", { $multiply: ["$duration", 60000] }] },
                      bookingStart,
                    ],
                  },
                ],
              },
            },
          ],
        }).populate<{ user: IUser }>("user", "name");

        const overlappingUsers = overlappingBookings.map((ob) => ({
          _id: ob.user._id.toString(),
          name: ob.user.name,
        }));

        return {
          _id: booking._id.toString(),
          date: booking.date.toISOString(),
          duration: booking.duration,
          user: {
            _id: booking.user._id.toString(),
            name: booking.user.name,
          },
          overlappingUsers,
        };
      })
    );

    res.status(200).send(formattedBookings);
  } catch (error) {
    res.status(500).send({
      error: "Failed to retrieve upcoming bookings",
      details: error,
    });
  }
};

export const getBookingsForWeekByTimeslot = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      date,
      startOfWeek: startOfWeekParam,
      startTime,
      endTime,
      useSpecialUserValue,
    } = req.query;

    if (!date || isNaN(Date.parse(date as string))) {
      res.status(400).send({ error: "Invalid or missing date parameter" });
      return;
    }

    const givenDate = new Date(date as string);
    const useStartOfWeek = startOfWeekParam === "true";
    const useSpecialValue = useSpecialUserValue === "true";

    const startHour = parseInt(startTime as string);
    const endHour = parseInt(endTime as string);

    if (
      isNaN(startHour) ||
      isNaN(endHour) ||
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23 ||
      startHour > endHour
    ) {
      res
        .status(400)
        .send({ error: "Invalid or missing startTime/endTime parameters" });
      return;
    }

    let startDate: Date;
    let endDate: Date;

    if (useStartOfWeek) {
      startDate = startOfWeek(givenDate, { weekStartsOn: 1 });
      endDate = addDays(startDate, 6);
    } else {
      startDate = givenDate;
      endDate = addDays(startDate, 6);
    }

    const weeklyBookings = await Booking.find({
      date: { $gte: startDate, $lte: endDate },
    }).populate("user", "name");

    const timeslotBookingsByDate: {
      [date: string]: { [timeslot: string]: number };
    } = {};

    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(startDate, i);
      const formattedDate = format(currentDate, "yyyy-MM-dd");

      if (!timeslotBookingsByDate[formattedDate]) {
        timeslotBookingsByDate[formattedDate] = {};
      }

      for (let hour = startHour; hour < endHour; hour++) {
        for (let j = 0; j < 2; j++) {
          const timeslotStart = set(currentDate, {
            hours: hour,
            minutes: j * 30,
          });
          const timeslotEnd = addMinutes(timeslotStart, 30);
          const timeslotKey = format(timeslotStart, "HH:mm");

          if (!timeslotBookingsByDate[formattedDate][timeslotKey]) {
            timeslotBookingsByDate[formattedDate][timeslotKey] = 0;
          }

          const bookingsInTimeslot = weeklyBookings.filter((booking) => {
            const bookingStart = new Date(booking.date);
            const bookingEnd = new Date(
              bookingStart.getTime() + Number(booking.duration) * 60 * 60 * 1000
            );
            return bookingStart < timeslotEnd && bookingEnd > timeslotStart;
          });

          if (useSpecialValue) {
            const userBookingInTimeslot = bookingsInTimeslot.some(
              (booking) =>
                booking.user._id.toString() === req.user!._id.toString()
            );

            if (userBookingInTimeslot) {
              timeslotBookingsByDate[formattedDate][timeslotKey] = 100;
            } else {
              timeslotBookingsByDate[formattedDate][timeslotKey] +=
                bookingsInTimeslot.length;
            }
          } else {
            timeslotBookingsByDate[formattedDate][timeslotKey] =
              bookingsInTimeslot.length;
          }
        }
      }
    }

    res.status(200).send(timeslotBookingsByDate);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Failed to retrieve bookings", details: error });
  }
};

const formatBookingDates = (booking: any) => {
  const bookingDate = new Date(booking.date);

  // Format for local time (based on server's time zone)
  const localDate = format(bookingDate, "EEEE, dd MMMM yyyy, h:mm a");

  // Format for Singapore time (SGT)
  const sgtDate = formatWithTimezone(
    bookingDate,
    "EEEE, dd MMMM yyyy, h:mm a",
    {
      timeZone: "Asia/Singapore",
    }
  );

  return {
    ...booking.toObject(),
    dateFormats: {
      original: bookingDate,
      local: localDate,
      sgt: sgtDate,
    },
  };
};
