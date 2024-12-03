const express = require('express');
const multer = require('multer');
const path = require('path');
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
    approveBooking,
    rejectBooking,
    deleteBooking,
    getAllUsers,
    deleteUser,
    getReports,
    exportBookings,
    exportUsers
} = require('../controllers/adminController');

// Multer config for event image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    }
});

const protect = [authMiddleware, adminMiddleware];

// -----------------
// Events CRUD
// -----------------
router.post('/events', protect, upload.single('image'), createEvent);
router.get('/events', protect, getAllEvents);
router.get('/events/:id', protect, getEventById);
router.put('/events/:id', protect, upload.single('image'), updateEvent);
router.delete('/events/:id', protect, deleteEvent);

// -----------------
// Bookings
// -----------------
router.get('/bookings', protect, getAllBookings);
// IMPORTANT: /export must come before /:id — otherwise Express matches 'export' as an :id value
router.get('/bookings/export', protect, exportBookings);
router.get('/bookings/:id', protect, getBookingById);
// Approve/Reject Bookings
router.put('/bookings/:id/approve', protect, approveBooking);
router.put('/bookings/:id/reject', protect, rejectBooking);
router.delete('/bookings/:id', protect, deleteBooking);

// -----------------
// User Management
// -----------------
router.get('/users', protect, getAllUsers);
router.get('/users/export', protect, exportUsers);
router.delete('/users/:id', protect, deleteUser);

// -----------------
// Reports
// -----------------
router.get('/reports', protect, getReports);

module.exports = router;