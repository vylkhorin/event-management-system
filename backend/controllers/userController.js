const User = require('../models/User');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');

// -----------------
// Profile
// -----------------
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('getProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name.trim();
        if (email) {
            // Check if email already taken by another user
            const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
            if (existing) return res.status(400).json({ message: 'Email already in use' });
            user.email = email.toLowerCase();
        }

        await user.save();
        res.json({
            message: 'Profile updated successfully',
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });

        // Hash manually then write directly — bypass the pre('save') hook
        // to prevent double-hashing (User model already hashes on save)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('updatePassword error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// -----------------
// Browse Events (with search, filter, pagination)
// -----------------
exports.getEvents = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, date, page = 1, limit = 12 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) query.category = category;
        if (minPrice !== undefined) query.price = { ...query.price, $gte: Number(minPrice) };
        if (maxPrice !== undefined) query.price = { ...query.price, $lte: Number(maxPrice) };
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            query.date = { $gte: start, $lt: end };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Event.countDocuments(query);
        const events = await Event.find(query)
            .sort({ date: 1 })
            .skip(skip)
            .limit(Number(limit));

        res.json({ events, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        console.error('getEvents error:', error);
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

// -----------------
// Bookings
// -----------------
exports.bookEvent = async (req, res) => {
    try {
        const { selectedSeats, paymentMethod = 'credit_card' } = req.body;
        
        if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length < 1) {
            return res.status(400).json({ message: 'Please select at least 1 seat' });
        }
        
        const numSeats = selectedSeats.length;

        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check if event is in the past
        if (new Date(event.date) < new Date()) {
            return res.status(400).json({ message: 'Cannot book a past event' });
        }

        if (event.availableSeats < numSeats) {
            return res.status(400).json({ message: `Only ${event.availableSeats} seats available` });
        }

        // Check if any selected seats are already booked
        const alreadyBooked = selectedSeats.some(seat => event.bookedSeats.includes(seat));
        if (alreadyBooked) {
            return res.status(400).json({ message: 'One or more selected seats are already booked' });
        }

        // Prevent duplicate bookings for the same event
        const existingBooking = await Booking.findOne({
            userId: req.user.id,
            eventId: event._id,
            status: { $in: ['confirmed', 'pending'] }
        });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked or requested this event' });
        }

        const totalPrice = event.price * numSeats;
        
        // Generate simulated transaction ID
        const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const booking = await Booking.create({
            userId: req.user.id,
            eventId: event._id,
            seatsBooked: numSeats,
            selectedSeats: selectedSeats,
            totalPrice,
            paymentMethod,
            transactionId,
            paymentStatus: 'pending',
            status: 'pending'
        });

        // Decrement available seats and add booked seats atomically
        await Event.findByIdAndUpdate(event._id, { 
            $inc: { availableSeats: -numSeats },
            $push: { bookedSeats: { $each: selectedSeats } }
        });

        res.status(201).json({ message: 'Booking requested! Waiting for admin approval.', booking });
    } catch (error) {
        console.error('bookEvent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getUserBookings = async (req, res) => {
    try {
        const { page = 1, limit = 12 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const total = await Booking.countDocuments({ userId: req.user.id });
        const bookings = await Booking.find({ userId: req.user.id })
            .populate('eventId', 'title date location price category imageUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        console.error('getUserBookings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id })
            .populate('eventId', 'title date location price category');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        res.json({
            bookingId: booking._id,
            event: booking.eventId?.title,
            category: booking.eventId?.category,
            location: booking.eventId?.location,
            date: booking.eventId?.date,
            seatsBooked: booking.seatsBooked,
            pricePerSeat: booking.eventId?.price,
            totalAmount: booking.totalPrice,
            bookingDate: booking.createdAt,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
            transactionId: booking.transactionId
        });
    } catch (error) {
        console.error('getBookingById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User cancels their own booking
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        // Restore seats
        await Event.findByIdAndUpdate(booking.eventId, {
            $inc: { availableSeats: booking.seatsBooked },
            $pullAll: { bookedSeats: booking.selectedSeats }
        });

        booking.status = 'cancelled';
        booking.paymentStatus = 'cancelled';
        await booking.save();

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('cancelBooking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a review for an event
exports.addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const eventId = req.params.eventId;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });
        }
        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ message: 'Please provide a comment for your review' });
        }

        // Verify that the user has a confirmed booking for this event
        const hasBooked = await Booking.findOne({
            userId: req.user.id,
            eventId: eventId,
            status: 'confirmed'
        });

        if (!hasBooked) {
            return res.status(403).json({ message: 'You can only review events you have attended (Confirmed bookings)' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check if user already reviewed
        const alreadyReviewed = event.reviews.find(r => r.userId.toString() === req.user.id.toString());
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this event' });
        }

        const review = {
            userId: req.user.id,
            userName: req.user.name || 'Anonymous',
            rating: Number(rating),
            comment: comment.trim()
        };

        event.reviews.push(review);

        // Update average rating
        const totalRating = event.reviews.reduce((acc, item) => item.rating + acc, 0);
        event.averageRating = totalRating / event.reviews.length;

        await event.save();

        res.status(201).json({ message: 'Review added successfully' });
    } catch (error) {
        console.error('addReview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
