const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
    getProfile,
    updateProfile,
    updatePassword,
    getEvents,
    getEventById,
    bookEvent,
    getUserBookings,
    getBookingById,
    cancelBooking,
    addReview
} = require('../controllers/userController');

// -----------------
// Profile
// -----------------
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/profile/password', authMiddleware, updatePassword);

// -----------------
// Browse Events (supports ?search= ?category= ?minPrice= ?maxPrice= ?date= ?page= ?limit=)
// -----------------
router.get('/events', getEvents);
router.get('/events/:id', getEventById);
router.post('/events/:eventId/review', authMiddleware, addReview);

// -----------------
// Bookings
// -----------------
router.post('/book/:eventId', authMiddleware, bookEvent);
router.get('/bookings', authMiddleware, getUserBookings);
router.get('/bookings/:id', authMiddleware, getBookingById);
router.delete('/bookings/:id', authMiddleware, cancelBooking);

module.exports = router;
