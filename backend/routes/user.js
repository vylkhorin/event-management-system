
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
    getProfile,
    updateProfile,
    getEvents,
    getEventById,
    bookEvent,
    getUserBookings,
    getBookingById
} = require('../controllers/userController');

// -----------------
// Profile
// -----------------
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
// router.put('/profile/password', authMiddleware, updatePassword);

// -----------------
// Browse Events
// -----------------
router.get('/events', getEvents);
router.get('/events/:id', getEventById);

// -----------------
// Bookings
// -----------------
router.post('/book/:eventId', authMiddleware, bookEvent);
router.get('/bookings', authMiddleware, getUserBookings);
router.get('/bookings/:id', authMiddleware, getBookingById);

module.exports = router;





// const express = require('express');
// const router = express.Router();
// const Event = require('../models/Event');
// const Booking = require('../models/Booking');
// const User = require('../models/User');
// const { authMiddleware } = require('../middleware/authMiddleware');


// // ------------------------
// // Existing Browse Routes
// // ------------------------
// router.get('/events', async (req, res) => {
//     try {
//         const events = await Event.find().sort({ date: 1 });
//         res.json(events);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// router.get('/events/:id', async (req, res) => {
//     try {
//         const event = await Event.findById(req.params.id);
//         if (!event) return res.status(404).json({ message: 'Event not found' });
//         res.json(event);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// // ------------------------
// // Booking Routes
// // ------------------------

// // @route   POST /api/user/book/:eventId
// // @desc    Book seats for an event
// // @access  Private (user)
// router.post('/book/:eventId', authMiddleware, async (req, res) => {
//     try {
//         const { seats } = req.body;
//         const event = await Event.findById(req.params.eventId);

//         if (!event) {
//             return res.status(404).json({ message: 'Event not found' });
//         }

//         if (event.availableSeats < seats) {
//             return res.status(400).json({ message: 'Not enough seats available' });
//         }

//         // Calculate total price
//         const totalPrice = event.price * seats;

//         // Create booking
//         const booking = new Booking({
//             userId: req.user._id,
//             eventId: event._id,
//             seatsBooked: seats,
//             totalPrice,
//             paymentStatus: 'paid'   // For now we assume successful payment
//         });

//         await booking.save();

//         // Update available seats in event
//         event.availableSeats -= seats;
//         await event.save();

//         res.status(201).json({ message: 'Booking successful', booking });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// // @route   GET /api/user/bookings
// // @desc    Get all bookings of logged-in user
// // @access  Private (user)
// router.get('/bookings', authMiddleware, async (req, res) => {
//     try {
//         const bookings = await Booking.find({ userId: req.user._id })
//             .populate('eventId', 'title date location price');
//         res.json(bookings);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });



// // =========================
// // USER PROFILE
// // =========================

// // @route   GET /api/user/profile
// // @desc    Get logged-in user profile
// // @access  Private
// router.get('/profile', authMiddleware, async (req, res) => {
//     try {
//         const user = await User.findById(req.user.id).select('-password'); // hide password
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }
//         res.json(user);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // @route   PUT /api/user/profile
// // @desc    Update user profile
// // @access  Private
// router.put('/profile', authMiddleware, async (req, res) => {
//     try {
//         const { name, email, password } = req.body;
//         let user = await User.findById(req.user.id);

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // Update fields if provided
//         if (name) user.name = name;
//         if (email) user.email = email;
//         if (password) {
//             const bcrypt = require('bcryptjs');
//             const salt = await bcrypt.genSalt(10);
//             user.password = await bcrypt.hash(password, salt);
//         }

//         await user.save();
//         res.json({ message: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email } });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// module.exports = router;
