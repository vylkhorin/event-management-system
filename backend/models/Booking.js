const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    seatsBooked: {
        type: Number,
        required: true,
        min: [1, 'Must book at least 1 seat']
    },
    selectedSeats: {
        type: [String],
        default: []
    },
    totalPrice: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'upi', 'bank_transfer'],
        default: 'credit_card'
    },
    transactionId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'cancelled'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
