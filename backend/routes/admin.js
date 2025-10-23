const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getAllBookings,
    getBookingById,
    deleteBooking,
    getReports
} = require('../controllers/adminController');

// -----------------
// Events CRUD
// -----------------
router.post('/events', authMiddleware, adminMiddleware, createEvent);
router.get('/events', authMiddleware, adminMiddleware, getAllEvents);
router.get('/events/:id', authMiddleware, adminMiddleware, getEventById);
router.put('/events/:id', authMiddleware, adminMiddleware, updateEvent);
router.delete('/events/:id', authMiddleware, adminMiddleware, deleteEvent);

// -----------------
// Bookings
// -----------------
router.get('/bookings', authMiddleware, adminMiddleware, getAllBookings);
router.get('/bookings/:id', authMiddleware, adminMiddleware, getBookingById);
router.delete('/bookings/:id', authMiddleware, adminMiddleware, deleteBooking);

// -----------------
// Reports
// -----------------
router.get('/reports', authMiddleware, adminMiddleware, getReports);

module.exports = router;





// const express = require('express');
// const router = express.Router();
// const Event = require('../models/Event');
// const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
// const Booking = require('../models/Booking');
// const User = require('../models/User');


// // @route   POST /api/admin/events
// // @desc    Create a new event
// // @access  Private (admin only)
// router.post('/events', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const { title, description, date, location, totalSeats, price } = req.body;

//         const event = new Event({
//             title,
//             description,
//             date,
//             location,
//             totalSeats,
//             availableSeats: totalSeats, // initially same as total
//             price
//         });

//         await event.save();
//         res.status(201).json({ message: 'Event created successfully', event });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// // @route   GET /api/admin/events
// // @desc    Get all events
// // @access  Private (admin only)
// router.get('/events', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const events = await Event.find().sort({ date: 1 });
//         res.json(events);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// // @route   PUT /api/admin/events/:id
// // @desc    Update an event
// // @access  Private (admin only)
// router.put('/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const event = await Event.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         );

//         if (!event) {
//             return res.status(404).json({ message: 'Event not found' });
//         }

//         res.json({ message: 'Event updated successfully', event });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// // @route   DELETE /api/admin/events/:id
// // @desc    Delete an event
// // @access  Private (admin only)
// router.delete('/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const event = await Event.findByIdAndDelete(req.params.id);

//         if (!event) {
//             return res.status(404).json({ message: 'Event not found' });
//         }

//         res.json({ message: 'Event deleted successfully' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// module.exports = router;


// // ----------------------
// // Admin Booking Routes
// // ----------------------

// // @route   GET /api/admin/bookings
// // @desc    Get all bookings
// // @access  Private (admin only)
// router.get('/bookings', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const bookings = await Booking.find()
//             .populate('userId', 'name email')    // show user info
//             .populate('eventId', 'title date location price'); // show event info

//         res.json(bookings);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // @route   GET /api/admin/bookings/:id
// // @desc    Get single booking by ID
// // @access  Private (admin only)
// router.get('/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const booking = await Booking.findById(req.params.id)
//             .populate('userId', 'name email')
//             .populate('eventId', 'title date location price');

//         if (!booking) {
//             return res.status(404).json({ message: 'Booking not found' });
//         }

//         res.json(booking);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });




// // @route   DELETE /api/admin/bookings/:id
// // @desc    Delete (cancel) a booking
// // @access  Private (admin only)
// router.delete('/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         const booking = await Booking.findById(req.params.id);
//         if (!booking) {
//             return res.status(404).json({ message: 'Booking not found' });
//         }

//         // Restore seats back to the event
//         await Event.findByIdAndUpdate(booking.eventId, {
//             $inc: { availableSeats: booking.seatsBooked }
//         });

//         // Delete the booking
//         await booking.deleteOne();

//         res.json({ message: 'Booking cancelled successfully' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// // ----------------------
// // Admin Reports
// // ----------------------

// // @route   GET /api/admin/reports
// // @desc    Get admin dashboard reports
// // @access  Private (admin only)
// router.get('/reports', authMiddleware, adminMiddleware, async (req, res) => {
//     try {
//         // Total number of users
//         const totalUsers = await User.countDocuments({ role: 'user' });

//         // Total number of events
//         const totalEvents = await Event.countDocuments();

//         // Total number of bookings
//         const totalBookings = await Booking.countDocuments();

//         // Total revenue
//         const totalRevenueAgg = await Booking.aggregate([
//             { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
//         ]);
//         const totalRevenue = totalRevenueAgg[0] ? totalRevenueAgg[0].totalRevenue : 0;

//         // Bookings per event
//         const bookingsPerEvent = await Booking.aggregate([
//             { $group: { _id: "$eventId", totalSeats: { $sum: "$seatsBooked" } } },
//             { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
//             { $unwind: "$event" },
//             { $project: { eventId: "$_id", title: "$event.title", totalSeats: 1 } }
//         ]);

//         res.json({
//             totalUsers,
//             totalEvents,
//             totalBookings,
//             totalRevenue,
//             bookingsPerEvent
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// module.exports = router;