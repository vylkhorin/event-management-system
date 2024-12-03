const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');

// -----------------
// EVENT CRUD
// -----------------
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location, category, totalSeats, price } = req.body;

        if (!title || !description || !date || !location || !totalSeats || price === undefined) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (Number(totalSeats) < 1) {
            return res.status(400).json({ message: 'Total seats must be at least 1' });
        }
        if (Number(price) < 0) {
            return res.status(400).json({ message: 'Price cannot be negative' });
        }
        if (new Date(date) < new Date()) {
            return res.status(400).json({ message: 'Event date must be in the future' });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const event = await Event.create({
            title,
            description,
            date,
            location,
            category: category || 'Other',
            totalSeats: Number(totalSeats),
            availableSeats: Number(totalSeats),
            price: Number(price),
            imageUrl
        });

        res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
        console.error('createEvent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 50 } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) query.category = category;

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Event.countDocuments(query);
        const events = await Event.find(query).sort({ date: 1 }).skip(skip).limit(Number(limit));

        res.json({ events, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        console.error('getAllEvents error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        console.error('getEventById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

        const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event updated successfully', event });
    } catch (error) {
        console.error('updateEvent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        // Also cancel all bookings for this event
        await Booking.updateMany({ eventId: req.params.id }, { status: 'cancelled', paymentStatus: 'cancelled' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('deleteEvent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -----------------
// BOOKINGS
// -----------------
exports.getAllBookings = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const total = await Booking.countDocuments();
        const bookings = await Booking.find()
            .populate('userId', 'name email')
            .populate('eventId', 'title date location price category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        console.error('getAllBookings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('eventId', 'title date location price category');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json(booking);
    } catch (error) {
        console.error('getBookingById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        
        if (booking.status === 'confirmed') return res.status(400).json({ message: 'Booking already confirmed' });
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Cannot approve a cancelled booking' });

        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        await booking.save();
        
        res.json({ message: 'Booking approved successfully' });
    } catch (error) {
        console.error('approveBooking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Booking already cancelled' });

        // Restore seats
        await Event.findByIdAndUpdate(booking.eventId, {
            $inc: { availableSeats: booking.seatsBooked }
        });

        booking.status = 'cancelled';
        booking.paymentStatus = 'cancelled';
        await booking.save();

        res.json({ message: 'Booking rejected successfully' });
    } catch (error) {
        console.error('rejectBooking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status !== 'cancelled') {
            await Event.findByIdAndUpdate(booking.eventId, {
                $inc: { availableSeats: booking.seatsBooked }
            });
            booking.status = 'cancelled';
            booking.paymentStatus = 'cancelled';
            await booking.save();
        }

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('deleteBooking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -----------------
// USER MANAGEMENT
// -----------------
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('getAllUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete an admin' });

        // Cancel all bookings for this user and restore seats
        const userBookings = await Booking.find({ userId: req.params.id, status: 'confirmed' });
        for (const bk of userBookings) {
            await Event.findByIdAndUpdate(bk.eventId, { $inc: { availableSeats: bk.seatsBooked } });
        }
        await Booking.updateMany({ userId: req.params.id }, { status: 'cancelled' });
        await user.deleteOne();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('deleteUser error:', error);
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
        const totalBookings = await Booking.countDocuments({ status: 'confirmed' });

        const totalRevenueAgg = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

        const bookingsPerEvent = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: '$eventId', totalSeats: { $sum: '$seatsBooked' }, revenue: { $sum: '$totalPrice' } } },
            { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
            { $unwind: '$event' },
            { $project: { eventId: '$_id', title: '$event.title', totalSeats: 1, revenue: 1 } },
            { $sort: { revenue: -1 } }
        ]);

        // Bookings per day (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const bookingsTrend = await Booking.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'confirmed' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totalUsers,
            totalEvents,
            totalBookings,
            totalRevenue,
            bookingsPerEvent,
            bookingsTrend
        });
    } catch (error) {
        console.error('getReports error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Export bookings as CSV data
exports.exportBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'confirmed' })
            .populate('userId', 'name email')
            .populate('eventId', 'title date location price');

        const rows = [['Booking ID', 'User Name', 'User Email', 'Event', 'Date', 'Location', 'Seats', 'Total Price', 'Booked On']];
        bookings.forEach(bk => {
            rows.push([
                bk._id,
                bk.userId?.name || '',
                bk.userId?.email || '',
                bk.eventId?.title || '',
                bk.eventId?.date ? new Date(bk.eventId.date).toLocaleDateString() : '',
                bk.eventId?.location || '',
                bk.seatsBooked,
                bk.totalPrice,
                new Date(bk.createdAt).toLocaleDateString()
            ]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
        res.send(csv);
    } catch (error) {
        console.error('exportBookings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Export users as CSV data
exports.exportUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });

        const rows = [['User ID', 'Name', 'Email', 'Joined Date']];
        users.forEach(u => {
            rows.push([
                u._id,
                u.name || '',
                u.email || '',
                new Date(u.createdAt).toLocaleDateString()
            ]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        res.send(csv);
    } catch (error) {
        console.error('exportUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
