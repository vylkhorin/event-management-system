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
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user profile (name, email)

exports.updateProfile = async (req, res) => {
       
        try {
            const { name, email } = req.body;
            let user = await User.findById(req.user.id);

            if (!user) {
            return res.status(404).json({ message: 'User not found' });
            }

            if (name) user.name = name;
            if (email) user.email = email.toLowerCase();

            await user.save();
            res.json({
            message: 'Profile updated successfully',
            user: { id: user.id, name: user.name, email: user.email }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
};

// update password

// exports.updatePassword = async (req, res) => {
//   try {
//     const { oldPassword, newPassword } = req.body;
//     // let user = await User.findById(req.user.id);
//     let user = await User.findById(req.user.id).select("+password");


//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Check old password first
//     const isMatch = await bcrypt.compare(oldPassword, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Old password is incorrect' });
//     }

//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(newPassword, salt);

//     await user.save();
//     res.json({ message: 'Password updated successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };




// -----------------
// Browse Events
// -----------------
exports.getEvents = async (req, res) => {
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

// -----------------
// Bookings
// -----------------


// book an event

exports.bookEvent = async (req, res) => {
    try {
        const { seats } = req.body;
        const event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.availableSeats < seats) {
            return res.status(400).json({ message: 'Not enough seats available' });
        }

        // Calculate total price
        const totalPrice = event.price * seats;

        // Create booking
        const booking = new Booking({
            userId: req.user._id,
            eventId: event._id,
            seatsBooked: seats,
            totalPrice,
            paymentStatus: 'paid'   // For now we assume successful payment
        });

        await booking.save();

        // Update available seats in event
        event.availableSeats -= seats;
        await event.save();

        res.status(201).json({ message: 'Booking successful', booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id }).populate('eventId', 'title date location price');
        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id })
            .populate('eventId', 'title date location price');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        res.json({
            bookingId: booking._id,
            event: booking.eventId.title,
            location: booking.eventId.location,
            date: booking.eventId.date,
            seatsBooked: booking.seatsBooked,
            pricePerSeat: booking.eventId.price,
            totalAmount: booking.totalPrice,
            bookingDate: booking.createdAt,
            status: booking.paymentStatus
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};






