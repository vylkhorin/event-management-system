const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Music', 'Tech', 'Sports', 'Art', 'Business', 'Food', 'Health', 'Education', 'Other'],
        default: 'Other'
    },
    totalSeats: {
        type: Number,
        required: true,
        min: [1, 'Total seats must be at least 1']
    },
    availableSeats: {
        type: Number,
        required: true,
        min: [0, 'Available seats cannot be negative']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    imageUrl: {
        type: String,
        default: null
    },
    bookedSeats: {
        type: [String],
        default: []
    },
    reviews: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    averageRating: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
