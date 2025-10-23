const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');

// -----------------
// EVENT CRUD
// -----------------
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location, totalSeats, price } = req.body;
        const event = await Event.create({
            title,
            description,
            date,
            location,
            totalSeats,
            availableSeats: totalSeats,
            price
        });
        res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event updated successfully', event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -----------------
// BOOKINGS
// -----------------
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'name email')
            .populate('eventId', 'title date location price');
        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('eventId', 'title date location price');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json(booking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Restore available seats
        await Event.findByIdAndUpdate(booking.eventId, {
            $inc: { availableSeats: booking.seatsBooked }
        });

        await booking.deleteOne();

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -----------------
// ADMIN REPORTS
// -----------------
exports.getReports = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalEvents = await Event.countDocuments();
        const totalBookings = await Booking.countDocuments();

        const totalRevenueAgg = await Booking.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
        ]);
        const totalRevenue = totalRevenueAgg[0] ? totalRevenueAgg[0].totalRevenue : 0;

        const bookingsPerEvent = await Booking.aggregate([
            { $group: { _id: "$eventId", totalSeats: { $sum: "$seatsBooked" } } },
            { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
            { $unwind: "$event" },
            { $project: { eventId: "$_id", title: "$event.title", totalSeats: 1 } }
        ]);

        res.json({
            totalUsers,
            totalEvents,
            totalBookings,
            totalRevenue,
            bookingsPerEvent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
