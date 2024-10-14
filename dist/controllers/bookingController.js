import Booking from "../models/Booking";
import { startOfWeek, addDays, startOfDay } from "date-fns";
import { format } from "date-fns";
import { format as formatWithTimezone, fromZonedTime } from "date-fns-tz";
export const createBooking = async (req, res) => {
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
        const bookingEndTime = new Date(new Date(date).getTime() + duration * 60 * 60 * 1000);
        const overlappingBookings = await Booking.find({
            user: req.user._id,
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
            user: req.user._id,
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
            user: req.user._id,
            date: date,
            duration,
        });
        await booking.save();
        res.status(201).send(booking);
    }
    catch (error) {
        res.status(400).send(error);
    }
};
export const getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate("user", "name");
        if (!booking) {
            res.status(404).send({ error: "Booking not found." });
            return;
        }
        const formattedBookings = formatBookingDates(booking);
        res.status(200).send(formattedBookings);
    }
    catch (error) {
        res
            .status(500)
            .send({ error: "Failed to retrieve booking", details: error });
    }
};
export const updateBooking = async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["date", "duration"];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
        res.status(400).send({ error: "Invalid updates!" });
        return;
    }
    try {
        const booking = await Booking.findOne({
            _id: req.params.id,
            user: req.user._id,
        });
        if (!booking) {
            res.status(404).send();
            return;
        }
        updates.forEach((update) => {
            if (update === "date") {
                booking.date = new Date(req.body.date);
            }
            else if (update === "duration") {
                booking.duration = req.body.duration;
            }
        });
        await booking.save();
        res.send(booking);
    }
    catch (error) {
        res.status(400).send(error);
    }
};
export const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id,
        });
        if (!booking) {
            res.status(404).send();
            return;
        }
        res.send(booking);
    }
    catch (error) {
        res.status(500).send(error);
    }
};
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().populate("user", "name");
        const formattedBookings = bookings.map(formatBookingDates);
        res.status(200).send(formattedBookings);
    }
    catch (error) {
        res
            .status(500)
            .send({ error: "Failed to retrieve bookings", details: error });
    }
};
export const getBookingsForDate = async (req, res) => {
    try {
        const { date } = req.params;
        if (!date || isNaN(Date.parse(date))) {
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
    }
    catch (error) {
        res
            .status(500)
            .send({ error: "Failed to retrieve bookings", details: error });
    }
};
export const getUserBookingHistory = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .sort({
            date: -1,
        })
            .populate("user", "name");
        const formattedBookings = bookings.map(formatBookingDates);
        res.status(200).send(formattedBookings);
    }
    catch (error) {
        res.status(500).send(error);
    }
};
// export const getBookingsForWeek = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { date } = req.params;
//     if (!date || isNaN(Date.parse(date as string))) {
//       res.status(400).send({ error: "Invalid or missing date parameter" });
//       return;
//     }
//     const givenDate = new Date(date);
//     const startOfTheWeek = startOfWeek(givenDate, { weekStartsOn: 1 }); // Monday
//     const endOfTheWeek = endOfWeek(givenDate, { weekStartsOn: 1 }); // Sunday
//     const weeklyBookings = await Booking.find({
//       date: { $gte: startOfTheWeek, $lte: endOfTheWeek },
//     }).populate("user", "name");
//     const now = new Date();
//     const pastBookings = weeklyBookings
//       .filter((booking) => booking.date < now)
//       .map(formatBookingDates);
//     const upcomingBookings = weeklyBookings
//       .filter((booking) => booking.date >= now)
//       .map(formatBookingDates);
//     res.status(200).send({
//       startOfTheWeek,
//       endOfTheWeek,
//       pastBookings,
//       upcomingBookings,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .send({ error: "Failed to retrieve bookings", details: error });
//   }
// };
export const getBookingsForWeek = async (req, res) => {
    try {
        const { date, startOfWeek: startOfWeekParam } = req.query;
        if (!date || isNaN(Date.parse(date))) {
            res.status(400).send({ error: "Invalid or missing date parameter" });
            return;
        }
        const givenDate = new Date(date);
        let startDate;
        let endDate;
        if (startOfWeekParam === "true") {
            startDate = startOfWeek(givenDate, { weekStartsOn: 1 });
        }
        else {
            startDate = startOfDay(givenDate);
        }
        endDate = addDays(startDate, 6);
        const weeklyBookings = await Booking.find({
            date: { $gte: startDate, $lte: endDate },
        }).populate("user", "name");
        const now = new Date();
        const pastBookings = weeklyBookings
            .filter((booking) => booking.date < now)
            .map(formatBookingDates);
        const upcomingBookings = weeklyBookings
            .filter((booking) => booking.date >= now)
            .map(formatBookingDates);
        res.status(200).send({
            startDate,
            endDate,
            pastBookings,
            upcomingBookings,
        });
    }
    catch (error) {
        res
            .status(500)
            .send({ error: "Failed to retrieve bookings", details: error });
    }
};
export const getPastBookings = async (req, res) => {
    try {
        const now = new Date();
        const pastBookings = await Booking.find({
            date: { $lt: now },
        })
            .populate("user", "name")
            .sort({ date: -1 });
        const formattedBookings = pastBookings.map(formatBookingDates);
        res.status(200).send(formattedBookings);
    }
    catch (error) {
        res.status(500).send({
            error: "Failed to retrieve past bookings",
            details: error,
        });
    }
};
export const getUpcomingBookings = async (req, res) => {
    try {
        const now = new Date();
        const upcomingBookings = await Booking.find({
            date: { $gte: now },
        })
            .populate("user", "name")
            .sort({ date: 1 });
        const formattedBookings = upcomingBookings.map(formatBookingDates);
        res.status(200).send(formattedBookings);
    }
    catch (error) {
        res.status(500).send({
            error: "Failed to retrieve upcoming bookings",
            details: error,
        });
    }
};
const formatBookingDates = (booking) => {
    const bookingDate = new Date(booking.date);
    // Format for local time (based on server's time zone)
    const localDate = format(bookingDate, "EEEE, dd MMMM yyyy, h:mm a");
    // Format for Singapore time (SGT)
    const sgtDate = formatWithTimezone(bookingDate, "EEEE, dd MMMM yyyy, h:mm a", {
        timeZone: "Asia/Singapore",
    });
    return {
        ...booking.toObject(),
        dateFormats: {
            original: bookingDate,
            local: localDate,
            sgt: sgtDate,
        },
    };
};
